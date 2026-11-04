import { Actor, Animation, vec } from 'excalibur';
import { animationFromFrameCount, img, sheetFrom } from '../assets';

/** A collectible drifting bubble. */
export class PickupActor extends Actor {
  private anim?: Animation;
  private readonly baseX: number;
  private readonly baseY: number;
  private time = 0;

  constructor(x: number, y: number) {
    super({ x, y, width: 23, height: 40, anchor: vec(0.5, 0.5), z: 12 });
    this.baseX = x;
    this.baseY = y;
  }

  onInitialize(): void {
    this.anim = animationFromFrameCount(sheetFrom(img.fx.bubbles, 23, 40), 4);
    this.graphics.use(this.anim);
  }

  onPostUpdate(_engine: unknown, elapsed: number): void {
    this.time += elapsed / 1000;
    this.pos = vec(this.baseX + Math.sin(this.time * 1.6) * 5, this.baseY + Math.sin(this.time * 2.4) * 6);
  }
}
