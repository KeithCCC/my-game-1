import Phaser from 'phaser';
import characterSheetUrl from '../../assets/all-character.png';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.image('officeCharacters', characterSheetUrl);
  }

  create(): void {
    const texture = this.textures.get('officeCharacters');
    if (!texture.has('0')) {
      const frameWidth = 214;
      const frameHeight = 165;
      const startX = 233;
      const startY = 23;
      const gapX = 29;
      const gapY = 26;
      for (let row = 0; row < 5; row += 1) {
        for (let col = 0; col < 5; col += 1) {
          const frame = row * 5 + col;
          texture.add(
            String(frame),
            0,
            startX + col * (frameWidth + gapX),
            startY + row * (frameHeight + gapY),
            frameWidth,
            frameHeight,
          );
        }
      }
    }
    this.scene.start('MenuScene');
  }
}
