// Tipos do caso. Todo conteúdo jogável vem de um JSON que segue este schema.

export interface DialogueChoice {
  text: string;
  /** id da página de destino dentro do MESMO diálogo. */
  goto: string;
  /** Opção só aparece se o jogador tem esta pista. */
  requires_clue?: string;
}

// (ver DialoguePage.id / choices / end abaixo para o suporte a ramificação)

export interface DialoguePage {
  speaker: string;
  text: string;
  /** Cor do retrato placeholder (hex CSS, ex.: "#D4537E"). */
  color?: string;
  /** Asset de retrato (em /public/assets); se ausente/não carregado, usa a cor. */
  portraitKey?: string;
  /** Moldura especial do slot ("tablet" = leitura de equipamento). */
  frame?: string;
  /** Alvo de "goto" de uma escolha. */
  id?: string;
  /** Se presente, mostra botões de escolha em vez de avançar por toque. */
  choices?: DialogueChoice[];
  /** Encerra o diálogo ao avançar desta página (ramos terminais). */
  end?: boolean;
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
  /** Laje de concreto sob o prédio (losango isométrico). Default: true. */
  platform?: boolean;
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
  /** Strings (uma página cada) OU páginas completas (p/ choices/goto/end). */
  dialogue: Array<string | DialoguePage>;
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
  /** Réplica do suspeito ao ser acusado errado (default: rebuttal). */
  accuse_wrong?: string;
  /** Confissão do culpado, mostrada antes do reveal das luzes. */
  accuse_right_confession?: string;
  /** Retrato do suspeito (em /public/assets); usado na acusação e na revelação. */
  portraitKey?: string;
}

export interface DeductionDef {
  id: string;
  /** ids de pistas necessárias para liberar o botão Conectar. */
  requires: string[];
  /** id da pista deduzida que entra no caderno. */
  unlocks_clue: string;
  /** Texto da pista deduzida no caderno (default: saci_line). */
  clue_text?: string;
  /** Fala do Saci ao conectar as pistas. */
  saci_line: string;
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
  /** Combinações de pistas (dedução). Opcional — sem bloco, sem aba. */
  deductions?: DeductionDef[];
}
