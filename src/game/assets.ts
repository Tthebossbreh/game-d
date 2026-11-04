import { Animation, AnimationStrategy, ImageSource, Loader, Sound, SpriteSheet } from 'excalibur';
import { COMBO } from './config';

const A = 'assets';

export const PATHS = {
  player: {
    idle: `${A}/player/player-idle.png`,
    swim: `${A}/player/player-swiming.png`,
    fast: `${A}/player/player-fast.png`,
    rush: `${A}/player/player-rush.png`,
    hurt: `${A}/player/player-hurt.png`,
  },
  enemies: {
    fish: `${A}/enemies/fish.png`,
    'fish-big': `${A}/enemies/fish-big.png`,
    'fish-dart': `${A}/enemies/fish-dart.png`,
    mine: `${A}/enemies/mine.png`,
    'mine-small': `${A}/enemies/mine-small.png`,
    'mine-big': `${A}/enemies/mine-big.png`,
  },
  fx: {
    explosion: `${A}/fx/explosion.png`,
    'explosion-small': `${A}/fx/explosion-small.png`,
    'explosion-big': `${A}/fx/explosion-big.png`,
    'enemy-death': `${A}/fx/enemy-death.png`,
    bubbles: `${A}/fx/bubbles.png`,
  },
  env: {
    tiles: `${A}/env/tiles.png`,
    props: `${A}/env/props.png`,
    background: `${A}/env/background.png`,
    midground: `${A}/env/midground.png`,
  },
  ui: {
    startBg: `${A}/ui/start-screen-bg.png`,
    startFg: `${A}/ui/start-screen-fg.png`,
    gradient: `${A}/ui/start-screen-gradient.png`,
    instructions: `${A}/ui/instructions.png`,
    font: `${A}/ui/04b03.font.png`,
  },
  audio: {
    theme: `${A}/audio/underwater-theme.mp3`,
    watery: `${A}/audio/watery_cave.mp3`,
    loop: `${A}/audio/watery_cave_loop.ogg`,
    bubble1: `${A}/audio/bubbles-single1.wav`,
    bubble2: `${A}/audio/bubbles-single2.wav`,
    bubble3: `${A}/audio/bubbles-single3.wav`,
    bubbleLoop1: `${A}/audio/bubbles-loop1-amp.wav`,
    bubbleLoop2: `${A}/audio/bubbles-loop2-amp.wav`,
    pickup: `${A}/audio/item_get2.flac`,
  },
} as const;

export const img = {
  player: {
    idle: new ImageSource(PATHS.player.idle),
    swim: new ImageSource(PATHS.player.swim),
    fast: new ImageSource(PATHS.player.fast),
    rush: new ImageSource(PATHS.player.rush),
    hurt: new ImageSource(PATHS.player.hurt),
  },
  enemies: {
    fish: new ImageSource(PATHS.enemies.fish),
    'fish-big': new ImageSource(PATHS.enemies['fish-big']),
    'fish-dart': new ImageSource(PATHS.enemies['fish-dart']),
    mine: new ImageSource(PATHS.enemies.mine),
    'mine-small': new ImageSource(PATHS.enemies['mine-small']),
    'mine-big': new ImageSource(PATHS.enemies['mine-big']),
  },
  fx: {
    explosion: new ImageSource(PATHS.fx.explosion),
    'explosion-small': new ImageSource(PATHS.fx['explosion-small']),
    'explosion-big': new ImageSource(PATHS.fx['explosion-big']),
    'enemy-death': new ImageSource(PATHS.fx['enemy-death']),
    bubbles: new ImageSource(PATHS.fx.bubbles),
  },
  env: {
    tiles: new ImageSource(PATHS.env.tiles),
    props: new ImageSource(PATHS.env.props),
    background: new ImageSource(PATHS.env.background),
    midground: new ImageSource(PATHS.env.midground),
  },
  ui: {
    startBg: new ImageSource(PATHS.ui.startBg),
    startFg: new ImageSource(PATHS.ui.startFg),
    gradient: new ImageSource(PATHS.ui.gradient),
    instructions: new ImageSource(PATHS.ui.instructions),
    font: new ImageSource(PATHS.ui.font),
  },
} as const;

export const sfx = {
  theme: new Sound(PATHS.audio.theme),
  watery: new Sound(PATHS.audio.watery),
  loop: new Sound(PATHS.audio.loop),
  bubble1: new Sound(PATHS.audio.bubble1),
  bubble2: new Sound(PATHS.audio.bubble2),
  bubble3: new Sound(PATHS.audio.bubble3),
  bubbleLoop1: new Sound(PATHS.audio.bubbleLoop1),
  bubbleLoop2: new Sound(PATHS.audio.bubbleLoop2),
  pickup: new Sound(PATHS.audio.pickup),
} as const;

function flatten(value: unknown, out: Loadable[] = []): Loadable[] {
  if (value instanceof ImageSource || value instanceof Sound) {
    out.push(value);
  } else if (value && typeof value === 'object') {
    for (const child of Object.values(value as Record<string, unknown>)) {
      flatten(child, out);
    }
  }
  return out;
}

type Loadable = ImageSource | Sound;

/** Every runtime asset, flattened for the Excalibur loader. */
export const ALL_RESOURCES: Loadable[] = [...flatten(img), ...flatten(sfx)];

export function createLoader(): Loader {
  return new Loader(ALL_RESOURCES);
}

export const pixelArtFilter = { filtering: 'pixel' } as const;

export function sheetFrom(img: ImageSource, frameWidth: number, frameHeight: number): SpriteSheet {
  const columns = Math.max(1, Math.floor(img.width / frameWidth));
  const rows = Math.max(1, Math.floor(img.height / frameHeight));
  return SpriteSheet.fromImageSource({
    image: img,
    grid: { rows, columns, spriteWidth: frameWidth, spriteHeight: frameHeight },
  });
}

export function animationFromFrameCount(
  sheet: SpriteSheet,
  frameCount: number,
  frameDuration: number = COMBO.frameDuration,
  strategy: AnimationStrategy = AnimationStrategy.Loop,
): Animation {
  const coords = Array.from({ length: frameCount }, (_, i) => ({
    x: i % sheet.columns,
    y: Math.floor(i / sheet.columns),
  }));
  return Animation.fromSpriteSheetCoordinates({
    spriteSheet: sheet,
    frameCoordinates: coords,
    durationPerFrame: frameDuration,
    strategy,
  });
}

/** Frame width/height for each enemy sheet, matching the original Impact.js data. */
export const ENEMY_FRAME = {
  fish: { w: 32, h: 32, frames: 4 },
  'fish-big': { w: 54, h: 49, frames: 4 },
  'fish-dart': { w: 39, h: 20, frames: 4 },
  mine: { w: 45, h: 45, frames: 1 },
  'mine-small': { w: 31, h: 31, frames: 1 },
  'mine-big': { w: 69, h: 69, frames: 1 },
} as const;

export const FX_FRAME = {
  explosion: { w: 60, h: 82, frames: 11 },
  'explosion-small': { w: 44, h: 53, frames: 11 },
  'explosion-big': { w: 78, h: 87, frames: 11 },
  'enemy-death': { w: 52, h: 53, frames: 6 },
  bubbles: { w: 23, h: 40, frames: 4 },
} as const;

export const PLAYER_FRAME = 80;
