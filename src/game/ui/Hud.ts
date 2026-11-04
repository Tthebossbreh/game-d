import { ImageSource, ScreenElement, vec, type Scene } from 'excalibur';
import { img } from '../assets';
import { VIEW } from '../config';
import { BitmapFont } from './BitmapFont';

/**
 * Screen-space HUD drawn with the pack's bitmap font. Text is re-rasterised
 * only when its contents change (score, health, band) to avoid churn.
 */
export class Hud {
  private readonly font: BitmapFont;
  private readonly status: ScreenElement;
  private readonly hint: ScreenElement;
  private lastStatus = '';
  private lastHint = '';

  constructor(scene: Scene) {
    this.font = new BitmapFont(img.ui.font);
    this.status = new ScreenElement({ x: 10, y: 8, anchor: vec(0, 0), z: 1000 });
    this.hint = new ScreenElement({ x: 10, y: VIEW.height - 18, anchor: vec(0, 0), z: 1000 });
    scene.add(this.status);
    scene.add(this.hint);
  }

  setStatus(text: string, color = '#ffffff'): void {
    if (text === this.lastStatus) {
      return;
    }
    this.lastStatus = text;
    this.status.graphics.use(ImageSource.fromHtmlCanvasElement(this.font.toCanvas(text, 2, color)).toSprite());
  }

  setHint(text: string, color = '#8fe3b0'): void {
    if (text === this.lastHint) {
      return;
    }
    this.lastHint = text;
    this.hint.graphics.use(ImageSource.fromHtmlCanvasElement(this.font.toCanvas(text, 1.5, color)).toSprite());
  }
}
