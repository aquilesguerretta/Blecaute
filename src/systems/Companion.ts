import Phaser from 'phaser';
import { COMPANION } from '../config';

/**
 * Companheiro (Saci): segue o player com atraso, parando a uma distância
 * alvo. Sem corpo físico — ele é mágico e flutua por cima de tudo que é baixo.
 */
export class Companion {
  readonly obj: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const key = scene.textures.exists('chibi_saci') ? 'chibi_saci' : 'tex-saci';
    this.obj = scene.add.image(x, y, key).setOrigin(0.5, 1);
    scene.tweens.add({
      targets: this.obj,
      scale: { from: 1, to: 1.07 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  get x(): number {
    return this.obj.x;
  }

  get y(): number {
    return this.obj.y;
  }

  update(deltaMs: number, targetX: number, targetY: number): void {
    const dt = deltaMs / 1000;
    const dx = targetX - this.obj.x;
    const dy = targetY - this.obj.y;
    const dist = Math.hypot(dx, dy);
    if (dist > COMPANION.followDist) {
      const speed = Math.min(COMPANION.maxSpeed, (dist - COMPANION.followDist) * COMPANION.gain);
      const step = Math.min(speed * dt, dist - COMPANION.followDist);
      this.obj.x += (dx / dist) * step;
      this.obj.y += (dy / dist) * step;
      if (Math.abs(dx) > 4) {
        this.obj.setFlipX(dx < 0);
      }
    }
    this.obj.setDepth(this.obj.y);
  }
}
