import { Keys, type Engine } from 'excalibur';
import type { PlayerInput } from '../player/PlayerState';

/**
 * Maps the keyboard onto the four player actions. Jump and boost are edge
 * detected here so the simulation sees clean press events.
 */
export class InputMap {
  private jumpWasHeld = false;
  private boostWasHeld = false;

  constructor(private readonly engine: Engine) {}

  sample(): PlayerInput {
    const kb = this.engine.input.keyboard;
    const jumpHeld = kb.isHeld(Keys.Space) || kb.isHeld(Keys.Up) || kb.isHeld(Keys.W);
    const boostHeld =
      kb.isHeld(Keys.ShiftLeft) || kb.isHeld(Keys.ShiftRight) || kb.isHeld(Keys.X) || kb.isHeld(Keys.Z);

    const input: PlayerInput = {
      left: kb.isHeld(Keys.Left) || kb.isHeld(Keys.A),
      right: kb.isHeld(Keys.Right) || kb.isHeld(Keys.D),
      jumpPressed: jumpHeld && !this.jumpWasHeld,
      boostPressed: boostHeld && !this.boostWasHeld,
    };

    this.jumpWasHeld = jumpHeld;
    this.boostWasHeld = boostHeld;
    return input;
  }

  reset(): void {
    this.jumpWasHeld = false;
    this.boostWasHeld = false;
  }
}
