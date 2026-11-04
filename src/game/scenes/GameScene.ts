import {
  Actor,
  Color,
  ImageWrapping,
  Keys,
  Scene,
  TiledSprite,
  vec,
  type Engine,
} from 'excalibur';
import { FX_FRAME, img } from '../assets';
import { Sfx } from '../audio/Sfx';
import { CAMERA, PLAYER, VIEW } from '../config';
import { EnemyActor } from '../enemies/EnemyActor';
import { EnemyState } from '../enemies/EnemyState';
import { FxActor } from '../entities/FxActor';
import { PickupActor } from '../entities/PickupActor';
import { InputMap } from '../input/InputMap';
import { LEVEL, PLAYER_SPAWN, type Rect } from '../level';
import { overlaps } from '../physics/aabb';
import { PlayerActor } from '../player/PlayerActor';
import { PlayerState } from '../player/PlayerState';
import { renderTileLayer } from '../render/tilemap';
import { Hud } from '../ui/Hud';

type FxName = keyof typeof FX_FRAME;

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function damp(current: number, target: number, lambda: number, dt: number): number {
  return target + (current - target) * Math.exp(-lambda * dt);
}

const EXPLOSION_BY_MINE: Record<string, FxName> = {
  mine: 'explosion',
  'mine-small': 'explosion-small',
  'mine-big': 'explosion-big',
};

export class GameScene extends Scene {
  private controls!: InputMap;
  private hud!: Hud;
  private player!: PlayerState;
  private playerActor!: PlayerActor;
  private readonly solids: Rect[] = LEVEL.solids;
  private readonly enemies: { state: EnemyState; actor: EnemyActor }[] = [];
  private readonly pickups: { actor: PickupActor; taken: boolean }[] = [];
  private background!: Actor;
  private midground!: Actor;
  private beacon!: Actor;
  private readonly goal = { x: VIEW.width / 2, y: VIEW.height / 2 };
  private score = 0;
  private time = 0;
  private complete = false;

  onInitialize(engine: Engine): void {
    this.controls = new InputMap(engine);

    this.background = this.addParallax(img.env.background, -100);
    this.midground = this.addParallax(img.env.midground, -50);

    this.addLayer(renderTileLayer(LEVEL.layers.main, LEVEL.columns.main, LEVEL.tile, img.env.tiles, LEVEL.pixelWidth, LEVEL.pixelHeight), 0);
    this.addLayer(renderTileLayer(LEVEL.layers.front, LEVEL.columns.front, LEVEL.tile, img.env.props, LEVEL.pixelWidth, LEVEL.pixelHeight), 8);

    this.spawnEntities();

    this.player = new PlayerState(PLAYER_SPAWN.x, PLAYER_SPAWN.y);
    this.playerActor = new PlayerActor(this.player);
    this.add(this.playerActor);

    this.beacon = new Actor({
      x: this.goal.x,
      y: this.goal.y,
      width: 44,
      height: 44,
      anchor: vec(0.5, 0.5),
      color: Color.fromHex('#8fe3b0'),
      z: 18,
    });
    this.add(this.beacon);

    this.hud = new Hud(this);
    this.camera.pos = vec(clamp(this.player.centerX, VIEW.width / 2, LEVEL.pixelWidth - VIEW.width / 2), clamp(this.player.centerY, VIEW.height / 2, LEVEL.pixelHeight - VIEW.height / 2));
  }

  onActivate(): void {
    Sfx.startMusic('watery');
    Sfx.startAmbience();
  }

  onDeactivate(): void {
    Sfx.stopMusic();
    Sfx.stopAmbience();
  }

  onPreUpdate(_engine: Engine, elapsed: number): void {
    const dt = Math.min(elapsed / 1000, 1 / 30);
    if (dt <= 0) {
      return;
    }
    this.time += dt;

    if (this.complete) {
      this.hud.setHint('LEVEL COMPLETE - PRESS ENTER', '#f2d06b');
      if (this.engine.input.keyboard.wasPressed(Keys.Enter)) {
        void this.engine.goToScene('title');
      }
      this.syncActors();
      return;
    }

    const input = this.controls.sample();
    const events = this.player.step(input, dt, this.solids);
    if (events.jump) {
      Sfx.jump();
      this.spawnFx('bubbles', this.player.centerX, this.player.centerY - 12, 22);
    }
    if (events.boost) {
      Sfx.boost();
      this.spawnFx('bubbles', this.player.centerX, this.player.centerY, 22);
    }
    if (events.land) {
      Sfx.land();
    }
    if (events.died) {
      this.respawn();
    }

    const target = { x: this.player.centerX, y: this.player.centerY };
    for (const { state } of this.enemies) {
      state.step(dt, target, this.solids);
    }

    this.resolveEnemyContacts();
    this.resolvePickups();
    this.checkGoal();

    this.syncActors();
    this.updateCamera(dt);
    this.updateHud();
  }

  // --- setup helpers -------------------------------------------------------

  private addParallax(source: typeof img.env.background, z: number): Actor {
    const sprite = new TiledSprite({
      image: source,
      width: LEVEL.pixelWidth,
      height: LEVEL.pixelHeight,
      wrapping: { x: ImageWrapping.Repeat, y: ImageWrapping.Repeat },
    });
    const actor = new Actor({ x: 0, y: 0, anchor: vec(0, 0), z });
    actor.graphics.use(sprite);
    actor.graphics.opacity = 0.9;
    this.add(actor);
    return actor;
  }

  private addLayer(source: ReturnType<typeof renderTileLayer>, z: number): void {
    const actor = new Actor({ x: 0, y: 0, anchor: vec(0, 0), z });
    actor.graphics.use(source.toSprite());
    this.add(actor);
  }

  private spawnEntities(): void {
    for (const spawn of LEVEL.spawns) {
      if (spawn.kind === 'player') {
        continue;
      }
      if (spawn.kind === 'exit') {
        // The right-hand exit is the goal; the left one is only a respawn marker.
        if (spawn.x > this.goal.x) {
          this.goal.x = spawn.x;
          this.goal.y = spawn.y;
        }
        continue;
      }
      if (spawn.kind === 'pickup') {
        const actor = new PickupActor(spawn.x, spawn.y);
        this.pickups.push({ actor, taken: false });
        this.add(actor);
        continue;
      }
      const state = new EnemyState(spawn.kind, spawn.x, spawn.y);
      const actor = new EnemyActor(state);
      this.enemies.push({ state, actor });
      this.add(actor);
    }
  }

  // --- per-frame resolution ------------------------------------------------

  private resolveEnemyContacts(): void {
    if (this.player.dead) {
      return;
    }
    const playerBox = { x: this.player.x, y: this.player.y, w: this.player.w, h: this.player.h };
    for (const { state } of this.enemies) {
      if (state.dead) {
        continue;
      }
      const box = { x: state.x, y: state.y, w: state.width, h: state.height };
      if (!overlaps(playerBox, box)) {
        continue;
      }

      if (state.isMine) {
        if (this.player.hurt(1, state.centerX)) {
          Sfx.hurt();
          Sfx.explosion();
          state.kill();
          this.explode(state);
        }
        continue;
      }

      const stomping = this.player.vy > 40 && this.player.centerY < state.centerY - 2;
      if (stomping || this.player.isBoosting) {
        state.kill();
        Sfx.enemyDeath();
        this.spawnFx('enemy-death', state.centerX, state.centerY, 28);
        this.score += state.kind === 'fish-big' ? 30 : state.kind === 'fish-dart' ? 20 : 10;
        if (stomping) {
          this.player.vy = -PLAYER.jumpSpeed * 0.7;
        }
      } else if (this.player.hurt(1, state.centerX)) {
        Sfx.hurt();
      }
    }
  }

  private resolvePickups(): void {
    const playerBox = { x: this.player.x, y: this.player.y, w: this.player.w, h: this.player.h };
    for (const pickup of this.pickups) {
      if (pickup.taken) {
        continue;
      }
      const p = pickup.actor.pos;
      const box = { x: p.x - 11, y: p.y - 20, w: 23, h: 40 };
      if (overlaps(playerBox, box)) {
        pickup.taken = true;
        pickup.actor.kill();
        this.score += 5;
        Sfx.pickup();
      }
    }
  }

  private checkGoal(): void {
    if (this.complete || this.player.dead) {
      return;
    }
    const dx = this.player.centerX - this.goal.x;
    const dy = this.player.centerY - this.goal.y;
    if (dx * dx + dy * dy < 30 * 30) {
      this.complete = true;
      this.score += 100;
      Sfx.pickup();
    }
  }

  private explode(state: EnemyState): void {
    const name = EXPLOSION_BY_MINE[state.kind] ?? 'explosion';
    this.spawnFx(name, state.centerX, state.centerY, 28);
  }

  private spawnFx(name: FxName, x: number, y: number, z = 30): void {
    this.add(new FxActor(img.fx[name], FX_FRAME[name], x, y, z));
  }

  private respawn(): void {
    this.player.respawn(PLAYER_SPAWN.x, PLAYER_SPAWN.y);
    this.controls.reset();
    for (const { state } of this.enemies) {
      if (state.dead) {
        continue;
      }
      state.x = state.homeX;
      state.y = state.homeY;
    }
  }

  private syncActors(): void {
    this.playerActor.sync();
    for (const { actor } of this.enemies) {
      actor.sync(this.time);
    }
  }

  private updateCamera(dt: number): void {
    const targetX = clamp(
      this.player.centerX + this.player.facing * CAMERA.lookAheadX,
      VIEW.width / 2,
      LEVEL.pixelWidth - VIEW.width / 2,
    );
    const targetY = clamp(
      this.player.centerY + CAMERA.lookAheadY,
      VIEW.height / 2,
      LEVEL.pixelHeight - VIEW.height / 2,
    );
    const cx = damp(this.camera.pos.x, targetX, CAMERA.lerp, dt);
    const cy = damp(this.camera.pos.y, targetY, CAMERA.lerp, dt);
    this.camera.pos = vec(cx, cy);

    const left = cx - VIEW.width / 2;
    const top = cy - VIEW.height / 2;
    this.background.pos = vec(left * 0.25, top * 0.25);
    this.midground.pos = vec(left * 0.5, top * 0.5);
    this.beacon.scale = vec(1 + Math.sin(this.time * 4) * 0.12, 1 + Math.sin(this.time * 4) * 0.12);
    this.beacon.graphics.opacity = 0.55 + Math.sin(this.time * 4) * 0.25;
  }

  private updateHud(): void {
    const vigor = '#'.repeat(Math.max(0, this.player.health)) + '-'.repeat(Math.max(0, PLAYER.maxHealth - this.player.health));
    this.hud.setStatus(`SCORE ${this.score.toString().padStart(4, '0')}  VIGOR [${vigor}]`);
    this.hud.setHint('REACH THE RIGHT EXIT', '#8fe3b0');
  }
}
