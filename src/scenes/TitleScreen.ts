import Phaser from 'phaser';
import { DEPTHS, STRINGS } from '../config';
import { audio } from '../systems/AudioManager';
import { loadSave } from '../systems/SaveState';

const TITLE_FONT = '"Bangers", Impact, system-ui, sans-serif';
const VIDEO_KEYS = ['title_loop', 'login_loop']; // preferência

/**
 * Abertura cinematográfica (estilo Pokémon): fundo (vídeo > bg_title >
 * keyart_title > gradiente), logo animado, fagulhas subindo, vinheta e um
 * prompt pulsante. Toque/clique/tecla -> flash + fade -> CaseMap. Tudo com
 * fallback gracioso se vídeo/áudio não existirem.
 */
export class TitleScreen extends Phaser.Scene {
  private started = false;
  private bg!: Phaser.GameObjects.Image;
  private video: Phaser.GameObjects.Video | null = null;
  private vignette!: Phaser.GameObjects.Image;
  private logo!: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
  private subtitle!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private alive = true;

  constructor() {
    super('TitleScreen');
  }

  create(): void {
    const { width: W, height: H } = this.scale.gameSize;
    this.cameras.main.setBackgroundColor('#0a0614');
    this.cameras.main.fadeIn(450, 6, 4, 16);

    // ----- fundo estático (cobre a viewport) -----
    const bgKey = this.textures.exists('bg_title')
      ? 'bg_title'
      : this.textures.exists('keyart_title')
        ? 'keyart_title'
        : this.makeGradient();
    this.bg = this.add.image(W / 2, H / 2, bgKey).setDepth(0);

    // ----- vídeo de fundo (se decodificável); senão fica no estático -----
    this.tryVideo();

    // ----- fagulhas subindo (sprites animados, simples e confiável) -----
    this.makeSpark();
    for (let i = 0; i < 14; i++) {
      this.spawnSpark(i * 280);
    }

    // ----- vinheta -----
    this.vignette = this.add
      .image(W / 2, H / 2, 'tex-vignette')
      .setScrollFactor(0)
      .setDepth(DEPTHS.grade);

    // ----- logo + subtítulo + prompt -----
    if (this.textures.exists('logo_blecaute')) {
      this.logo = this.add.image(W / 2, 0, 'logo_blecaute').setDepth(10);
    } else {
      this.logo = this.add
        .text(W / 2, 0, 'BLECAUTE', {
          fontFamily: TITLE_FONT,
          fontSize: '64px',
          color: '#ffd23f',
          stroke: '#0d0a02',
          strokeThickness: 8,
        })
        .setOrigin(0.5)
        .setDepth(10);
    }
    this.subtitle = this.add
      .text(W / 2, 0, STRINGS.subtitle, {
        fontFamily: "system-ui, 'Segoe UI', sans-serif",
        fontSize: '16px',
        fontStyle: 'italic',
        color: '#e6e0d2',
      })
      .setOrigin(0.5)
      .setDepth(11);

    const hasProgress = this.savedProgress();
    this.prompt = this.add
      .text(W / 2, 0, hasProgress ? STRINGS.titleContinue : STRINGS.titleStart, {
        fontFamily: TITLE_FONT,
        fontSize: '28px',
        color: '#fac775',
        stroke: '#0d0a02',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(12);

    // entrada do logo: fade + scale; depois pulso sutil
    this.logo.setAlpha(0).setScale(0.82);
    this.tweens.add({
      targets: this.logo,
      alpha: 1,
      scale: 1,
      duration: 700,
      ease: 'Back.Out',
      onComplete: () => {
        this.tweens.add({
          targets: this.logo,
          scale: 1.03,
          duration: 1400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut',
        });
      },
    });
    // prompt pulsante
    this.tweens.add({
      targets: this.prompt,
      alpha: { from: 1, to: 0.3 },
      duration: 820,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    this.layout();
    const onResize = (): void => this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);

    // música de menu (no-op se o mp3 ainda não existe)
    audio()?.play('bgm_menu', { loop: true, volume: 0.55 });

    // qualquer toque/clique/tecla inicia
    this.input.once(Phaser.Input.Events.POINTER_DOWN, () => this.start());
    this.input.keyboard?.once('keydown', () => this.start());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.alive = false;
      this.scale.off(Phaser.Scale.Events.RESIZE, onResize);
      delete (window as unknown as Record<string, unknown>).__blecauteTitle;
    });

    (window as unknown as Record<string, unknown>).__blecauteTitle = { ready: true };
  }

  private layout(): void {
    const { width: W, height: H } = this.scale.gameSize;
    // fundo: cover (cobre sem distorcer, recorta excesso)
    const cover = (img: Phaser.GameObjects.Image | Phaser.GameObjects.Video): void => {
      const tw = img.width || 1;
      const th = img.height || 1;
      const s = Math.max(W / tw, H / th);
      img.setPosition(W / 2, H / 2);
      img.setDisplaySize(tw * s, th * s);
    };
    cover(this.bg);
    if (this.video) {
      cover(this.video);
    }
    this.vignette.setPosition(W / 2, H / 2).setDisplaySize(W, H);

    // logo no topo (longe do notch); escala é da animação de entrada/pulso
    this.logo.setPosition(W / 2, Math.max(100, H * 0.16));
    // subtítulo abaixo do logo em tamanho cheio (evita sobreposição no pulso)
    const logoH = this.textures.exists('logo_blecaute') ? 104 : 64;
    this.subtitle.setPosition(W / 2, this.logo.y + logoH / 2 + 20);
    this.prompt.setPosition(W / 2, H - Math.max(96, H * 0.13));
  }

  /**
   * Usa o vídeo de fundo SÓ quando ele realmente decodifica quadros (evento
   * 'timeupdate'). Fica invisível até confirmar — assim o fundo estático
   * (keyart) nunca some atrás de um vídeo preto (ex.: chromium headless sem
   * codec, que reporta "tocando" mas não renderiza nada).
   */
  private tryVideo(): void {
    const key = VIDEO_KEYS.find((k) => this.cache.video?.exists(k));
    if (!key) {
      return;
    }
    try {
      const vid = this.add.video(0, 0, key).setDepth(1).setAlpha(0);
      vid.setMute(true);
      vid.setLoop(true);
      vid.play(true);
      this.video = vid;
      let revealed = false;
      const reveal = (): void => {
        if (revealed || !this.video) {
          return;
        }
        revealed = true;
        this.video.setAlpha(1);
        this.layout();
      };
      const el = vid.video as HTMLVideoElement | undefined;
      el?.addEventListener('timeupdate', reveal, { once: true });
      this.time.delayedCall(2500, () => {
        if (!revealed && this.video) {
          this.video.destroy();
          this.video = null; // nunca decodificou: fica no estático
        }
      });
    } catch {
      this.video = null;
    }
  }

  /** Uma fagulha que sobe da base ao topo e some; respawna em loop. */
  private spawnSpark(delay: number): void {
    if (!this.alive) {
      return;
    }
    const { width: W, height: H } = this.scale.gameSize;
    const x = Phaser.Math.Between(16, W - 16);
    const s = this.add
      .image(x, H + 12, 'tex-spark')
      .setScrollFactor(0)
      .setDepth(2)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(Phaser.Math.FloatBetween(0.28, 0.6))
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
        this.spawnSpark(0); // mantém o fluxo
      },
    });
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

  private start(): void {
    if (this.started) {
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

  /** Gradiente de fallback quando não há bg_title nem keyart_title. */
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
