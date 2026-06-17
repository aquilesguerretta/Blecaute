import Phaser from 'phaser';
import { STRINGS, dpr } from '../config';
import { audio } from '../systems/AudioManager';
import { loadSave } from '../systems/SaveState';

const TITLE_FONT = '"Bangers", Impact, system-ui, sans-serif';
const VIDEO_KEYS = ['title_loop', 'login_loop']; // preferência

// Posição do "banner press-start" dentro do FRAME do vídeo (fração 0..1).
// O JOGAR é escrito aqui no último frame. Ajustável por screenshot.
const PLAQUE_X = 0.5;
const PLAQUE_Y = 0.6;

/**
 * Abertura cinematográfica: o vídeo (login_loop) roda UMA vez, inteiro, sem
 * cortar/esticar (contain) e em qualidade nativa. Ao terminar (ou ao tocar
 * para pular), o último frame fica congelado e o "JOGAR" é escrito sobre o
 * banner; tocar no JOGAR vai para o mapa. Sem codec/sem vídeo: cai num fundo
 * estático (keyart) com logo + JOGAR.
 */
export class TitleScreen extends Phaser.Scene {
  private started = false;
  private ended = false;
  private alive = true;
  private videoMode = false;
  private base!: Phaser.GameObjects.Rectangle;
  private bg!: Phaser.GameObjects.Image;
  private video: Phaser.GameObjects.Video | null = null;
  private logo!: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
  private subtitle!: Phaser.GameObjects.Text;
  private jogar!: Phaser.GameObjects.Text;
  private fallbackEls: Array<Phaser.GameObjects.Image | Phaser.GameObjects.Text> = [];
  private d = dpr(); // canvas é físico; textos/sprites de tela escalam junto

  constructor() {
    super('TitleScreen');
  }

  create(): void {
    const { width: W, height: H } = this.scale.gameSize;
    this.cameras.main.setBackgroundColor('#0a0614');
    this.cameras.main.fadeIn(450, 6, 4, 16);
    this.makeSpark();

    // base escura (preenche letterbox do vídeo / fundo do fallback)
    this.base = this.add.rectangle(W / 2, H / 2, W, H, 0x0a0614).setDepth(-1);

    // fundo estático (keyart) — visível até o vídeo aparecer; é o fallback
    const bgKey = this.textures.exists('bg_title')
      ? 'bg_title'
      : this.textures.exists('keyart_title')
        ? 'keyart_title'
        : this.makeGradient();
    this.bg = this.add.image(W / 2, H / 2, bgKey).setDepth(0);
    this.fallbackEls.push(this.bg);

    // logo + subtítulo (só no fallback; o vídeo já traz o logo dele)
    if (this.textures.exists('logo_blecaute')) {
      this.logo = this.add.image(W / 2, 0, 'logo_blecaute').setScale(this.d).setDepth(10);
    } else {
      this.logo = this.add
        .text(W / 2, 0, 'BLECAUTE', {
          fontFamily: TITLE_FONT,
          fontSize: `${64 * this.d}px`,
          color: '#ffd23f',
          stroke: '#0d0a02',
          strokeThickness: 8 * this.d,
        })
        .setOrigin(0.5)
        .setDepth(10);
    }
    this.subtitle = this.add
      .text(W / 2, 0, STRINGS.subtitle, {
        fontFamily: "system-ui, 'Segoe UI', sans-serif",
        fontSize: `${16 * this.d}px`,
        fontStyle: 'italic',
        color: '#e6e0d2',
      })
      .setOrigin(0.5)
      .setDepth(11);
    this.fallbackEls.push(this.logo, this.subtitle);

    // botão JOGAR (escondido até o fim do vídeo / fallback)
    const hasProgress = this.savedProgress();
    this.jogar = this.add
      .text(W / 2, H * PLAQUE_Y, hasProgress ? STRINGS.titleResume : STRINGS.titlePlay, {
        fontFamily: TITLE_FONT,
        fontSize: `${40 * this.d}px`,
        color: '#fac775',
        stroke: '#0d0a02',
        strokeThickness: 6 * this.d,
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setVisible(false);

    this.tryVideo();

    // entradas: durante o vídeo -> pula; com o JOGAR -> inicia
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onInput, this);
    this.input.keyboard?.on('keydown', this.onInput, this);
    this.jogar.setInteractive({ useHandCursor: true });
    this.jogar.on(Phaser.Input.Events.POINTER_DOWN, () => this.start());

    this.layout();
    const onResize = (): void => this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);

    audio()?.play('bgm_menu', { loop: true, volume: 0.55 });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.alive = false;
      this.scale.off(Phaser.Scale.Events.RESIZE, onResize);
      delete (window as unknown as Record<string, unknown>).__blecauteTitle;
    });

    this.publish();
  }

  private onInput(): void {
    if (this.ended) {
      this.start();
    } else {
      this.skip();
    }
  }

  /** Vídeo de fundo (contain, uma vez); só aparece quando decodifica frames. */
  private tryVideo(): void {
    const key = VIDEO_KEYS.find((k) => this.cache.video?.exists(k));
    if (!key) {
      this.enterFallback();
      return;
    }
    try {
      const vid = this.add.video(0, 0, key).setDepth(1).setAlpha(0);
      vid.setMute(true);
      vid.setLoop(false); // toca uma vez, inteiro
      vid.play(false);
      this.video = vid;
      vid.on(Phaser.GameObjects.Events.VIDEO_COMPLETE, () => this.showJogar());
      // dimensões nativas só existem após o metadata -> redimensiona aí
      vid.on('metadata', () => {
        if (this.alive) {
          this.layout();
        }
      });

      let revealed = false;
      const reveal = (): void => {
        if (revealed || !this.alive || !this.video || !this.video.active) {
          return;
        }
        revealed = true;
        this.videoMode = true;
        this.video.setAlpha(1);
        for (const el of this.fallbackEls) {
          el.setVisible(false);
        }
        this.layout();
      };
      const el = vid.video as HTMLVideoElement | undefined;
      el?.addEventListener('timeupdate', reveal, { once: true });

      // nunca decodificou em 2.5s -> fallback estático
      this.time.delayedCall(2500, () => {
        if (!revealed && this.video) {
          this.video.destroy();
          this.video = null;
          this.enterFallback();
        }
      });
    } catch {
      this.video = null;
      this.enterFallback();
    }
  }

  /** Sem vídeo: fundo estático + logo + fagulhas + JOGAR já disponível. */
  private enterFallback(): void {
    if (this.videoMode) {
      return;
    }
    for (let i = 0; i < 12; i++) {
      this.spawnSpark(i * 280);
    }
    this.showJogar();
  }

  /** Pula o restante do vídeo, congela o último frame e revela o JOGAR. */
  private skip(): void {
    if (this.ended) {
      return;
    }
    const el = this.video?.video as HTMLVideoElement | undefined;
    if (el && Number.isFinite(el.duration) && el.duration > 0) {
      el.currentTime = Math.max(0, el.duration - 0.04); // último frame (banner)
    }
    this.showJogar();
  }

  private showJogar(): void {
    if (this.ended || !this.alive) {
      return;
    }
    this.ended = true;
    this.layout();
    this.jogar.setVisible(true).setAlpha(0).setScale(0.8);
    this.tweens.add({ targets: this.jogar, alpha: 1, scale: 1, duration: 360, ease: 'Back.Out' });
    this.tweens.add({
      targets: this.jogar,
      alpha: { from: 1, to: 0.45 },
      duration: 760,
      yoyo: true,
      repeat: -1,
      delay: 360,
      ease: 'Sine.InOut',
    });
    this.publish();
  }

  private layout(): void {
    const { width: W, height: H } = this.scale.gameSize;
    this.base.setPosition(W / 2, H / 2).setSize(W, H);

    // fundo estático em cover
    const cover = (img: Phaser.GameObjects.Image): void => {
      const s = Math.max(W / (img.width || 1), H / (img.height || 1));
      img.setPosition(W / 2, H / 2).setDisplaySize(img.width * s, img.height * s);
    };
    cover(this.bg);

    // logo/subtítulo (fallback) — offsets em px físicos (× dpr)
    this.logo.setPosition(W / 2, Math.max(100 * this.d, H * 0.16));
    const logoH = (this.textures.exists('logo_blecaute') ? 104 : 64) * this.d;
    this.subtitle.setPosition(W / 2, this.logo.y + logoH / 2 + 20 * this.d);

    // vídeo em CONTAIN (frame INTEIRO, sem cortar o logo nem esticar;
    // letterbox escuro). A nitidez vem do render em alta-DPI (ver main.ts).
    let jx = W / 2;
    let jy = H * PLAQUE_Y;
    if (this.video) {
      const vw = this.video.width || 1;
      const vh = this.video.height || 1;
      const s = Math.min(W / vw, H / vh);
      const dispW = vw * s;
      const dispH = vh * s;
      this.video.setPosition(W / 2, H / 2).setDisplaySize(dispW, dispH);
      jx = (W - dispW) / 2 + dispW * PLAQUE_X; // = W/2 (banner centralizado)
      jy = (H - dispH) / 2 + dispH * PLAQUE_Y;
    } else if (!this.videoMode) {
      jy = H * 0.62; // JOGAR centralizado no fallback
    }
    this.jogar.setPosition(jx, jy);
  }

  private savedProgress(): boolean {
    try {
      const s = loadSave();
      const cur = s.currentCase;
      const p = cur ? s.cases[cur] : undefined;
      return !!(p && !p.solved && p.clues.length > 0);
    } catch {
      return false;
    }
  }

  private publish(): void {
    // coords em px de TELA (CSS) p/ o e2e clicar (canvas é físico = × dpr)
    (window as unknown as Record<string, unknown>).__blecauteTitle = {
      ready: true,
      ended: this.ended,
      jogar: { x: this.jogar.x / this.d, y: this.jogar.y / this.d },
    };
  }

  private start(): void {
    if (this.started || !this.ended) {
      return;
    }
    this.started = true;
    audio()?.play('sfx_confirm', { volume: 0.7 });
    this.cameras.main.flash(180, 255, 255, 255);
    this.cameras.main.fadeOut(420, 6, 4, 16);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
      this.scene.start('CaseMap'),
    );
  }

  private spawnSpark(delay: number): void {
    if (!this.alive || this.videoMode) {
      return;
    }
    const { width: W, height: H } = this.scale.gameSize;
    const x = Phaser.Math.Between(16, W - 16);
    const s = this.add
      .image(x, H + 12, 'tex-spark')
      .setScrollFactor(0)
      .setDepth(2)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(Phaser.Math.FloatBetween(0.28, 0.6) * this.d)
      .setAlpha(0);
    this.tweens.add({
      targets: s,
      y: H * Phaser.Math.FloatBetween(0.18, 0.42),
      x: x + Phaser.Math.Between(-26, 26),
      alpha: { from: 0.75, to: 0 },
      duration: Phaser.Math.Between(4200, 6800),
      delay,
      ease: 'Sine.Out',
      onComplete: () => {
        s.destroy();
        this.spawnSpark(0);
      },
    });
  }

  private makeGradient(): string {
    const key = 'tex-titlebg';
    if (this.textures.exists(key)) {
      return key;
    }
    const w = 64;
    const h = 256;
    const tex = this.textures.createCanvas(key, w, h);
    if (!tex) {
      return key;
    }
    const ctx = tex.getContext();
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#211749');
    g.addColorStop(0.5, '#13102b');
    g.addColorStop(1, '#080510');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    tex.refresh();
    return key;
  }

  private makeSpark(): void {
    if (this.textures.exists('tex-spark')) {
      return;
    }
    const size = 16;
    const tex = this.textures.createCanvas('tex-spark', size, size);
    if (!tex) {
      return;
    }
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    g.addColorStop(0, 'rgba(250,199,117,0.95)');
    g.addColorStop(0.5, 'rgba(250,199,117,0.45)');
    g.addColorStop(1, 'rgba(93,202,165,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }
}
