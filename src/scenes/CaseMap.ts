import Phaser from 'phaser';
import { CASE_PINS, PIN_COLORS, STRINGS, VIEW, type CasePin } from '../config';
import { centerDesign } from '../systems/Layout';
import { loadSave } from '../systems/SaveState';

type PinState = 'available' | 'locked' | 'solved';

// Polígono simplificado do Brasil (estilizado, linhas finas) em espaço 390x844.
const BRAZIL: Array<[number, number]> = [
  [150, 255],
  [210, 250],
  [258, 272],
  [305, 308],
  [330, 360],
  [322, 415],
  [300, 468],
  [285, 505],
  [262, 548],
  [232, 590],
  [205, 648],
  [172, 608],
  [150, 560],
  [128, 512],
  [98, 470],
  [108, 420],
  [92, 362],
  [128, 330],
  [138, 288],
];

const TITLE_FONT = '"Bangers", Impact, system-ui, sans-serif';

/** Hub de casos: mapa do Brasil com pins; toque num pin disponível abre o caso. */
export class CaseMap extends Phaser.Scene {
  private map!: Phaser.GameObjects.Container;
  private pinHooks: Array<{
    caseId: string | null;
    name: string;
    state: PinState;
    dx: number;
    dy: number;
  }> = [];
  private continueDesign: { x: number; y: number } | null = null;

  constructor() {
    super('CaseMap');
  }

  create(): void {
    const save = loadSave();
    const completed = new Set(save.casesCompleted);
    const W = VIEW.designWidth;

    this.cameras.main.setBackgroundColor('#05060a');
    this.cameras.main.fadeIn(250, 5, 6, 10);

    // tudo entra num container autorado em 390x844 e centralizado na viewport
    this.map = this.add.container(0, 0);
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.map.add(o);
      return o;
    };

    // título: logo de arte se existir, senão texto em Bangers
    if (this.textures.exists('logo_blecaute')) {
      add(this.add.image(W / 2, 92, 'logo_blecaute'));
    } else {
      add(
        this.add
          .text(W / 2, 92, 'BLECAUTE', {
            fontFamily: TITLE_FONT,
            fontSize: '64px',
            color: '#ffd23f',
            stroke: '#0d0a02',
            strokeThickness: 8,
          })
          .setOrigin(0.5),
      );
    }
    add(
      this.add
        .text(W / 2, 162, STRINGS.subtitle, {
          fontFamily: "system-ui, 'Segoe UI', sans-serif",
          fontSize: '16px',
          fontStyle: 'italic',
          color: '#c9c3b4',
        })
        .setOrigin(0.5),
    );

    // Brasil
    const g = this.add.graphics();
    const pts = BRAZIL.map(([x, y]) => new Phaser.Geom.Point(x, y));
    g.fillStyle(0x0c1320, 1);
    g.fillPoints(pts, true);
    g.lineStyle(2, 0x2c3a4f, 1);
    g.strokePoints(pts, true);
    add(g);

    // pins
    this.pinHooks = [];
    for (const pin of CASE_PINS) {
      const state = this.pinState(pin, completed);
      this.drawPin(add, pin, state);
      this.pinHooks.push({
        caseId: pin.caseId ?? null,
        name: pin.name,
        state,
        dx: pin.x,
        dy: pin.y,
      });
    }

    // continuar caso em andamento
    this.continueDesign = null;
    const cur = save.currentCase;
    const curProg = cur ? save.cases[cur] : undefined;
    if (cur && curProg && !curProg.solved && curProg.clues.length > 0) {
      const bx = W / 2;
      const by = 770;
      const btn = add(
        this.add.rectangle(bx, by, 240, 54, PIN_COLORS.available).setStrokeStyle(3, 0x0d0a02, 1),
      );
      add(
        this.add
          .text(bx, by, STRINGS.continueBtn, {
            fontFamily: "system-ui, 'Segoe UI', sans-serif",
            fontSize: '19px',
            fontStyle: 'bold',
            color: '#171204',
          })
          .setOrigin(0.5),
      );
      btn.setInteractive({ useHandCursor: true });
      btn.on(Phaser.Input.Events.POINTER_DOWN, () => this.launch(cur));
      this.continueDesign = { x: bx, y: by };
    }

    centerDesign(this, this.map, () => this.syncHook());
  }

  /** Coordenadas de TELA dos pins (pós-transform do container) para o e2e. */
  private syncHook(): void {
    const ox = this.map.x;
    const oy = this.map.y;
    const s = this.map.scaleX;
    (window as unknown as Record<string, unknown>).__blecauteMap = {
      pins: this.pinHooks.map((p) => ({
        caseId: p.caseId,
        name: p.name,
        state: p.state,
        x: ox + p.dx * s,
        y: oy + p.dy * s,
      })),
      continue: this.continueDesign
        ? { x: ox + this.continueDesign.x * s, y: oy + this.continueDesign.y * s }
        : null,
    };
  }

  private pinState(pin: CasePin, completed: Set<string>): PinState {
    if (pin.comingSoon || !pin.caseId) {
      return 'locked';
    }
    if (completed.has(pin.caseId)) {
      return 'solved';
    }
    if (pin.requires && !completed.has(pin.requires)) {
      return 'locked';
    }
    return 'available';
  }

  private drawPin(
    add: <T extends Phaser.GameObjects.GameObject>(o: T) => T,
    pin: CasePin,
    state: PinState,
  ): void {
    const color = PIN_COLORS[state];

    // teaser da Cuca atrás dos pins "em breve" (usa a arte cuca_teaser)
    if (pin.comingSoon && this.textures.exists('cuca_teaser')) {
      const teaser = add(
        this.add
          .image(pin.x, pin.y - 6, 'cuca_teaser')
          .setOrigin(0.5, 1)
          .setAlpha(0.45),
      );
      teaser.setDisplaySize(teaser.width * (78 / teaser.height), 78);
    }

    const circle = add(this.add.circle(pin.x, pin.y, 26, color).setStrokeStyle(3, 0x0d0a02, 1));
    const bolt = add(
      this.add
        .text(pin.x, pin.y, '⚡', {
          fontSize: '22px',
          color: state === 'available' ? '#171204' : '#e8e4d8',
        })
        .setOrigin(0.5),
    );
    const label = add(
      this.add
        .text(pin.x, pin.y + 42, pin.name, {
          fontFamily: "system-ui, 'Segoe UI', sans-serif",
          fontSize: '15px',
          fontStyle: 'bold',
          color: '#e8e4d8',
          stroke: '#10131f',
          strokeThickness: 3,
        })
        .setOrigin(0.5),
    );

    if (state === 'locked') {
      circle.setAlpha(0.75);
      bolt.setAlpha(0.55);
      label.setAlpha(0.7);
      const sub = pin.comingSoon ? STRINGS.comingSoon : STRINGS.lockedPin;
      add(
        this.add
          .text(pin.x, pin.y + 62, sub, {
            fontFamily: "system-ui, 'Segoe UI', sans-serif",
            fontSize: '13px',
            fontStyle: 'italic',
            color: '#8a8676',
          })
          .setOrigin(0.5),
      );
      return;
    }

    if (state === 'available') {
      this.tweens.add({
        targets: [circle, bolt],
        scale: { from: 1, to: 1.14 },
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    }

    const caseId = pin.caseId;
    if (caseId) {
      circle.setInteractive({ useHandCursor: true });
      circle.on(Phaser.Input.Events.POINTER_DOWN, () => this.launch(caseId));
    }
  }

  private launch(caseId: string): void {
    this.cameras.main.fadeOut(220, 5, 6, 10);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
      this.scene.start('World', { caseId }),
    );
  }
}
