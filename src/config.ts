// Todos os números de tuning do jogo vivem aqui.
// Conteúdo de caso (textos, posições, pistas) fica em /data/caseN.json.

export const GAME = {
  width: 390,
  height: 844,
  bg: '#05060a',
} as const;

export const PLAYER = {
  speed: 175, // px/s
  bodySize: 22, // lado do AABB de colisão
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
  radius: 46, // raio de proximidade de NPCs/inspecionáveis
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
  clueAdded: 'Pista anotada no caderno!',
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
} as const;

export const SAVE_KEY = 'blecaute.save.v1';
