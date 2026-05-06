import Phaser from 'phaser';
import { WEAPON_DEFS } from '../game/config';
import { formatTime } from '../game/math';
import { getWeaponLevel } from '../game/progression';
import { applyUpgrade, createGameState, getAuraRadius, getCurrentWaveName, getResult, updateGame } from '../game/simulation';
import type { GameState, InputState, Projectile, UpgradeChoice } from '../game/types';

type GameSceneData = {
  debug?: boolean;
  playerGender?: 'male' | 'female';
};

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private worldGraphics!: Phaser.GameObjects.Graphics;
  private overlayGraphics!: Phaser.GameObjects.Graphics;
  private playerSprite?: Phaser.GameObjects.Image;
  private enemySprites = new Map<number, Phaser.GameObjects.Image>();
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private hudRoot?: HTMLDivElement;
  private modalRoot?: HTMLDivElement;
  private selectedChoiceIndex = 0;
  private levelUpKeyHandler?: (event: KeyboardEvent) => void;
  private isPaused = false;
  private lastHudStatus = '';

  constructor() {
    super('GameScene');
  }

  create(data: GameSceneData): void {
    this.state = createGameState({ debug: data.debug });
    this.isPaused = false;
    this.worldGraphics = this.add.graphics().setDepth(1);
    this.overlayGraphics = this.add.graphics().setDepth(30);
    this.cameras.main.setBounds(0, 0, this.state.world.width, this.state.world.height);

    const playerGender = data.playerGender ?? 'male';
    this.playerSprite = this.add.image(
      this.state.player.position.x,
      this.state.player.position.y,
      'playerCharacters',
      `${playerGender}-0`,
    );
    this.playerSprite.setDepth(20);
    this.playerSprite.setOrigin(0.5, 0.72);
    this.playerSprite.setData('gender', playerGender);

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard?.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
    this.createHud();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupDom());
  }

  update(_time: number, delta: number): void {
    if (!this.isPaused) {
      updateGame(this.state, Math.min(delta, 40), this.getInput());
    }

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
    this.drawOfficeBackground(g);
    this.drawPassiveWeaponEffects(g);

    for (const orb of this.state.xpOrbs) {
      g.fillStyle(0x8ee8ff, 0.9);
      g.fillCircle(orb.position.x, orb.position.y, orb.radius);
    }

    for (const projectile of this.state.projectiles) {
      this.drawProjectile(g, projectile);
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

    this.syncPlayerSprite();
  }

  private drawProjectile(g: Phaser.GameObjects.Graphics, projectile: Projectile): void {
    if (projectile.weaponId === 'memoBeam') {
      const length = 54;
      const speed = Math.hypot(projectile.velocity.x, projectile.velocity.y) || 1;
      const nx = projectile.velocity.x / speed;
      const ny = projectile.velocity.y / speed;
      const sx = projectile.position.x - nx * length;
      const sy = projectile.position.y - ny * length;
      g.lineStyle(7, 0xf6f0a8, 0.22);
      g.lineBetween(sx, sy, projectile.position.x, projectile.position.y);
      g.lineStyle(3, 0xfff6b8, 0.95);
      g.lineBetween(sx, sy, projectile.position.x, projectile.position.y);
      g.fillStyle(0xfff6b8, 1);
      g.fillCircle(projectile.position.x, projectile.position.y, 3);
      return;
    }

    if (projectile.weaponId === 'reminderBolt') {
      this.drawElectricBolt(g, projectile);
      return;
    }

    g.fillStyle(projectile.color, 1);
    g.fillCircle(projectile.position.x, projectile.position.y, projectile.radius);
  }

  private drawElectricBolt(g: Phaser.GameObjects.Graphics, projectile: Projectile): void {
    const speed = Math.hypot(projectile.velocity.x, projectile.velocity.y) || 1;
    const nx = projectile.velocity.x / speed;
    const ny = projectile.velocity.y / speed;
    const px = -ny;
    const py = nx;
    const length = 70;
    let lastX = projectile.position.x - nx * length;
    let lastY = projectile.position.y - ny * length;
    g.lineStyle(5, 0x7de3ff, 0.22);
    for (let i = 1; i <= 5; i += 1) {
      const t = i / 5;
      const jitter = Math.sin(this.state.elapsedMs * 0.05 + projectile.id * 1.7 + i * 2.3) * 9;
      const x = projectile.position.x - nx * length * (1 - t) + px * jitter;
      const y = projectile.position.y - ny * length * (1 - t) + py * jitter;
      g.lineBetween(lastX, lastY, x, y);
      lastX = x;
      lastY = y;
    }
    g.lineStyle(2, 0xcff7ff, 1);
    g.strokeCircle(projectile.position.x, projectile.position.y, projectile.radius + 5);
    g.fillStyle(0x7de3ff, 0.85);
    g.fillCircle(projectile.position.x, projectile.position.y, projectile.radius);
  }

  private drawPassiveWeaponEffects(g: Phaser.GameObjects.Graphics): void {
    const player = this.state.player;
    const auraRadius = getAuraRadius(this.state);
    if (auraRadius > 0) {
      const pulse = (this.state.elapsedMs % 700) / 700;
      g.fillStyle(0x9be879, 0.07);
      g.fillCircle(player.position.x, player.position.y, auraRadius);
      g.lineStyle(2, 0x9be879, 0.32);
      g.strokeCircle(player.position.x, player.position.y, auraRadius);
      g.lineStyle(3, 0xc7ff9d, 0.34 * (1 - pulse));
      g.strokeCircle(player.position.x, player.position.y, 40 + auraRadius * pulse);
    }

    const shieldLevel = getWeaponLevel(this.state, 'consensusShield');
    if (shieldLevel > 0) {
      const dots = Math.min(4, shieldLevel);
      const orbit = 30 + shieldLevel * 3;
      for (let i = 0; i < dots; i += 1) {
        const angle = this.state.elapsedMs * 0.003 + (Math.PI * 2 * i) / dots;
        g.fillStyle(0xb8e2ff, 0.92);
        g.fillCircle(player.position.x + Math.cos(angle) * orbit, player.position.y + Math.sin(angle) * orbit, 5);
      }
      g.lineStyle(2, 0xb8e2ff, 0.24);
      g.strokeCircle(player.position.x, player.position.y, orbit + 5);
    }

    const sprintLevel = getWeaponLevel(this.state, 'deckSprint');
    const input = this.getInput();
    if (sprintLevel > 0 && (Math.abs(input.moveX) > 0 || Math.abs(input.moveY) > 0)) {
      const len = Math.hypot(input.moveX, input.moveY) || 1;
      const bx = player.position.x - (input.moveX / len) * 26;
      const by = player.position.y - (input.moveY / len) * 26;
      g.fillStyle(0xffd36b, 0.18);
      g.fillCircle(bx, by, 13 + sprintLevel * 2);
      g.fillStyle(0xfff0b8, 0.14);
      g.fillCircle(bx - (input.moveX / len) * 22, by - (input.moveY / len) * 22, 8 + sprintLevel);
    }
  }

  private syncPlayerSprite(): void {
    if (!this.playerSprite) {
      return;
    }
    const player = this.state.player;
    const input = this.getInput();
    const moving = Math.abs(input.moveX) + Math.abs(input.moveY) > 0;
    const gender = this.playerSprite.getData('gender') as 'male' | 'female';
    this.playerSprite.setFrame(`${gender}-${moving ? 6 : 0}`);
    this.playerSprite.setPosition(player.position.x, player.position.y + player.radius * 0.72);
    this.playerSprite.setScale((player.radius * 3.6) / 160);
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

  private drawOfficeBackground(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x15201d, 1);
    g.fillRect(0, 0, this.state.world.width, this.state.world.height);

    g.fillStyle(0x1c2a26, 1);
    for (let x = 0; x <= this.state.world.width; x += 96) {
      for (let y = 0; y <= this.state.world.height; y += 96) {
        if ((x / 96 + y / 96) % 2 === 0) {
          g.fillRect(x, y, 96, 96);
        }
      }
    }

    g.lineStyle(1, 0x32443d, 0.5);
    for (let x = 0; x <= this.state.world.width; x += 96) {
      g.lineBetween(x, 0, x, this.state.world.height);
    }
    for (let y = 0; y <= this.state.world.height; y += 96) {
      g.lineBetween(0, y, this.state.world.width, y);
    }

    this.drawWindowBand(g);
    this.drawMeetingRoom(g, 1680, 190, 660, 360);
    this.drawWhiteboard(g, 350, 220, 360, 78);
    this.drawWhiteboard(g, 1450, 165, 180, 64);
    this.drawWhiteboard(g, 1860, 690, 330, 78);
    this.drawWhiteboard(g, 760, 1510, 320, 78);
    this.drawWhiteboard(g, 2320, 245, 210, 70);
    this.drawDeskIsland(g, 390, 560, 3, 2);
    this.drawDeskIsland(g, 1110, 590, 3, 2);
    this.drawDeskIsland(g, 550, 1180, 3, 2);
    this.drawDeskIsland(g, 1340, 1190, 3, 2);
    this.drawReceptionCounter(g, 220, 1570);
    this.drawPrinterStation(g, 2160, 1110);
    this.drawPrinterStation(g, 1880, 1450);
    this.drawStandalonePc(g, 980, 430, 0);
    this.drawStandalonePc(g, 1600, 1030, 1);
    this.drawPlant(g, 250, 340);
    this.drawPlant(g, 2360, 430);
    this.drawPlant(g, 2080, 1570);

    for (let x = 300; x < this.state.world.width; x += 520) {
      for (let y = 120; y < this.state.world.height; y += 520) {
        this.drawFluorescentLight(g, x, y);
      }
    }
  }

  private drawWindowBand(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x284743, 0.42);
    g.fillRect(0, 0, this.state.world.width, 150);
    g.lineStyle(4, 0x9fdad1, 0.28);
    for (let x = 90; x < this.state.world.width; x += 190) {
      g.strokeRect(x, 24, 130, 88);
      g.lineBetween(x + 65, 24, x + 65, 112);
    }
  }

  private drawDeskIsland(g: Phaser.GameObjects.Graphics, x: number, y: number, cols: number, rows: number): void {
    const deskW = 148;
    const deskH = 82;
    const gapX = 18;
    const gapY = 28;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        this.drawDesk(g, x + col * (deskW + gapX), y + row * (deskH + gapY), deskW, deskH, (row + col) % 3);
      }
    }
  }

  private drawDesk(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    variant = 0,
  ): void {
    g.fillStyle(0x5f5143, 1);
    g.fillRoundedRect(x, y, width, height, 6);
    g.lineStyle(2, 0x8a7a68, 0.7);
    g.strokeRoundedRect(x, y, width, height, 6);
    this.drawPcOnDesk(g, x + 18, y + 12, variant);
    this.drawPaperStack(g, x + width - 48, y + 14);
    g.fillStyle(0x263631, 1);
    g.fillRoundedRect(x + width / 2 - 22, y + height + 8, 44, 30, 5);
  }

  private drawPcOnDesk(g: Phaser.GameObjects.Graphics, x: number, y: number, variant: number): void {
    g.fillStyle(0x1b2224, 1);
    g.fillRoundedRect(x, y, variant === 1 ? 34 : 46, 30, 3);
    g.fillStyle(variant === 2 ? 0xffd36b : 0x7ed6d1, 0.72);
    g.fillRect(x + 5, y + 5, variant === 1 ? 24 : 36, 20);
    if (variant === 1) {
      g.fillStyle(0x1b2224, 1);
      g.fillRoundedRect(x + 42, y, 34, 30, 3);
      g.fillStyle(0x9be879, 0.7);
      g.fillRect(x + 47, y + 5, 24, 20);
    }
    if (variant === 2) {
      g.fillStyle(0x202a2d, 1);
      g.fillRoundedRect(x + 52, y + 7, 34, 22, 3);
    }
  }

  private drawStandalonePc(g: Phaser.GameObjects.Graphics, x: number, y: number, variant: number): void {
    g.fillStyle(0x4a4138, 1);
    g.fillRoundedRect(x, y, 170, 92, 8);
    this.drawPcOnDesk(g, x + 20, y + 18, variant);
    g.fillStyle(0x263631, 1);
    g.fillRoundedRect(x + 112, y + 18, 28, 54, 4);
  }

  private drawMeetingRoom(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number): void {
    g.fillStyle(0x203330, 0.72);
    g.fillRoundedRect(x, y, width, height, 8);
    g.lineStyle(5, 0x89b5ad, 0.34);
    g.strokeRoundedRect(x, y, width, height, 8);
    g.fillStyle(0x6b5b48, 1);
    g.fillRoundedRect(x + 110, y + 115, width - 220, 110, 10);
    g.lineStyle(2, 0x9a876d, 0.75);
    g.strokeRoundedRect(x + 110, y + 115, width - 220, 110, 10);
    g.fillStyle(0x263631, 1);
    for (let i = 0; i < 4; i += 1) {
      g.fillRoundedRect(x + 150 + i * 92, y + 72, 48, 30, 5);
      g.fillRoundedRect(x + 150 + i * 92, y + 244, 48, 30, 5);
    }
    this.drawWhiteboard(g, x + width - 220, y + 48, 150, 58);
  }

  private drawWhiteboard(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number): void {
    g.fillStyle(0xdce9e4, 0.92);
    g.fillRoundedRect(x, y, width, height, 4);
    g.lineStyle(2, 0x9bb5ae, 0.75);
    g.strokeRoundedRect(x, y, width, height, 4);
    g.lineStyle(2, 0x67847d, 0.4);
    g.lineBetween(x + 22, y + 24, x + width - 28, y + 24);
    g.lineBetween(x + 22, y + 42, x + width - 80, y + 42);
    g.fillStyle(0xe97878, 0.75);
    g.fillCircle(x + width - 32, y + height - 18, 4);
  }

  private drawReceptionCounter(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0x3d4a44, 1);
    g.fillRoundedRect(x, y, 430, 130, 8);
    g.fillStyle(0x6d7c72, 1);
    g.fillRoundedRect(x + 18, y + 18, 394, 48, 5);
    this.drawPaperStack(g, x + 300, y + 82);
  }

  private drawPrinterStation(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0x3b4641, 1);
    g.fillRoundedRect(x - 18, y - 18, 190, 136, 8);
    g.fillStyle(0xc7d1cb, 1);
    g.fillRoundedRect(x, y, 138, 86, 8);
    g.fillStyle(0x2a3432, 1);
    g.fillRect(x + 18, y + 15, 92, 14);
    g.fillStyle(0x8ca39b, 1);
    g.fillRoundedRect(x + 18, y + 42, 104, 25, 3);
    this.drawPaperStack(g, x + 118, y + 90);
    this.drawPaperStack(g, x - 8, y + 92);
  }

  private drawPaperStack(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0xe6ebdc, 0.92);
    g.fillRect(x, y, 28, 36);
    g.lineStyle(1, 0x9aa391, 0.7);
    g.lineBetween(x + 4, y + 10, x + 24, y + 10);
    g.lineBetween(x + 4, y + 20, x + 24, y + 20);
  }

  private drawPlant(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0x5f5143, 1);
    g.fillRoundedRect(x - 20, y + 28, 40, 34, 5);
    g.fillStyle(0x4c9b67, 0.92);
    g.fillCircle(x, y, 24);
    g.fillCircle(x - 20, y + 16, 18);
    g.fillCircle(x + 20, y + 16, 18);
  }

  private drawFluorescentLight(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0xf2f5dd, 0.24);
    g.fillRoundedRect(x, y, 210, 20, 10);
    g.lineStyle(1, 0xf2f5dd, 0.3);
    g.strokeRoundedRect(x, y, 210, 20, 10);
  }

  private createHud(): void {
    this.hudRoot = document.createElement('div');
    this.hudRoot.className = 'hud';
    this.hudRoot.addEventListener('click', (event) => this.handleHudClick(event));
    document.getElementById('hud-root')?.appendChild(this.hudRoot);
    this.updateHud(true);
  }

  private handleHudClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const button = target.closest<HTMLButtonElement>('[data-hud-action]');
    if (!button) {
      return;
    }
    if (button.dataset.hudAction === 'pause') {
      this.togglePause();
    }
    if (button.dataset.hudAction === 'menu') {
      this.returnToMenu();
    }
  }

  private togglePause(): void {
    if (this.state.status === 'won' || this.state.status === 'lost') {
      return;
    }
    this.isPaused = !this.isPaused;
    this.updateHud(true);
  }

  private returnToMenu(): void {
    this.cleanupDom();
    this.scene.start('MenuScene');
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
    const status = `${this.state.elapsedMs}|${this.state.player.hp}|${this.state.xp}|${this.state.level}|${this.isPaused}|${this.state.weapons.map((w) => `${w.id}:${w.level}`).join(',')}`;
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
      <div class="hud-actions">
        <button class="hud-button" type="button" data-hud-action="pause">${this.isPaused ? '再開' : 'ポーズ'}</button>
        <button class="hud-button" type="button" data-hud-action="menu">メニューに戻る</button>
      </div>
      ${this.isPaused ? '<div class="pause-banner">ポーズ中</div>' : ''}
      <div class="bottom-help">WASD / 矢印キーで移動。攻撃は自動。経験値を集めると3択。</div>
    `;
  }

  private showLevelUp(choices: UpgradeChoice[]): void {
    if (this.modalRoot) {
      return;
    }
    this.selectedChoiceIndex = 0;
    this.modalRoot = document.createElement('div');
    this.modalRoot.className = 'modal';
    this.modalRoot.innerHTML = `
      <section class="modal-panel">
        <h2 class="modal-title">レベルアップ</h2>
        <p class="modal-subtitle">左右キーで選択、Enter / Spaceで確定。</p>
        <div class="choice-grid">
          ${choices
            .map(
              (choice, index) => `
                <button class="choice-button" type="button" data-choice-index="${index}" data-upgrade="${choice.id}">
                  <small>${index + 1}</small>
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
        const index = Number(button.dataset.choiceIndex ?? 0);
        this.selectChoice(index);
        this.confirmSelectedChoice();
      });
      button.addEventListener('mouseenter', () => {
        this.selectChoice(Number(button.dataset.choiceIndex ?? 0));
      });
    });
    this.levelUpKeyHandler = (event: KeyboardEvent) => this.handleLevelUpKey(event);
    window.addEventListener('keydown', this.levelUpKeyHandler);
    this.selectChoice(0);
  }

  private handleLevelUpKey(event: KeyboardEvent): void {
    if (!this.modalRoot || this.state.status !== 'levelUp') {
      return;
    }
    const choiceCount = this.state.pendingChoices.length;
    if (choiceCount === 0) {
      return;
    }
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
      event.preventDefault();
      this.selectChoice((this.selectedChoiceIndex + choiceCount - 1) % choiceCount);
      return;
    }
    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
      event.preventDefault();
      this.selectChoice((this.selectedChoiceIndex + 1) % choiceCount);
      return;
    }
    if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') {
      event.preventDefault();
      this.selectChoice(Math.max(0, this.selectedChoiceIndex - 1));
      return;
    }
    if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') {
      event.preventDefault();
      this.selectChoice(Math.min(choiceCount - 1, this.selectedChoiceIndex + 1));
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.confirmSelectedChoice();
      return;
    }
    if (['1', '2', '3'].includes(event.key)) {
      const index = Number(event.key) - 1;
      if (index < choiceCount) {
        event.preventDefault();
        this.selectChoice(index);
        this.confirmSelectedChoice();
      }
    }
  }

  private selectChoice(index: number): void {
    if (!this.modalRoot) {
      return;
    }
    const buttons = Array.from(this.modalRoot.querySelectorAll<HTMLButtonElement>('[data-upgrade]'));
    if (buttons.length === 0) {
      return;
    }
    this.selectedChoiceIndex = Math.max(0, Math.min(index, buttons.length - 1));
    buttons.forEach((button, buttonIndex) => {
      const selected = buttonIndex === this.selectedChoiceIndex;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-selected', String(selected));
      if (selected) {
        button.focus({ preventScroll: true });
      }
    });
  }

  private confirmSelectedChoice(): void {
    const choice = this.state.pendingChoices[this.selectedChoiceIndex];
    if (!choice) {
      return;
    }
    applyUpgrade(this.state, choice.id);
    this.closeLevelUpModal();
    this.updateHud(true);
  }

  private closeLevelUpModal(): void {
    if (this.levelUpKeyHandler) {
      window.removeEventListener('keydown', this.levelUpKeyHandler);
      this.levelUpKeyHandler = undefined;
    }
    this.modalRoot?.remove();
    this.modalRoot = undefined;
  }

  private cleanupDom(): void {
    this.hudRoot?.remove();
    this.hudRoot = undefined;
    this.closeLevelUpModal();
    for (const sprite of this.enemySprites.values()) {
      sprite.destroy();
    }
    this.enemySprites.clear();
    this.playerSprite?.destroy();
    this.playerSprite = undefined;
  }
}
