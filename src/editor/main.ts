import rawLevel from '../game/levels/level1.json';
import {
  deleteEntityAt,
  eraseTile,
  forEachLine,
  paintBox,
  paintLine,
  paintTile,
  placeEntity,
  type LayerName,
} from './tools';
import './editor.css';

/* ------------------------------------------------------------------ types */

type ToolName = 'brush' | 'line' | 'box' | 'eraser' | 'entity';

interface EntityJSON {
  type: string;
  x: number;
  y: number;
  [key: string]: unknown;
}

interface LevelJSON {
  tilesize: number;
  width: number;
  height: number;
  tilesets: { main: { cols: number }; front: { cols: number } };
  collision: number[][];
  main: number[][];
  front: number[][];
  entities: EntityJSON[];
}

interface EntityDef {
  type: string;
  label: string;
  color: string;
  w: number;
  h: number;
}

interface DragState {
  mode: 'paint' | 'erase' | 'line' | 'box' | 'pan';
  startTileX: number;
  startTileY: number;
  lastTileX: number;
  lastTileY: number;
  screenX: number;
  screenY: number;
  panStartX: number;
  panStartY: number;
}

/* --------------------------------------------------------------- entities */

const ENTITY_DEFS: EntityDef[] = [
  { type: 'EntityPlayer', label: 'Player', color: '#4fc3f7', w: 32, h: 20 },
  { type: 'EntityFish', label: 'Fish', color: '#ffb74d', w: 32, h: 32 },
  { type: 'EntityFishBig', label: 'Big Fish', color: '#ff8a65', w: 54, h: 49 },
  { type: 'EntityFishDart', label: 'Dart Fish', color: '#ba68c8', w: 39, h: 20 },
  { type: 'EntityMine', label: 'Mine', color: '#e57373', w: 45, h: 45 },
  { type: 'EntityMineSmall', label: 'Small Mine', color: '#f06292', w: 31, h: 31 },
  { type: 'EntityMineBig', label: 'Big Mine', color: '#d32f2f', w: 69, h: 69 },
  { type: 'EntityLevelexit', label: 'Exit', color: '#81c784', w: 32, h: 32 },
  { type: 'EntityPickup', label: 'Pickup', color: '#fff176', w: 23, h: 40 },
];

function entityDef(type: string): EntityDef {
  return ENTITY_DEFS.find((d) => d.type === type) ?? {
    type,
    label: type,
    color: '#8a8a8a',
    w: 16,
    h: 16,
  };
}

/* ------------------------------------------------------------------ state */

const state = {
  level: structuredClone(rawLevel) as unknown as LevelJSON,
  layer: 'main' as LayerName,
  tool: 'brush' as ToolName,
  selectedTile: { main: 1, front: 1 } as Record<'main' | 'front', number>,
  entityType: 'EntityFish',
  zoom: 1,
  panX: 0,
  panY: 0,
  showGrid: true,
  paletteZoom: 2,
  drag: null as DragState | null,
};

/* -------------------------------------------------------------------- dom */

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) {
    throw new Error(`Missing element #${id}`);
  }
  return node as T;
}

const viewport = el<HTMLDivElement>('viewport');
const canvas = el<HTMLCanvasElement>('view');
const ctxOrNull = canvas.getContext('2d');
if (!ctxOrNull) {
  throw new Error('2D canvas unavailable');
}
const ctx: CanvasRenderingContext2D = ctxOrNull;

const palette = el<HTMLCanvasElement>('palette');
const pctxOrNull = palette.getContext('2d');
if (!pctxOrNull) {
  throw new Error('2D canvas unavailable');
}
const pctx: CanvasRenderingContext2D = pctxOrNull;

const statusEl = el<HTMLDivElement>('status');
const tileLabel = el<HTMLSpanElement>('tile-label');

/* ----------------------------------------------------------------- images */

const tilesImg = new Image();
tilesImg.src = 'assets/env/tiles.png';
tilesImg.addEventListener('load', () => {
  markDirty();
  renderPalette();
});

const propsImg = new Image();
propsImg.src = 'assets/env/props.png';
propsImg.addEventListener('load', () => {
  markDirty();
  renderPalette();
});

/* ---------------------------------------------------------------- history */

const history: string[] = [];
let historyIndex = -1;

function snapshot(): string {
  return JSON.stringify(state.level);
}

function resetHistory(): void {
  history.length = 0;
  history.push(snapshot());
  historyIndex = 0;
  updateHistoryButtons();
}

function commit(): void {
  history.splice(historyIndex + 1);
  history.push(snapshot());
  if (history.length > 40) {
    history.shift();
  }
  historyIndex = history.length - 1;
  updateHistoryButtons();
}

function undo(): void {
  if (historyIndex <= 0) {
    return;
  }
  historyIndex -= 1;
  state.level = JSON.parse(history[historyIndex] ?? '{}') as LevelJSON;
  afterHistory();
  toast('Undo');
}

function redo(): void {
  if (historyIndex >= history.length - 1) {
    return;
  }
  historyIndex += 1;
  state.level = JSON.parse(history[historyIndex] ?? '{}') as LevelJSON;
  afterHistory();
  toast('Redo');
}

function afterHistory(): void {
  updateHistoryButtons();
  markDirty();
  renderPalette();
}

function updateHistoryButtons(): void {
  el<HTMLButtonElement>('undo').disabled = historyIndex <= 0;
  el<HTMLButtonElement>('redo').disabled = historyIndex >= history.length - 1;
}

/* --------------------------------------------------------------- helpers */

let viewW = 1;
let viewH = 1;

function markDirty(): void {
  dirty = true;
}

let dirty = true;

function currentTileId(): number {
  return state.layer === 'collision' ? 1 : state.selectedTile[state.layer];
}

function paintAt(x: number, y: number): void {
  paintTile(state.level, state.layer, x, y, currentTileId());
}

function eraseAt(x: number, y: number): void {
  eraseTile(state.level, state.layer, x, y);
}

function toast(message: string): void {
  statusEl.textContent = message;
  window.setTimeout(() => {
    if (statusEl.textContent === message) {
      statusEl.textContent = '';
    }
  }, 2600);
}

/* ------------------------------------------------------------- rendering */

function resizeView(): void {
  const dpr = window.devicePixelRatio || 1;
  viewW = Math.max(1, viewport.clientWidth);
  viewH = Math.max(1, viewport.clientHeight);
  canvas.width = Math.floor(viewW * dpr);
  canvas.height = Math.floor(viewH * dpr);
  canvas.style.width = `${viewW}px`;
  canvas.style.height = `${viewH}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  markDirty();
}

function drawLayer(
  data: number[][],
  cols: number,
  image: HTMLImageElement,
  sx0: number,
  sy0: number,
  sx1: number,
  sy1: number,
): void {
  if (!image.complete || image.naturalWidth === 0) {
    return;
  }
  const T = state.level.tilesize;
  const z = state.zoom;
  for (let y = sy0; y < sy1; y++) {
    const row = data[y];
    if (!row) {
      continue;
    }
    for (let x = sx0; x < sx1; x++) {
      const id = row[x] ?? 0;
      if (id <= 0) {
        continue;
      }
      const index = id - 1;
      const srcX = (index % cols) * T;
      const srcY = Math.floor(index / cols) * T;
      ctx.drawImage(
        image,
        srcX,
        srcY,
        T,
        T,
        (x * T - state.panX) * z,
        (y * T - state.panY) * z,
        T * z,
        T * z,
      );
    }
  }
}

function drawCollision(sx0: number, sy0: number, sx1: number, sy1: number): void {
  const T = state.level.tilesize;
  const z = state.zoom;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 80, 80, 0.35)';
  for (let y = sy0; y < sy1; y++) {
    const row = state.level.collision[y];
    if (!row) {
      continue;
    }
    for (let x = sx0; x < sx1; x++) {
      if ((row[x] ?? 0) <= 0) {
        continue;
      }
      ctx.fillRect((x * T - state.panX) * z, (y * T - state.panY) * z, T * z, T * z);
    }
  }
  ctx.restore();
}

function drawEntities(): void {
  const z = state.zoom;
  for (const entity of state.level.entities) {
    const def = entityDef(entity.type);
    const dx = (entity.x - state.panX) * z;
    const dy = (entity.y - state.panY) * z;
    const dw = def.w * z;
    const dh = def.h * z;
    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = def.color;
    ctx.fillRect(dx, dy, dw, dh);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(4, 18, 27, 0.9)';
    ctx.lineWidth = 1;
    ctx.strokeRect(dx + 0.5, dy + 0.5, Math.max(1, dw - 1), Math.max(1, dh - 1));
    if (z >= 0.55 && dw >= 22 && dh >= 14) {
      ctx.fillStyle = '#04121b';
      ctx.font = '10px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.label, dx + dw / 2, dy + dh / 2);
    }
    ctx.restore();
  }
}

function drawGrid(sx0: number, sy0: number, sx1: number, sy1: number): void {
  const T = state.level.tilesize;
  const z = state.zoom;
  ctx.save();
  ctx.strokeStyle = 'rgba(143, 227, 176, 0.14)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const top = Math.max(0, (sy0 * T - state.panY) * z);
  const bottom = Math.min(viewH, (sy1 * T - state.panY) * z);
  const left = Math.max(0, (sx0 * T - state.panX) * z);
  const right = Math.min(viewW, (sx1 * T - state.panX) * z);
  for (let x = sx0; x <= sx1; x++) {
    const dx = Math.round((x * T - state.panX) * z) + 0.5;
    ctx.moveTo(dx, top);
    ctx.lineTo(dx, bottom);
  }
  for (let y = sy0; y <= sy1; y++) {
    const dy = Math.round((y * T - state.panY) * z) + 0.5;
    ctx.moveTo(left, dy);
    ctx.lineTo(right, dy);
  }
  ctx.stroke();
  ctx.restore();
}

function drawPreview(): void {
  const drag = state.drag;
  if (!drag || drag.mode === 'pan' || drag.mode === 'paint' || drag.mode === 'erase') {
    return;
  }
  const T = state.level.tilesize;
  const z = state.zoom;
  const x0 = Math.min(drag.startTileX, drag.lastTileX);
  const x1 = Math.max(drag.startTileX, drag.lastTileX);
  const y0 = Math.min(drag.startTileY, drag.lastTileY);
  const y1 = Math.max(drag.startTileY, drag.lastTileY);
  ctx.save();
  ctx.strokeStyle = '#f2d06b';
  ctx.lineWidth = 2;
  if (drag.mode === 'box') {
    ctx.strokeRect(
      (x0 * T - state.panX) * z + 1,
      (y0 * T - state.panY) * z + 1,
      (x1 - x0 + 1) * T * z - 2,
      (y1 - y0 + 1) * T * z - 2,
    );
  } else {
    forEachLine(drag.startTileX, drag.startTileY, drag.lastTileX, drag.lastTileY, (x, y) => {
      ctx.strokeRect((x * T - state.panX) * z + 1, (y * T - state.panY) * z + 1, T * z - 2, T * z - 2);
    });
  }
  ctx.restore();
}

function drawBorder(): void {
  const T = state.level.tilesize;
  const z = state.zoom;
  ctx.save();
  ctx.strokeStyle = 'rgba(143, 227, 176, 0.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(
    (0 - state.panX) * z + 0.5,
    (0 - state.panY) * z + 0.5,
    state.level.width * T * z,
    state.level.height * T * z,
  );
  ctx.restore();
}

function render(): void {
  const T = state.level.tilesize;
  const z = state.zoom;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#071018';
  ctx.fillRect(0, 0, viewW, viewH);

  const sx0 = Math.max(0, Math.floor(state.panX / T));
  const sy0 = Math.max(0, Math.floor(state.panY / T));
  const sx1 = Math.min(state.level.width, Math.ceil((state.panX + viewW / z) / T));
  const sy1 = Math.min(state.level.height, Math.ceil((state.panY + viewH / z) / T));

  drawLayer(state.level.main, state.level.tilesets.main.cols, tilesImg, sx0, sy0, sx1, sy1);
  drawLayer(state.level.front, state.level.tilesets.front.cols, propsImg, sx0, sy0, sx1, sy1);
  if (state.layer === 'collision') {
    drawCollision(sx0, sy0, sx1, sy1);
  }
  drawEntities();
  if (state.showGrid && z >= 0.35) {
    drawGrid(sx0, sy0, sx1, sy1);
  }
  drawPreview();
  drawBorder();
}

function loop(): void {
  if (dirty) {
    dirty = false;
    render();
  }
  requestAnimationFrame(loop);
}

/* --------------------------------------------------------------- palette */

function paletteImage(): { image: HTMLImageElement; cols: number } {
  if (state.layer === 'front') {
    return { image: propsImg, cols: state.level.tilesets.front.cols };
  }
  return { image: tilesImg, cols: state.level.tilesets.main.cols };
}

function renderPalette(): void {
  if (state.layer === 'collision') {
    return;
  }
  const { image, cols } = paletteImage();
  if (!image.complete || image.naturalWidth === 0) {
    return;
  }
  const T = state.level.tilesize;
  const pz = state.paletteZoom;
  const w = image.naturalWidth * pz;
  const h = image.naturalHeight * pz;
  palette.width = w;
  palette.height = h;
  palette.style.width = `${w}px`;
  palette.style.height = `${h}px`;
  pctx.imageSmoothingEnabled = false;
  pctx.clearRect(0, 0, w, h);
  pctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, 0, 0, w, h);

  const id = state.selectedTile[state.layer];
  if (id > 0) {
    const index = id - 1;
    const cx = (index % cols) * T * pz;
    const cy = Math.floor(index / cols) * T * pz;
    pctx.strokeStyle = '#f2d06b';
    pctx.lineWidth = 2;
    pctx.strokeRect(cx + 1, cy + 1, T * pz - 2, T * pz - 2);
  }
}

palette.addEventListener('click', (event) => {
  if (state.layer === 'collision') {
    return;
  }
  const { image, cols } = paletteImage();
  const T = state.level.tilesize;
  const pz = state.paletteZoom;
  const rect = palette.getBoundingClientRect();
  const px = Math.floor((event.clientX - rect.left) / (T * pz));
  const py = Math.floor((event.clientY - rect.top) / (T * pz));
  const rows = Math.floor(image.naturalHeight / T);
  if (px < 0 || py < 0 || px >= cols || py >= rows) {
    return;
  }
  state.selectedTile[state.layer] = py * cols + px + 1;
  updateTileLabel();
  renderPalette();
  markDirty();
});

function updateTileLabel(): void {
  if (state.layer === 'collision') {
    tileLabel.textContent = '(solid paint)';
    return;
  }
  tileLabel.textContent = `#${state.selectedTile[state.layer]}`;
}

/* ------------------------------------------------------------- ui wiring */

function setTool(tool: ToolName): void {
  state.tool = tool;
  document.querySelectorAll<HTMLButtonElement>('#tool-seg button').forEach((button) => {
    button.classList.toggle('active', button.dataset.tool === tool);
  });
  canvas.style.cursor = tool === 'entity' ? 'copy' : tool === 'eraser' ? 'cell' : 'crosshair';
  markDirty();
}

function updateLayerUI(): void {
  document.querySelectorAll<HTMLButtonElement>('#layer-seg button').forEach((button) => {
    button.classList.toggle('active', button.dataset.layer === state.layer);
  });
  const paletteGroup = el('palette-group');
  if (state.layer === 'collision') {
    paletteGroup.style.display = 'none';
  } else {
    paletteGroup.style.display = '';
    renderPalette();
  }
  updateTileLabel();
}

function buildEntityList(): void {
  const list = el('entity-list');
  list.innerHTML = '';
  for (const def of ENTITY_DEFS) {
    const button = document.createElement('button');
    button.className = 'entity-btn';
    button.dataset.type = def.type;
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = def.color;
    const label = document.createElement('span');
    label.textContent = def.label;
    button.append(swatch, label);
    button.addEventListener('click', () => {
      state.entityType = def.type;
      updateEntityUI();
    });
    list.appendChild(button);
  }
  updateEntityUI();
}

function updateEntityUI(): void {
  document.querySelectorAll<HTMLButtonElement>('.entity-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.type === state.entityType);
  });
}

function updateGridButton(): void {
  el('grid').classList.toggle('active', state.showGrid);
}

/* -------------------------------------------------------------- geometry */

function pointerInfo(event: PointerEvent): { tx: number; ty: number; wx: number; wy: number } {
  const rect = canvas.getBoundingClientRect();
  const sx = event.clientX - rect.left;
  const sy = event.clientY - rect.top;
  const wx = sx / state.zoom + state.panX;
  const wy = sy / state.zoom + state.panY;
  return {
    tx: Math.floor(wx / state.level.tilesize),
    ty: Math.floor(wy / state.level.tilesize),
    wx,
    wy,
  };
}

function fitView(): void {
  const T = state.level.tilesize;
  const w = state.level.width * T;
  const h = state.level.height * T;
  const zoom = Math.min(viewW / w, viewH / h) * 0.95;
  state.zoom = Math.max(0.2, Math.min(4, zoom));
  state.panX = Math.max(0, (w - viewW / state.zoom) / 2);
  state.panY = Math.max(0, (h - viewH / state.zoom) / 2);
  markDirty();
}

/* ----------------------------------------------------------- entity edits */

function placeSelectedEntity(info: { wx: number; wy: number }): void {
  const def = entityDef(state.entityType);
  placeEntity(state.level, state.entityType, info.wx, info.wy, def, true);
  commit();
  markDirty();
  toast(`Placed ${def.label}`);
}

function removeEntityAt(wx: number, wy: number): void {
  const removed = deleteEntityAt(state.level, wx, wy, entityDef);
  if (removed) {
    commit();
    markDirty();
    toast(`Deleted ${entityDef(removed).label}`);
  } else {
    toast('No entity there');
  }
}

/* --------------------------------------------------------------- pointer */

let spaceHeld = false;

canvas.addEventListener('pointerdown', (event) => {
  // Pointer capture is a nicety (keeps drags alive outside the canvas) but it
  // throws if the pointer id is not currently active, so never let it break
  // the handler.
  try {
    canvas.setPointerCapture(event.pointerId);
  } catch {
    /* ignore — the drag still works without capture */
  }
  const info = pointerInfo(event);

  if (event.button === 1 || spaceHeld) {
    event.preventDefault();
    state.drag = {
      mode: 'pan',
      startTileX: info.tx,
      startTileY: info.ty,
      lastTileX: info.tx,
      lastTileY: info.ty,
      screenX: event.clientX,
      screenY: event.clientY,
      panStartX: state.panX,
      panStartY: state.panY,
    };
    canvas.style.cursor = 'grabbing';
    return;
  }

  if (event.button === 2) {
    removeEntityAt(info.wx, info.wy);
    return;
  }

  if (event.button !== 0) {
    return;
  }

  if (state.tool === 'entity') {
    placeSelectedEntity(info);
    return;
  }

  if (state.tool === 'line' || state.tool === 'box') {
    state.drag = {
      mode: state.tool,
      startTileX: info.tx,
      startTileY: info.ty,
      lastTileX: info.tx,
      lastTileY: info.ty,
      screenX: event.clientX,
      screenY: event.clientY,
      panStartX: state.panX,
      panStartY: state.panY,
    };
    markDirty();
    return;
  }

  const erasing = state.tool === 'eraser';
  state.drag = {
    mode: erasing ? 'erase' : 'paint',
    startTileX: info.tx,
    startTileY: info.ty,
    lastTileX: info.tx,
    lastTileY: info.ty,
    screenX: event.clientX,
    screenY: event.clientY,
    panStartX: state.panX,
    panStartY: state.panY,
  };
  if (erasing) {
    eraseAt(info.tx, info.ty);
  } else {
    paintAt(info.tx, info.ty);
  }
  markDirty();
});

canvas.addEventListener('pointermove', (event) => {
  const drag = state.drag;
  if (!drag) {
    return;
  }

  if (drag.mode === 'pan') {
    const dx = event.clientX - drag.screenX;
    const dy = event.clientY - drag.screenY;
    state.panX = drag.panStartX - dx / state.zoom;
    state.panY = drag.panStartY - dy / state.zoom;
    markDirty();
    return;
  }

  const info = pointerInfo(event);

  if (drag.mode === 'line' || drag.mode === 'box') {
    drag.lastTileX = info.tx;
    drag.lastTileY = info.ty;
    markDirty();
    return;
  }

  // paint / erase: fill the gap between the previous and current tile.
  forEachLine(drag.lastTileX, drag.lastTileY, info.tx, info.ty, (x, y) => {
    if (drag.mode === 'erase') {
      eraseAt(x, y);
    } else {
      paintAt(x, y);
    }
  });
  drag.lastTileX = info.tx;
  drag.lastTileY = info.ty;
  markDirty();
});

function endDrag(event: PointerEvent): void {
  const drag = state.drag;
  if (!drag) {
    return;
  }
  canvas.style.cursor = state.tool === 'entity' ? 'copy' : state.tool === 'eraser' ? 'cell' : 'crosshair';

  if (drag.mode === 'pan') {
    state.drag = null;
    return;
  }

  const info = pointerInfo(event);

  if (drag.mode === 'line') {
    paintLine(state.level, state.layer, drag.startTileX, drag.startTileY, info.tx, info.ty, currentTileId());
    commit();
  } else if (drag.mode === 'box') {
    paintBox(state.level, state.layer, drag.startTileX, drag.startTileY, info.tx, info.ty, currentTileId());
    commit();
  } else {
    commit();
  }

  state.drag = null;
  markDirty();
}

canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', () => {
  state.drag = null;
  markDirty();
});
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

canvas.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = event.clientX - rect.left;
    const sy = event.clientY - rect.top;
    const wx = sx / state.zoom + state.panX;
    const wy = sy / state.zoom + state.panY;
    const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15;
    const nextZoom = Math.max(0.2, Math.min(4, state.zoom * factor));
    state.zoom = nextZoom;
    state.panX = wx - sx / nextZoom;
    state.panY = wy - sy / nextZoom;
    markDirty();
  },
  { passive: false },
);

/* ---------------------------------------------------------------- actions */

async function saveToProject(): Promise<void> {
  try {
    const response = await fetch('/__editor/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.level),
    });
    const text = await response.text();
    if (!response.ok || text !== 'saved') {
      throw new Error(text || `HTTP ${response.status}`);
    }
    toast('Saved to src/game/levels/level1.json');
  } catch {
    toast('Dev save unavailable — downloading instead');
    downloadJSON();
  }
}

function downloadJSON(): void {
  const blob = new Blob([JSON.stringify(state.level)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'level1.json';
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Downloaded level1.json');
}

function isValidLevel(value: Partial<LevelJSON>): boolean {
  return (
    typeof value.tilesize === 'number' &&
    typeof value.width === 'number' &&
    typeof value.height === 'number' &&
    !!value.tilesets?.main &&
    !!value.tilesets?.front &&
    Array.isArray(value.collision) &&
    Array.isArray(value.main) &&
    Array.isArray(value.front) &&
    Array.isArray(value.entities)
  );
}

function newLevel(): void {
  const width = Number(window.prompt('Width in tiles', String(state.level.width)) ?? state.level.width);
  const height = Number(window.prompt('Height in tiles', String(state.level.height)) ?? state.level.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 4 || height < 4) {
    toast('Cancelled');
    return;
  }
  const T = state.level.tilesize;
  const empty = (): number[][] => Array.from({ length: height }, () => new Array<number>(width).fill(0));
  state.level = {
    tilesize: T,
    width,
    height,
    tilesets: {
      main: { cols: state.level.tilesets.main.cols },
      front: { cols: state.level.tilesets.front.cols },
    },
    collision: empty(),
    main: empty(),
    front: empty(),
    entities: [{ type: 'EntityPlayer', x: Math.floor(width / 2) * T, y: Math.floor(height / 2) * T }],
  };
  state.selectedTile.main = 1;
  state.selectedTile.front = 1;
  fitView();
  resetHistory();
  renderPalette();
  markDirty();
  toast(`New ${width}×${height} level`);
}

/* ------------------------------------------------------------- ui events */

document.querySelectorAll<HTMLButtonElement>('#layer-seg button').forEach((button) => {
  button.addEventListener('click', () => {
    state.layer = (button.dataset.layer as LayerName) ?? 'main';
    updateLayerUI();
    markDirty();
  });
});

document.querySelectorAll<HTMLButtonElement>('#tool-seg button').forEach((button) => {
  button.addEventListener('click', () => {
    setTool((button.dataset.tool as ToolName) ?? 'brush');
  });
});

document.querySelectorAll<HTMLButtonElement>('#palette-zoom button').forEach((button) => {
  button.addEventListener('click', () => {
    state.paletteZoom = Number(button.dataset.pz ?? '2');
    document.querySelectorAll<HTMLButtonElement>('#palette-zoom button').forEach((other) => {
      other.classList.toggle('active', other === button);
    });
    renderPalette();
  });
});

el('undo').addEventListener('click', undo);
el('redo').addEventListener('click', redo);
el('fit').addEventListener('click', () => {
  fitView();
  toast('Fit to view');
});
el('grid').addEventListener('click', () => {
  state.showGrid = !state.showGrid;
  updateGridButton();
  markDirty();
});

el('save').addEventListener('click', () => {
  void saveToProject();
});
el('download').addEventListener('click', downloadJSON);
el('new').addEventListener('click', newLevel);

el<HTMLInputElement>('load').addEventListener('change', async (event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }
  try {
    const text = await file.text();
    const parsed = JSON.parse(text) as Partial<LevelJSON>;
    if (!isValidLevel(parsed)) {
      throw new Error('not a level file');
    }
    state.level = parsed as LevelJSON;
    state.selectedTile.main = 1;
    state.selectedTile.front = 1;
    fitView();
    resetHistory();
    renderPalette();
    markDirty();
    toast('Loaded level');
  } catch (error) {
    toast(`Load failed: ${String(error)}`);
  }
  input.value = '';
});

window.addEventListener('keydown', (event) => {
  const target = event.target as HTMLElement | null;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
    return;
  }
  if (event.code === 'Space') {
    spaceHeld = true;
    event.preventDefault();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    if (event.shiftKey) {
      redo();
    } else {
      undo();
    }
    return;
  }
  switch (event.key.toLowerCase()) {
    case 'b':
      setTool('brush');
      break;
    case 'l':
      setTool('line');
      break;
    case 'r':
      setTool('box');
      break;
    case 'e':
      setTool('eraser');
      break;
    case 't':
      setTool('entity');
      break;
    case 'g':
      state.showGrid = !state.showGrid;
      updateGridButton();
      markDirty();
      break;
    default:
      break;
  }
});

window.addEventListener('keyup', (event) => {
  if (event.code === 'Space') {
    spaceHeld = false;
  }
});

window.addEventListener('resize', resizeView);
if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(resizeView).observe(viewport);
}

/* --------------------------------------------------------------- startup */

buildEntityList();
updateLayerUI();
resizeView();
fitView();
resetHistory();
markDirty();
requestAnimationFrame(loop);

toast('Ready — wheel to zoom, Space+drag to pan');

// Debug handle for automated checks and live console tweaking.
(window as unknown as { __editor?: typeof state }).__editor = state;
