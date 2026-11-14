import { ImageSource } from 'excalibur';

/**
 * Rasterise an Impact.js tile layer into a single offscreen canvas and hand it
 * back as an Excalibur sprite source. Impact stores tile ids 1-based with 0 as
 * empty, so the tile position is `id - 1`.
 */
export function renderTileLayer(
  data: number[][],
  columns: number,
  tileSize: number,
  tileset: ImageSource,
  widthPx: number,
  heightPx: number,
  flipX?: number[][],
): ImageSource {
  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    const image = tileset.image;
    for (let y = 0; y < data.length; y++) {
      const row = data[y];
      if (!row) {
        continue;
      }
      for (let x = 0; x < row.length; x++) {
        const id = row[x] ?? 0;
        if (id <= 0) {
          continue;
        }
        const index = id - 1;
        const sx = (index % columns) * tileSize;
        const sy = Math.floor(index / columns) * tileSize;
        if (flipX?.[y]?.[x]) {
          // Mirrored copy (e.g. the right-hand wall built from the left wall).
          ctx.save();
          ctx.translate((x + 1) * tileSize, y * tileSize);
          ctx.scale(-1, 1);
          ctx.drawImage(image, sx, sy, tileSize, tileSize, 0, 0, tileSize, tileSize);
          ctx.restore();
        } else {
          ctx.drawImage(image, sx, sy, tileSize, tileSize, x * tileSize, y * tileSize, tileSize, tileSize);
        }
      }
    }
  }
  return ImageSource.fromHtmlCanvasElement(canvas);
}
