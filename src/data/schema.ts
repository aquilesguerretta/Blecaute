// Tipos do caso. Todo conteúdo jogável vem de um JSON que segue este schema.

export interface DialoguePage {
  speaker: string;
  text: string;
  /** Cor do retrato placeholder (hex CSS, ex.: "#D4537E"). */
  color?: string;
}

export interface ClueDef {
  id: string;
  text: string;
}

export interface BuildingDef {
  /** Canto superior esquerdo do retângulo de colisão. */
  x: number;
  y: number;
  w: number;
  h: number;
  name: string;
  spriteKey?: string;
}

export interface LightDef {
  x: number;
  y: number;
}

export interface PropDef {
  x: number;
  y: number;
  kind: string;
}

export interface WorldDef {
  w: number;
  h: number;
  buildings: BuildingDef[];
  lights: LightDef[];
  props: PropDef[];
}

export interface NpcDef {
  id: string;
  name: string;
  x: number;
  y: number;
  /** Cor do NPC e do seu retrato (hex CSS). */
  color: string;
  portraitKey?: string;
  dialogue: string[];
  clue?: ClueDef;
}

export interface InspectableDef {
  id: string;
  name: string;
  x: number;
  y: number;
  dialogue: string[];
  clue?: ClueDef;
}

export interface SuspectDef {
  id: string;
  name: string;
  desc: string;
  correct: boolean;
  rebuttal?: string;
}

export interface VictoryDef {
  reveal: string;
  lesson: string;
}

export interface Case {
  id: string;
  title: string;
  intro: DialoguePage[];
  minClues: number;
  world: WorldDef;
  npcs: NpcDef[];
  inspectables: InspectableDef[];
  suspects: SuspectDef[];
  victory: VictoryDef;
}
