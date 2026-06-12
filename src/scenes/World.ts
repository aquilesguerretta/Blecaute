import Phaser from 'phaser';
import type { Case, ClueDef, DialoguePage, InspectableDef, NpcDef } from '../data/schema';
import { CAMERA, COMPANION, INTERACT, PLAYER, STRINGS } from '../config';
import { buildWorld, clueIndex, loadCase, type LightField } from '../systems/CaseLoader';
import { ClueJournal } from '../systems/ClueJournal';
import { Companion } from '../systems/Companion';
import { DialogueSystem } from '../systems/DialogueSystem';
import { VirtualJoystick } from '../systems/Input';
import { Interactables, type Interactable } from '../systems/Interactables';
import { defaultSave, loadSave, writeSave, type SaveData } from '../systems/SaveState';
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
  private state!: SaveData;
  private lightField!: LightField;

  constructor() {
    super('World');
  }

  create(data?: { caseId?: string }): void {
    this.caseData = loadCase(data?.caseId ?? 'case1');
    const save = loadSave();
    this.state = save && save.caseId === this.caseData.id ? save : defaultSave(this.caseData.id);
    const built = buildWorld(this, this.caseData);
    this.lightField = built.lights;
    if (this.state.solved) {
      this.lightField.solve(false);
    }

    const { w, h } = this.caseData.world;
    this.physics.world.setBounds(0, 0, w, h);

    const playerKey = this.textures.exists('chibi_jogador') ? 'chibi_jogador' : 'tex-player';
    this.player = this.physics.add.image(w / 2, h / 2, playerKey).setOrigin(0.5, 1);
    // corpo AABB nos pés do chibi (origem é a base do sprite)
    this.player.body.setSize(PLAYER.bodyW, PLAYER.bodyH);
    this.player.body.setOffset(
      (this.player.width - PLAYER.bodyW) / 2,
      this.player.height - PLAYER.bodyH,
    );
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, built.colliders);

    this.cameras.main.setBounds(0, 0, w, h);
    this.cameras.main.startFollow(this.player, true, CAMERA.lerp, CAMERA.lerp);

    this.saci = new Companion(this, w / 2 + 34, h / 2 + 10);

    this.joystick = new VirtualJoystick(this);

    this.ui = new UIManager(this.game.canvas, (key) => this.textures.exists(key));
    this.ui.setTitle(this.caseData.title);
    this.dialogue = new DialogueSystem(this.ui);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.ui.destroy());

    this.journal = new ClueJournal(clueIndex(this.caseData));
    this.journal.onChange = (j) => {
      this.ui.setClues(j.count, j.total);
      this.persist();
    };
    this.ui.setClues(this.journal.count, this.journal.total);
    this.journal.restore(this.state.clues);
    this.ui.onCluesClick = () => {
      if (!this.ui.isModalOpen()) {
        this.ui.showJournal(this.journal.texts());
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
        !this.state.solved && this.journal.count >= this.caseData.minClues
          ? STRINGS.accuse
          : STRINGS.talkCompanion,
      action: () => this.talkToSaci(),
    });
    this.ui.onInteract = () => this.currentInteract?.action();

    if (!this.state.introSeen) {
      this.dialogue.open(this.caseData.intro, () => {
        this.state.introSeen = true;
        this.persist();
        this.ui.toast(this.caseData.title);
      });
    }

    // gancho somente leitura para a verificação automatizada (playwright)
    (window as unknown as Record<string, unknown>).__blecaute = {
      getState: () => ({
        x: this.player.x,
        y: this.player.y,
        clues: this.journal.count,
        solved: this.state.solved,
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
    }));
    this.dialogue.open(pages, () => this.collectClue(def.clue));
  }

  private collectClue(clue?: ClueDef): void {
    if (clue && this.journal.add(clue)) {
      this.ui.toast(STRINGS.clueAdded);
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
    if (this.state.solved) {
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
    this.dialogue.open([this.saciPage(this.caseData.victory.reveal)], () => {
      this.state.solved = true;
      this.persist();
      this.lightField.solve(true);
      this.ui.showVictory(this.caseData.title, this.caseData.victory.lesson, () =>
        this.ui.toast(STRINGS.solvedToast),
      );
    });
  }

  private persist(): void {
    this.state.clues = this.journal.ids();
    writeSave(this.state);
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
      this.ui.showInteract(label);
      this.lastInteractLabel = label;
    }
  }

  update(_time: number, delta: number): void {
    const modal = this.ui.isModalOpen();
    this.joystick.setEnabled(!modal);

    const v = this.joystick.vector();
    if (modal) {
      this.player.setVelocity(0, 0);
    } else {
      this.player.setVelocity(v.x * PLAYER.speed, v.y * PLAYER.speed);
      if (Math.abs(v.x) > 0.1) {
        this.player.setFlipX(v.x < 0);
      }
    }
    this.player.setDepth(this.player.y);
    this.saci.update(delta, this.player.x, this.player.y);
    this.joystick.update();
    this.refreshInteract(modal);
  }
}
