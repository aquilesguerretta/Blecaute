import './style.css';
import Phaser from 'phaser';
import { GAME } from './config';
import { Boot } from './scenes/Boot';
import { World } from './scenes/World';

new Phaser.Game({
  // CANVAS: rende igual em qualquer WebView/celular e no headless dos testes;
  // a cena (formas 2D simples) não precisa de WebGL.
  type: Phaser.CANVAS,
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
  scene: [Boot, World],
});
