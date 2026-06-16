import Phaser from 'phaser';
import { VIEW } from '../config';

/**
 * Centraliza e escala um container autorado em VIEW.designWidth x designHeight
 * para caber na viewport atual (letterbox por layout, não por canvas), e
 * re-aplica no resize. Remove o listener no SHUTDOWN. `onLayout` roda após
 * cada ajuste (ex.: recalcular coordenadas de tela p/ o e2e).
 */
export function centerDesign(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  onLayout?: () => void,
): void {
  const layout = (): void => {
    const { width, height } = scene.scale.gameSize;
    const s = Math.min(width / VIEW.designWidth, height / VIEW.designHeight);
    container.setScale(s);
    container.setPosition((width - VIEW.designWidth * s) / 2, (height - VIEW.designHeight * s) / 2);
    onLayout?.();
  };
  layout();
  scene.scale.on(Phaser.Scale.Events.RESIZE, layout);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
    scene.scale.off(Phaser.Scale.Events.RESIZE, layout),
  );
}
