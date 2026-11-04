import { Color, DisplayMode, Engine } from 'excalibur';
import { createLoader } from './game/assets';
import { FIXED_UPDATE_FPS, VIEW } from './game/config';
import { GameScene } from './game/scenes/GameScene';
import { InstructionsScene } from './game/scenes/InstructionsScene';
import { TitleScene } from './game/scenes/TitleScene';
import './style.css';

const game = new Engine({
  width: VIEW.width,
  height: VIEW.height,
  canvasElementId: 'game',
  displayMode: DisplayMode.FitContainer,
  backgroundColor: Color.fromHex('#050a0e'),
  suppressPlayButton: true,
  fixedUpdateFps: FIXED_UPDATE_FPS,
  antialiasing: false,
});

game.addScene('title', new TitleScene());
game.addScene('instructions', new InstructionsScene());
game.addScene('game', new GameScene());

// Handy runtime handle for tuning and debugging from the console.
(window as unknown as { __diving?: Engine }).__diving = game;

// Stop the page from scrolling while playing.
const prevent = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter']);
window.addEventListener(
  'keydown',
  (event) => {
    if (prevent.has(event.code) || prevent.has(event.key)) {
      event.preventDefault();
    }
  },
  { passive: false },
);

game
  .start(createLoader())
  .then(() => {
    document.getElementById('loading')?.classList.add('hidden');
    return game.goToScene('title');
  })
  .catch((error: unknown) => {
    console.error('Failed to start Underwater Diving', error);
  });
