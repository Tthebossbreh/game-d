import { Actor, Animation, vec } from 'excalibur';
import { animationFromFrameCount, img, PLAYER_FRAME, sheetFrom } from '../assets';
import { PLAYER } from '../config';
import type { PlayerState } from './PlayerState';

type AnimName = 'idle' | 'swim' | 'fast' | 'rush' | 'hurt';

const FRAME_COUNTS: Record<AnimName, number> = {
  idle: 6,
  swim: 7,
  fast: 5,
  rush: 7,
  hurt: 5,
};

/**
 * Renders the diver. The 80x80 frames are centred on the 32x20 collision body,
 * matching the original Impact.js offsets.
 */
export class PlayerActor extends Actor {
  private readonly anims = new Map<AnimName, Animation>();

  constructor(private readonly state: PlayerState) {
    super({
      x: state.centerX,
      y: state.centerY,
      width: PLAYER_FRAME,
      height: PLAYER_FRAME,
      anchor: vec(0.5, 0.5),
      z: 20,
    });
  }

  onInitialize(): void {
    const sources: Record<AnimName, typeof img.player.idle> = {
      idle: img.player.idle,
      swim: img.player.swim,
      fast: img.player.fast,
      rush: img.player.rush,
      hurt: img.player.hurt,
    };
    (Object.keys(sources) as AnimName[]).forEach((name) => {
      const animation = animationFromFrameCount(
        sheetFrom(sources[name], PLAYER_FRAME, PLAYER_FRAME),
        FRAME_COUNTS[name],
      );
      this.anims.set(name, animation);
      this.graphics.add(name, animation);
    });
    this.graphics.use('idle');
  }

  sync(): void {
    const s = this.state;
    this.pos = vec(s.centerX, s.centerY);

    let name: AnimName = 'idle';
    if (s.isHurt) {
      name = 'hurt';
    } else if (s.isBoosting) {
      name = 'rush';
    } else if (Math.abs(s.vx) > PLAYER.maxRunSpeed * 0.92) {
      name = 'fast';
    } else if (Math.abs(s.vx) > 20) {
      name = 'swim';
    }

    this.graphics.use(name);
    const animation = this.anims.get(name);
    if (animation) {
      animation.flipHorizontal = s.facing < 0;
    }
    this.graphics.opacity = s.invuln > 0 && Math.floor(s.invuln * 18) % 2 === 0 ? 0.35 : 1;
  }
}
