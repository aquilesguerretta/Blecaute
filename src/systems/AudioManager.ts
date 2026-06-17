import Phaser from 'phaser';

/**
 * Áudio simples e à prova de arquivo-ausente: play/loop/stop/volume. Usa o
 * SoundManager global do jogo (persiste entre cenas, então a música da
 * TitleScreen continua no CaseMap). Se o som não foi carregado, é no-op.
 */
export class AudioManager {
  private game: Phaser.Game;
  private active = new Map<string, Phaser.Sound.BaseSound>();

  constructor(game: Phaser.Game) {
    this.game = game;
  }

  /** O áudio foi carregado (existe arquivo)? */
  has(key: string): boolean {
    return this.game.cache.audio.exists(key);
  }

  play(key: string, opts: { loop?: boolean; volume?: number } = {}): void {
    if (!this.has(key)) {
      return; // sem arquivo: silencioso
    }
    let s = this.active.get(key);
    if (!s) {
      s = this.game.sound.add(key);
      this.active.set(key, s);
    }
    if (!s.isPlaying) {
      try {
        s.play({ loop: opts.loop ?? false, volume: opts.volume ?? 1 });
      } catch {
        // autoplay bloqueado / contexto suspenso — ignora
      }
    }
  }

  stop(key: string): void {
    this.active.get(key)?.stop();
  }

  setVolume(key: string, volume: number): void {
    const s = this.active.get(key);
    if (s && 'setVolume' in s) {
      (s as Phaser.Sound.WebAudioSound).setVolume(volume);
    }
  }

  /** Esmaece o volume e para (cross-fade entre telas). */
  fade(scene: Phaser.Scene, key: string, to: number, ms: number, stopAtEnd = false): void {
    const s = this.active.get(key);
    if (!s || !('volume' in s)) {
      return;
    }
    scene.tweens.add({
      targets: s,
      volume: to,
      duration: ms,
      onComplete: () => {
        if (stopAtEnd) {
          s.stop();
        }
      },
    });
  }

  stopAll(): void {
    for (const s of this.active.values()) {
      s.stop();
    }
  }
}

let instance: AudioManager | null = null;

export function initAudio(game: Phaser.Game): AudioManager {
  instance = new AudioManager(game);
  return instance;
}

export function audio(): AudioManager | null {
  return instance;
}
