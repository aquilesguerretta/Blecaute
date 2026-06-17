// Dados do pipeline de assets — SEM importar Phaser, para que
// scripts/process-assets.mjs (Node) possa importar este módulo direto.
// Largura-alvo (px) por nome de arquivo em /raw. Altura segue o aspect ratio.
export const ASSET_WIDTHS: Record<string, number> = {
  // Hierarquia de massa coerente (largura na base isométrica). Também é a
  // largura-alvo de runtime dos prédios (fitWidth no CaseLoader) — não
  // precisa regenerar arte: a config sozinha redimensiona em cena.
  building_bar: 300,
  building_casa_marta: 300,
  building_galpao: 340,
  building_padaria: 320,
  building_sobrado: 360, // prédio alto = base mais larga
  building_centro_a: 300,
  building_centro_b: 300,
  building_delegacia: 320,
  building_fazenda: 340,
  building_subestacao: 340,
  building_casebre: 320,
  // props pequenos: processados em alta resolução p/ downscale nítido no runtime
  prop_poste_trafo: 200,
  prop_medidor: 80,
  // chibis: arte alta (ratio ~1:2); processa largo (~130px de altura) e o
  // CaseLoader reduz por altura-alvo no runtime — fica nítido em qualquer zoom
  chibi_jogador: 64,
  chibi_saci: 64,
  chibi_marta: 64,
  chibi_tonho: 64,
  chibi_kiko: 64,
  chibi_cida: 64,
  chibi_nando: 64,
  chibi_regina: 64,
  portrait_saci: 256,
  portrait_marta: 256,
  portrait_tonho: 256,
  portrait_kiko: 256,
  portrait_agente: 256,
  portrait_cida: 256,
  portrait_nando: 256,
  portrait_regina: 256,
  portrait_morador: 256,
  prop_tree: 170,
  prop_bench: 90,
  prop_crate: 85,
  prop_hydrant: 60,
  prop_lamppost: 64,
  ground_vila: 512,
  logo_blecaute: 320,
  keyart_title: 780,
  bg_title: 900, // fundo full-bleed da tela de título (quando existir o PNG)
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
