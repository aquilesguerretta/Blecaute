import './style.css';
import Phaser from 'phaser';
import { GAME, dpr } from './config';
import { Boot } from './scenes/Boot';
import { TitleScreen } from './scenes/TitleScreen';
import { CaseMap } from './scenes/CaseMap';
import { World } from './scenes/World';

const game = new Phaser.Game({
  // CANVAS: rende igual em qualquer WebView/celular e no headless dos testes.
  type: Phaser.CANVAS,
  parent: 'app',
  backgroundColor: GAME.bg,
  scale: {
    // Alta-DPI: o jogo renderiza no tamanho FÍSICO (janela × dpr) e o CSS
    // reduz de volta -> nítido em telas retina. fit() abaixo controla tudo.
    mode: Phaser.Scale.NONE,
    width: Math.floor(window.innerWidth * dpr()),
    height: Math.floor(window.innerHeight * dpr()),
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

/** canvas físico = janela × dpr; CSS = janela. Reaplica no resize/rotação. */
function fit(): void {
  const d = dpr();
  const w = window.innerWidth;
  const h = window.innerHeight;
  game.scale.resize(Math.floor(w * d), Math.floor(h * d));
  const c = game.canvas;
  if (c) {
    c.style.width = `${w}px`;
    c.style.height = `${h}px`;
  }
}

window.addEventListener('resize', fit);
window.addEventListener('orientationchange', fit);
fit();
