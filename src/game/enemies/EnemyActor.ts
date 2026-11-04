import { Actor, Graphic, vec } from 'excalibur';
import { animationFromFrameCount, ENEMY_FRAME, img, sheetFrom } from '../assets';
import type { EnemyState } from './EnemyState';

/**
 * Renders one enemy from the appropriate sprite sheet. Mines are a single
 * frame; everything else loops its swim animation.
 */
export class EnemyActor extends Actor {
  private graphic?: Graphic;

  constructor(private readonly state: EnemyState) {
    super({
      x: state.centerX,
      y: state.centerY,
      width: state.width,
      height: state.height,
      anchor: vec(0.5, 0.5),
      z: state.isMine ? 14 : 16,
    });
  }

  onInitialize(): void {
    const frame = ENEMY_FRAME[this.state.kind];
    const sheet = sheetFrom(img.enemies[this.state.kind], frame.w, frame.h);
    const graphic = this.state.isMine
      ? sheet.getSprite(0, 0)
      : animationFromFrameCount(sheet, frame.frames);
    this.graphic = graphic;
    this.graphics.use(graphic);
  }

  sync(time: number): void {
    const s = this.state;
    this.pos = vec(s.centerX, s.centerY);
    this.graphics.visible = !s.dead;
    if (this.graphic) {
      this.graphic.flipHorizontal = s.facing < 0;
    }
    if (s.isMine) {
      // Gentle bob so the mines do not look frozen.
      this.scale = vec(1 + Math.sin(time * 3 + s.homeX) * 0.04, 1 + Math.cos(time * 3 + s.homeX) * 0.04);
    }
  }
}
