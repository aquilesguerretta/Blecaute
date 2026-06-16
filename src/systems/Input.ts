import Phaser from 'phaser';
import { DEPTHS, JOYSTICK } from '../config';

/**
 * Joystick flutuante estilo Among Us: o primeiro toque em qualquer ponto do
 * canvas vira a base do stick; o polegar fica limitado a JOYSTICK.cap px.
 * Teclado (WASD/setas) é fallback para desktop e testes automatizados.
 */
export class VirtualJoystick {
  private scene: Phaser.Scene;
  private gfx: Phaser.GameObjects.Graphics;
  private keys: Record<string, Phaser.Input.Keyboard.Key> | null = null;
  private pointerId: number | null = null;
  private base = new Phaser.Math.Vector2();
  private stick = new Phaser.Math.Vector2();
  private out = new Phaser.Math.Vector2();
  private enabled = true;
  private touchEnabled: boolean;

  constructor(scene: Phaser.Scene, opts?: { touchEnabled?: boolean }) {
    this.scene = scene;
    this.touchEnabled = opts?.touchEnabled ?? true;
    this.gfx = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.joystick);
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    const kb = scene.input.keyboard;
    if (kb) {
      this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE') as Record<
        string,
        Phaser.Input.Keyboard.Key
      >;
    }
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  /** true no frame em que E/Espaço é pressionado (interação no desktop). */
  interactPressed(): boolean {
    if (!this.enabled || !this.keys) {
      return false;
    }
    return (
      Phaser.Input.Keyboard.JustDown(this.keys.E) ||
      Phaser.Input.Keyboard.JustDown(this.keys.SPACE)
    );
  }

  /** Desativa durante overlays modais; solta o stick atual. */
  setEnabled(v: boolean): void {
    this.enabled = v;
    if (!v) {
      this.pointerId = null;
    }
  }

  /** Vetor de movimento com magnitude 0..1. */
  vector(): Phaser.Math.Vector2 {
    this.out.set(0, 0);
    if (!this.enabled) {
      return this.out;
    }
    if (this.pointerId !== null) {
      const dx = this.stick.x - this.base.x;
      const dy = this.stick.y - this.base.y;
      const len = Math.hypot(dx, dy);
      if (len > JOYSTICK.deadzone) {
        const mag = Math.min(len, JOYSTICK.cap) / JOYSTICK.cap;
        this.out.set((dx / len) * mag, (dy / len) * mag);
      }
      return this.out;
    }
    if (this.keys) {
      const k = this.keys;
      const x = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.A.isDown ? 1 : 0);
      const y = (k.DOWN.isDown || k.S.isDown ? 1 : 0) - (k.UP.isDown || k.W.isDown ? 1 : 0);
      if (x !== 0 || y !== 0) {
        this.out.set(x, y).normalize();
      }
    }
    return this.out;
  }

  /** Redesenha base + polegar; chamar todo frame. */
  update(): void {
    this.gfx.clear();
    if (this.pointerId === null || !this.enabled) {
      return;
    }
    const dx = this.stick.x - this.base.x;
    const dy = this.stick.y - this.base.y;
    const len = Math.hypot(dx, dy);
    let tx = this.stick.x;
    let ty = this.stick.y;
    if (len > JOYSTICK.cap) {
      tx = this.base.x + (dx / len) * JOYSTICK.cap;
      ty = this.base.y + (dy / len) * JOYSTICK.cap;
    }
    this.gfx.fillStyle(JOYSTICK.color, JOYSTICK.baseAlpha);
    this.gfx.fillCircle(this.base.x, this.base.y, JOYSTICK.baseRadius);
    this.gfx.lineStyle(2, JOYSTICK.color, JOYSTICK.baseAlpha + 0.1);
    this.gfx.strokeCircle(this.base.x, this.base.y, JOYSTICK.baseRadius);
    this.gfx.fillStyle(JOYSTICK.color, JOYSTICK.thumbAlpha);
    this.gfx.fillCircle(tx, ty, JOYSTICK.thumbRadius);
  }

  private onDown(p: Phaser.Input.Pointer): void {
    // no desktop (mouse) o stick não nasce; teclado cuida do movimento
    if (!this.touchEnabled || !this.enabled || this.pointerId !== null) {
      return;
    }
    this.pointerId = p.id;
    this.base.set(p.x, p.y);
    this.stick.set(p.x, p.y);
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id === this.pointerId) {
      this.stick.set(p.x, p.y);
    }
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id === this.pointerId) {
      this.pointerId = null;
    }
  }

  private teardown(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
  }
}
