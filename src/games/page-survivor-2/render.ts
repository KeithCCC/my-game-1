import playerUrl from '../../../assets/player-characters.png';
import enemyUrl from '../../../assets/all-character.png';
import { clamp, UPGRADES, WORLD, type Run } from './model';
import { orbitRadius } from './combat';
import { isEvolved } from './progression';

export type Gender = 'male' | 'female';
export class AstraRenderer {
  private ctx: CanvasRenderingContext2D;
  private player = new Image();
  private enemies = new Image();
  private width = 1;
  private height = 1;
  private dpr = 1;
  private zoom = 1;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  ready: Promise<void>;

  constructor(private canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable');
    this.ctx = context;
    this.ready = Promise.all([this.load(this.player, playerUrl), this.load(this.enemies, enemyUrl)]).then(() => {});
    this.resize();
  }
  private load(image: HTMLImageElement, url: string): Promise<void> {
    return new Promise((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('キャラクター画像を読み込めませんでした。')); image.src = url; });
  }
  resize(): void {
    const r = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, r.width); this.height = Math.max(1, r.height);
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.width * this.dpr); this.canvas.height = Math.round(this.height * this.dpr);
    this.zoom = clamp(this.width / 1180, .65, 1.25);
  }
  draw(s: Run, gender: Gender, moving: boolean): void {
    const c = this.ctx;
    const vw = this.width / this.zoom, vh = this.height / this.zoom;
    const camX = clamp(s.player.x - vw / 2, -30, Math.max(-30, WORLD.width - vw + 30));
    const camY = clamp(s.player.y - vh / 2, -30, Math.max(-30, WORLD.height - vh + 30));
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = '#091a1b'; c.fillRect(0, 0, this.width, this.height);
    c.scale(this.zoom, this.zoom);
    c.translate(-camX, -camY);
    if (s.shake > 0 && !this.reduced) c.translate(Math.sin(s.time * 110) * 3, Math.cos(s.time * 100) * 3);
    this.office(camX, camY, vw, vh);
    for (const p of s.pickups) {
      if (p.x < camX - 50 || p.x > camX + vw + 50 || p.y < camY - 50 || p.y > camY + vh + 50) continue;
      const bob = this.reduced ? 0 : Math.sin(s.time * 3 + p.id) * 2;
      c.save(); c.translate(p.x, p.y + bob);
      if (p.kind === 'xp') {
        c.fillStyle = p.value > 5 ? '#d7afff' : '#76dfc7';
        c.beginPath(); c.moveTo(0, -6); c.lineTo(4, 0); c.lineTo(0, 6); c.lineTo(-4, 0); c.closePath(); c.fill();
        c.fillStyle = '#d9fff4'; c.fillRect(-1, -3, 2, 4);
      } else {
        const color = p.kind === 'coffee' ? '#ffcc87' : p.kind === 'chest' ? '#ffe496' : '#cdb1ff';
        c.fillStyle = '#12292b'; c.strokeStyle = color; c.lineWidth = 2;
        c.beginPath(); c.arc(0, 0, 19, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = color; c.font = 'bold 21px sans-serif'; c.textAlign = 'center';
        c.fillText(p.kind === 'coffee' ? '☕' : p.kind === 'chest' ? '▣' : '◇', 0, 7);
      }
      c.restore();
    }
    for (const h of s.hazards) {
      c.save(); c.translate(h.x, h.y); c.rotate(h.angle);
      const warning = h.warning > 0;
      c.strokeStyle = '#ff9292'; c.fillStyle = warning ? 'rgba(255,103,112,.13)' : 'rgba(255,120,128,.65)';
      c.lineWidth = warning ? 2 : 4;
      c.setLineDash(warning ? [8, 5] : []);
      if (h.kind === 'lane') {
        c.fillRect(0, -h.width / 2, h.length, h.width); c.strokeRect(0, -h.width / 2, h.length, h.width);
        c.setLineDash([]); c.beginPath(); c.moveTo(h.length - 28, -12); c.lineTo(h.length - 10, 0); c.lineTo(h.length - 28, 12); c.stroke();
      } else {
        c.beginPath(); c.arc(0, 0, h.radius, h.kind === 'volley' ? .5 : 0, h.kind === 'volley' ? Math.PI * 2 - .5 : Math.PI * 2); c.stroke();
        if (h.kind === 'circle') c.fill();
        c.setLineDash([]);
        if (warning && h.kind === 'circle') { c.beginPath(); c.arc(0, 0, h.radius * clamp(1 - h.warning / 1.15, 0, 1), 0, Math.PI * 2); c.stroke(); }
      }
      c.restore();
    }
    const orbit = s.levels.orbit;
    if (orbit) {
      const radius = orbitRadius(s), evolved = isEvolved(s, 'orbit');
      c.strokeStyle = evolved ? '#75e6c888' : '#75e6c83a'; c.lineWidth = evolved ? 3 : 1;
      c.beginPath(); c.arc(s.player.x, s.player.y, radius, 0, Math.PI * 2); c.stroke();
      if (evolved) { c.fillStyle = '#75e6c810'; c.fill(); }
      const count = 2 + Math.floor(orbit / 2);
      for (let i = 0; i < count; i++) {
        const a = s.time * 2.4 + i * Math.PI * 2 / count;
        c.save(); c.translate(s.player.x + Math.cos(a) * radius, s.player.y + Math.sin(a) * radius); c.rotate(a);
        c.fillStyle = '#baf9e6'; c.fillRect(-9, -12, 18, 24); c.fillStyle = '#3a8277'; c.fillRect(-5, -5, 10, 2); c.fillRect(-5, 0, 7, 2); c.restore();
      }
    }
    const actors = [...s.enemies.map(e => ({ y: e.y, enemy: e })), { y: s.player.y, enemy: undefined }].sort((a, b) => a.y - b.y);
    for (const { enemy: e } of actors) {
      if (!e) { this.drawPlayer(s, gender, moving); continue; }
      if (e.x < camX - 100 || e.x > camX + vw + 100 || e.y < camY - 100 || e.y > camY + vh + 100) continue;
      const size = e.boss ? 106 + e.boss * 9 : e.kind === 3 ? 68 : 54;
      this.shadow(e.x, e.y + 5, size * .4);
      if (e.boss) {
        c.strokeStyle = e.hp < e.maxHp * .5 ? '#ff8b91' : '#ffd278'; c.lineWidth = 2;
        c.beginPath(); c.ellipse(e.x, e.y + 4, size * .55, size * .24, 0, 0, Math.PI * 2); c.stroke();
        if ((e.shield ?? 0) > 0) { c.strokeStyle = '#ffe5a3aa'; c.beginPath(); c.arc(e.x, e.y - size * .3, size * .6, 0, Math.PI * 2); c.stroke(); }
      }
      c.save(); c.globalAlpha = e.flash ? .6 : 1;
      if (this.enemies.complete && this.enemies.naturalWidth) {
        const pose = e.boss && e.cooldown < 1 ? 3 : Math.floor(s.time * 2 + e.id) % 2;
        c.imageSmoothingEnabled = false;
        c.drawImage(this.enemies, 237 + pose * 243, 27 + Math.min(4, e.kind) * 191, 204, 157, e.x - size / 2, e.y - size * .82, size, size * .8);
      }
      c.restore();
      if (!e.boss && e.hp < e.maxHp) {
        c.fillStyle = '#092022'; c.fillRect(e.x - 18, e.y - size * .87, 36, 3);
        c.fillStyle = '#ffb48b'; c.fillRect(e.x - 18, e.y - size * .87, 36 * Math.max(0, e.hp / e.maxHp), 3);
      }
    }
    for (const b of s.shots) {
      c.strokeStyle = b.color; c.lineWidth = b.radius * (b.enemy ? 1 : .8); c.lineCap = 'round';
      c.beginPath(); c.moveTo(b.x - b.vx * .025, b.y - b.vy * .025); c.lineTo(b.x, b.y); c.stroke();
      c.fillStyle = b.enemy ? '#ffb3b5' : '#fffbe5'; c.beginPath(); c.arc(b.x, b.y, b.radius * .6, 0, Math.PI * 2); c.fill();
    }
    c.lineCap = 'butt';
    for (const e of s.effects) {
      const progress = 1 - e.life / e.maxLife;
      c.globalAlpha = 1 - progress; c.fillStyle = e.color; c.strokeStyle = e.color;
      if (e.text) { c.font = 'bold 15px monospace'; c.textAlign = 'center'; c.fillText(e.text, e.x, e.y - 38 - progress * 24); }
      else { c.lineWidth = 3 * (1 - progress) + 1; c.beginPath(); c.arc(e.x, e.y, e.radius * (.3 + progress * .7), 0, Math.PI * 2); c.stroke(); }
    }
    c.globalAlpha = 1;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const vignette = c.createRadialGradient(this.width / 2, this.height / 2, this.height * .2, this.width / 2, this.height / 2, this.width * .7);
    vignette.addColorStop(0, 'rgba(3,12,17,0)'); vignette.addColorStop(1, 'rgba(3,12,17,.55)');
    c.fillStyle = vignette; c.fillRect(0, 0, this.width, this.height);
    if (s.player.hp / s.player.maxHp < .3) { c.strokeStyle = '#ff8b9188'; c.lineWidth = 8; c.strokeRect(0, 0, this.width, this.height); }
  }
  private shadow(x: number, y: number, size: number): void {
    this.ctx.fillStyle = 'rgba(0,8,12,.5)'; this.ctx.beginPath(); this.ctx.ellipse(x, y, size, size * .33, 0, 0, Math.PI * 2); this.ctx.fill();
  }
  private drawPlayer(s: Run, gender: Gender, moving: boolean): void {
    const c = this.ctx, p = s.player;
    this.shadow(p.x, p.y + 5, 23);
    c.strokeStyle = '#9affdf'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(p.x, p.y + 5, 25, 10, 0, 0, Math.PI * 2); c.stroke();
    if (p.invulnerable > 0) {
      c.strokeStyle = '#c2fff199'; c.beginPath(); c.arc(p.x, p.y - 20, 37, 0, Math.PI * 2); c.stroke();
    }
    c.save(); c.translate(p.x, p.y); c.scale(p.facing, 1);
    const frame = moving ? (Math.floor(s.time * 9) % 2 ? 1 : 6) : 0;
    if (this.player.complete && this.player.naturalWidth) {
      c.imageSmoothingEnabled = false;
      c.drawImage(this.player, (frame % 5) * 160 + 4, (Math.floor(frame / 5) + (gender === 'female' ? 2 : 0)) * 160 + 3, 151, 152, -31, -62, 62, 67);
    }
    c.restore();
    c.fillStyle = '#a5eed7'; c.font = '10px monospace'; c.textAlign = 'center'; c.fillText('YOU', p.x, p.y - 72);
  }
  private office(x: number, y: number, w: number, h: number): void {
    const c = this.ctx;
    c.fillStyle = '#15201d'; c.fillRect(0, 0, WORLD.width, WORLD.height);
    for (let tx = Math.max(0, Math.floor(x / 96) * 96); tx < Math.min(WORLD.width, x + w + 96); tx += 96) {
      for (let ty = Math.max(0, Math.floor(y / 96) * 96); ty < Math.min(WORLD.height, y + h + 96); ty += 96) {
        c.fillStyle = ((tx + ty) / 96) % 2 ? '#15201d' : '#1c2a26';
        c.fillRect(tx, ty, 96, 96);
        c.strokeStyle = '#32443d66'; c.lineWidth = 1; c.strokeRect(tx, ty, 96, 96);
      }
    }
    // Match the first game's furnished office: six-seat islands around open aisles.
    // Furniture remains scenery, just as in the original; hazards and actors draw above it.
    const islands = [[170, 290], [920, 290], [580, 590], [1360, 590], [580, 1080], [1360, 1080], [180, 1490], [960, 1490]];
    for (const [ix, iy] of islands) {
      if (ix > x + w || ix + 480 < x || iy > y + h || iy + 240 < y) continue;
      for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) {
        this.desk(ix + col * 166, iy + row * 110, (row + col) % 3);
      }
    }
    // Windows, a meeting room, whiteboards and shared equipment give each area landmarks.
    this.box(0, 0, WORLD.width, 125, '#28474366');
    for (let wx = 90; wx < WORLD.width; wx += 190) {
      c.strokeStyle = '#9fdad166'; c.lineWidth = 3; c.strokeRect(wx, 24, 130, 76);
      c.beginPath(); c.moveTo(wx + 65, 24); c.lineTo(wx + 65, 100); c.stroke();
    }
    this.box(1850, 195, 430, 300, '#203330', '#648b7977');
    this.box(1930, 300, 265, 92, '#6b5b48', '#9a876daa');
    for (let i = 0; i < 3; i++) {
      this.box(1945 + i * 82, 258, 48, 30, '#344c41');
      this.box(1945 + i * 82, 406, 48, 30, '#344c41');
    }
    for (const [bx, by] of [[700, 210], [1490, 470], [1980, 225], [690, 1390]]) {
      this.box(bx, by, 210, 55, '#cbcdbb', '#748875');
      c.fillStyle = '#698c80'; c.fillRect(bx + 16, by + 13, 105, 3); c.fillRect(bx + 16, by + 25, 155, 2);
      c.fillStyle = '#b29767'; c.fillRect(bx + 137, by + 10, 18, 13);
    }
    this.desk(1710, 920, 1);
    for (const [px, py] of [[380, 970], [2050, 1160]]) {
      this.box(px, py, 105, 82, '#6b7166', '#92998488');
      this.box(px + 12, py + 12, 80, 30, '#283b36');
      this.box(px + 22, py - 10, 60, 25, '#d9ddca');
      c.fillStyle = '#93c8b0'; c.fillRect(px + 13, py + 54, 14, 8);
      c.fillStyle = '#303e38'; c.fillRect(px + 37, py + 54, 54, 13);
    }
    c.fillStyle = '#88a49266'; c.font = '11px monospace'; c.textAlign = 'center';
    c.fillText('OFFICE 02 / ASTRA', 1200, 974);
    c.fillStyle = '#87c6ac'; c.font = 'bold 14px monospace'; c.fillText('EXIT →', 1200, 155);
    for (const [px, py] of [[220, 700], [2120, 720], [250, 1340], [2120, 1530]]) {
      this.box(px - 15, py - 8, 30, 32, '#756850');
      c.fillStyle = '#315c4f'; c.beginPath(); c.arc(px, py, 23, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#46816a'; c.beginPath(); c.ellipse(px - 7, py - 5, 22, 10, -.7, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#619479'; c.beginPath(); c.ellipse(px + 6, py - 8, 20, 9, .7, 0, Math.PI * 2); c.fill();
    }
    for (const [lx, ly] of [[620, 556], [1400, 556], [620, 1046], [1400, 1046], [960, 250]]) {
      this.box(lx, ly, 210, 15, '#c6d4b426', '#dbe7ce38');
    }
  }
  private box(x: number, y: number, w: number, h: number, fill: string, stroke?: string): void {
    const c = this.ctx;
    c.beginPath(); c.roundRect(x, y, w, h, 5); c.fillStyle = fill; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2; c.stroke(); }
  }
  private desk(x: number, y: number, variant: number): void {
    const c = this.ctx;
    this.box(x + 4, y + 6, 148, 82, '#09151266');
    this.box(x, y, 148, 82, '#5f5143', '#8a7a68b3');
    const mx = x + 18, my = y + 12, monitorWidth = variant === 1 ? 34 : 46;
    this.box(mx, my, monitorWidth, 30, '#1b2224');
    c.fillStyle = variant === 2 ? '#bba052' : '#65a7a3'; c.fillRect(mx + 5, my + 5, monitorWidth - 10, 20);
    if (variant === 1) {
      this.box(mx + 42, my, 34, 30, '#1b2224');
      c.fillStyle = '#78aa60'; c.fillRect(mx + 47, my + 5, 24, 20);
    }
    if (variant === 2) this.box(mx + 52, my + 7, 28, 22, '#202a2d');
    c.fillStyle = '#d8dcc8'; c.fillRect(x + 100, y + 14, 28, 36);
    c.fillStyle = '#b9c1af'; c.fillRect(x + 104, y + 23, 20, 2); c.fillRect(x + 104, y + 32, 20, 2);
    this.box(x + 52, y + 90, 44, 30, '#2d4036');
  }
}
