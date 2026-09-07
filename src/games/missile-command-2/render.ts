import { blastRadius, type Defense, type Point, type ThreatKind } from './model';

export const threatColors: Record<ThreatKind, string> = {
  ballistic: '#ff846c', interceptor: '#ffcf68', splitter: '#db93ff', drone: '#69edb0', warhead: '#efabff',
};

export function drawDefense(c: CanvasRenderingContext2D, s: Defense, aim: Point): void {
  const { width: w, height: h, time } = s;
  const sky = c.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#050b20'); sky.addColorStop(0.65, '#102744'); sky.addColorStop(1, '#2b4657');
  c.fillStyle = sky; c.fillRect(0, 0, w, h);
  // Deterministic scenery does not consume the simulation's random stream.
  for (let i = 0; i < 90; i++) {
    const x = (Math.sin(i * 127.1) * 43758.5 % 1 + 1) % 1 * w;
    const y = (Math.sin(i * 311.7) * 23674.2 % 1 + 1) % 1 * h * 0.77;
    c.fillStyle = `rgba(186,222,255,${0.25 + 0.35 * (1 + Math.sin(time / 1800 + i)) / 2})`;
    c.fillRect(x, y, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
  }
  const moonX = w * 0.79, moonY = h * 0.18;
  const halo = c.createRadialGradient(moonX, moonY, 3, moonX, moonY, 110);
  halo.addColorStop(0, '#b0cee02c'); halo.addColorStop(1, '#a5ccff00');
  c.fillStyle = halo; c.fillRect(moonX - 110, moonY - 110, 220, 220);
  c.fillStyle = '#a9c9d9'; circle(c, moonX, moonY, 21);
  c.fillStyle = '#0b172d'; circle(c, moonX - 9, moonY - 7, 20);
  for (let layer = 0; layer < 2; layer++) {
    const bw = layer ? 33 : 47;
    for (let i = 0; i < w / bw + 1; i++) {
      const bh = 24 + ((i * 37 + layer * 29) % 83);
      const y = h - 57 - bh;
      c.fillStyle = layer ? '#101f31' : '#1b3449'; c.fillRect(i * bw, y, bw - 2, bh);
      c.fillStyle = layer ? '#4b899344' : '#6facc622';
      for (let wy = y + 8; wy < h - 63; wy += 12) {
        for (let wx = i * bw + 5; wx < (i + 1) * bw - 5; wx += 9) c.fillRect(wx, wy, 3, 4);
      }
    }
  }
  c.strokeStyle = '#6ae9ef0c'; c.lineWidth = 1;
  for (let x = 0; x < w; x += 80) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h - 55); c.stroke(); }
  for (let y = 60; y < h - 55; y += 80) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  const ground = c.createLinearGradient(0, h - 55, 0, h);
  ground.addColorStop(0, '#102b39'); ground.addColorStop(1, '#050d18');
  c.fillStyle = ground; c.fillRect(0, h - 55, w, 55);
  c.fillStyle = '#66dfd080'; c.fillRect(0, h - 55, w, 1);
  s.cities.forEach((city, index) => {
    const scale = Math.min(1.1, w / 750);
    c.save(); c.translate(city.x, city.y); c.scale(scale, scale);
    if (city.alive) {
      c.fillStyle = '#77d4d512'; c.fillRect(-30, -72, 60, 72);
      for (let b = 0; b < 3; b++) {
        const bh = 27 + ((index * 13 + b * 19) % 35), x = -25 + b * 16;
        c.fillStyle = '#1f4354'; c.fillRect(x, -bh, 14, bh);
        c.strokeStyle = '#6cafb5'; c.lineWidth = 1; c.strokeRect(x, -bh, 14, bh);
        c.fillStyle = '#8ce4d1';
        for (let y = -bh + 6; y < -4; y += 9) { c.fillRect(x + 3, y, 3, 3); c.fillRect(x + 9, y, 2, 3); }
      }
      c.fillStyle = '#9fe8d7'; c.fillRect(-1, -68, 2, 8);
    } else {
      c.fillStyle = '#263240'; c.fillRect(-26, -9, 17, 9); c.fillRect(-4, -15, 12, 15); c.fillRect(12, -6, 15, 6);
      c.fillStyle = '#ff815a'; circle(c, 0, -7, 3);
      for (let i = 0; i < 4; i++) {
        const t = (time / 45 + i * 15) % 65;
        c.fillStyle = `rgba(100,112,129,${(1 - t / 65) * 0.25})`; circle(c, Math.sin(t / 12 + index) * 9, -t - 8, 5 + t / 8);
      }
    }
    c.restore();
  });
  s.bases.forEach((base, i) => {
    c.save(); c.translate(base.x, base.y - 9);
    c.fillStyle = '#142f43'; c.strokeStyle = base.ammo ? '#71e3ec' : '#596779'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-22, 7); c.lineTo(-16, -9); c.lineTo(16, -9); c.lineTo(22, 7); c.closePath(); c.fill(); c.stroke();
    c.save(); c.rotate(Math.atan2(aim.y - (base.y - 9), aim.x - base.x) + Math.PI / 2);
    c.fillStyle = '#9fd2dc'; c.fillRect(-3, -27, 6, 25); c.fillStyle = '#d6ffff'; c.fillRect(-3, -27, 6, 4); c.restore();
    c.fillStyle = '#39b3c4'; circle(c, 0, -4, 8);
    c.fillStyle = '#061520'; circle(c, 0, -4, 4);
    c.font = 'bold 11px monospace'; c.textAlign = 'center'; c.fillStyle = base.ammo ? '#a5eef0' : '#ef8e80';
    c.fillText(`${['A', 'S', 'D'][i]} · ${base.ammo}`, 0, 27);
    c.restore();
  });
  for (const e of s.enemies) {
    const color = threatColors[e.kind];
    c.strokeStyle = color; c.lineWidth = e.kind === 'splitter' ? 2 : 1.5;
    c.globalAlpha = 0.5; c.beginPath();
    e.trail.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y));
    c.lineTo(e.x, e.y); c.stroke(); c.globalAlpha = 1;
    const prev = e.trail.at(-1) ?? { x: e.x, y: e.y - 1 };
    c.save(); c.translate(e.x, e.y); c.rotate(Math.atan2(e.y - prev.y, e.x - prev.x) - Math.PI / 2);
    c.shadowColor = color; c.shadowBlur = 12; c.fillStyle = color;
    c.beginPath();
    if (e.kind === 'drone') { c.moveTo(0, 7); c.lineTo(-13, -4); c.lineTo(-5, -7); c.lineTo(0, -2); c.lineTo(5, -7); c.lineTo(13, -4); }
    else if (e.kind === 'splitter') { c.moveTo(0, 10); c.lineTo(-8, 0); c.lineTo(-5, -9); c.lineTo(5, -9); c.lineTo(8, 0); }
    else { c.moveTo(0, 8); c.lineTo(-4, -6); c.lineTo(0, -3); c.lineTo(4, -6); }
    c.closePath(); c.fill(); c.shadowBlur = 0; c.fillStyle = '#ffffff'; c.fillRect(-1, -2, 2, 6); c.restore();
    if (e.kind === 'splitter' && e.progress > 0.3) {
      c.strokeStyle = color; c.setLineDash([3, 4]); c.beginPath(); c.arc(e.x, e.y, 17 + Math.sin(time / 90) * 2, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
      c.fillStyle = color; c.textAlign = 'center'; c.font = '9px monospace'; c.fillText('SPLIT IMMINENT', e.x, e.y - 24);
    }
  }
  for (const shot of s.shots) {
    const tail = { x: shot.x + (shot.start.x - shot.x) * 0.25, y: shot.y + (shot.start.y - shot.y) * 0.25 };
    c.strokeStyle = '#83edff'; c.lineWidth = 2; c.beginPath(); c.moveTo(tail.x, tail.y); c.lineTo(shot.x, shot.y); c.stroke();
    c.fillStyle = '#fff'; circle(c, shot.x, shot.y, 2.5);
    c.strokeStyle = '#8cedff66'; c.lineWidth = 1; c.beginPath(); c.arc(shot.target.x, shot.target.y, 5, 0, Math.PI * 2); c.stroke();
  }
  for (const b of s.blasts) {
    const r = Math.max(0.1, blastRadius(b)), t = b.age / b.duration;
    const rgb = b.friendly ? '104,225,255' : '255,139,86';
    const glow = c.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
    glow.addColorStop(0, `rgba(${rgb},${0.5 * (1 - t)})`); glow.addColorStop(0.75, `rgba(${rgb},0.08)`); glow.addColorStop(1, `rgba(${rgb},0.3)`);
    c.fillStyle = glow; circle(c, b.x, b.y, r);
    c.strokeStyle = `rgba(${rgb},${1 - t})`; c.lineWidth = 2; c.beginPath(); c.arc(b.x, b.y, r, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 1; c.beginPath(); c.arc(b.x, b.y, r * 0.72, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI / 5 + b.x; const reach = r + t * 20;
      c.fillStyle = `rgba(${rgb},${1 - t})`; c.fillRect(b.x + Math.cos(a) * reach, b.y + Math.sin(a) * reach, 2, 2);
    }
  }
  c.strokeStyle = '#b6f6f0'; c.lineWidth = 1;
  c.beginPath(); c.arc(aim.x, aim.y, 12, 0, Math.PI * 2); c.stroke();
  for (const sign of [-1, 1]) {
    c.beginPath(); c.moveTo(aim.x + sign * 7, aim.y); c.lineTo(aim.x + sign * 19, aim.y); c.moveTo(aim.x, aim.y + sign * 7); c.lineTo(aim.x, aim.y + sign * 19); c.stroke();
  }
}

function circle(c: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
}
