import './style.css';
import Phaser from 'phaser';
import { GAME } from './config';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: GAME.bg,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME.width,
    height: GAME.height,
  },
  physics: {
    default: 'arcade',
  },
  input: {
    activePointers: 3,
  },
  disableContextMenu: true,
  render: {
    roundPixels: true,
    antialias: true,
  },
  scene: [],
});
