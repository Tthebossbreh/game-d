/**
 * Central tunables for the underwater platformer. This file deliberately has
 * no engine imports so it can be pulled into headless tests.
 */

export const VIEW = {
  width: 640,
  height: 360,
} as const;

export const TILE = 16;

/** Simulation runs at a fixed rate so movement is deterministic. */
export const FIXED_UPDATE_FPS = 120;

export const CAMERA = {
  /** Higher = snappier follow. */
  lerp: 8,
  lookAheadX: 48,
  lookAheadY: 24,
} as const;

export const PLAYER = {
  width: 32,
  height: 20,
  maxRunSpeed: 165,
  groundAccel: 900,
  groundFriction: 1100,
  airAccel: 620,
  airDrag: 260,
  gravity: 900,
  maxFall: 430,
  /** Instant upward kick when jumping off the ground. */
  jumpSpeed: 320,
  /** Holding jump underwater keeps lifting the diver. */
  swimUpAccel: 1500,
  swimMaxRise: 170,
  coyoteTime: 0.1,
  jumpBufferTime: 0.12,
  /** Horizontal burst. Doubles as the attack. */
  boostSpeed: 330,
  boostTime: 0.2,
  boostCooldown: 0.55,
  maxHealth: 3,
  invulnTime: 1.3,
  hurtTime: 0.35,
  hurtStun: 0.25,
  knockbackX: 180,
  knockbackY: -160,
  /** How long the death animation plays before respawning. */
  deathTime: 0.9,
} as const;

export const ENEMY = {
  fish: { width: 32, height: 32, speed: 42, aggro: 120 },
  'fish-big': { width: 54, height: 49, speed: 22, turnTime: 5 },
  'fish-dart': { width: 39, height: 20, speed: 320, aggro: 220 },
  mine: { width: 45, height: 45 },
  'mine-small': { width: 31, height: 31 },
  'mine-big': { width: 69, height: 69 },
} as const;

export type EnemyKind = keyof typeof ENEMY;

export const COMBO = {
  /** Frames per second for sprite animations (Impact used 0.1s). */
  frameDuration: 110,
  /** Enemy-death and explosion durations. */
  fxFrameDuration: 70,
} as const;

export const AUDIO = {
  musicVolume: 0.5,
  ambientVolume: 0.35,
  sfxVolume: 0.7,
} as const;
