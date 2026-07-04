import Phaser from 'phaser';
import {
  createSpaceFighterState,
  getSpaceFighterLevelDef,
  skipSpaceFighterTransition,
  updateSpaceFighter,
  type SpaceFighterEnemy,
  type SpaceFighterProjectile,
  type SpaceFighterState,
} from '../games/space-fighter';

export class SpaceFighterScene extends Phaser.Scene {
  private state!: SpaceFighterState;
  private graphics!: Phaser.GameObjects.Graphics;
  private overlay!: Phaser.GameObjects.Graphics;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private hudRoot?: HTMLDivElement;
  private lastHudStatus = '';
  private isPaused = false;

  constructor() {
    super('SpaceFighterScene');
  }

  create(): void {
    this.state = createSpaceFighterState({
      width: this.scale.width,
      height: this.scale.height,
    });
    this.graphics = this.add.graphics();
    this.overlay = this.add.graphics().setDepth(10);
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard?.addKeys('W,A,S,D,P,SPACE,ENTER') as Record<string, Phaser.Input.Keyboard.Key>;
    this.createHud();
    this.input.on('pointerdown', () => this.skipTransition());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupDom());
  }

  update(_time: number, delta: number): void {
    this.syncStateSize();
    this.handleKeys();
    if (!this.isPaused) {
      updateSpaceFighter(this.state, delta, this.getInput());
    }
    this.draw();
    this.updateHud();
  }

  private syncStateSize(): void {
    if (this.state.width === this.scale.width && this.state.height === this.scale.height) {
      return;
    }
    this.state.width = this.scale.width;
    this.state.height = this.scale.height;
    this.state.groundY = this.scale.height - 64;
    this.state.player.position.x = Math.min(this.state.player.position.x, this.state.width - 85);
    this.state.player.position.y = this.state.player.canFly
      ? Math.min(this.state.player.position.y, this.state.height - 92)
      : this.state.groundY;
  }

  private handleKeys(): void {
    if (this.justDown('P')) {
      this.isPaused = !this.isPaused;
      this.updateHud(true);
    }
    if (this.justDown('SPACE') || this.justDown('ENTER')) {
      this.skipTransition();
    }
  }

  private justDown(key: string): boolean {
    const inputKey = this.keys?.[key];
    return Boolean(inputKey && Phaser.Input.Keyboard.JustDown(inputKey));
  }

  private skipTransition(): void {
    if (this.state.phase === 'transition') {
      skipSpaceFighterTransition(this.state);
      this.updateHud(true);
    }
  }

  private getInput(): { moveX: number; moveY: number } {
    const left = this.cursors?.left?.isDown || this.keys?.A?.isDown;
    const right = this.cursors?.right?.isDown || this.keys?.D?.isDown;
    const up = this.cursors?.up?.isDown || this.keys?.W?.isDown;
    const down = this.cursors?.down?.isDown || this.keys?.S?.isDown;
    return {
      moveX: (right ? 1 : 0) - (left ? 1 : 0),
      moveY: (down ? 1 : 0) - (up ? 1 : 0),
    };
  }

  private draw(): void {
    this.graphics.clear();
    this.overlay.clear();
    this.drawBackground();
    this.drawPlayer();
    for (const enemy of this.state.enemies) {
      this.drawEnemy(enemy);
    }
    for (const projectile of this.state.projectiles) {
      this.drawProjectile(projectile);
    }
    this.drawExplosions();
    this.drawForeground();
    if (this.isPaused) {
      this.overlay.fillStyle(0x02070b, 0.44);
      this.overlay.fillRect(0, 0, this.state.width, this.state.height);
    }
  }

  private drawBackground(): void {
    const g = this.graphics;
    const width = this.state.width;
    const height = this.state.height;
    const level = getSpaceFighterLevelDef(this.state.level);

    if (level.environment === 'space') {
      g.fillGradientStyle(0x02040a, 0x02040a, 0x07142b, 0x09162f, 1);
      g.fillRect(0, 0, width, height);
      for (let i = 0; i < 90; i += 1) {
        const x = (i * 137 - this.state.cameraX * (0.25 + (i % 4) * 0.12)) % (width + 80);
        const y = (i * 71) % height;
        g.fillStyle(i % 9 === 0 ? 0xf5e86b : 0xd8f4ff, i % 5 === 0 ? 0.9 : 0.48);
        g.fillCircle(x < -20 ? x + width + 80 : x, y, i % 9 === 0 ? 1.8 : 1);
      }
      return;
    }

    if (level.environment === 'sky') {
      g.fillGradientStyle(0x083152, 0x0c4a75, 0x8fc6d8, 0xcbd7c1, 1);
      g.fillRect(0, 0, width, height);
      for (let i = 0; i < 12; i += 1) {
        const x = (i * 190 - this.state.cameraX * 0.38) % (width + 240);
        const y = 70 + (i * 47) % Math.max(120, height * 0.45);
        g.fillStyle(0xf2fbff, 0.22);
        g.fillEllipse(x < -140 ? x + width + 240 : x, y, 150, 34);
      }
      return;
    }

    g.fillGradientStyle(0x2b1d2f, 0x2c2848, 0xc27148, 0xe3a65a, 1);
    g.fillRect(0, 0, width, height);
    g.fillStyle(0x643a37, 0.86);
    for (let i = 0; i < 8; i += 1) {
      const baseX = (i * 220 - this.state.cameraX * 0.42) % (width + 280);
      const x = baseX < -160 ? baseX + width + 280 : baseX;
      g.fillTriangle(x, this.state.groundY, x + 95, this.state.groundY - 118 - (i % 3) * 28, x + 205, this.state.groundY);
    }
  }

  private drawForeground(): void {
    const g = this.graphics;
    if (getSpaceFighterLevelDef(this.state.level).environment === 'space') {
      return;
    }
    g.fillStyle(0x20170f, 1);
    g.fillRect(0, this.state.groundY + 24, this.state.width, this.state.height - this.state.groundY);
    g.fillStyle(0x3d2c1b, 1);
    g.fillRect(0, this.state.groundY, this.state.width, 26);
    g.lineStyle(2, 0xf5e86b, 0.24);
    g.lineBetween(0, this.state.groundY, this.state.width, this.state.groundY);
  }

  private drawPlayer(): void {
    const g = this.graphics;
    const player = this.state.player;
    const x = player.position.x;
    const y = player.position.y;
    const flash = player.invulnerableMs > 0 && Math.floor(player.invulnerableMs / 90) % 2 === 0;
    const color = flash ? 0xffffff : 0x64d8ff;

    if (!player.canFly) {
      g.fillStyle(0x17252a, 1);
      g.fillRoundedRect(x - 34, y - 22, 68, 28, 8);
      g.fillStyle(color, 1);
      g.fillRoundedRect(x - 18, y - 38, 36, 20, 7);
      g.fillRect(x + 8, y - 31, 42, 7);
      g.fillStyle(0x0b1014, 1);
      g.fillCircle(x - 22, y + 6, 11);
      g.fillCircle(x + 22, y + 6, 11);
      return;
    }

    g.fillStyle(color, 1);
    g.fillTriangle(x + 34, y, x - 28, y - 24, x - 16, y);
    g.fillTriangle(x + 34, y, x - 28, y + 24, x - 16, y);
    g.fillStyle(0xf5e86b, 1);
    g.fillCircle(x + 10, y, 5);
    g.fillStyle(0xff6b4a, 0.78);
    g.fillTriangle(x - 28, y - 9, x - 55, y, x - 28, y + 9);
  }

  private drawEnemy(enemy: SpaceFighterEnemy): void {
    const g = this.graphics;
    const x = enemy.position.x;
    const y = enemy.position.y;
    const isBoss = enemy.isBoss;

    if (enemy.kind === 'alienTank' || enemy.kind === 'bossTank') {
      g.fillStyle(isBoss ? 0xb54b6f : 0x68d35c, 1);
      g.fillRoundedRect(x - enemy.radius, y - enemy.radius * 0.8, enemy.radius * 2, enemy.radius * 1.25, 8);
      g.fillStyle(0x17211f, 1);
      g.fillCircle(x - enemy.radius * 0.52, y + enemy.radius * 0.45, enemy.radius * 0.3);
      g.fillCircle(x + enemy.radius * 0.52, y + enemy.radius * 0.45, enemy.radius * 0.3);
      g.fillStyle(0xf5e86b, 1);
      g.fillRect(x - enemy.radius * 1.25, y - enemy.radius * 0.42, enemy.radius * 0.8, 5);
    } else if (enemy.kind === 'battleShip' || enemy.kind === 'bossDreadnought') {
      g.fillStyle(isBoss ? 0xd14f62 : 0xa485ff, 1);
      g.fillTriangle(x - enemy.radius * 1.3, y, x + enemy.radius, y - enemy.radius * 0.75, x + enemy.radius, y + enemy.radius * 0.75);
      g.fillStyle(0x101827, 1);
      g.fillRoundedRect(x - enemy.radius * 0.4, y - 6, enemy.radius * 0.9, 12, 5);
    } else {
      g.fillStyle(enemy.kind === 'alienFlyer' ? 0x73e4a2 : 0xffcc5c, 1);
      g.fillTriangle(x - 22, y, x + 18, y - 18, x + 12, y);
      g.fillTriangle(x - 22, y, x + 18, y + 18, x + 12, y);
      g.fillStyle(0x17211f, 1);
      g.fillCircle(x + 2, y, 5);
    }

    if (isBoss) {
      const width = Math.min(220, enemy.radius * 4.8);
      g.fillStyle(0x050807, 0.72);
      g.fillRect(x - width / 2, y - enemy.radius - 26, width, 6);
      g.fillStyle(0xff5d5d, 1);
      g.fillRect(x - width / 2, y - enemy.radius - 26, width * Math.max(0, enemy.hp / enemy.maxHp), 6);
    }
  }

  private drawProjectile(projectile: SpaceFighterProjectile): void {
    const g = this.graphics;
    if (projectile.weapon === 'rocket') {
      g.fillStyle(0xf5e86b, 1);
      g.fillCircle(projectile.position.x, projectile.position.y, projectile.radius);
      g.lineStyle(3, 0xff8a4a, 0.55);
      g.lineBetween(projectile.position.x - 18, projectile.position.y, projectile.position.x - 4, projectile.position.y);
      return;
    }
    g.fillStyle(projectile.owner === 'player' ? 0xd8f4ff : 0xff5d5d, 1);
    g.fillCircle(projectile.position.x, projectile.position.y, projectile.radius);
  }

  private drawExplosions(): void {
    const g = this.graphics;
    for (const explosion of this.state.explosions) {
      const progress = explosion.ageMs / explosion.durationMs;
      const radius = explosion.radius * (0.35 + progress);
      const alpha = Math.max(0, 1 - progress);
      g.lineStyle(3, 0xf5e86b, alpha);
      g.strokeCircle(explosion.position.x, explosion.position.y, radius);
      g.fillStyle(0xff8a4a, 0.18 * alpha);
      g.fillCircle(explosion.position.x, explosion.position.y, radius * 0.75);
    }
  }

  private createHud(): void {
    this.hudRoot = document.createElement('div');
    this.hudRoot.className = 'space-fighter-hud';
    this.hudRoot.addEventListener('click', (event) => this.handleHudClick(event));
    document.getElementById('hud-root')?.appendChild(this.hudRoot);
    this.updateHud(true);
  }

  private handleHudClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const action = target.closest<HTMLButtonElement>('[data-space-action]')?.dataset.spaceAction;
    if (action === 'pause') {
      this.isPaused = !this.isPaused;
      this.updateHud(true);
    } else if (action === 'retry') {
      this.scene.restart();
    } else if (action === 'menu') {
      window.dispatchEvent(new CustomEvent('space-fighter-menu'));
    }
  }

  private updateHud(force = false): void {
    if (!this.hudRoot) {
      return;
    }
    const hpPct = Math.max(0, this.state.player.hp / this.state.player.maxHp) * 100;
    const level = getSpaceFighterLevelDef(this.state.level);
    const defeated = this.state.regularDefeated + (this.state.bossDefeated ? 1 : 0);
    const spawned = this.state.regularSpawned + (this.state.bossSpawned ? 1 : 0);
    const status = [
      this.state.phase,
      this.state.level,
      this.state.transition,
      this.state.transitionTimerMs,
      this.state.player.hp,
      this.state.player.lives,
      this.state.score,
      spawned,
      defeated,
      this.isPaused,
    ].join('|');
    if (!force && status === this.lastHudStatus) {
      return;
    }
    this.lastHudStatus = status;

    const transitionText =
      this.state.transition === 'takeoff'
        ? 'Flight systems online'
        : this.state.transition === 'orbit'
          ? 'Orbital engines engaged'
          : 'Fleet destroyed';
    const result =
      this.state.phase === 'won' || this.state.phase === 'lost'
        ? `
          <div class="space-result">
            <h1>${this.state.phase === 'won' ? 'Victory' : 'Game Over'}</h1>
            <p>Score ${this.state.score}</p>
            <button type="button" data-space-action="retry">Retry</button>
            <button type="button" data-space-action="menu">Game Select</button>
          </div>
        `
        : '';

    this.hudRoot.innerHTML = `
      <div class="space-topbar">
        <section>
          <span>Level</span>
          <strong>${this.state.level} / 3</strong>
          <small>${level.name}</small>
        </section>
        <section>
          <span>Hull</span>
          <strong>${Math.max(0, Math.ceil(this.state.player.hp))}</strong>
          <div class="space-meter"><div style="width: ${hpPct}%"></div></div>
        </section>
        <section>
          <span>Lives</span>
          <strong>${this.state.player.lives}</strong>
          <small>${this.state.player.canFly ? 'Flight unlocked' : 'Ground tank'}</small>
        </section>
        <section>
          <span>Enemies</span>
          <strong>${Math.min(level.totalEnemies, defeated + this.state.enemies.length)} / ${level.totalEnemies}</strong>
          <small>${this.state.player.rocketsUnlocked ? 'Rockets ready' : 'Auto cannon'}</small>
        </section>
        <section>
          <span>Score</span>
          <strong>${this.state.score}</strong>
        </section>
      </div>
      <div class="space-actions">
        <button type="button" data-space-action="pause">${this.isPaused ? 'Resume' : 'Pause'}</button>
        <button type="button" data-space-action="menu">Game Select</button>
      </div>
      <div class="space-help">WASD / Arrow keys move. Auto-fire targets nearest enemy. P pauses.</div>
      ${
        this.state.phase === 'transition'
          ? `<div class="space-transition"><strong>${transitionText}</strong><span>Space / Enter / click to skip</span></div>`
          : ''
      }
      ${this.isPaused ? '<div class="space-transition"><strong>Paused</strong><span>P or Resume to continue</span></div>' : ''}
      ${result}
    `;
  }

  private cleanupDom(): void {
    this.hudRoot?.remove();
    this.hudRoot = undefined;
  }
}
