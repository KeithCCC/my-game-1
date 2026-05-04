import Phaser from 'phaser';
import { WEAPON_DEFS } from '../game/config';
import { formatTime } from '../game/math';
import { applyUpgrade, createGameState, getAuraRadius, getCurrentWaveName, getResult, updateGame } from '../game/simulation';
import type { GameState, InputState, UpgradeChoice } from '../game/types';

type GameSceneData = {
  debug?: boolean;
};

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private worldGraphics!: Phaser.GameObjects.Graphics;
  private overlayGraphics!: Phaser.GameObjects.Graphics;
  private enemySprites = new Map<number, Phaser.GameObjects.Image>();
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private hudRoot?: HTMLDivElement;
  private modalRoot?: HTMLDivElement;
  private lastHudStatus = '';

  constructor() {
    super('GameScene');
  }

  create(data: GameSceneData): void {
    this.state = createGameState({ debug: data.debug });
    this.worldGraphics = this.add.graphics();
    this.worldGraphics.setDepth(1);
    this.overlayGraphics = this.add.graphics();
    this.overlayGraphics.setDepth(30);
    this.cameras.main.setBounds(0, 0, this.state.world.width, this.state.world.height);
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard?.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
    this.createHud();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupDom());
  }

  update(_time: number, delta: number): void {
    updateGame(this.state, Math.min(delta, 40), this.getInput());

    if (this.state.status === 'levelUp') {
      this.showLevelUp(this.state.pendingChoices);
    }

    const result = getResult(this.state);
    if (result) {
      this.cleanupDom();
      this.scene.start('ResultScene', result);
      return;
    }

    this.updateCamera();
    this.renderWorld();
    this.updateHud();
  }

  private getInput(): InputState {
    const left = this.cursors?.left?.isDown || this.keys?.A?.isDown;
    const right = this.cursors?.right?.isDown || this.keys?.D?.isDown;
    const up = this.cursors?.up?.isDown || this.keys?.W?.isDown;
    const down = this.cursors?.down?.isDown || this.keys?.S?.isDown;
    return {
      moveX: (right ? 1 : 0) - (left ? 1 : 0),
      moveY: (down ? 1 : 0) - (up ? 1 : 0),
    };
  }

  private updateCamera(): void {
    this.cameras.main.centerOn(this.state.player.position.x, this.state.player.position.y);
  }

  private renderWorld(): void {
    const g = this.worldGraphics;
    const overlay = this.overlayGraphics;
    g.clear();
    overlay.clear();
    this.drawGrid(g);

    const auraRadius = getAuraRadius(this.state);
    if (auraRadius > 0) {
      g.lineStyle(2, 0x9be879, 0.34);
      g.fillStyle(0x9be879, 0.08);
      g.fillCircle(this.state.player.position.x, this.state.player.position.y, auraRadius);
      g.strokeCircle(this.state.player.position.x, this.state.player.position.y, auraRadius);
    }

    for (const orb of this.state.xpOrbs) {
      g.fillStyle(0x8ee8ff, 0.9);
      g.fillCircle(orb.position.x, orb.position.y, orb.radius);
    }

    for (const projectile of this.state.projectiles) {
      g.fillStyle(projectile.color, 1);
      g.fillCircle(projectile.position.x, projectile.position.y, projectile.radius);
    }

    this.syncEnemySprites();
    for (const enemy of this.state.enemies) {
      const hpWidth = enemy.radius * 2.2;
      overlay.fillStyle(0x101817, 0.72);
      overlay.fillRect(enemy.position.x - hpWidth / 2, enemy.position.y - enemy.radius - 34, hpWidth, 4);
      overlay.fillStyle(0xf7fbf1, 0.88);
      overlay.fillRect(
        enemy.position.x - hpWidth / 2,
        enemy.position.y - enemy.radius - 34,
        hpWidth * Math.max(0, enemy.hp / enemy.maxHp),
        4,
      );
    }

    const player = this.state.player;
    g.fillStyle(0xf7fbf1, 1);
    g.fillCircle(player.position.x, player.position.y, player.radius);
    g.fillStyle(0x17211f, 1);
    g.fillCircle(player.position.x - 6, player.position.y - 4, 3);
    g.fillCircle(player.position.x + 6, player.position.y - 4, 3);
    g.fillRect(player.position.x - 8, player.position.y + 7, 16, 3);
  }

  private syncEnemySprites(): void {
    const liveEnemyIds = new Set<number>();
    for (const enemy of this.state.enemies) {
      liveEnemyIds.add(enemy.id);
      let sprite = this.enemySprites.get(enemy.id);
      if (!sprite) {
        sprite = this.add.image(enemy.position.x, enemy.position.y, 'officeCharacters', String(enemy.frame));
        sprite.setDepth(10);
        sprite.setOrigin(0.5, 0.7);
        this.enemySprites.set(enemy.id, sprite);
      }

      const scale = (enemy.radius * 3.2) / 165;
      sprite.setFrame(String(enemy.frame));
      sprite.setPosition(enemy.position.x, enemy.position.y + enemy.radius * 0.65);
      sprite.setScale(scale);
      sprite.setAlpha(enemy.hitCooldownMs > 0 ? 0.82 : 1);
    }

    for (const [enemyId, sprite] of this.enemySprites) {
      if (!liveEnemyIds.has(enemyId)) {
        sprite.destroy();
        this.enemySprites.delete(enemyId);
      }
    }
  }

  private drawGrid(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x17211f, 1);
    g.fillRect(0, 0, this.state.world.width, this.state.world.height);
    g.lineStyle(1, 0x31413a, 0.45);
    for (let x = 0; x <= this.state.world.width; x += 120) {
      g.lineBetween(x, 0, x, this.state.world.height);
    }
    for (let y = 0; y <= this.state.world.height; y += 120) {
      g.lineBetween(0, y, this.state.world.width, y);
    }
  }

  private createHud(): void {
    this.hudRoot = document.createElement('div');
    this.hudRoot.className = 'hud';
    document.getElementById('hud-root')?.appendChild(this.hudRoot);
    this.updateHud(true);
  }

  private updateHud(force = false): void {
    if (!this.hudRoot) {
      return;
    }
    const hpPct = Math.max(0, this.state.player.hp / this.state.player.maxHp) * 100;
    const xpPct = Math.max(0, this.state.xp / this.state.xpToNext) * 100;
    const weapons = this.state.weapons
      .map((weapon) => {
        const def = WEAPON_DEFS[weapon.id];
        return `<div class="weapon-chip"><span>${def.name}</span><strong>Lv.${weapon.level}</strong></div>`;
      })
      .join('');
    const status = `${this.state.elapsedMs}|${this.state.player.hp}|${this.state.xp}|${this.state.level}|${this.state.weapons.map((w) => `${w.id}:${w.level}`).join(',')}`;
    if (!force && status === this.lastHudStatus) {
      return;
    }
    this.lastHudStatus = status;
    this.hudRoot.innerHTML = `
      <div class="topbar">
        <section class="stat-panel">
          <div class="stat-row"><span>若手社員</span><strong>Lv.${this.state.level}</strong></div>
          <div class="meter"><div class="meter-fill hp" style="width: ${hpPct}%"></div></div>
          <div class="stat-row"><span>経験値</span><strong>${this.state.xp}/${this.state.xpToNext}</strong></div>
          <div class="meter"><div class="meter-fill" style="width: ${xpPct}%"></div></div>
          <div class="stat-row"><span>局面</span><strong>${getCurrentWaveName(this.state)}</strong></div>
        </section>
        <div class="timer"><span>定時まで</span><strong>${formatTime(this.state.durationMs - this.state.elapsedMs)}</strong></div>
        <section class="weapon-panel">
          <div class="panel-title">装備中のビジネス用語</div>
          <div class="weapon-list">${weapons}</div>
        </section>
      </div>
      <div class="bottom-help">WASD / 矢印キーで移動。攻撃は自動。経験値を集めると3択。</div>
    `;
  }

  private showLevelUp(choices: UpgradeChoice[]): void {
    if (this.modalRoot) {
      return;
    }
    this.modalRoot = document.createElement('div');
    this.modalRoot.className = 'modal';
    this.modalRoot.innerHTML = `
      <section class="modal-panel">
        <h2 class="modal-title">レベルアップ</h2>
        <p class="modal-subtitle">次の会議体を乗り切るための打ち手を選ぶ。</p>
        <div class="choice-grid">
          ${choices
            .map(
              (choice) => `
                <button class="choice-button" type="button" data-upgrade="${choice.id}">
                  <strong>${choice.name} Lv.${choice.nextLevel}</strong>
                  <span>${choice.description}</span>
                </button>
              `,
            )
            .join('')}
        </div>
      </section>
    `;
    document.getElementById('hud-root')?.appendChild(this.modalRoot);
    this.modalRoot.querySelectorAll<HTMLButtonElement>('[data-upgrade]').forEach((button) => {
      button.addEventListener('click', () => {
        applyUpgrade(this.state, button.dataset.upgrade as UpgradeChoice['id']);
        this.modalRoot?.remove();
        this.modalRoot = undefined;
        this.updateHud(true);
      });
    });
  }

  private cleanupDom(): void {
    this.hudRoot?.remove();
    this.hudRoot = undefined;
    this.modalRoot?.remove();
    this.modalRoot = undefined;
    for (const sprite of this.enemySprites.values()) {
      sprite.destroy();
    }
    this.enemySprites.clear();
  }
}
