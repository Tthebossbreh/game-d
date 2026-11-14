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
  private readonly timer: ScreenElement;
  private readonly hint: ScreenElement;
  private readonly message: ScreenElement;
  private lastStatus = '';
  private lastTimer = '';
  private lastHint = '';
  private lastMessage = '';

  constructor(scene: Scene) {
    this.font = new BitmapFont(img.ui.font);
    this.status = new ScreenElement({ x: 10, y: 8, anchor: vec(0, 0), z: 1000 });
    this.timer = new ScreenElement({ x: VIEW.width - 10, y: 8, anchor: vec(1, 0), z: 1000 });
    this.hint = new ScreenElement({ x: 10, y: VIEW.height - 18, anchor: vec(0, 0), z: 1000 });
    this.message = new ScreenElement({ x: VIEW.width / 2, y: VIEW.height / 2, anchor: vec(0.5, 0.5), z: 1001 });
    scene.add(this.status);
    scene.add(this.timer);
    scene.add(this.hint);
    scene.add(this.message);
  }

  setStatus(text: string, color = '#ffffff'): void {
    if (text === this.lastStatus) {
      return;
    }
    this.lastStatus = text;
    this.status.graphics.use(ImageSource.fromHtmlCanvasElement(this.font.toCanvas(text, 2, color)).toSprite());
  }

  /** Right-aligned level timer, re-rasterised only when the text or colour changes. */
  setTimer(text: string, color = '#ffffff'): void {
    const key = `${text}|${color}`;
    if (key === this.lastTimer) {
      return;
    }
    this.lastTimer = key;
    this.timer.graphics.use(ImageSource.fromHtmlCanvasElement(this.font.toCanvas(text, 2, color)).toSprite());
  }

  setHint(text: string, color = '#8fe3b0'): void {
    if (text === this.lastHint) {
      return;
    }
    this.lastHint = text;
    this.hint.graphics.use(ImageSource.fromHtmlCanvasElement(this.font.toCanvas(text, 1.5, color)).toSprite());
  }

  /** Big centred banner (e.g. GAME OVER). Pass an empty string to clear it. */
  setMessage(text: string, color = '#ffffff'): void {
    const key = `${text}|${color}`;
    if (key === this.lastMessage) {
      return;
    }
    this.lastMessage = key;
    if (!text) {
      // A zero-width canvas cannot become a sprite, so hide the banner instead.
      this.message.graphics.visible = false;
      return;
    }
    this.message.graphics.use(ImageSource.fromHtmlCanvasElement(this.font.toCanvas(text, 3, color)).toSprite());
    this.message.graphics.visible = true;
  }
}
