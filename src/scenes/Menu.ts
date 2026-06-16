import Phaser from 'phaser';
import { PIN_COLORS, STRINGS, VIEW, isDesktopPointer } from '../config';
import { centerDesign } from '../systems/Layout';

const TITLE_FONT = '"Bangers", Impact, system-ui, sans-serif';

/** Tela de início: arte-chave (keyart_title) + logo + botão Jogar. */
export class Menu extends Phaser.Scene {
  private started = false;

  constructor() {
    super('Menu');
  }

  create(): void {
    const W = VIEW.designWidth;
    const H = VIEW.designHeight;

    this.cameras.main.setBackgroundColor('#05060a');
    this.cameras.main.fadeIn(300, 5, 6, 10);

    const root = this.add.container(0, 0);
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      root.add(o);
      return o;
    };

    // fundo: arte-chave cobrindo a coluna 390x844
    if (this.textures.exists('keyart_title')) {
      const art = add(this.add.image(W / 2, H / 2, 'keyart_title'));
      const cover = Math.max(W / art.width, H / art.height);
      art.setScale(cover);
    } else {
      add(this.add.rectangle(W / 2, H / 2, W, H, 0x0c1320));
    }
    // scrim p/ legibilidade (topo e base mais escuros)
    add(this.add.rectangle(W / 2, H / 2, W, H, 0x05060a, 0.32));
    add(this.add.rectangle(W / 2, H - 130, W, 260, 0x05060a, 0.55));
    add(this.add.rectangle(W / 2, 90, W, 180, 0x05060a, 0.45));

    // logo / título
    if (this.textures.exists('logo_blecaute')) {
      const logo = add(this.add.image(W / 2, 104, 'logo_blecaute'));
      logo.setScale(Math.min(1, (W - 40) / logo.width));
    } else {
      add(
        this.add
          .text(W / 2, 104, 'BLECAUTE', {
            fontFamily: TITLE_FONT,
            fontSize: '60px',
            color: '#ffd23f',
            stroke: '#0d0a02',
            strokeThickness: 8,
          })
          .setOrigin(0.5),
      );
    }
    add(
      this.add
        .text(W / 2, 168, STRINGS.subtitle, {
          fontFamily: "system-ui, 'Segoe UI', sans-serif",
          fontSize: '16px',
          fontStyle: 'italic',
          color: '#e6e0d2',
        })
        .setOrigin(0.5),
    );

    // botão Jogar
    const by = 686;
    const btn = add(
      this.add.rectangle(W / 2, by, 232, 64, PIN_COLORS.available).setStrokeStyle(3, 0x0d0a02, 1),
    );
    add(
      this.add
        .text(W / 2, by, STRINGS.play, {
          fontFamily: TITLE_FONT,
          fontSize: '34px',
          color: '#171204',
        })
        .setOrigin(0.5),
    );
    btn.setInteractive({ useHandCursor: true });
    btn.on(Phaser.Input.Events.POINTER_DOWN, () => this.start());
    const bx = W / 2;
    const playHook = () => {
      (window as unknown as Record<string, unknown>).__blecauteMenu = {
        ready: true,
        play: { x: root.x + bx * root.scaleX, y: root.y + by * root.scaleY },
      };
    };
    this.tweens.add({
      targets: btn,
      scale: { from: 1, to: 1.05 },
      duration: 780,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    // dica de controles conforme o dispositivo
    add(
      this.add
        .text(W / 2, 770, isDesktopPointer() ? STRINGS.controlsDesktop : STRINGS.controlsTouch, {
          fontFamily: "system-ui, 'Segoe UI', sans-serif",
          fontSize: '14px',
          color: '#c9c3b4',
          align: 'center',
          wordWrap: { width: W - 60 },
        })
        .setOrigin(0.5),
    );

    centerDesign(this, root, playHook);

    // teclado: Enter/Espaço inicia (desktop)
    const kb = this.input.keyboard;
    if (kb) {
      kb.once('keydown-ENTER', () => this.start());
      kb.once('keydown-SPACE', () => this.start());
    }
  }

  private start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.cameras.main.fadeOut(260, 5, 6, 10);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
      this.scene.start('CaseMap'),
    );
  }
}
