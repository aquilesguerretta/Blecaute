import Phaser from 'phaser';

export interface ContactShadow {
  readonly obj: Phaser.GameObjects.Ellipse;
  /** Reposiciona no chão (x,y) e encolhe (1 = cheia). Para atores móveis. */
  follow(x: number, y: number, shrink?: number): void;
  destroy(): void;
}

/**
 * Elipse escura achatada sob o sprite — "cola" o objeto ao chão. Desenhada
 * logo abaixo do sprite (depth - 1) com blend MULTIPLY (escurece o chão).
 * Sprites usam origem (0.5, 1), então a base fica em (go.x, go.y).
 */
interface Footed {
  x: number;
  y: number;
  displayWidth: number;
  depth: number;
}

export function addContactShadow(
  scene: Phaser.Scene,
  go: Footed,
  opts?: { widthScale?: number; heightScale?: number; alpha?: number },
): ContactShadow {
  const ws = opts?.widthScale ?? 0.85;
  const hs = opts?.heightScale ?? 0.22;
  const w = Math.max(6, go.displayWidth * ws);
  const h = Math.max(3, go.displayWidth * hs);
  const e = scene.add
    .ellipse(go.x, go.y, w, h, 0x000000, opts?.alpha ?? 0.35)
    .setBlendMode(Phaser.BlendModes.MULTIPLY)
    .setDepth(go.depth - 1);
  return {
    obj: e,
    follow(x: number, y: number, shrink = 1): void {
      e.setPosition(x, y);
      e.setScale(shrink);
      e.setDepth(y - 1);
    },
    destroy(): void {
      e.destroy();
    },
  };
}
