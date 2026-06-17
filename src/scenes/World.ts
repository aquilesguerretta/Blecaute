import Phaser from 'phaser';
import type {
  Case,
  ClueDef,
  DeductionDef,
  DialoguePage,
  InspectableDef,
  NpcDef,
  SuspectDef,
} from '../data/schema';
import {
  ASSET_HEIGHTS,
  CAMERA,
  CHIBI,
  COMPANION,
  DEFAULT_CHIBI_HEIGHT,
  DEPTHS,
  EXPANSIONS,
  INTERACT,
  PLAYER,
  STRINGS,
  isDesktopPointer,
  worldZoom,
} from '../config';
import { addContactShadow, type ContactShadow } from '../systems/Shadow';
import { type SpawnedInspectable, type SpawnedNpc } from '../systems/CaseLoader';
import { ExpansionCard } from '../ui/ExpansionCard';

/** Move `current` em direção a `target` no máximo `maxDelta` (ease linear). */
function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) {
    return Math.min(current + maxDelta, target);
  }
  if (current > target) {
    return Math.max(current - maxDelta, target);
  }
  return target;
}
import { buildWorld, clueIndex, loadCase, type LightField } from '../systems/CaseLoader';
import { ClueJournal } from '../systems/ClueJournal';
import { Companion } from '../systems/Companion';
import { DialogueSystem } from '../systems/DialogueSystem';
import { VirtualJoystick } from '../systems/Input';
import { Interactables, type Interactable } from '../systems/Interactables';
import {
  getProgress,
  loadSave,
  writeSave,
  type CaseProgress,
  type SaveData,
} from '../systems/SaveState';
import { UIManager, type DeductionView } from '../ui/UIManager';

export class World extends Phaser.Scene {
  private caseData!: Case;
  private player!: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  private saci!: Companion;
  private joystick!: VirtualJoystick;
  private ui!: UIManager;
  private dialogue!: DialogueSystem;
  private interactables!: Interactables;
  private currentInteract: Interactable | null = null;
  private lastInteractLabel: string | null = null;
  private journal!: ClueJournal;
  private save!: SaveData;
  private prog!: CaseProgress;
  private caseId!: string;
  private lightField!: LightField;
  private expansion: ExpansionCard | null = null;
  private playerShadow!: ContactShadow;
  private npcs: SpawnedNpc[] = [];
  private grade!: Phaser.GameObjects.Rectangle;
  private vignette!: Phaser.GameObjects.Image;
  private indicators: Array<{ obj: Phaser.GameObjects.GameObject; done: () => boolean; gone: boolean }> = [];
  private talkedNpcs = new Set<string>();
  private inspectedIds = new Set<string>();

  constructor() {
    super('World');
  }

  create(data?: { caseId?: string }): void {
    this.caseId = data?.caseId ?? 'case1';
    this.caseData = loadCase(this.caseId);
    this.save = loadSave();
    this.prog = getProgress(this.save, this.caseId);
    if (!this.prog.solved) {
      this.save.currentCase = this.caseId;
    }
    this.cameras.main.fadeIn(250, 5, 6, 10);
    const built = buildWorld(this, this.caseData);
    this.lightField = built.lights;
    this.npcs = built.npcs;
    if (this.prog.solved) {
      this.lightField.solve(false);
    }

    const { w, h } = this.caseData.world;
    this.physics.world.setBounds(0, 0, w, h);

    const hasChibi = this.textures.exists('chibi_jogador');
    const playerKey = hasChibi ? 'chibi_jogador' : 'tex-player';
    this.player = this.physics.add.image(w / 2, h / 2, playerKey).setOrigin(0.5, 1);
    // reduz para a altura-alvo (arte vem em alta resolução)
    const targetH = hasChibi ? (ASSET_HEIGHTS.chibi_jogador ?? DEFAULT_CHIBI_HEIGHT) : this.player.height;
    const sc = this.player.height ? targetH / this.player.height : 1;
    this.player.setScale(sc);
    // corpo AABB nos pés: dimensões em px de fonte para que o mundo final
    // fique PLAYER.bodyW x bodyH independentemente da escala do sprite.
    const fw = this.player.width;
    const fh = this.player.height;
    const bw = PLAYER.bodyW / sc;
    const bh = PLAYER.bodyH / sc;
    this.player.body.setSize(bw, bh);
    this.player.body.setOffset((fw - bw) / 2, fh - bh);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, built.colliders);
    this.playerShadow = addContactShadow(this, this.player);

    this.cameras.main.setBounds(0, 0, w, h);
    this.cameras.main.startFollow(this.player, true, CAMERA.lerp, CAMERA.lerp);
    this.cameras.main.setDeadzone(CAMERA.deadzoneW, CAMERA.deadzoneH);

    // FX de tela: grade de cor (MULTIPLY) + vinheta, fixos na câmera, sem input
    const { width: vw, height: vh } = this.scale.gameSize;
    this.grade = this.add
      .rectangle(vw / 2, vh / 2, vw, vh, 0x1a1530, 0.18)
      .setScrollFactor(0)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setDepth(DEPTHS.grade);
    this.vignette = this.add
      .image(vw / 2, vh / 2, 'tex-vignette')
      .setScrollFactor(0)
      .setDepth(DEPTHS.vignette);
    this.fitScreenFx();

    this.applyView();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.applyView, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitScreenFx, this);

    this.saci = new Companion(this, w / 2 + 34, h / 2 + 10);

    this.joystick = new VirtualJoystick(this, { touchEnabled: !isDesktopPointer() });

    this.ui = new UIManager(this.game.canvas, (key) => this.textures.exists(key));
    this.ui.setTitle(this.caseData.title);
    this.dialogue = new DialogueSystem(this.ui);
    this.dialogue.hasClue = (id) => this.journal.has(id);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.applyView, this);
      this.scale.off(Phaser.Scale.Events.RESIZE, this.fitScreenFx, this);
      this.ui.destroy();
      this.expansion?.destroy();
      this.expansion = null;
      // limpa o gancho p/ não satisfizer gates do e2e com estado da cena morta
      delete (window as unknown as Record<string, unknown>).__blecaute;
    });

    this.journal = new ClueJournal(clueIndex(this.caseData));
    this.journal.onChange = (j) => {
      this.ui.setClues(j.count, j.total, j.unread);
      this.persist();
    };
    this.ui.setClues(this.journal.count, this.journal.total);
    this.journal.restore(this.prog.clues);
    this.ui.onCluesClick = () => this.openJournal();

    this.interactables = new Interactables();
    for (const { def } of built.npcs) {
      this.interactables.add({
        id: def.id,
        kind: 'npc',
        radius: INTERACT.radius,
        getXY: () => ({ x: def.x, y: def.y }),
        label: () => STRINGS.talk(def.name),
        action: () => this.talkToNpc(def),
      });
    }
    for (const { def } of built.inspectables) {
      this.interactables.add({
        id: def.id,
        kind: 'inspect',
        radius: INTERACT.radius,
        getXY: () => ({ x: def.x, y: def.y }),
        label: () => STRINGS.inspect,
        action: () => this.inspect(def),
      });
    }
    this.interactables.add({
      id: 'companion',
      kind: 'companion',
      radius: COMPANION.interactRadius,
      getXY: () => ({ x: this.saci.x, y: this.saci.y }),
      label: () =>
        !this.prog.solved && this.journal.count >= this.caseData.minClues
          ? STRINGS.accuse
          : STRINGS.talkCompanion,
      action: () => this.talkToSaci(),
    });
    this.ui.onInteract = () => this.currentInteract?.action();

    this.buildIndicators(built.npcs, built.inspectables);

    if (!this.prog.introSeen) {
      this.dialogue.open(this.caseData.intro, () => {
        this.prog.introSeen = true;
        this.persist();
        this.ui.toast(this.caseData.title);
      });
    }

    this.persist();

    if (isDesktopPointer()) {
      this.ui.toast(STRINGS.controlsDesktop);
    }

    // gancho somente leitura para a verificação automatizada (playwright)
    (window as unknown as Record<string, unknown>).__blecaute = {
      getState: () => ({
        x: this.player.x,
        y: this.player.y,
        caseId: this.caseId,
        clues: this.journal.count,
        solved: this.prog.solved,
        lightsOn: this.lightField.solved,
        modal: this.ui.isModalOpen(),
      }),
    };
  }

  /** Indicador flutuante "!" / lupa sobre interagíveis ainda não concluídos. */
  private buildIndicators(npcs: SpawnedNpc[], inspectables: SpawnedInspectable[]): void {
    const make = (
      x: number,
      headY: number,
      kind: 'npc' | 'inspect',
      done: () => boolean,
    ): void => {
      const iconKey = kind === 'npc' ? 'icon_speech' : 'icon_magnifier';
      let obj: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
      if (this.textures.exists(iconKey)) {
        const img = this.add.image(x, headY, iconKey).setDepth(6000);
        img.setDisplaySize(28, (28 * img.height) / img.width);
        obj = img;
      } else {
        obj = this.add
          .text(x, headY, kind === 'npc' ? '!' : '🔍', {
            fontFamily: "system-ui, 'Segoe UI', sans-serif",
            fontSize: '26px',
            fontStyle: 'bold',
            color: '#FAC775',
            stroke: '#10131f',
            strokeThickness: 4,
          })
          .setOrigin(0.5)
          .setDepth(6000);
      }
      const entry = { obj, done, gone: false };
      if (done()) {
        obj.destroy();
        entry.gone = true;
      } else {
        this.tweens.add({ targets: obj, y: headY - 8, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        this.tweens.add({ targets: obj, alpha: { from: 1, to: 0.55 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }
      this.indicators.push(entry);
    };
    for (const { def, obj } of npcs) {
      make(def.x, def.y - obj.displayHeight - 12, 'npc', () =>
        def.clue ? this.journal.has(def.clue.id) : this.talkedNpcs.has(def.id),
      );
    }
    for (const { def, obj } of inspectables) {
      make(def.x, def.y - obj.displayHeight - 12, 'inspect', () =>
        def.clue ? this.journal.has(def.clue.id) : this.inspectedIds.has(def.id),
      );
    }
  }

  private talkToNpc(def: NpcDef): void {
    this.talkedNpcs.add(def.id);
    const portraitKey = def.portraitKey ?? `portrait_${def.id}`;
    // string = página simples; objeto = página completa (choices/goto/end)
    const pages: DialoguePage[] = def.dialogue.map((d) =>
      typeof d === 'string'
        ? { speaker: def.name, text: d, color: def.color, portraitKey }
        : { portraitKey, ...d, speaker: d.speaker ?? def.name, color: d.color ?? def.color },
    );
    this.dialogue.open(pages, () => this.collectClue(def.clue));
  }

  private inspect(def: InspectableDef): void {
    this.inspectedIds.add(def.id);
    const pages = def.dialogue.map((text) => ({
      speaker: def.name,
      text,
      color: INTERACT.inspectPortrait,
      frame: 'tablet', // leitura de equipamento -> moldura de tablet
    }));
    this.dialogue.open(pages, () => this.collectClue(def.clue));
  }

  private collectClue(clue?: ClueDef): void {
    if (clue && this.journal.add(clue)) {
      this.ui.toast(STRINGS.clueAdded);
      this.vibrate(40);
    }
  }

  /** Abre o caderno com a aba de Deduções (parte F). */
  private openJournal(): void {
    if (this.ui.isModalOpen()) {
      return;
    }
    const deductions: DeductionView[] = (this.caseData.deductions ?? []).map((d) => {
      const met = d.requires.filter((r) => this.journal.has(r)).length;
      const done = this.journal.has(d.unlocks_clue);
      const available = !done && met === d.requires.length;
      return {
        line: d.saci_line,
        state: done ? 'done' : available ? 'available' : 'locked',
        met,
        total: d.requires.length,
        onConnect: available ? () => this.connectDeduction(d) : undefined,
      };
    });
    this.ui.showJournal(this.journal.texts(), deductions);
    this.journal.markAllRead();
  }

  private connectDeduction(d: DeductionDef): void {
    this.ui.hideJournal();
    this.dialogue.open([this.saciPage(d.saci_line)], () => {
      if (this.journal.add({ id: d.unlocks_clue, text: d.clue_text ?? d.saci_line })) {
        this.ui.toast(STRINGS.newDeduction);
        this.vibrate([40, 30, 80]);
      }
    });
  }

  private vibrate(pattern: number | number[]): void {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // haptics indisponível — segue sem
      }
    }
  }

  private saciPage(text: string): DialoguePage {
    return {
      speaker: COMPANION.name,
      text,
      color: COMPANION.portrait,
      portraitKey: 'portrait_saci',
    };
  }

  private suspectPage(s: SuspectDef, text: string): DialoguePage {
    return { speaker: s.name, text, color: '#7a3b3b', portraitKey: s.portraitKey };
  }

  private talkToSaci(): void {
    if (this.prog.solved) {
      // recapitula a solução depois do caso fechado
      this.dialogue.open([
        this.saciPage(this.caseData.victory.reveal),
        this.saciPage(this.caseData.victory.lesson),
      ]);
      return;
    }
    if (this.journal.count >= this.caseData.minClues) {
      this.openAccusation();
      return;
    }
    this.dialogue.open([
      this.saciPage(STRINGS.saciHint(this.journal.count, this.caseData.minClues)),
    ]);
  }

  private openAccusation(): void {
    this.ui.showAccuse(
      this.caseData.suspects,
      (id) => this.resolveAccusation(id),
      () => this.ui.hideAccuse(),
    );
  }

  private resolveAccusation(id: string): void {
    const suspect = this.caseData.suspects.find((s) => s.id === id);
    this.ui.hideAccuse();
    if (!suspect) {
      return;
    }
    if (!suspect.correct) {
      // réplica do PRÓPRIO suspeito (parte H) + comentário do Saci
      const wrong: DialoguePage[] = [];
      if (suspect.accuse_wrong) {
        wrong.push(this.suspectPage(suspect, suspect.accuse_wrong));
      }
      wrong.push(this.saciPage(suspect.rebuttal ?? STRINGS.rebuttalFallback));
      this.dialogue.open(wrong);
      return;
    }
    this.cameras.main.flash(220, 255, 240, 180);
    this.vibrate([40, 30, 80]);
    // confissão do culpado antes do reveal das luzes (parte H)
    const reveal: DialoguePage[] = [];
    if (suspect.accuse_right_confession) {
      reveal.push(this.suspectPage(suspect, suspect.accuse_right_confession));
    }
    reveal.push(this.saciPage(this.caseData.victory.reveal));
    this.dialogue.open(reveal, () => {
      this.prog.solved = true;
      if (!this.save.casesCompleted.includes(this.caseId)) {
        this.save.casesCompleted.push(this.caseId);
      }
      this.save.currentCase = null;
      this.persist();
      this.lightField.solve(true);
      this.ui.toast(STRINGS.solvedToast);
      this.ui.showVictory(
        this.caseData.title,
        this.caseData.victory.lesson,
        () => this.afterVictory(),
        suspect.portraitKey,
      );
    });
  }

  /** Pós-vitória: decisão de expansão (uma vez por caso) e volta ao mapa. */
  private afterVictory(): void {
    const choices = EXPANSIONS[this.caseId];
    if (choices && !this.save.choices[this.caseId]) {
      this.expansion = new ExpansionCard();
      this.expansion.show(
        choices,
        (key) => this.textures.exists(key),
        (choiceId) => {
          this.expansion = null;
          this.save.choices[this.caseId] = choiceId;
          this.persist();
          this.gotoMap();
        },
      );
      return;
    }
    this.gotoMap();
  }

  /** Só o zoom reage ao viewport (follow/deadzone são fixados uma vez no create). */
  private applyView(): void {
    const { width, height } = this.scale.gameSize;
    const { w, h } = this.caseData.world;
    this.cameras.main.setZoom(worldZoom(width, height, w, h));
  }

  /** Cobre a viewport com a grade de cor e a vinheta (chamado no create/resize). */
  private fitScreenFx(): void {
    const { width, height } = this.scale.gameSize;
    this.grade.setPosition(width / 2, height / 2).setSize(width, height);
    this.vignette.setPosition(width / 2, height / 2).setDisplaySize(width, height);
  }

  private gotoMap(): void {
    this.cameras.main.fadeOut(220, 5, 6, 10);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
      this.scene.start('CaseMap'),
    );
  }

  private persist(): void {
    this.prog.clues = this.journal.ids();
    writeSave(this.save);
  }

  private refreshInteract(modal: boolean): void {
    const next = modal ? null : this.interactables.closest(this.player.x, this.player.y);
    this.currentInteract = next;
    if (!next) {
      if (this.lastInteractLabel !== null) {
        this.ui.hideInteract();
        this.lastInteractLabel = null;
      }
      return;
    }
    const label = next.label();
    if (label !== this.lastInteractLabel) {
      const icon =
        next.kind === 'inspect'
          ? 'icon_magnifier'
          : label === STRINGS.accuse
            ? 'icon_warning'
            : 'icon_speech';
      this.ui.showInteract(label, icon);
      this.lastInteractLabel = label;
    }
  }

  update(time: number, delta: number): void {
    const dt = delta / 1000;
    const modal = this.ui.isModalOpen() || this.expansion !== null;
    this.joystick.setEnabled(!modal);

    const v = this.joystick.vector();
    const body = this.player.body;
    if (modal || (v.x === 0 && v.y === 0)) {
      // sem input: desacelera até parar
      body.velocity.x = approach(body.velocity.x, 0, PLAYER.decel * dt);
      body.velocity.y = approach(body.velocity.y, 0, PLAYER.decel * dt);
    } else {
      const tx = v.x * PLAYER.speed;
      const ty = v.y * PLAYER.speed;
      const rx =
        Math.sign(tx) !== Math.sign(body.velocity.x) && body.velocity.x !== 0
          ? PLAYER.accel * PLAYER.turnBoost
          : PLAYER.accel;
      const ry =
        Math.sign(ty) !== Math.sign(body.velocity.y) && body.velocity.y !== 0
          ? PLAYER.accel * PLAYER.turnBoost
          : PLAYER.accel;
      body.velocity.x = approach(body.velocity.x, tx, rx * dt);
      body.velocity.y = approach(body.velocity.y, ty, ry * dt);
      if (Math.abs(v.x) > 0.1) {
        this.player.setFlipX(v.x < 0);
      }
    }
    this.player.setDepth(this.player.y);
    this.saci.update(delta, this.player.x, this.player.y);
    this.joystick.update();
    this.refreshInteract(modal);

    // sombras de contato: player pulsa com a passada, NPCs encolhem no bob
    const moving = Math.hypot(body.velocity.x, body.velocity.y) > 20;
    const pulse = moving ? 1 - 0.06 * (0.5 + 0.5 * Math.sin(time * 0.018)) : 1;
    this.playerShadow.follow(this.player.x, this.player.y, pulse);
    for (const n of this.npcs) {
      const lift = Math.max(0, Math.min(1, (n.baseY - n.obj.y) / CHIBI.bobPx));
      n.shadow.follow(n.obj.x, n.baseY, 1 - 0.08 * lift);
      // NPC encara o jogador quando ele se aproxima
      if (Math.hypot(this.player.x - n.def.x, this.player.y - n.def.y) < INTERACT.radius + 36) {
        n.obj.setFlipX(this.player.x < n.def.x);
      }
    }

    // indicadores: somem com fade quando o objeto é concluído
    for (const it of this.indicators) {
      if (it.gone || !it.done()) {
        continue;
      }
      it.gone = true;
      this.tweens.killTweensOf(it.obj);
      this.tweens.add({
        targets: it.obj,
        alpha: 0,
        scale: 0.4,
        duration: 260,
        ease: 'Sine.In',
        onComplete: () => it.obj.destroy(),
      });
    }

    // desktop: E/Espaço dispara a ação contextual atual
    if (!modal && this.currentInteract && this.joystick.interactPressed()) {
      this.currentInteract.action();
    }
  }
}
