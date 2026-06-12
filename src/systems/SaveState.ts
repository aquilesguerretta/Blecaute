import { SAVE_KEY, SAVE_KEY_LEGACY } from '../config';

export interface CaseProgress {
  clues: string[];
  solved: boolean;
  introSeen: boolean;
}

export interface SaveData {
  /** Último caso em andamento (null quando nada aberto). */
  currentCase: string | null;
  casesCompleted: string[];
  /** Escolhas de expansão por caso (choicesMap). */
  choices: Record<string, string>;
  cases: Record<string, CaseProgress>;
}

export function emptySave(): SaveData {
  return { currentCase: null, casesCompleted: [], choices: {}, cases: {} };
}

export function defaultProgress(): CaseProgress {
  return { clues: [], solved: false, introSeen: false };
}

/** Progresso do caso, criando um vazio dentro do save se ainda não existir. */
export function getProgress(save: SaveData, caseId: string): CaseProgress {
  const existing = save.cases[caseId];
  if (existing) {
    return existing;
  }
  const fresh = defaultProgress();
  save.cases[caseId] = fresh;
  return fresh;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function sanitizeProgress(value: unknown): CaseProgress {
  const p = (value ?? {}) as Partial<CaseProgress>;
  return {
    clues: strings(p.clues),
    solved: p.solved === true,
    introSeen: p.introSeen === true,
  };
}

function sanitize(value: unknown): SaveData | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const d = value as Partial<SaveData>;
  if (typeof d.cases !== 'object' || d.cases === null) {
    return null;
  }
  const cases: Record<string, CaseProgress> = {};
  for (const [id, p] of Object.entries(d.cases)) {
    cases[id] = sanitizeProgress(p);
  }
  const choices: Record<string, string> = {};
  if (typeof d.choices === 'object' && d.choices !== null) {
    for (const [id, c] of Object.entries(d.choices)) {
      if (typeof c === 'string') {
        choices[id] = c;
      }
    }
  }
  return {
    currentCase: typeof d.currentCase === 'string' ? d.currentCase : null,
    casesCompleted: strings(d.casesCompleted),
    choices,
    cases,
  };
}

/** Carrega o save v2; migra o v1 (single-case) se for o que existir. */
export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = sanitize(JSON.parse(raw));
      if (s) {
        return s;
      }
    }
    const legacy = localStorage.getItem(SAVE_KEY_LEGACY);
    if (legacy) {
      const v1 = JSON.parse(legacy) as {
        caseId?: string;
        clues?: unknown;
        solved?: unknown;
        introSeen?: unknown;
      };
      if (typeof v1.caseId === 'string') {
        const s = emptySave();
        s.cases[v1.caseId] = {
          clues: strings(v1.clues),
          solved: v1.solved === true,
          introSeen: v1.introSeen === true,
        };
        if (v1.solved === true) {
          s.casesCompleted.push(v1.caseId);
        } else {
          s.currentCase = v1.caseId;
        }
        writeSave(s);
        return s;
      }
    }
  } catch {
    // save corrompido ou storage indisponível — recomeça limpo
  }
  return emptySave();
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // armazenamento indisponível (modo privado etc.) — o jogo segue sem save
  }
}
