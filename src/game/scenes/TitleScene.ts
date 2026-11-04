import { Actor, ImageSource, Keys, Scene, vec, type Engine } from 'excalibur';
import { img } from '../assets';
import { Sfx } from '../audio/Sfx';
import { VIEW } from '../config';
import { BitmapFont } from '../ui/BitmapFont';

/** Title screen built from the pack's start-screen art and bitmap font. */
export class TitleScene extends Scene {
  private font!: BitmapFont;

  onInitialize(_engine: Engine): void {
    this.font = new BitmapFont(img.ui.font);
    this.add(this.scaled(img.ui.gradient, VIEW.width / 500, VIEW.height / 330, 0, -100));
    this.add(this.scaled(img.ui.startBg, 1, 1, VIEW.width / 2, VIEW.height / 2, -90));
    this.add(this.scaled(img.ui.startFg, 1, 1, VIEW.width / 2, VIEW.height, -80, vec(0.5, 1)));

    // The start-screen art already draws the game's title, so the bitmap font
    // carries the tagline and prompt instead of duplicating it.
    this.add(this.text('A CAVE PLATFORMER', VIEW.width / 2, VIEW.height - 92, 2, '#f2d06b', vec(0.5, 0)));
    this.add(this.text('PRESS ENTER TO DIVE', VIEW.width / 2, VIEW.height - 52, 2, '#ffffff', vec(0.5, 0)));
  }

  onActivate(): void {
    Sfx.startMusic('theme');
  }

  onDeactivate(): void {
    Sfx.stopMusic();
    Sfx.stopAmbience();
  }

  onPreUpdate(engine: Engine): void {
    if (engine.input.keyboard.wasPressed(Keys.Enter)) {
      void engine.goToScene('instructions');
    }
  }

  private scaled(
    source: ImageSource,
    scaleX: number,
    scaleY: number,
    x: number,
    y: number,
    z = 0,
    anchor = vec(0, 0),
  ): Actor {
    const actor = new Actor({ x, y, anchor, z });
    actor.graphics.use(source.toSprite());
    actor.scale = vec(scaleX, scaleY);
    return actor;
  }

  private text(
    value: string,
    x: number,
    y: number,
    scale: number,
    color: string,
    anchor = vec(0, 0),
  ): Actor {
    const actor = new Actor({ x, y, anchor, z: 10 });
    actor.graphics.use(ImageSource.fromHtmlCanvasElement(this.font.toCanvas(value, scale, color)).toSprite());
    return actor;
  }
}
