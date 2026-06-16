import type { DialoguePage, SuspectDef } from '../data/schema';
import { STRINGS, UI, isDesktopPointer } from '../config';

// fallback quando o asset de ícone não está disponível
const ICON_EMOJI: Record<string, string> = {
  icon_speech: '💬',
  icon_magnifier: '🔍',
  icon_warning: '⚡',
  icon_notebook: '📓',
};

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
 * Toda a UI textual é HTML por cima do canvas (texto nítido, quebra de linha
 * grátis, toque acessível). O root é sincronizado com o retângulo do canvas
 * (Scale.FIT deixa barras nas laterais em telas não-portrait).
 */
export class UIManager {
  onInteract?: () => void;
  onDialogueTap?: () => void;
  onCluesClick?: () => void;

  private root: HTMLDivElement;
  private titleEl: HTMLDivElement;
  private cluesBtn: HTMLButtonElement;
  private cluesText: HTMLSpanElement;
  private cluesBadge: HTMLSpanElement;
  private interactBtn: HTMLButtonElement;
  private toastWrap: HTMLDivElement;

  private dialogueEl: HTMLDivElement;
  private dlgPortrait: HTMLDivElement;
  private dlgName: HTMLDivElement;
  private dlgText: HTMLDivElement;
  private dlgPage: HTMLSpanElement;

  private journalEl: HTMLDivElement;
  private journalList: HTMLUListElement;

  private accuseEl: HTMLDivElement;
  private accuseList: HTMLDivElement;
  private accuseCancel: HTMLButtonElement;

  private victoryEl: HTMLDivElement;
  private victoryFace: HTMLDivElement;
  private victoryCase: HTMLDivElement;
  private victoryLesson: HTMLDivElement;
  private victoryDoneCb?: () => void;

  private canvas: HTMLCanvasElement;
  private hasAsset: (key: string) => boolean;
  private ro: ResizeObserver;
  private syncFn: () => void;

  constructor(canvas: HTMLCanvasElement, hasAsset: (key: string) => boolean) {
    this.canvas = canvas;
    this.hasAsset = hasAsset;
    document.getElementById('ui-root')?.remove();

    this.root = el('div', '', document.body as HTMLElement);
    this.root.id = 'ui-root';
    this.root.classList.toggle('desktop', isDesktopPointer());

    // topo: botão do caderno (esquerda) + título do caso (direita)
    const topbar = el('div', '', this.root);
    topbar.id = 'ui-topbar';
    this.cluesBtn = el('button', 'clickable', topbar);
    this.cluesBtn.id = 'ui-clues';
    this.cluesBtn.type = 'button';
    if (hasAsset('icon_notebook')) {
      const img = el('img', 'btn-icon', this.cluesBtn);
      img.src = 'assets/icon_notebook.png';
      img.alt = '';
    }
    this.cluesText = el('span', '', this.cluesBtn);
    this.cluesBadge = el('span', 'clue-unread', this.cluesBtn);
    this.cluesBtn.addEventListener('click', () => this.onCluesClick?.());
    this.titleEl = el('div', '', topbar);
    this.titleEl.id = 'ui-title';

    this.toastWrap = el('div', 'toast-wrap', this.root);

    // botão contextual de interação
    this.interactBtn = el('button', 'clickable', this.root);
    this.interactBtn.id = 'ui-interact';
    this.interactBtn.type = 'button';
    this.interactBtn.addEventListener('click', () => this.onInteract?.());

    // diálogo (folha inferior; toque em qualquer lugar avança)
    this.dialogueEl = el('div', 'overlay clickable', this.root);
    this.dialogueEl.id = 'ui-dialogue';
    const sheet = el('div', 'dlg-sheet', this.dialogueEl);
    this.dlgPortrait = el('div', 'dlg-portrait', sheet);
    const dlgBody = el('div', 'dlg-body', sheet);
    this.dlgName = el('div', 'dlg-name', dlgBody);
    this.dlgText = el('div', 'dlg-text', dlgBody);
    const meta = el('div', 'dlg-meta', dlgBody);
    this.dlgPage = el('span', '', meta);
    el('span', 'dlg-hint', meta, STRINGS.continueHint);
    this.dialogueEl.addEventListener('click', () => this.onDialogueTap?.());

    // caderno de pistas
    this.journalEl = el('div', 'overlay center clickable', this.root);
    this.journalEl.id = 'ui-journal';
    const jSheet = el('div', 'sheet', this.journalEl);
    el('h2', '', jSheet, STRINGS.journalTitle);
    this.journalList = el('ul', '', jSheet);
    this.journalList.id = 'ui-journal-list';
    const jClose = el('button', 'btn-secondary', jSheet, STRINGS.close);
    jClose.id = 'ui-journal-close';
    jClose.type = 'button';
    jClose.addEventListener('click', () => this.hideJournal());

    // acusação
    this.accuseEl = el('div', 'overlay center clickable', this.root);
    this.accuseEl.id = 'ui-accuse';
    const aSheet = el('div', 'sheet', this.accuseEl);
    el('h2', '', aSheet, STRINGS.accuseTitle);
    el('p', 'hint', aSheet, STRINGS.accuseHint);
    this.accuseList = el('div', 'accuse-list', aSheet);
    this.accuseCancel = el('button', 'btn-secondary', aSheet, STRINGS.cancel);
    this.accuseCancel.id = 'ui-accuse-cancel';
    this.accuseCancel.type = 'button';

    // vitória
    this.victoryEl = el('div', 'overlay center clickable', this.root);
    this.victoryEl.id = 'ui-victory';
    const vSheet = el('div', 'sheet victory', this.victoryEl);
    const vHead = el('div', 'victory-head', vSheet);
    const star = (): void => {
      if (hasAsset('icon_star')) {
        const st = el('img', 'victory-star', vHead);
        st.src = 'assets/icon_star.png';
        st.alt = '';
      }
    };
    star();
    el('h2', '', vHead, STRINGS.victoryTitle);
    star();
    this.victoryFace = el('div', 'victory-face', vSheet);
    this.victoryCase = el('div', 'case-name', vSheet);
    el('div', 'lesson-label', vSheet, STRINGS.lessonLabel);
    this.victoryLesson = el('div', 'lesson', vSheet);
    this.victoryLesson.id = 'ui-victory-lesson';
    const vDone = el('button', 'btn-primary', vSheet, STRINGS.victoryDone);
    vDone.id = 'ui-victory-done';
    vDone.type = 'button';
    vDone.addEventListener('click', () => {
      this.hideVictory();
      this.victoryDoneCb?.();
    });

    this.syncFn = () => this.sync();
    window.addEventListener('resize', this.syncFn);
    this.ro = new ResizeObserver(this.syncFn);
    this.ro.observe(canvas);
    this.sync();
  }

  setTitle(t: string): void {
    this.titleEl.textContent = t;
  }

  setClues(n: number, total: number, unread = 0): void {
    this.cluesText.textContent = STRINGS.clues(n, total);
    if (unread > 0) {
      this.cluesBadge.textContent = String(unread);
      this.cluesBadge.style.display = 'flex';
    } else {
      this.cluesBadge.style.display = 'none';
    }
  }

  showInteract(label: string, iconKey?: string): void {
    this.interactBtn.replaceChildren();
    if (iconKey) {
      if (this.hasAsset(iconKey)) {
        const img = el('img', 'btn-icon', this.interactBtn);
        img.src = `assets/${iconKey}.png`;
        img.alt = '';
      } else {
        el('span', 'btn-emoji', this.interactBtn, ICON_EMOJI[iconKey] ?? '•');
      }
    }
    el('span', '', this.interactBtn, label);
    this.interactBtn.classList.add('visible');
  }

  hideInteract(): void {
    this.interactBtn.classList.remove('visible');
  }

  showDialogue(page: DialoguePage, index: number, total: number): void {
    if (page.frame === 'tablet' && this.hasAsset('ui_tablet')) {
      // leitura de equipamento: moldura de tablet no lugar do retrato
      this.dlgPortrait.style.background = `#0d1422 url('assets/ui_tablet.png') center / contain no-repeat`;
      this.dlgPortrait.textContent = '';
    } else if (page.portraitKey && this.hasAsset(page.portraitKey)) {
      this.dlgPortrait.style.background = `${page.color ?? '#10141f'} url('assets/${page.portraitKey}.png') center / cover no-repeat`;
      this.dlgPortrait.textContent = '';
    } else {
      this.dlgPortrait.style.background = page.color ?? '#39424e';
      this.dlgPortrait.textContent = page.speaker.charAt(0).toUpperCase();
    }
    this.dlgName.textContent = page.speaker;
    this.dlgText.textContent = page.text;
    this.dlgPage.textContent = `${index + 1}/${total}`;
    this.dialogueEl.classList.add('visible');
  }

  hideDialogue(): void {
    this.dialogueEl.classList.remove('visible');
  }

  showJournal(texts: string[]): void {
    this.journalList.replaceChildren();
    if (texts.length === 0) {
      el('li', 'empty', this.journalList, STRINGS.journalEmpty);
    } else {
      for (const t of texts) {
        el('li', '', this.journalList, t);
      }
    }
    this.journalEl.classList.add('visible');
  }

  hideJournal(): void {
    this.journalEl.classList.remove('visible');
  }

  showAccuse(suspects: SuspectDef[], onPick: (id: string) => void, onCancel: () => void): void {
    this.accuseList.replaceChildren();
    for (const s of suspects) {
      const btn = el('button', 'suspect', this.accuseList);
      btn.type = 'button';
      btn.dataset.id = s.id;
      if (s.portraitKey && this.hasAsset(s.portraitKey)) {
        const face = el('div', 'suspect-face', btn);
        face.style.backgroundImage = `url('assets/${s.portraitKey}.png')`;
      }
      const body = el('div', 'suspect-body', btn);
      el('b', '', body, s.name);
      el('span', '', body, s.desc);
      btn.addEventListener('click', () => onPick(s.id));
    }
    this.accuseCancel.onclick = () => onCancel();
    this.accuseEl.classList.add('visible');
  }

  hideAccuse(): void {
    this.accuseEl.classList.remove('visible');
  }

  showVictory(caseTitle: string, lesson: string, onDone: () => void, portraitKey?: string): void {
    if (portraitKey && this.hasAsset(portraitKey)) {
      this.victoryFace.style.backgroundImage = `url('assets/${portraitKey}.png')`;
      this.victoryFace.style.display = 'block';
    } else {
      this.victoryFace.style.display = 'none';
    }
    this.victoryCase.textContent = caseTitle;
    this.victoryLesson.textContent = lesson;
    this.victoryDoneCb = onDone;
    this.victoryEl.classList.add('visible');
  }

  hideVictory(): void {
    this.victoryEl.classList.remove('visible');
  }

  toast(text: string): void {
    while (this.toastWrap.children.length >= 2) {
      this.toastWrap.firstElementChild?.remove();
    }
    const t = el('div', 'toast', this.toastWrap, text);
    window.setTimeout(() => t.remove(), UI.toastMs);
  }

  isModalOpen(): boolean {
    return (
      this.dialogueEl.classList.contains('visible') ||
      this.journalEl.classList.contains('visible') ||
      this.accuseEl.classList.contains('visible') ||
      this.victoryEl.classList.contains('visible')
    );
  }

  destroy(): void {
    window.removeEventListener('resize', this.syncFn);
    this.ro.disconnect();
    this.root.remove();
  }

  /** Alinha o overlay ao retângulo visível do canvas (letterbox do Scale.FIT). */
  private sync(): void {
    const r = this.canvas.getBoundingClientRect();
    this.root.style.left = `${r.left}px`;
    this.root.style.top = `${r.top}px`;
    this.root.style.width = `${r.width}px`;
    this.root.style.height = `${r.height}px`;
  }
}
