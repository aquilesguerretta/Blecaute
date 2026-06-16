import Phaser from 'phaser';
import case1 from '../data/case1.json';
import case2 from '../data/case2.json';
import type { Case, InspectableDef, LightDef, NpcDef } from '../data/schema';
import {
  ASSET_HEIGHTS,
  CHIBI,
  DEFAULT_CHIBI_HEIGHT,
  DEFAULT_PROP_HEIGHT,
  DEPTHS,
  KIND_ART,
  KIND_HEIGHT,
  LIGHTS,
  SPRITE_ALIASES,
  WORLD_COLORS,
} from '../config';

// Registro de casos disponíveis. Novos casos: importar o JSON e listar aqui.
const CASES: Record<string, unknown> = { case1, case2 };

export function loadCase(id: string): Case {
  const data = CASES[id];
  if (!data) {
    throw new Error(`Caso desconhecido: ${id}`);
  }
  return data as Case;
}

/** Suporte a ?case=2 (ou ?case=case2) para teste direto de um caso. */
export function caseIdFromQuery(): string | null {
  const raw = new URLSearchParams(window.location.search).get('case');
  if (!raw) {
    return null;
  }
  const id = raw.startsWith('case') ? raw : `case${raw}`;
  return CASES[id] ? id : null;
}

/** Mapa id da pista -> texto, com tudo que o caso oferece (define o total do caderno). */
export function clueIndex(c: Case): Map<string, string> {
  const map = new Map<string, string>();
  for (const npc of c.npcs) {
    if (npc.clue) {
      map.set(npc.clue.id, npc.clue.text);
    }
  }
  for (const ins of c.inspectables) {
    if (ins.clue) {
      map.set(ins.clue.id, ins.clue.text);
    }
  }
  return map;
}

export interface SpawnedNpc {
  def: NpcDef;
  obj: Phaser.GameObjects.Image;
}

export interface SpawnedInspectable {
  def: InspectableDef;
  obj: Phaser.GameObjects.Image;
}

export interface BuiltWorld {
  colliders: Phaser.GameObjects.Rectangle[];
  lights: LightField;
  npcs: SpawnedNpc[];
  inspectables: SpawnedInspectable[];
}

// placeholders por kind quando não existe asset prop_<kind>
const PROP_TEX: Record<string, string> = {
  tree: 'tex-tree',
  bush: 'tex-bush',
  rock: 'tex-rock',
  barrel: 'tex-barrel',
  bench: 'tex-barrel',
  crate: 'tex-barrel',
  hydrant: 'tex-device',
};

/**
 * Redimensiona a imagem para uma altura-alvo (px de mundo) preservando o
 * aspect ratio. A arte vem em alta resolução e é reduzida aqui — único
 * lugar que define o tamanho na tela, então proporções ficam coerentes.
 */
function fitHeight(img: Phaser.GameObjects.Image, targetH: number): void {
  if (!targetH || !img.height) {
    return;
  }
  img.setDisplaySize(img.width * (targetH / img.height), targetH);
}

function heightFor(key: string, fallback: number): number {
  return ASSET_HEIGHTS[key] ?? fallback;
}

interface LabelOpts {
  size: number;
  wrap?: number;
  middle?: boolean;
}

function addLabel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  depth: number,
  opts: LabelOpts,
): Phaser.GameObjects.Text {
  const t = scene.add
    .text(x, y, text, {
      fontFamily: "system-ui, 'Segoe UI', sans-serif",
      fontSize: `${opts.size}px`,
      color: WORLD_COLORS.label,
      stroke: WORLD_COLORS.labelStroke,
      strokeThickness: 3,
      align: 'center',
    })
    .setOrigin(0.5, opts.middle ? 0.5 : 1)
    .setDepth(depth);
  if (opts.wrap) {
    t.setWordWrapWidth(opts.wrap);
  }
  return t;
}

/**
 * Placeholder de NPC quando não há arte de chibi: uma figurinha (corpo +
 * cabeça) na cor do personagem — lê como "pessoa", não como bolha chapada
 * (tint não é confiável no renderer Canvas, por isso desenhamos colorido).
 */
function npcTexture(scene: Phaser.Scene, id: string, colorHex: string): string {
  const key = `tex-npc-${id}`;
  if (scene.textures.exists(key)) {
    return key;
  }
  const c = Phaser.Display.Color.HexStringToColor(colorHex);
  const color = c.color;
  const dark = c.clone().darken(28).color;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  // corpo (tronco arredondado)
  g.fillStyle(WORLD_COLORS.npcOutline, 1);
  g.fillRoundedRect(6, 22, 28, 32, 9);
  g.fillStyle(color, 1);
  g.fillRoundedRect(8, 24, 24, 28, 8);
  g.fillStyle(dark, 1);
  g.fillRoundedRect(8, 44, 24, 8, 4); // sombra dos pés
  // cabeça
  g.fillStyle(WORLD_COLORS.npcOutline, 1);
  g.fillCircle(20, 14, 13);
  g.fillStyle(color, 1);
  g.fillCircle(20, 14, 11);
  g.generateTexture(key, 40, 56);
  g.destroy();
  return key;
}

/** Monta o mundo inteiro a partir do JSON do caso. Nada de conteúdo hardcoded. */
export function buildWorld(scene: Phaser.Scene, c: Case): BuiltWorld {
  const { w, h } = c.world;

  // chão: tile de arte se existir; senão cor chapada + pontilhado
  if (scene.textures.exists('ground_vila')) {
    scene.add.tileSprite(w / 2, h / 2, w, h, 'ground_vila').setDepth(DEPTHS.ground);
  } else {
    scene.add.rectangle(w / 2, h / 2, w, h, WORLD_COLORS.ground).setDepth(DEPTHS.ground);
    const deco = scene.add.graphics().setDepth(DEPTHS.deco);
    deco.fillStyle(WORLD_COLORS.groundDot, 1);
    for (let y = 40; y < h; y += 88) {
      const offset = ((y / 88) % 2) * 44;
      for (let x = 40 + offset; x < w; x += 88) {
        deco.fillCircle(x, y, 3);
      }
    }
  }
  scene.add
    .rectangle(w / 2, h / 2, w - 4, h - 4, 0, 0)
    .setStrokeStyle(3, WORLD_COLORS.border, 1)
    .setDepth(DEPTHS.deco);

  // prédios: arte ancorada na base + colisor AABB do JSON (a base, não o telhado)
  const colliders: Phaser.GameObjects.Rectangle[] = [];
  for (const b of c.world.buildings) {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const baseY = b.y + b.h;
    const hasArt = !!(b.spriteKey && scene.textures.exists(b.spriteKey));
    let collider: Phaser.GameObjects.Rectangle;
    if (hasArt) {
      // prédios mantêm a LARGURA da arte (= largura do colisor no JSON), então
      // a base cobre o footprint — não usar altura-alvo aqui (criaria paredes
      // invisíveis quando a arte ficasse mais estreita que o colisor).
      const img = scene.add.image(cx, baseY, b.spriteKey!).setOrigin(0.5, 1).setDepth(baseY);
      collider = scene.add.rectangle(cx, cy, b.w, b.h); // invisível, só física
      addLabel(scene, cx, baseY - img.displayHeight - 6, b.name, baseY + 1, {
        size: 13,
        wrap: b.w + 40,
      });
    } else {
      collider = scene.add
        .rectangle(cx, cy, b.w, b.h, WORLD_COLORS.building)
        .setStrokeStyle(2, WORLD_COLORS.buildingLine, 1)
        .setDepth(baseY);
      scene.add
        .rectangle(cx, cy - 8, b.w - 16, b.h - 26, WORLD_COLORS.buildingTop)
        .setDepth(baseY + 0.5);
      addLabel(scene, cx, cy, b.name, baseY + 1, { size: 13, wrap: b.w - 14, middle: true });
    }
    scene.physics.add.existing(collider, true);
    colliders.push(collider);
  }

  // props decorativos (asset prop_<kind> com fallback de placeholder)
  for (const p of c.world.props) {
    if (p.kind === 'doorglow') {
      const glow = scene.add.rectangle(p.x, p.y, 8, 4, 0xffa726).setDepth(p.y + 1);
      scene.tweens.add({
        targets: glow,
        alpha: { from: 0.3, to: 0.7 },
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
      continue;
    }
    const artKey = KIND_ART[p.kind] ?? `prop_${p.kind}`;
    const key = scene.textures.exists(artKey) ? artKey : (PROP_TEX[p.kind] ?? 'tex-rock');
    const propImg = scene.add.image(p.x, p.y, key).setOrigin(0.5, 1).setDepth(p.y);
    fitHeight(propImg, KIND_HEIGHT[p.kind] ?? heightFor(key, DEFAULT_PROP_HEIGHT));
  }

  // postes de luz com flicker (param de piscar quando o caso é resolvido)
  const lights = new LightField(scene, c.world.lights);

  // NPCs: chibi de arte (chibi_<id> ou alias) com fallback de círculo colorido
  const npcs: SpawnedNpc[] = [];
  for (const n of c.npcs) {
    const chibiKey = SPRITE_ALIASES[n.id] ?? `chibi_${n.id}`;
    const hasChibi = scene.textures.exists(chibiKey);
    const key = hasChibi ? chibiKey : npcTexture(scene, n.id, n.color);
    const obj = scene.add.image(n.x, n.y, key).setOrigin(0.5, 1).setDepth(n.y);
    fitHeight(obj, hasChibi ? heightFor(chibiKey, DEFAULT_CHIBI_HEIGHT) : DEFAULT_CHIBI_HEIGHT);
    scene.tweens.add({
      targets: obj,
      y: n.y - CHIBI.bobPx,
      duration: CHIBI.bobMs,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    addLabel(scene, n.x, n.y - obj.displayHeight - 8, n.name, n.y + 1, { size: 14 });
    npcs.push({ def: n, obj });
  }

  // inspecionáveis: asset via alias/prop_<id>, fallback device placeholder
  const inspectables: SpawnedInspectable[] = [];
  for (const i of c.inspectables) {
    const artKey = SPRITE_ALIASES[i.id] ?? `prop_${i.id}`;
    const hasArt = scene.textures.exists(artKey);
    const key = hasArt ? artKey : 'tex-device';
    const obj = scene.add.image(i.x, i.y, key).setOrigin(0.5, 1).setDepth(i.y);
    fitHeight(obj, hasArt ? heightFor(artKey, DEFAULT_PROP_HEIGHT) : DEFAULT_PROP_HEIGHT);
    addLabel(scene, i.x, i.y - obj.displayHeight - 6, i.name, i.y + 1, { size: 14, wrap: 150 });
    inspectables.push({ def: i, obj });
  }

  return { colliders, lights, npcs, inspectables };
}

interface LightParts {
  post: Phaser.GameObjects.Image;
  isArt: boolean;
  /** Só nos postes placeholder; a arte do lampião já tem o lampião aceso. */
  lamp?: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  timer?: Phaser.Time.TimerEvent;
}

/** Conjunto de postes do mapa: pisca enquanto o caso está aberto, acende ao resolver. */
export class LightField {
  private scene: Phaser.Scene;
  private parts: LightParts[] = [];
  private isSolved = false;

  constructor(scene: Phaser.Scene, defs: LightDef[]) {
    this.scene = scene;
    const hasArt = scene.textures.exists('prop_lamppost');
    for (const d of defs) {
      const post = scene.add
        .image(d.x, d.y, hasArt ? 'prop_lamppost' : 'tex-pole')
        .setOrigin(0.5, 1)
        .setDepth(d.y);
      if (hasArt) {
        fitHeight(post, heightFor('prop_lamppost', 104));
      }
      // posição da cabeça do lampião (perto do topo da arte)
      const lampY = d.y - post.displayHeight + (hasArt ? 14 : 6);
      // a arte do lampião JÁ tem o foco aceso — não empilhar tex-lamp por cima.
      const lamp = hasArt ? undefined : scene.add.image(d.x, lampY, 'tex-lamp').setDepth(d.y);
      const glow = scene.add
        .image(d.x, lampY, 'tex-glow')
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(DEPTHS.glow);
      if (hasArt) {
        glow.setScale((post.displayHeight * 0.75) / glow.height);
      }
      const p: LightParts = { post, isArt: hasArt, lamp, glow };
      this.parts.push(p);
      this.schedule(p);
    }
  }

  get solved(): boolean {
    return this.isSolved;
  }

  private schedule(p: LightParts): void {
    const delay = Phaser.Math.Between(LIGHTS.flickerMin, LIGHTS.flickerMax);
    p.timer = this.scene.time.delayedCall(delay, () => {
      if (this.isSolved) {
        return;
      }
      const blackout = Math.random() < LIGHTS.blackoutChance;
      const a = blackout ? 0.06 : 0.35 + Math.random() * 0.65;
      p.lamp?.setAlpha(a);
      p.glow.setAlpha(a * LIGHTS.glowAlphaScale);
      // postes de arte: escurece levemente a arte no apagão (sem tint)
      if (p.isArt) {
        p.post.setAlpha(blackout ? 0.62 : 0.86 + a * 0.14);
      }
      this.schedule(p);
    });
  }

  solve(animated: boolean): void {
    if (this.isSolved) {
      return;
    }
    this.isSolved = true;
    for (const p of this.parts) {
      p.timer?.remove(false);
      const lit: Phaser.GameObjects.Image[] = [p.glow];
      if (p.lamp) {
        lit.push(p.lamp);
      }
      if (animated) {
        if (p.lamp) {
          this.scene.tweens.add({ targets: p.lamp, alpha: 1, duration: LIGHTS.solveTweenMs, ease: 'Sine.Out' });
        }
        this.scene.tweens.add({
          targets: p.glow,
          alpha: LIGHTS.glowAlphaScale + 0.1,
          duration: LIGHTS.solveTweenMs,
          ease: 'Sine.Out',
        });
        if (p.isArt) {
          this.scene.tweens.add({ targets: p.post, alpha: 1, duration: LIGHTS.solveTweenMs, ease: 'Sine.Out' });
        }
      } else {
        p.lamp?.setAlpha(1);
        p.glow.setAlpha(LIGHTS.glowAlphaScale + 0.1);
        if (p.isArt) {
          p.post.setAlpha(1);
        }
      }
    }
  }
}
