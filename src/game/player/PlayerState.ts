import { PLAYER } from '../config';
import type { Box } from '../physics/aabb';
import { moveAndCollide } from '../physics/kinematic';

export interface PlayerInput {
  left: boolean;
  right: boolean;
  jumpPressed: boolean;
  boostPressed: boolean;
}

export interface PlayerEvents {
  jump: boolean;
  boost: boolean;
  land: boolean;
  hurt: boolean;
  died: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/**
 * Engine-free player simulation: a low-gravity platformer. Jumping is the only
 * way up — there is no swimming lift once the diver leaves the ground.
 */
export class PlayerState {
  x: number;
  y: number;
  readonly w = PLAYER.width;
  readonly h = PLAYER.height;
  vx = 0;
  vy = 0;
  facing: 1 | -1 = 1;
  onGround = false;
  health: number = PLAYER.maxHealth;
  invuln = 0;
  hurtTimer = 0;
  boostTimer = 0;
  boostCooldown = 0;
  coyote = 0;
  jumpBuffer = 0;
  dead = false;
  deathTimer = 0;

  constructor(centerX: number, centerY: number) {
    this.x = centerX - this.w / 2;
    this.y = centerY - this.h / 2;
  }

  get centerX(): number {
    return this.x + this.w / 2;
  }

  get centerY(): number {
    return this.y + this.h / 2;
  }

  get isBoosting(): boolean {
    return this.boostTimer > 0;
  }

  get isHurt(): boolean {
    return this.hurtTimer > 0;
  }

  step(input: PlayerInput, dt: number, solids: readonly Box[]): PlayerEvents {
    const events: PlayerEvents = {
      jump: false,
      boost: false,
      land: false,
      hurt: false,
      died: false,
    };

    if (this.dead) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) {
        events.died = true;
      }
      return events;
    }

    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.boostCooldown = Math.max(0, this.boostCooldown - dt);
    this.coyote = Math.max(0, this.coyote - dt);
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);

    const stunned = this.hurtTimer > 0;
    const control = stunned ? 0 : 1;
    const accel = this.onGround ? PLAYER.groundAccel : PLAYER.airAccel;

    if (control > 0 && input.left && !input.right) {
      this.vx -= accel * dt;
      this.facing = -1;
    } else if (control > 0 && input.right && !input.left) {
      this.vx += accel * dt;
      this.facing = 1;
    } else {
      const drag = (this.onGround ? PLAYER.groundFriction : PLAYER.airDrag) * dt;
      this.vx = Math.abs(this.vx) <= drag ? 0 : this.vx - Math.sign(this.vx) * drag;
    }

    if (input.boostPressed && this.boostCooldown <= 0 && this.boostTimer <= 0) {
      this.boostTimer = PLAYER.boostTime;
      this.boostCooldown = PLAYER.boostCooldown;
      this.vx = this.facing * PLAYER.boostSpeed;
      events.boost = true;
    }
    if (this.boostTimer > 0) {
      this.boostTimer = Math.max(0, this.boostTimer - dt);
      this.vx = this.facing * PLAYER.boostSpeed;
    }

    const speedCap = this.boostTimer > 0 ? PLAYER.boostSpeed : PLAYER.maxRunSpeed;
    this.vx = clamp(this.vx, -speedCap, speedCap);

    if (input.jumpPressed) {
      this.jumpBuffer = PLAYER.jumpBufferTime;
    }
    if (this.onGround) {
      this.coyote = PLAYER.coyoteTime;
    }
    if (this.jumpBuffer > 0 && this.coyote > 0 && !stunned) {
      this.vy = -PLAYER.jumpSpeed;
      this.jumpBuffer = 0;
      this.coyote = 0;
      this.onGround = false;
      events.jump = true;
    }

    this.vy += PLAYER.gravity * dt;
    if (this.vy > PLAYER.maxFall) {
      this.vy = PLAYER.maxFall;
    }

    const wasOnGround = this.onGround;
    const result = moveAndCollide(this, solids, dt);
    this.onGround = result.onGround;
    if (!wasOnGround && this.onGround) {
      events.land = true;
    }

    return events;
  }

  /** Returns true when the hit actually landed (not blocked by i-frames). */
  hurt(amount: number, fromX: number): boolean {
    if (this.dead || this.invuln > 0) {
      return false;
    }
    this.health -= amount;
    this.invuln = PLAYER.invulnTime;
    this.hurtTimer = PLAYER.hurtTime;
    const dir = this.centerX < fromX ? -1 : 1;
    this.vx = dir * PLAYER.knockbackX;
    this.vy = PLAYER.knockbackY;
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
      this.deathTimer = PLAYER.deathTime;
    }
    return true;
  }

  /**
   * Place the diver back at a spawn point. Vigor is restored by default (a
   * death or GAME OVER); looping through the exit passes `false` so the run
   * keeps whatever vigor it has left.
   */
  respawn(centerX: number, centerY: number, restoreVigor = true): void {
    this.x = centerX - this.w / 2;
    this.y = centerY - this.h / 2;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.onGround = false;
    if (restoreVigor) {
      this.health = PLAYER.maxHealth;
    }
    this.invuln = PLAYER.invulnTime;
    this.hurtTimer = 0;
    this.boostTimer = 0;
    this.boostCooldown = 0;
    this.dead = false;
    this.deathTimer = 0;
  }
}
