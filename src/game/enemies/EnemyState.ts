import { ENEMY, type EnemyKind } from '../config';
import type { Box } from '../physics/aabb';
import { moveAndCollide } from '../physics/kinematic';

export interface EnemyTarget {
  x: number;
  y: number;
}

/**
 * Engine-free enemy brain and body. Fish swim, big fish patrol, dart fish
 * commit to a straight charge, and mines sit still. Stores top-left position.
 */
export class EnemyState {
  readonly kind: EnemyKind;
  readonly width: number;
  readonly height: number;
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  facing: 1 | -1 = 1;
  readonly homeX: number;
  readonly homeY: number;
  dead = false;
  /** True once a dart fish has locked on and is charging. */
  charging = false;
  private turnTimer: number;
  private readonly initialTurnTime: number;

  constructor(kind: EnemyKind, centerX: number, centerY: number) {
    const def = ENEMY[kind];
    this.kind = kind;
    this.width = def.width;
    this.height = def.height;
    this.x = centerX - this.width / 2;
    this.y = centerY - this.height / 2;
    this.homeX = this.x;
    this.homeY = this.y;
    this.initialTurnTime = 'turnTime' in def ? def.turnTime : 0;
    this.turnTimer = this.initialTurnTime;
  }

  get centerX(): number {
    return this.x + this.width / 2;
  }

  get centerY(): number {
    return this.y + this.height / 2;
  }

  /** Body-compatible aliases so the enemy can reuse the shared collider. */
  get w(): number {
    return this.width;
  }

  get h(): number {
    return this.height;
  }

  get isMine(): boolean {
    return this.kind === 'mine' || this.kind === 'mine-small' || this.kind === 'mine-big';
  }

  step(dt: number, target: EnemyTarget | null, solids: readonly Box[]): void {
    if (this.dead) {
      return;
    }
    switch (this.kind) {
      case 'fish':
        this.stepFish(dt, target, solids);
        break;
      case 'fish-big':
        this.stepPatrol(dt, solids);
        break;
      case 'fish-dart':
        this.stepDart(dt, target, solids);
        break;
      default:
        // Mines are immovable hazards.
        break;
    }
  }

  private stepFish(dt: number, target: EnemyTarget | null, solids: readonly Box[]): void {
    const speed = ENEMY.fish.speed;
    const aggro = ENEMY.fish.aggro;
    if (target) {
      const dx = target.x - this.centerX;
      const dy = target.y - this.centerY;
      if (dx * dx + dy * dy < aggro * aggro) {
        const len = Math.hypot(dx, dy) || 1;
        this.vx = (dx / len) * speed;
        this.vy = (dy / len) * speed;
        this.facing = dx >= 0 ? 1 : -1;
        moveAndCollide(this, solids, dt);
        return;
      }
    }
    const homeDX = this.homeX - this.x;
    const homeDY = this.homeY - this.y;
    if (Math.abs(homeDX) < 1 && Math.abs(homeDY) < 1) {
      this.vx = 0;
      this.vy = 0;
      return;
    }
    const len = Math.hypot(homeDX, homeDY) || 1;
    this.vx = (homeDX / len) * speed;
    this.vy = (homeDY / len) * speed;
    this.facing = homeDX >= 0 ? 1 : -1;
    moveAndCollide(this, solids, dt);
  }

  private stepPatrol(dt: number, solids: readonly Box[]): void {
    this.turnTimer -= dt;
    if (this.turnTimer <= 0) {
      this.facing = this.facing === 1 ? -1 : 1;
      this.turnTimer = ENEMY['fish-big'].turnTime;
    }
    this.vx = this.facing * ENEMY['fish-big'].speed;
    const result = moveAndCollide(this, solids, dt);
    if (result.hitX) {
      this.facing = this.facing === 1 ? -1 : 1;
    }
  }

  private stepDart(dt: number, target: EnemyTarget | null, solids: readonly Box[]): void {
    const speed = ENEMY['fish-dart'].speed;
    const aggro = ENEMY['fish-dart'].aggro;
    if (target) {
      const dx = target.x - this.centerX;
      const dy = Math.abs(target.y - this.centerY);
      if (!this.charging && dy < this.height && Math.abs(dx) < aggro) {
        this.charging = true;
        this.facing = dx >= 0 ? 1 : -1;
      } else if (!this.charging) {
        this.facing = dx >= 0 ? 1 : -1;
      }
    }
    if (this.charging) {
      this.vx = this.facing * speed;
      const result = moveAndCollide(this, solids, dt);
      if (result.hitX) {
        this.dead = true;
      }
    }
  }

  kill(): void {
    this.dead = true;
  }

  /**
   * Return the enemy to its spawn, alive and un-alerted. Used when the level
   * loops so every lap starts with the same fish and mines.
   */
  revive(): void {
    this.dead = false;
    this.x = this.homeX;
    this.y = this.homeY;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.charging = false;
    this.turnTimer = this.initialTurnTime;
  }
}
