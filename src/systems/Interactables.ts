export type InteractKind = 'npc' | 'inspect' | 'companion';

export interface Interactable {
  id: string;
  kind: InteractKind;
  radius: number;
  getXY(): { x: number; y: number };
  label(): string;
  action(): void;
}

/**
 * Registro de entidades interagíveis. A cada frame, o mais próximo dentro do
 * raio define o botão contextual. NPCs e inspecionáveis têm prioridade sobre
 * o companion (que está sempre colado no player).
 */
export class Interactables {
  private items: Interactable[] = [];

  add(item: Interactable): void {
    this.items.push(item);
  }

  closest(px: number, py: number): Interactable | null {
    let best: Interactable | null = null;
    let bestScore = Infinity;
    for (const it of this.items) {
      const { x, y } = it.getXY();
      const d = Math.hypot(x - px, y - py);
      if (d > it.radius) {
        continue;
      }
      const rank = it.kind === 'companion' ? 1 : 0;
      const score = rank * 1e6 + d;
      if (score < bestScore) {
        bestScore = score;
        best = it;
      }
    }
    return best;
  }
}
