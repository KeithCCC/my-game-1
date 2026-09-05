import Phaser from 'phaser';
import {
  createMeteorPaintState,
  getPowerupColor,
  resizeMeteorPaintState,
  updateMeteorPaint,
  type MeteorPaintMeteor,
  type MeteorPaintPowerup,
  type MeteorPaintSplash,
  type MeteorPaintState,
  type MeteorPaintTrailDot,
} from '../games/meteor-paint-arena';

export class MeteorPaintArenaScene extends Phaser.Scene {
  private state!: MeteorPaintState;
  private paintLayer!: Phaser.GameObjects.Graphics;
  private worldLayer!: Phaser.GameObjects.Graphics;
  private fxLayer!: Phaser.GameObjects.Graphics;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private hudRoot?: HTMLDivElement;
  private lastHudStatus = '';
  private isPaused = false;
  private burstQueued = false;

  constructor() {
    super('MeteorPaintArenaScene');
  }

  create(): void {
    this.state = createMeteorPaintState({
      width: this.scale.width,
      height: this.scale.height,
    });
    this.paintLayer = this.add.graphics().setDepth(1);
    this.worldLayer = this.add.graphics().setDepth(5);
    this.fxLayer = this.add.graphics().setDepth(10);
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard?.addKeys('W,A,S,D,P,SPACE,ENTER') as Record<string, Phaser.Input.Keyboard.Key>;
    this.createHud();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupDom());
  }

  update(_time: number, delta: number): void {
    this.syncSize();
    this.handleKeys();
    if (!this.isPaused) {
      updateMeteorPaint(this.state, delta, { ...this.getMovementInput(), burst: this.burstQueued });
    }
    this.burstQueued = false;
    this.draw();
    this.updateHud();
  }

  private syncSize(): void {
    if (this.state.width === this.scale.width && this.state.height === this.scale.height) {
      return;
    }
    resizeMeteorPaintState(this.state, this.scale.width, this.scale.height);
  }

  private handleKeys(): void {
    if (this.justDown('P')) {
      this.isPaused = !this.isPaused;
      this.updateHud(true);
    }
    if (this.justDown('SPACE') || this.justDown('ENTER')) {
      if (this.state.status === 'gameOver') {
        this.scene.restart();
      } else {
        this.burstQueued = true;
      }
    }
  }

  private justDown(key: string): boolean {
    const inputKey = this.keys?.[key];
    return Boolean(inputKey && Phaser.Input.Keyboard.JustDown(inputKey));
  }

  private getMovementInput(): { moveX: number; moveY: number } {
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
    this.paintLayer.clear();
    this.worldLayer.clear();
    this.fxLayer.clear();
    this.drawBackground();
    for (const splash of this.state.splashes) {
      this.drawSplash(splash);
    }
    for (const dot of this.state.trail) {
      this.drawTrail(dot);
    }
    for (const powerup of this.state.powerups) {
      this.drawPowerup(powerup);
    }
    for (const meteor of this.state.meteors) {
      this.drawMeteor(meteor);
    }
    this.drawPlayer();
    if (this.isPaused || this.state.status === 'gameOver') {
      this.fxLayer.fillStyle(0x070612, this.state.status === 'gameOver' ? 0.52 : 0.34);
      this.fxLayer.fillRect(0, 0, this.state.width, this.state.height);
    }
  }

  private drawBackground(): void {
    const g = this.paintLayer;
    g.fillGradientStyle(0x090712, 0x11162b, 0x141024, 0x07140f, 1);
    g.fillRect(0, 0, this.state.width, this.state.height);
    g.lineStyle(1, 0xffffff, 0.055);
    for (let x = 0; x < this.state.width; x += 42) {
      g.lineBetween(x, 0, x, this.state.height);
    }
    for (let y = 0; y < this.state.height; y += 42) {
      g.lineBetween(0, y, this.state.width, y);
    }
  }

  private drawSplash(splash: MeteorPaintSplash): void {
    const progress = splash.ageMs / splash.durationMs;
    const alpha = 0.45 * (1 - progress * 0.2);
    const pulse = 1 + Math.sin(progress * Math.PI) * 0.08;
    this.paintLayer.fillStyle(splash.color, alpha);
    this.paintLayer.fillCircle(splash.position.x, splash.position.y, splash.radius * pulse);
    this.paintLayer.lineStyle(3, splash.color, 0.36 * (1 - progress));
    this.paintLayer.strokeCircle(splash.position.x, splash.position.y, splash.radius * (0.55 + progress * 0.5));
    for (let i = 0; i < 10; i += 1) {
      const angle = splash.id * 0.33 + i * 0.628;
      const size = splash.radius * (0.1 + (i % 4) * 0.025);
      const orbit = splash.radius * (0.26 + progress * 0.62 + (i % 3) * 0.04);
      this.paintLayer.fillStyle(splash.color, 0.22 * (1 - progress));
      this.paintLayer.fillCircle(splash.position.x + Math.cos(angle) * orbit, splash.position.y + Math.sin(angle) * orbit, size);
    }
  }

  private drawTrail(dot: MeteorPaintTrailDot): void {
    const progress = dot.ageMs / dot.durationMs;
    this.paintLayer.fillStyle(dot.color, 0.28 * (1 - progress));
    this.paintLayer.fillCircle(dot.position.x, dot.position.y, 22 * (1 - progress * 0.35));
  }

  private drawMeteor(meteor: MeteorPaintMeteor): void {
    const g = this.worldLayer;
    const speed = Math.hypot(meteor.velocity.x, meteor.velocity.y) || 1;
    const tailX = meteor.position.x - (meteor.velocity.x / speed) * meteor.radius * 3.8;
    const tailY = meteor.position.y - (meteor.velocity.y / speed) * meteor.radius * 3.8;
    if (meteor.warningMs > 0) {
      g.lineStyle(2, meteor.color, 0.15 + 0.25 * Math.sin(this.state.elapsedMs * 0.02));
      g.strokeCircle(meteor.position.x, meteor.position.y, meteor.radius * 2.2);
    }
    g.lineStyle(meteor.radius * 0.8, meteor.color, 0.28);
    g.lineBetween(tailX, tailY, meteor.position.x, meteor.position.y);
    g.fillStyle(meteor.color, 0.36);
    g.fillCircle(meteor.position.x, meteor.position.y, meteor.radius * 1.55);
    g.fillStyle(0xfff7df, 1);
    g.fillCircle(meteor.position.x, meteor.position.y, meteor.radius * 0.62);
    g.lineStyle(2, meteor.color, 0.92);
    g.strokeCircle(meteor.position.x, meteor.position.y, meteor.radius);
  }

  private drawPowerup(powerup: MeteorPaintPowerup): void {
    const color = getPowerupColor(powerup.kind);
    const pulse = 1 + Math.sin(this.state.elapsedMs * 0.006 + powerup.id) * 0.16;
    const g = this.worldLayer;
    g.fillStyle(color, 0.12);
    g.fillCircle(powerup.position.x, powerup.position.y, 34 * pulse);
    g.lineStyle(3, color, 0.78);
    g.strokeCircle(powerup.position.x, powerup.position.y, powerup.radius * pulse);
    g.fillStyle(color, 1);
    if (powerup.kind === 'shield') {
      g.fillTriangle(powerup.position.x, powerup.position.y - 13, powerup.position.x - 13, powerup.position.y - 2, powerup.position.x, powerup.position.y + 15);
      g.fillTriangle(powerup.position.x, powerup.position.y - 13, powerup.position.x + 13, powerup.position.y - 2, powerup.position.x, powerup.position.y + 15);
    } else if (powerup.kind === 'haste') {
      g.fillTriangle(powerup.position.x - 11, powerup.position.y - 13, powerup.position.x + 13, powerup.position.y, powerup.position.x - 11, powerup.position.y + 13);
    } else {
      g.fillCircle(powerup.position.x, powerup.position.y, 7);
      g.lineStyle(4, color, 1);
      g.lineBetween(powerup.position.x - 14, powerup.position.y, powerup.position.x + 14, powerup.position.y);
      g.lineBetween(powerup.position.x, powerup.position.y - 14, powerup.position.x, powerup.position.y + 14);
    }
  }

  private drawPlayer(): void {
    const g = this.worldLayer;
    const player = this.state.player;
    const shielded = player.shieldMs > 0;
    const color = player.hasteMs > 0 ? 0x7cf75a : 0xf7fbf1;
    g.fillStyle(0x000000, 0.24);
    g.fillEllipse(player.position.x, player.position.y + 18, 44, 16);
    g.fillStyle(color, 1);
    g.fillTriangle(player.position.x, player.position.y - 24, player.position.x - 18, player.position.y + 18, player.position.x + 18, player.position.y + 18);
    g.fillStyle(0x35d6ff, 1);
    g.fillCircle(player.position.x, player.position.y + 2, 7);
    g.lineStyle(3, shielded ? 0x35d6ff : 0xffd166, shielded ? 0.82 : 0.3);
    g.strokeCircle(player.position.x, player.position.y, player.radius + (shielded ? 12 : 4));
  }

  private createHud(): void {
    this.hudRoot = document.createElement('div');
    this.hudRoot.className = 'meteor-hud';
    this.hudRoot.addEventListener('click', (event) => this.handleHudClick(event));
    document.getElementById('hud-root')?.appendChild(this.hudRoot);
    this.updateHud(true);
  }

  private handleHudClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const action = target.closest<HTMLButtonElement>('[data-meteor-action]')?.dataset.meteorAction;
    if (action === 'pause') {
      this.isPaused = !this.isPaused;
      this.updateHud(true);
    } else if (action === 'burst') {
      this.burstQueued = true;
    } else if (action === 'retry') {
      this.scene.restart();
    } else if (action === 'menu') {
      window.dispatchEvent(new CustomEvent('meteor-paint-menu'));
    }
  }

  private updateHud(force = false): void {
    if (!this.hudRoot) {
      return;
    }
    const hpPct = Math.max(0, this.state.player.hp / this.state.player.maxHp) * 100;
    const burstReady = this.state.player.burstCooldownMs <= 0;
    const status = [
      Math.floor(this.state.score),
      this.state.wave,
      this.state.player.hp,
      Math.ceil(this.state.player.shieldMs / 1000),
      Math.ceil(this.state.player.hasteMs / 1000),
      Math.ceil(this.state.player.burstCooldownMs / 1000),
      this.state.status,
      this.isPaused,
    ].join('|');
    if (!force && status === this.lastHudStatus) {
      return;
    }
    this.lastHudStatus = status;
    this.hudRoot.innerHTML = `
      <div class="meteor-topbar">
        <section><span>Score</span><strong>${Math.floor(this.state.score)}</strong></section>
        <section><span>Wave</span><strong>${this.state.wave}</strong></section>
        <section>
          <span>Integrity</span>
          <strong>${this.state.player.hp} / ${this.state.player.maxHp}</strong>
          <div class="meteor-meter"><div style="width:${hpPct}%"></div></div>
        </section>
        <section><span>Paint</span><strong>${this.state.splashes.length + this.state.trail.length}</strong></section>
      </div>
      <div class="meteor-actions">
        <button type="button" data-meteor-action="burst" ${burstReady && this.state.status === 'playing' ? '' : 'disabled'}>${burstReady ? 'Burst' : `${Math.ceil(this.state.player.burstCooldownMs / 1000)}s`}</button>
        <button type="button" data-meteor-action="pause">${this.isPaused ? 'Resume' : 'Pause'}</button>
        <button type="button" data-meteor-action="menu">Game Select</button>
      </div>
      <div class="meteor-help">WASD / Arrow keys move. Space triggers paint burst.</div>
      ${this.state.player.shieldMs > 0 ? '<div class="meteor-status is-shield">Shield active</div>' : ''}
      ${this.state.player.hasteMs > 0 ? '<div class="meteor-status is-haste">Haste active</div>' : ''}
      ${this.isPaused ? '<div class="meteor-center"><strong>Paused</strong><span>P or Resume to continue</span></div>' : ''}
      ${
        this.state.status === 'gameOver'
          ? `<div class="meteor-center meteor-result"><strong>Paint Complete</strong><span>Score ${Math.floor(this.state.score)}. Wave ${this.state.wave}.</span><button type="button" data-meteor-action="retry">Retry</button><button type="button" data-meteor-action="menu">Game Select</button></div>`
          : ''
      }
    `;
  }

  private cleanupDom(): void {
    this.hudRoot?.remove();
    this.hudRoot = undefined;
  }
}
