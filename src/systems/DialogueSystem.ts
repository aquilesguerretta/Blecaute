import type { DialogueChoice, DialoguePage } from '../data/schema';
import type { UIManager } from '../ui/UIManager';

/**
 * Páginas de texto vindas do JSON, avanço por toque e callback de fim
 * (ex.: anotar pista no caderno). Páginas com "choices" mostram botões de
 * escolha e pulam por "goto" — retrocompatível: páginas sem choices avançam
 * por toque exatamente como antes.
 */
export class DialogueSystem {
  /** Predicado de posse de pista (para choices com requires_clue). */
  hasClue?: (id: string) => boolean;

  private ui: UIManager;
  private pages: DialoguePage[] = [];
  private idx = 0;
  private onEnd?: () => void;
  private opened = false;
  private hasVisibleChoices = false;

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
    if (!this.opened || this.hasVisibleChoices) {
      return; // páginas com escolhas não avançam por toque
    }
    if (this.pages[this.idx]?.end) {
      this.finish(); // ramo terminal
      return;
    }
    this.idx += 1;
    if (this.idx >= this.pages.length) {
      this.finish();
    } else {
      this.show();
    }
  }

  private finish(): void {
    this.opened = false;
    this.hasVisibleChoices = false;
    this.ui.hideChoices();
    this.ui.hideDialogue();
    const cb = this.onEnd;
    this.onEnd = undefined;
    cb?.(); // pode abrir outro diálogo na sequência
  }

  private pickChoice(choice: DialogueChoice): void {
    this.ui.hideChoices();
    this.hasVisibleChoices = false;
    const target = this.pages.findIndex((p) => p.id === choice.goto);
    if (target >= 0) {
      this.idx = target;
      this.show();
    } else {
      this.finish(); // goto inválido: encerra com segurança
    }
  }

  private show(): void {
    const page = this.pages[this.idx];
    this.ui.showDialogue(page, this.idx, this.pages.length);
    const visible = (page.choices ?? []).filter(
      (c) => !c.requires_clue || this.hasClue?.(c.requires_clue) === true,
    );
    this.hasVisibleChoices = visible.length > 0;
    if (this.hasVisibleChoices) {
      this.ui.showChoices(visible, (choice) => this.pickChoice(choice));
    } else {
      this.ui.hideChoices();
    }
  }
}
