import { Actor, Color, Font, Scene, Text, vec, type Engine } from 'excalibur';
import { STARTER, VIEW } from '../config';

/**
 * A deliberately tiny scene: a ground strip and a square that bounces around
 * the playable area. It exists to prove the Excalibur + Vite + TypeScript
 * pipeline works end to end; replace it with your own game.
 */
export class StarterScene extends Scene {
  private player!: Actor;
  private readonly velocity = vec(STARTER.speedX, STARTER.speedY);

  onInitialize(_engine: Engine): void {
    const groundTop = VIEW.height - STARTER.groundHeight;

    this.add(
      new Actor({
        x: 0,
        y: groundTop,
        width: VIEW.width,
        height: STARTER.groundHeight,
        anchor: vec(0, 0),
        color: Color.fromHex('#1d2833'),
        z: 0,
      }),
    );

    this.player = new Actor({
      x: VIEW.width / 2,
      y: groundTop - STARTER.boxHalf,
      width: STARTER.boxHalf * 2,
      height: STARTER.boxHalf * 2,
      color: Color.fromHex('#f2eee1'),
      z: 1,
    });
    this.add(this.player);

    this.add(
      new Actor({
        x: 32,
        y: 28,
        anchor: vec(0, 0),
        z: 2,
        graphic: new Text({
          text: 'GAME D — starter',
          font: new Font({ size: 28, color: Color.fromHex('#8fe3b0') }),
        }),
      }),
    );
  }

  onPostUpdate(_engine: Engine, elapsed: number): void {
    const dt = Math.min(elapsed / 1000, 1 / 30);
    if (dt <= 0) {
      return;
    }

    const half = STARTER.boxHalf;
    const floor = VIEW.height - STARTER.groundHeight - half;
    const next = this.player.pos.clone();
    next.x += this.velocity.x * dt;
    next.y += this.velocity.y * dt;

    if (next.x < half) {
      next.x = half;
      this.velocity.x = Math.abs(this.velocity.x);
    } else if (next.x > VIEW.width - half) {
      next.x = VIEW.width - half;
      this.velocity.x = -Math.abs(this.velocity.x);
    }

    if (next.y < half) {
      next.y = half;
      this.velocity.y = Math.abs(this.velocity.y);
    } else if (next.y > floor) {
      next.y = floor;
      this.velocity.y = -Math.abs(this.velocity.y);
    }

    this.player.pos = next;
  }
}
