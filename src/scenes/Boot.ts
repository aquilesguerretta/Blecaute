import Phaser from 'phaser';
import { COMPANION, LIGHTS, PLAYER, WORLD_COLORS } from '../config';
import { caseIdFromQuery } from '../systems/CaseLoader';
import { audio, initAudio } from '../systems/AudioManager';

const VIDEO_EXT = new Set(['mp4', 'webm']);

/**
 * Gera todas as texturas placeholder em código (sem assets externos)
 * e entrega para a cena do mundo.
 */
export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    // manifests regravados pelo npm run assets com o que existe na pasta
    this.load.json('asset-manifest', 'assets/manifest.json');
    this.load.json('media-manifest', 'assets/media.json');
  }

  create(): void {
    this.makePlayer();
    this.makeSaci();
    this.makeLightParts();
    this.makeProps();
    this.makeDevice();
    this.makeVignette();

    initAudio(this.game);
    // gancho do e2e: exercita o AudioManager mesmo sem arquivos (no-op gracioso)
    (window as unknown as Record<string, unknown>).__audioTest = () => {
      const a = audio();
      if (!a) {
        return false;
      }
      a.play('__none__', { loop: true, volume: 0.5 });
      a.setVolume('__none__', 0.3);
      a.stop('__none__');
      a.stopAll();
      return true;
    };

    const list = (k: string): string[] => {
      const v = this.cache.json.get(k) as unknown;
      return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
    };
    for (const key of list('asset-manifest')) {
      this.load.image(key, `assets/${key}.png`);
    }
    for (const file of list('media-manifest')) {
      const key = file.replace(/\.[^.]+$/, '');
      const ext = file.split('.').pop()?.toLowerCase() ?? '';
      if (VIDEO_EXT.has(ext)) {
        this.load.video(key, `assets/${file}`);
      } else {
        this.load.audio(key, `assets/${file}`);
      }
    }
    // mídia faltante/indecodificável não pode travar o boot
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, () => undefined);

    let routed = false;
    const goOnce = (): void => {
      if (!routed) {
        routed = true;
        this.route();
      }
    };
    this.load.once(Phaser.Loader.Events.COMPLETE, goOnce);
    this.time.delayedCall(6000, goOnce); // segurança: nunca trava no boot
    this.load.start();
  }

  private route(): void {
    // espera a Bangers carregar (com teto de 1s) para o título do CaseMap
    const fontReady = document.fonts
      ? document.fonts.load('64px Bangers').then(() => undefined)
      : Promise.resolve(undefined);
    const timeout = new Promise<void>((resolve) => {
      window.setTimeout(resolve, 1000);
    });
    Promise.race([fontReady, timeout]).then(
      () => this.go(),
      () => this.go(),
    );
  }

  private go(): void {
    const fromQuery = caseIdFromQuery();
    if (fromQuery) {
      this.scene.start('World', { caseId: fromQuery });
    } else {
      this.scene.start('TitleScreen');
    }
  }

  private gfx(): Phaser.GameObjects.Graphics {
    return this.make.graphics({ x: 0, y: 0 }, false);
  }

  private makePlayer(): void {
    const s = PLAYER.texSize;
    const r = s / 2;
    const g = this.gfx();
    g.fillStyle(WORLD_COLORS.playerOutline, 1);
    g.fillCircle(r, r, r);
    g.fillStyle(WORLD_COLORS.playerBody, 1);
    g.fillCircle(r, r, r - 2);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(r, r - 5, 5); // capacete
    g.generateTexture('tex-player', s, s);
    g.destroy();
  }

  private makeSaci(): void {
    const g = this.gfx();
    g.fillStyle(COMPANION.bodyColor, 1);
    g.fillCircle(15, 20, 12); // corpo
    g.fillStyle(COMPANION.capColor, 1);
    g.fillCircle(15, 9, 9); // gorro
    g.fillStyle(0xffffff, 1);
    g.fillCircle(11, 19, 2);
    g.fillCircle(19, 19, 2); // olhos
    g.generateTexture('tex-saci', 30, 34);
    g.destroy();
  }

  private makeLightParts(): void {
    const pole = this.gfx();
    pole.fillStyle(0x3a4150, 1);
    pole.fillEllipse(7, 32, 12, 5); // base
    pole.fillStyle(WORLD_COLORS.pole, 1);
    pole.fillRect(5, 4, 4, 28);
    pole.generateTexture('tex-pole', 14, 36);
    pole.destroy();

    const lamp = this.gfx();
    lamp.fillStyle(LIGHTS.onColor, 1);
    lamp.fillCircle(6, 6, 5);
    lamp.generateTexture('tex-lamp', 12, 12);
    lamp.destroy();

    const glow = this.gfx();
    const alphas = [0.04, 0.05, 0.07, 0.09, 0.12];
    const radii = [46, 40, 33, 26, 18];
    for (let i = 0; i < alphas.length; i++) {
      glow.fillStyle(LIGHTS.onColor, alphas[i]);
      glow.fillCircle(48, 48, radii[i]);
    }
    glow.generateTexture('tex-glow', 96, 96);
    glow.destroy();
  }

  private makeProps(): void {
    const tree = this.gfx();
    tree.fillStyle(WORLD_COLORS.treeTrunk, 1);
    tree.fillRect(19, 36, 6, 16);
    tree.fillStyle(WORLD_COLORS.treeLeaf, 1);
    tree.fillCircle(22, 20, 14);
    tree.fillCircle(13, 28, 9);
    tree.fillCircle(31, 27, 10);
    tree.generateTexture('tex-tree', 44, 54);
    tree.destroy();

    const bush = this.gfx();
    bush.fillStyle(WORLD_COLORS.bush, 1);
    bush.fillCircle(10, 14, 8);
    bush.fillCircle(18, 10, 9);
    bush.fillCircle(27, 14, 8);
    bush.generateTexture('tex-bush', 36, 22);
    bush.destroy();

    const rock = this.gfx();
    rock.fillStyle(WORLD_COLORS.rock, 1);
    rock.fillEllipse(14, 12, 24, 14);
    rock.fillStyle(0x8d93a0, 1);
    rock.fillEllipse(12, 9, 14, 8);
    rock.generateTexture('tex-rock', 28, 20);
    rock.destroy();

    const barrel = this.gfx();
    barrel.fillStyle(WORLD_COLORS.barrel, 1);
    barrel.fillRoundedRect(2, 2, 20, 26, 4);
    barrel.fillStyle(0x6e4722, 1);
    barrel.fillRect(2, 8, 20, 3);
    barrel.fillRect(2, 19, 20, 3);
    barrel.generateTexture('tex-barrel', 24, 30);
    barrel.destroy();
  }

  /** Textura de vinheta (gradiente radial transparente -> preto nas bordas). */
  private makeVignette(): void {
    const size = 256;
    const tex = this.textures.createCanvas('tex-vignette', size, size);
    if (!tex) {
      return;
    }
    const ctx = tex.getContext();
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      size * 0.3,
      size / 2,
      size / 2,
      size * 0.62,
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }

  private makeDevice(): void {
    const g = this.gfx();
    g.fillStyle(0x232931, 1);
    g.fillRect(6, 28, 4, 4);
    g.fillRect(18, 28, 4, 4); // pés
    g.fillStyle(WORLD_COLORS.device, 1);
    g.fillRoundedRect(3, 6, 22, 22, 3);
    g.fillStyle(WORLD_COLORS.deviceScreen, 1);
    g.fillRect(7, 11, 14, 8); // visor
    g.generateTexture('tex-device', 28, 32);
    g.destroy();
  }
}
