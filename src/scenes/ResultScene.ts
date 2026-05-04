import Phaser from 'phaser';
import { formatTime } from '../game/math';
import type { GameResult } from '../game/types';

export class ResultScene extends Phaser.Scene {
  private root?: HTMLDivElement;

  constructor() {
    super('ResultScene');
  }

  create(result: GameResult): void {
    const won = result.status === 'won';
    this.root = document.createElement('div');
    this.root.className = 'screen';
    this.root.innerHTML = `
      <section class="screen-panel">
        <h1>${won ? '定時退社' : '稟議差し戻し'}</h1>
        <p>${won ? '終業チャイムと同時に、今日のピッチ修正を切り抜けた。' : 'カレンダーに謎の追加会議が入り、業務は翌日に持ち越された。'}</p>
        <div class="result-grid">
          <div class="result-card"><span>生存時間</span><strong>${formatTime(result.elapsedMs)}</strong></div>
          <div class="result-card"><span>到達レベル</span><strong>Lv.${result.level}</strong></div>
          <div class="result-card"><span>対応件数</span><strong>${result.defeatedEnemies}</strong></div>
        </div>
        <button class="primary-button" type="button">もう一度始業</button>
      </section>
    `;
    document.body.appendChild(this.root);
    this.root.querySelector('button')?.addEventListener('click', () => this.restart());
    this.input.keyboard?.once('keydown-ENTER', () => this.restart());
  }

  shutdown(): void {
    this.root?.remove();
    this.root = undefined;
  }

  private restart(): void {
    this.shutdown();
    this.scene.start('MenuScene');
  }
}
