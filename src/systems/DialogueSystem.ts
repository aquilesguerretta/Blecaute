import type { DialoguePage } from '../data/schema';
import type { UIManager } from '../ui/UIManager';

/**
 * Páginas de texto vindas do JSON, avanço por toque e callback de fim
 * (ex.: anotar pista no caderno).
 */
export class DialogueSystem {
  private ui: UIManager;
  private pages: DialoguePage[] = [];
  private idx = 0;
  private onEnd?: () => void;
  private opened = false;

  constructor(ui: UIManager) {
    this.ui = ui;
    ui.onDialogueTap = () => this.advance();
  }

  get isOpen(): boolean {
    return this.opened;
  }

  open(pages: DialoguePage[], onEnd?: () => void): void {
    if (pages.length === 0) {
      onEnd?.();
      return;
    }
    this.pages = pages;
    this.idx = 0;
    this.onEnd = onEnd;
    this.opened = true;
    this.show();
  }

  advance(): void {
    if (!this.opened) {
      return;
    }
    this.idx += 1;
    if (this.idx >= this.pages.length) {
      this.opened = false;
      this.ui.hideDialogue();
      const cb = this.onEnd;
      this.onEnd = undefined;
      cb?.(); // pode abrir outro diálogo na sequência
    } else {
      this.show();
    }
  }

  private show(): void {
    this.ui.showDialogue(this.pages[this.idx], this.idx, this.pages.length);
  }
}
