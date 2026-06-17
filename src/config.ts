// Todos os números de tuning do jogo vivem aqui.
// Conteúdo de caso (textos, posições, pistas) fica em /data/caseN.json.
import Phaser from 'phaser';

export const GAME = {
  width: 390,
  height: 844,
  bg: '#05060a',
} as const;

// ===== Viewport responsivo (mobile retrato + desktop paisagem) =====
// Canvas = janela inteira (Scale.RESIZE). Cenas de menu/hub são autoradas em
// 390x844 e centralizadas+escaladas; o World deriva o zoom da câmera daqui.
export const VIEW = {
  designWidth: 390,
  designHeight: 844,
  // altura de mundo (px) que se quer ver — retrato é mais íntimo, paisagem mais aberta
  targetWorldH_portrait: 620,
  targetWorldH_landscape: 760,
  minZoom: 0.85,
  maxZoom: 2.6,
} as const;

/** true quando há ponteiro fino (mouse) -> UX de desktop. */
export function isDesktopPointer(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches === true
  );
}

/**
 * Zoom da câmera a partir do viewport: mira uma altura de mundo confortável,
 * mas nunca deixa "vazar" o mundo (cobre a viewport quando o mundo é menor).
 */
export function worldZoom(viewW: number, viewH: number, worldW: number, worldH: number): number {
  const landscape = viewW >= viewH;
  const targetH = landscape ? VIEW.targetWorldH_landscape : VIEW.targetWorldH_portrait;
  const cover = Math.max(viewW / worldW, viewH / worldH); // mínimo p/ não mostrar vazio
  const z = Math.max(viewH / targetH, cover);
  return Phaser.Math.Clamp(z, VIEW.minZoom, VIEW.maxZoom);
}

export const PLAYER = {
  speed: 210, // px/s (velocidade de topo)
  accel: 2400, // px/s² ao manter direção (~90ms até o topo: peso sem travar)
  decel: 3200, // px/s² ao soltar (parada firme, sem patinar)
  turnBoost: 1.6, // multiplica o accel ao inverter direção (vira responsivo)
  bodyW: 20, // AABB de colisão (pés)
  bodyH: 16,
  texSize: 28,
} as const;

export const CAMERA = {
  lerp: 0.12, // acompanha o ramp de aceleração sem ficar pra trás
  deadzoneW: 90, // caixa de folga horizontal (jitter do joystick não move a câmera)
  deadzoneH: 130, // folga vertical maior (mundo é alto)
} as const;

export const JOYSTICK = {
  cap: 42, // raio máximo do polegar (esquema Among Us)
  baseRadius: 50,
  thumbRadius: 22,
  baseAlpha: 0.25,
  thumbAlpha: 0.5,
  color: 0xffffff,
  deadzone: 6,
} as const;

export const COMPANION = {
  name: 'Saci',
  followDist: 50, // distância alvo atrás do player (trilha mais solta)
  maxSpeed: 230,
  gain: 2.8, // velocidade proporcional à distância excedente
  interactRadius: 70,
  portrait: '#b03a2e',
  bodyColor: 0x3e2a20,
  capColor: 0xd8382e,
} as const;

export const INTERACT = {
  radius: 52, // raio de proximidade de NPCs/inspecionáveis
  inspectPortrait: '#2e6f78',
} as const;

export const LIGHTS = {
  onColor: 0xffd56b,
  glowAlphaScale: 0.5,
  flickerMin: 110, // ms entre re-sorteios do flicker
  flickerMax: 420,
  blackoutChance: 0.22,
  solveTweenMs: 700, // animação de acender ao resolver o caso
} as const;

export const WORLD_COLORS = {
  ground: 0x141f1a,
  groundDot: 0x1d2b23,
  border: 0x2c3a4f,
  building: 0x2e3450,
  buildingTop: 0x3a4163,
  buildingLine: 0x515b8a,
  pole: 0x6b7280,
  treeTrunk: 0x5d4037,
  treeLeaf: 0x2f6b3c,
  bush: 0x3d7a47,
  rock: 0x7a7f8a,
  barrel: 0x8a5a2b,
  device: 0x39424e,
  deviceScreen: 0x57e0c4,
  playerBody: 0xf2a33c,
  playerOutline: 0x1b2430,
  npcOutline: 0x10131f,
  label: '#e8e4d8',
  labelStroke: '#10131f',
} as const;

export const DEPTHS = {
  ground: -10,
  deco: -9,
  // atores, props e prédios usam depth = y (y-sort)
  glow: 5000,
  grade: 8000, // grade de cor (acima do mundo)
  vignette: 8001, // vinheta (acima da grade)
  joystick: 9000, // joystick desenha por cima dos FX de tela
} as const;

export const UI = {
  minTouch: 44, // px — alvo mínimo de toque
  toastMs: 2200,
} as const;

// Textos de interface (cromo do jogo, não conteúdo de caso).
export const STRINGS = {
  talk: (name: string) => `Falar: ${name}`,
  inspect: 'Inspecionar',
  talkCompanion: `Falar com o ${COMPANION.name}`,
  accuse: 'ACUSAR',
  clues: (n: number, total: number) => `Pistas ${n}/${total}`,
  clueAdded: '📓 Pista anotada!',
  journalTitle: 'Caderno de Pistas',
  journalEmpty: 'Nenhuma pista ainda. Fale com o povo e inspecione os equipamentos.',
  cluesTab: 'Pistas',
  deductionsTab: 'Deduções',
  connect: 'Conectar',
  newDeduction: 'Nova dedução!',
  deductionDone: '✓ Conectado',
  deductionLocked: (met: number, total: number) => `🔒 Faltam pistas (${met}/${total})`,
  close: 'Fechar',
  accuseTitle: 'Quem é o culpado?',
  accuseHint: 'Toque em um suspeito para acusar.',
  cancel: 'Cancelar',
  continueHint: 'toque para continuar',
  victoryTitle: 'CASO RESOLVIDO!',
  lessonLabel: 'Lição de campo',
  victoryDone: 'Concluir',
  solvedToast: 'As luzes da vila voltaram!',
  saciHint: (n: number, min: number) =>
    `Temos ${n} de ${min} pistas. Fala com o povo e inspeciona os equipamentos — aí sim a gente acusa!`,
  rebuttalFallback: 'Esse aí não foi, não. Olha as pistas de novo!',
  subtitle: 'Apague as dúvidas. Reacenda a verdade.',
  comingSoon: 'em breve',
  lockedPin: 'resolva o caso anterior',
  continueBtn: 'Continuar',
  expansionTitle: 'Expansão da Cidade',
  expansionHint: 'O caso fechou. Como a cidade investe agora?',
  expansionConfirm: 'Sua escolha moldará a cidade.',
  expansionBack: 'Voltar ao mapa',
  play: 'Jogar',
  controlsDesktop: 'WASD / setas para andar · E para interagir',
  controlsTouch: 'Toque e arraste para andar',
  titleStart: 'Toque para começar',
  titleContinue: 'Toque para continuar',
  titlePlay: 'JOGAR',
  titleResume: 'CONTINUAR',
} as const;

// ===== Decisões de expansão pós-caso (efeito real chega no Brief #3) =====
export interface ExpansionChoice {
  id: string;
  /** Emoji placeholder; se existir o asset card_<id>, a UI usa a imagem. */
  icon: string;
  /** Ícone de asset (em /public/assets) — fallback antes do emoji. */
  iconKey?: string;
  title: string;
  desc: string;
}

export const EXPANSIONS: Record<string, ExpansionChoice[]> = {
  case1: [
    {
      id: 'solar',
      icon: '☀️',
      title: 'Fazenda Solar',
      desc: 'Energia limpa e barata de dia. Depende do sol — e a vila vive à noite.',
    },
    {
      id: 'eolica',
      icon: '🌬️',
      title: 'Eólica',
      desc: 'Vento do litoral gira turbina dia e noite. Custo alto de instalação.',
    },
    {
      id: 'termica',
      icon: '🔥',
      title: 'Térmica (backup)',
      desc: 'Liga quando precisa e segura qualquer pico. Cara e poluente.',
    },
  ],
  case2: [
    {
      id: 'trafo',
      icon: '🔌',
      title: 'Upgrade do Trafo',
      desc: 'Troca o 75 kVA por um maior. Resolve o quarteirão — custo vai à tarifa.',
    },
    {
      id: 'bateria',
      icon: '🔋',
      iconKey: 'icon_battery',
      title: 'Bateria de Bairro',
      desc: 'Armazena na madrugada, devolve no pico. Tecnologia nova e cara.',
    },
    {
      id: 'demanda',
      icon: '📉',
      title: 'Resposta da Demanda',
      desc: 'Tarifa inteligente desloca o consumo. Barata, mas exige adesão.',
    },
  ],
};

export const SAVE_KEY = 'blecaute.save.v2';
export const SAVE_KEY_LEGACY = 'blecaute.save.v1';

// ===== Hub de casos (CaseMap) =====
export interface CasePin {
  caseId?: string;
  name: string;
  x: number;
  y: number;
  comingSoon?: boolean;
  /** Caso que precisa estar resolvido para desbloquear este pin. */
  requires?: string;
}

export const CASE_PINS: CasePin[] = [
  { caseId: 'case1', name: 'Vila Aurora', x: 228, y: 582 },
  { caseId: 'case2', name: 'Centro', x: 312, y: 496, requires: 'case1' },
  { name: 'Sertão', x: 288, y: 408, comingSoon: true },
  { name: 'Norte', x: 148, y: 330, comingSoon: true },
];

export const PIN_COLORS = {
  available: 0xffd23f,
  locked: 0x3a4150,
  solved: 0x46c46e,
} as const;

// Pipeline de assets: dados em ./asset-widths (sem Phaser, p/ Node lê direto).
export { ASSET_WIDTHS, DEFAULT_ASSET_WIDTH } from './asset-widths';

// Ids de entidades cujo asset não segue a convenção chibi_<id> / prop_<id>.
export const SPRITE_ALIASES: Record<string, string> = {
  'trafo-va03': 'prop_poste_trafo',
  'trafo-quarteirao': 'prop_poste_trafo',
  'medidor-galpao': 'prop_medidor',
  'medidor-marta': 'prop_medidor',
  'medidor-padaria': 'prop_medidor',
  'curva-ct07': 'prop_medidor',
};

export const CHIBI = {
  bobPx: 2, // amplitude do idle bob
  bobMs: 800,
} as const;

// ===== Tamanho NA TELA (altura-alvo em px de mundo) =====
// A arte é processada por LARGURA (ASSET_WIDTHS) em alta resolução; o
// CaseLoader reduz cada objeto para esta altura-alvo no runtime
// (setDisplaySize), preservando o aspect ratio. Isso conserta o lampião
// gigante (alto+estreito) e os chibis minúsculos, e mantém tudo nítido.
export const ASSET_HEIGHTS: Record<string, number> = {
  // props
  prop_lamppost: 104,
  prop_poste_trafo: 132,
  prop_tree: 118,
  prop_bench: 48,
  prop_crate: 50,
  prop_hydrant: 54,
  prop_medidor: 62,
  // chibis (personagens)
  chibi_jogador: 76,
  chibi_kiko: 70,
  chibi_marta: 74,
  chibi_saci: 64,
  chibi_tonho: 72,
  chibi_cida: 74,
  chibi_nando: 74,
  chibi_regina: 74,
  // prédios NÃO entram aqui: ficam no tamanho por LARGURA (= largura do
  // colisor no JSON) para a base cobrir o footprint.
};

export const DEFAULT_PROP_HEIGHT = 64;
export const DEFAULT_CHIBI_HEIGHT = 72;

// kinds de prop sem arte própria -> reaproveitam arte existente.
export const KIND_ART: Record<string, string> = {
  barrel: 'prop_crate',
  bush: 'prop_tree', // arbusto = árvore menor (altura abaixo)
};
// altura-alvo específica por kind (sobrepõe ASSET_HEIGHTS do asset reusado).
export const KIND_HEIGHT: Record<string, number> = {
  bush: 60,
  rock: 36,
};
