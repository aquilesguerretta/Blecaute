import './style.css';
import Phaser from 'phaser';
import { GAME } from './config';
import { Boot } from './scenes/Boot';
import { TitleScreen } from './scenes/TitleScreen';
import { CaseMap } from './scenes/CaseMap';
import { World } from './scenes/World';

new Phaser.Game({
  // CANVAS: rende igual em qualquer WebView/celular e no headless dos testes;
  // a cena (formas 2D simples) não precisa de WebGL.
  type: Phaser.CANVAS,
  parent: 'app',
  backgroundColor: GAME.bg,
  scale: {
    // RESIZE: canvas = #app (janela inteira). Sem letterbox no desktop;
    // cada cena se centraliza/escala e o World deriva o zoom do viewport.
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.NO_CENTER,
    width: window.innerWidth,
    height: window.innerHeight,
    min: { width: 320, height: 480 },
    max: { width: 2560, height: 1440 },
    expandParent: true,
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
  scene: [Boot, TitleScreen, CaseMap, World],
});
