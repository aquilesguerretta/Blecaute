import Phaser from 'phaser';
import type { Case } from '../data/schema';
import { buildWorld, loadCase } from '../systems/CaseLoader';

export class World extends Phaser.Scene {
  private caseData!: Case;

  constructor() {
    super('World');
  }

  create(): void {
    this.caseData = loadCase('case1');
    buildWorld(this, this.caseData);

    const { w, h } = this.caseData.world;
    this.physics.world.setBounds(0, 0, w, h);
    this.cameras.main.setBounds(0, 0, w, h);
    this.cameras.main.centerOn(w / 2, h / 2);
  }
}
