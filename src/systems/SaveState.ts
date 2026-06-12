import { SAVE_KEY } from '../config';

export interface SaveData {
  caseId: string;
  clues: string[];
  solved: boolean;
  introSeen: boolean;
}

export function defaultSave(caseId: string): SaveData {
  return { caseId, clues: [], solved: false, introSeen: false };
}

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return null;
    }
    const d = JSON.parse(raw) as Partial<SaveData>;
    if (typeof d.caseId !== 'string') {
      return null;
    }
    return {
      caseId: d.caseId,
      clues: Array.isArray(d.clues)
        ? d.clues.filter((c): c is string => typeof c === 'string')
        : [],
      solved: d.solved === true,
      introSeen: d.introSeen === true,
    };
  } catch {
    return null;
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // armazenamento indisponível (modo privado etc.) — o jogo segue sem save
  }
}
