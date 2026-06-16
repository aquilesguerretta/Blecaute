import type { ExpansionChoice } from '../config';
import { STRINGS } from '../config';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  parent: HTMLElement | null,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  parent?.appendChild(node);
  return node;
}

/**
 * Overlay HTML de decisão de expansão pós-caso (não é cena Phaser).
 * Mostra 3 cards; a escolha vai para SaveState.choices via callback.
 */
export class ExpansionCard {
  private root: HTMLDivElement | null = null;

  show(
    choices: ExpansionChoice[],
    hasAsset: (key: string) => boolean,
    onDone: (choiceId: string) => void,
  ): void {
    this.destroy();
    const root = el('div', '', document.body as HTMLElement);
    root.id = 'ui-expansion';
    this.root = root;

    const sheet = el('div', 'sheet expansion', root);
    el('h2', '', sheet, STRINGS.expansionTitle);
    el('p', 'hint', sheet, STRINGS.expansionHint);
    const list = el('div', 'expansion-list', sheet);

    for (const c of choices) {
      const btn = el('button', 'expansion-card', list);
      btn.type = 'button';
      btn.dataset.id = c.id;
      const icon = el('div', 'exp-icon', btn);
      const assetKey = `card_${c.id}`;
      if (hasAsset(assetKey)) {
        const img = el('img', '', icon);
        img.src = `assets/${assetKey}.png`;
        img.alt = c.title;
      } else if (c.iconKey && hasAsset(c.iconKey)) {
        const img = el('img', 'exp-icon-sm', icon);
        img.src = `assets/${c.iconKey}.png`;
        img.alt = c.title;
      } else {
        icon.textContent = c.icon;
      }
      const body = el('div', 'exp-body', btn);
      el('b', '', body, c.title);
      el('span', '', body, c.desc);
      btn.addEventListener('click', () => this.confirm(sheet, c, onDone));
    }
  }

  destroy(): void {
    this.root?.remove();
    this.root = null;
  }

  private confirm(
    sheet: HTMLElement,
    choice: ExpansionChoice,
    onDone: (choiceId: string) => void,
  ): void {
    sheet.replaceChildren();
    el('h2', '', sheet, STRINGS.expansionTitle);
    el('p', 'exp-picked', sheet, `${choice.icon} ${choice.title}`);
    el('p', 'hint', sheet, STRINGS.expansionConfirm);
    const back = el('button', 'btn-primary', sheet, STRINGS.expansionBack);
    back.id = 'ui-expansion-done';
    back.type = 'button';
    back.addEventListener('click', () => {
      this.destroy();
      onDone(choice.id);
    });
  }
}
