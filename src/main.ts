import { Color, DisplayMode, Engine } from 'excalibur';
import { FIXED_UPDATE_FPS, VIEW } from './game/config';
import { StarterScene } from './game/scenes/StarterScene';
import './style.css';

const game = new Engine({
  width: VIEW.width,
  height: VIEW.height,
  canvasElementId: 'game',
  displayMode: DisplayMode.FitContainer,
  backgroundColor: Color.fromHex('#0b1117'),
  suppressPlayButton: true,
  fixedUpdateFps: FIXED_UPDATE_FPS,
  antialiasing: true,
});

game.addScene('starter', new StarterScene());

game
  .start()
  .then(() => game.goToScene('starter'))
  .catch((error: unknown) => {
    console.error('Failed to start Game D', error);
  });
