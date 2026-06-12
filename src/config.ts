// Todos os números de tuning do jogo vivem aqui.
// Conteúdo de caso (textos, posições, pistas) fica em /data/caseN.json.

export const GAME = {
  width: 390,
  height: 844,
  bg: '#05060a',
} as const;

export const PLAYER = {
  speed: 200, // px/s
  bodyW: 20, // AABB de colisão (pés)
  bodyH: 16,
  texSize: 28,
} as const;

export const CAMERA = {
  lerp: 0.09,
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
  followDist: 44, // distância alvo atrás do player
  maxSpeed: 240,
  gain: 3.4, // velocidade proporcional à distância excedente
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
  joystick: 9000,
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
} as const;

// ===== Decisões de expansão pós-caso (efeito real chega no Brief #3) =====
export interface ExpansionChoice {
  id: string;
  /** Emoji placeholder; se existir o asset card_<id>, a UI usa a imagem. */
  icon: string;
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

// ===== Pipeline de assets (scripts/process-assets.mjs lê este mapa) =====
// Largura-alvo (px) por nome de arquivo em /raw. Altura segue o aspect ratio.
export const ASSET_WIDTHS: Record<string, number> = {
  building_casa_marta: 300,
  building_galpao: 380,
  building_bar: 320,
  building_padaria: 340,
  building_sobrado: 280,
  building_centro_a: 260,
  building_centro_b: 260,
  prop_poste_trafo: 140,
  prop_medidor: 44,
  // chibis: largura pequena — a arte é alta (ratio ~1:2); altura final ~46px
  chibi_jogador: 22,
  chibi_saci: 20,
  chibi_marta: 21,
  chibi_tonho: 21,
  chibi_kiko: 18,
  chibi_cida: 21,
  chibi_nando: 21,
  chibi_regina: 21,
  portrait_saci: 256,
  portrait_marta: 256,
  portrait_tonho: 256,
  portrait_kiko: 256,
  portrait_agente: 256,
  portrait_cida: 256,
  portrait_nando: 256,
  portrait_regina: 256,
  portrait_morador: 256,
  prop_tree: 84,
  prop_bench: 64,
  prop_crate: 40,
  prop_hydrant: 30,
  prop_lamppost: 56,
  ground_vila: 512,
  logo_blecaute: 320,
  keyart_title: 780,
  cuca_teaser: 256,
  card_solar: 220,
  card_eolica: 220,
  card_termica: 220,
  icon_notebook: 64,
  icon_speech: 64,
  icon_magnifier: 64,
  icon_warning: 64,
  icon_battery: 64,
  icon_star: 64,
  ui_tablet: 512,
};

export const DEFAULT_ASSET_WIDTH = 256;

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
