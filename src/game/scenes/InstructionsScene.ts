import { Actor, ImageSource, Keys, Scene, vec, type Engine } from 'excalibur';
import { img } from '../assets';
import { VIEW } from '../config';
import { BitmapFont } from '../ui/BitmapFont';

/** Shows the pack's control card before the game starts. */
export class InstructionsScene extends Scene {
  private font!: BitmapFont;

  onInitialize(_engine: Engine): void {
    this.font = new BitmapFont(img.ui.font);

    const card = new Actor({ x: VIEW.width / 2, y: VIEW.height / 2 - 8, anchor: vec(0.5, 0.5), z: 0 });
    card.graphics.use(img.ui.instructions.toSprite());
    card.scale = vec(Math.min(VIEW.width / 500, (VIEW.height - 40) / 330), Math.min(VIEW.width / 500, (VIEW.height - 40) / 330));
    this.add(card);

    const prompt = new Actor({ x: VIEW.width / 2, y: VIEW.height - 26, anchor: vec(0.5, 0), z: 10 });
    prompt.graphics.use(
      ImageSource.fromHtmlCanvasElement(this.font.toCanvas('PRESS ENTER TO START', 1.6, '#ffffff')).toSprite(),
    );
    this.add(prompt);
  }

  onPreUpdate(engine: Engine): void {
    if (engine.input.keyboard.wasPressed(Keys.Enter) || engine.input.keyboard.wasPressed(Keys.Space)) {
      void engine.goToScene('game');
    }
  }
}
