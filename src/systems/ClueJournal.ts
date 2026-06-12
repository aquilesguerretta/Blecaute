import type { ClueDef } from '../data/schema';

/** Pistas coletadas. O total vem do índice de pistas que o caso oferece. */
export class ClueJournal {
  onChange?: (journal: ClueJournal) => void;

  private byId: Map<string, string>;
  private collected = new Map<string, string>();
  private unreadCount = 0;

  constructor(allClues: Map<string, string>) {
    this.byId = allClues;
  }

  /** Pistas novas desde a última leitura do caderno (badge vermelho). */
  get unread(): number {
    return this.unreadCount;
  }

  markAllRead(): void {
    if (this.unreadCount !== 0) {
      this.unreadCount = 0;
      this.onChange?.(this);
    }
  }

  get total(): number {
    return this.byId.size;
  }

  get count(): number {
    return this.collected.size;
  }

  has(id: string): boolean {
    return this.collected.has(id);
  }

  /** Retorna true se a pista era nova. */
  add(clue: ClueDef): boolean {
    if (this.collected.has(clue.id)) {
      return false;
    }
    this.collected.set(clue.id, clue.text);
    this.unreadCount += 1;
    this.onChange?.(this);
    return true;
  }

  /** Reidrata a partir dos ids salvos, buscando os textos no índice do caso. */
  restore(ids: string[]): void {
    for (const id of ids) {
      const text = this.byId.get(id);
      if (text) {
        this.collected.set(id, text);
      }
    }
    if (this.collected.size > 0) {
      this.onChange?.(this);
    }
  }

  ids(): string[] {
    return [...this.collected.keys()];
  }

  texts(): string[] {
    return [...this.collected.values()];
  }
}
