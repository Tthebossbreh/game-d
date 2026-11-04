import { Actor, AnimationStrategy, vec, type ImageSource } from 'excalibur';
import { animationFromFrameCount, sheetFrom } from '../assets';
import { COMBO } from '../config';

/**
 * One-shot effect (explosion, enemy death, boost bubbles) that removes itself
 * when its animation finishes.
 */
export class FxActor extends Actor {
  constructor(
    private readonly source: ImageSource,
    private readonly frame: { w: number; h: number; frames: number },
    x: number,
    y: number,
    z = 30,
  ) {
    super({ x, y, width: frame.w, height: frame.h, anchor: vec(0.5, 0.5), z });
  }

  onInitialize(): void {
    const sheet = sheetFrom(this.source, this.frame.w, this.frame.h);
    const animation = animationFromFrameCount(
      sheet,
      this.frame.frames,
      COMBO.fxFrameDuration,
      AnimationStrategy.End,
    );
    this.graphics.use(animation);
    animation.events.on('end', () => this.kill());
    // Safety net in case the end event is missed.
    this.actions.delay((this.frame.frames * COMBO.fxFrameDuration) / 1000 + 0.2).callMethod(() => this.kill());
  }
}
