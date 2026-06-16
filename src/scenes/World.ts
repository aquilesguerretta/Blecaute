import Phaser from 'phaser';
import type { Case, ClueDef, DialoguePage, InspectableDef, NpcDef } from '../data/schema';
import {
  ASSET_HEIGHTS,
  CAMERA,
  COMPANION,
  DEFAULT_CHIBI_HEIGHT,
  EXPANSIONS,
  INTERACT,
  PLAYER,
  STRINGS,
  isDesktopPointer,
  worldZoom,
} from '../config';
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
import { UIManager } from '../ui/UIManager';

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

    this.cameras.main.setBounds(0, 0, w, h);
    this.applyView();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.applyView, this);

    this.saci = new Companion(this, w / 2 + 34, h / 2 + 10);

    this.joystick = new VirtualJoystick(this, { touchEnabled: !isDesktopPointer() });

    this.ui = new UIManager(this.game.canvas, (key) => this.textures.exists(key));
    this.ui.setTitle(this.caseData.title);
    this.dialogue = new DialogueSystem(this.ui);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.applyView, this);
      this.ui.destroy();
      this.expansion?.destroy();
      this.expansion = null;
    });

    this.journal = new ClueJournal(clueIndex(this.caseData));
    this.journal.onChange = (j) => {
      this.ui.setClues(j.count, j.total, j.unread);
      this.persist();
    };
    this.ui.setClues(this.journal.count, this.journal.total);
    this.journal.restore(this.prog.clues);
    this.ui.onCluesClick = () => {
      if (!this.ui.isModalOpen()) {
        this.ui.showJournal(this.journal.texts());
        this.journal.markAllRead();
      }
    };

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

  private talkToNpc(def: NpcDef): void {
    const portraitKey = def.portraitKey ?? `portrait_${def.id}`;
    const pages = def.dialogue.map((text) => ({
      speaker: def.name,
      text,
      color: def.color,
      portraitKey,
    }));
    this.dialogue.open(pages, () => this.collectClue(def.clue));
  }

  private inspect(def: InspectableDef): void {
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
      this.dialogue.open([this.saciPage(suspect.rebuttal ?? STRINGS.rebuttalFallback)]);
      return;
    }
    this.cameras.main.flash(220, 255, 240, 180);
    this.vibrate([40, 30, 80]);
    this.dialogue.open([this.saciPage(this.caseData.victory.reveal)], () => {
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

  /** Zoom da câmera a partir do viewport atual (chamado no create e no resize). */
  private applyView(): void {
    const { width, height } = this.scale.gameSize;
    const { w, h } = this.caseData.world;
    const cam = this.cameras.main;
    cam.setZoom(worldZoom(width, height, w, h));
    cam.startFollow(this.player, true, CAMERA.lerp, CAMERA.lerp);
    cam.setDeadzone(CAMERA.deadzoneW, CAMERA.deadzoneH);
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

  update(_time: number, delta: number): void {
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

    // desktop: E/Espaço dispara a ação contextual atual
    if (!modal && this.currentInteract && this.joystick.interactPressed()) {
      this.currentInteract.action();
    }
  }
}
