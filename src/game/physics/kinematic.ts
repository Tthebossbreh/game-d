import { overlaps, type Box } from './aabb';

export interface Body {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
}

export interface MoveResult {
  /** True when the body came to rest on top of a solid this step. */
  onGround: boolean;
  /** True when horizontal movement was blocked. */
  hitX: boolean;
  /** True when vertical movement was blocked. */
  hitY: boolean;
}

/**
 * Axis-separated AABB movement against a list of static solids.
 *
 * Speeds in this game stay well below one tile per simulation step, so moving
 * each axis fully and then resolving penetration is stable and simple. The
 * body is mutated in place and a summary of the collisions is returned.
 */
export function moveAndCollide(body: Body, solids: readonly Box[], dt: number): MoveResult {
  const result: MoveResult = { onGround: false, hitX: false, hitY: false };

  // --- Horizontal ---
  body.x += body.vx * dt;
  for (const s of solids) {
    if (!overlaps(body, s)) {
      continue;
    }
    if (body.vx > 0) {
      body.x = s.x - body.w;
    } else if (body.vx < 0) {
      body.x = s.x + s.w;
    } else {
      // Pushed into a wall without horizontal velocity: nudge out the short way.
      const pushLeft = s.x + s.w - body.x;
      const pushRight = body.x + body.w - s.x;
      body.x += pushLeft < pushRight ? pushLeft : -pushRight;
    }
    body.vx = 0;
    result.hitX = true;
  }

  // --- Vertical ---
  body.y += body.vy * dt;
  for (const s of solids) {
    if (!overlaps(body, s)) {
      continue;
    }
    if (body.vy > 0) {
      body.y = s.y - body.h;
      result.onGround = true;
    } else if (body.vy < 0) {
      body.y = s.y + s.h;
    } else {
      const pushUp = s.y + s.h - body.y;
      const pushDown = body.y + body.h - s.y;
      body.y += pushUp < pushDown ? pushUp : -pushDown;
    }
    body.vy = 0;
    result.hitY = true;
  }

  return result;
}
