import Phaser from 'phaser';
import type { Case } from '../data/schema';
import { CAMERA, PLAYER } from '../config';
import { buildWorld, loadCase } from '../systems/CaseLoader';
import { Companion } from '../systems/Companion';
import { VirtualJoystick } from '../systems/Input';

export class World extends Phaser.Scene {
  private caseData!: Case;
  private player!: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  private saci!: Companion;
  private joystick!: VirtualJoystick;

  constructor() {
    super('World');
  }

  create(): void {
    this.caseData = loadCase('case1');
    const built = buildWorld(this, this.caseData);

    const { w, h } = this.caseData.world;
    this.physics.world.setBounds(0, 0, w, h);

    this.player = this.physics.add.image(w / 2, h / 2, 'tex-player');
    this.player.body.setSize(PLAYER.bodySize, PLAYER.bodySize);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, built.colliders);

    this.cameras.main.setBounds(0, 0, w, h);
    this.cameras.main.startFollow(this.player, true, CAMERA.lerp, CAMERA.lerp);

    this.saci = new Companion(this, w / 2 + 34, h / 2 + 10);

    this.joystick = new VirtualJoystick(this);
  }

  update(_time: number, delta: number): void {
    const v = this.joystick.vector();
    this.player.setVelocity(v.x * PLAYER.speed, v.y * PLAYER.speed);
    this.player.setDepth(this.player.y + 12);
    this.saci.update(delta, this.player.x, this.player.y);
    this.joystick.update();
  }
}
