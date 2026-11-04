import { ImageSource } from 'excalibur';
import fontData from './font.json';

interface GlyphMetrics {
  x: number;
  w: number;
}

/**
 * Renders the pack's 04b03 bitmap font. The font is a single strip of 95
 * glyphs covering ASCII 32-126; we measure each glyph's opaque columns and
 * draw it with the 2D canvas API.
 */
export class BitmapFont {
  readonly height: number;
  private readonly gap: number;
  private readonly glyphs = new Map<number, GlyphMetrics>();
  private readonly tints = new Map<string, HTMLCanvasElement>();

  constructor(private readonly source: ImageSource) {
    this.height = fontData.height;
    this.gap = fontData.advanceGap;
    const raw = fontData.glyphs as Record<string, number[]>;
    for (const [code, rect] of Object.entries(raw)) {
      this.glyphs.set(Number(code), { x: rect[0] ?? 0, w: rect[1] ?? 0 });
    }
  }

  measure(text: string, scale = 1): number {
    let width = 0;
    for (const ch of text) {
      const glyph = this.glyphs.get(ch.charCodeAt(0));
      width += ((glyph?.w ?? Math.round(this.height * 0.6)) + this.gap) * scale;
    }
    return width;
  }

  /** Draw text at (x, y) top-left. `y` is the top of the glyph line. */
  draw(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    scale = 1,
    color = '#ffffff',
  ): void {
    const atlas = this.atlas(color);
    ctx.imageSmoothingEnabled = false;
    let cursor = x;
    for (const ch of text) {
      const code = ch.charCodeAt(0);
      const glyph = this.glyphs.get(code);
      if (code !== 32 && glyph) {
        ctx.drawImage(
          atlas,
          glyph.x,
          0,
          glyph.w,
          this.height,
          cursor,
          y,
          glyph.w * scale,
          this.height * scale,
        );
      }
      cursor += ((glyph?.w ?? Math.round(this.height * 0.6)) + this.gap) * scale;
    }
  }

  /** Render text to a fresh canvas, transparent background. */
  toCanvas(text: string, scale = 1, color = '#ffffff', padding = 0): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(this.measure(text, scale)) + padding * 2;
    canvas.height = Math.ceil(this.height * scale) + padding * 2;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      this.draw(ctx, text, padding, padding, scale, color);
    }
    return canvas;
  }

  private atlas(color: string): CanvasImageSource {
    const key = color.toLowerCase();
    const cached = this.tints.get(key);
    if (cached) {
      return cached;
    }
    const image = this.source.image;
    const canvas = document.createElement('canvas');
    canvas.width = this.source.width;
    canvas.height = this.source.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return image;
    }
    ctx.drawImage(image, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.tints.set(key, canvas);
    return canvas;
  }
}
