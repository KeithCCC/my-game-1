import { createDefense, fireDefense, resizeDefense, stepDefense } from './model';
import { drawDefense } from './render';
import './style.css';

export function mountMissileCommand2(root: HTMLElement, onMenu: () => void): { cleanup: () => void } {
  const shell = document.createElement('main');
  shell.className = 'mc2';
  shell.innerHTML = `
    <header class="mc2-header">
      <div class="mc2-brand"><span class="mc2-mark">Ⅱ</span><div><small>CITY DEFENSE DIVISION</small><strong>MISSILE COMMAND <em>2</em></strong></div></div>
      <nav aria-label="Game controls"><button data-pause disabled>Pause</button><button data-menu>Main Menu</button></nav>
    </header>
    <div class="mc2-stats" aria-label="Defense status">
      <div><span>SCORE</span><strong data-score>000000</strong></div>
      <div><span>SECTOR</span><strong data-wave>01</strong></div>
      <div><span>CITIES</span><strong data-cities>6 / 6</strong></div>
      <div><span>AMMO</span><strong data-ammo>42</strong></div>
    </div>
    <section class="mc2-field" aria-label="Missile Command 2 battlefield">
      <canvas aria-label="Aim and click or tap to intercept enemy missiles"></canvas>
      <div class="mc2-notice" data-notice aria-live="polite"></div>
      <div class="mc2-combo" data-combo></div>
      <div class="mc2-overlay" data-overlay>
        <article class="mc2-panel">
          <span class="mc2-eyebrow">NIGHTFALL PROTOCOL / 02</span>
          <h1>Hold the <em>sky.</em></h1>
          <p>Six cities. Three batteries. Every interception counts.</p>
          <div class="mc2-threat-list">
            <div><b class="mc2-orange">↘</b><span><strong>BALLISTIC</strong>Predict the impact. Lead your shot.</span></div>
            <div><b class="mc2-yellow">ϟ</b><span><strong>INTERCEPTOR · SECTOR 02</strong>Fast approach. React early.</span></div>
            <div><b class="mc2-purple">⋔</b><span><strong>SPLITTER · SECTOR 03</strong>Intercept before three warheads separate.</span></div>
            <div><b class="mc2-green">⌁</b><span><strong>DRONE · SECTOR 04</strong>Weaving flight. Cover its path with a blast.</span></div>
          </div>
          <button class="mc2-primary" data-start>Launch defense <span>→</span></button>
          <small>Click / tap: auto-select & fire · A / S / D: fire left / center / right · P pauses</small>
        </article>
      </div>
    </section>
    <footer class="mc2-footer"><span><i></i> <span data-status>DEFENSE SYSTEM READY</span></span><span>Click / tap to fire <b>·</b> A / S / D batteries <b>·</b> P pause</span></footer>
  `;
  root.appendChild(shell);
  const canvas = shell.querySelector('canvas')!;
  const ctx = canvas.getContext('2d')!;
  const get = (key: string) => shell.querySelector<HTMLElement>(`[data-${key}]`)!;
  const overlay = get('overlay');
  const pauseButton = get('pause') as HTMLButtonElement;
  let state = createDefense(900, 600);
  let aim = { x: 450, y: 240 };
  let started = false, paused = false, disposed = false, frame = 0, last = performance.now();
  let lastFire = 0, lastPhase = state.phase;
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    aim.x *= r.width / state.width; aim.y *= r.height / state.height;
    resizeDefense(state, r.width, r.height);
  };
  const start = () => {
    state = createDefense(state.width, state.height, Date.now() >>> 0);
    started = true; paused = false; lastPhase = 'combat';
    overlay.hidden = true; pauseButton.disabled = false;
    pauseButton.textContent = 'Pause'; pauseButton.setAttribute('aria-pressed', 'false');
    last = performance.now();
  };
  const setPaused = (value: boolean) => {
    if (!started || state.phase === 'over') return;
    paused = value; pauseButton.textContent = value ? 'Resume' : 'Pause';
    pauseButton.setAttribute('aria-pressed', String(value));
    overlay.hidden = !value;
    if (value) {
      overlay.innerHTML = '<article class="mc2-panel mc2-compact"><span class="mc2-eyebrow">DEFENSE ON HOLD</span><h1>Paused.</h1><p>Take a breath. Your cities can wait.</p><button class="mc2-primary" data-resume>Resume defense →</button></article>';
      overlay.querySelector('[data-resume]')!.addEventListener('click', () => setPaused(false));
    }
    last = performance.now();
  };
  const move = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    aim = { x: event.clientX - rect.left, y: Math.max(0, Math.min(state.height - 90, event.clientY - rect.top)) };
  };
  const fire = (base?: number) => {
    if (!started || paused || performance.now() - lastFire < 120) return;
    if (fireDefense(state, aim, base)) lastFire = performance.now();
  };
  const down = (event: PointerEvent) => { if (event.button !== 0) return; event.preventDefault(); move(event); fire(); };
  const key = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.altKey || event.metaKey || event.repeat) return;
    const k = event.key.toLowerCase();
    if (k === 'p' || k === 'escape') { event.preventDefault(); setPaused(!paused); }
    const base = ['a', 's', 'd'].indexOf(k);
    if (base >= 0) { event.preventDefault(); fire(base); }
  };
  const visibility = () => { if (document.hidden) setPaused(true); };
  const loop = (now: number) => {
    if (disposed) return;
    const delta = Math.min(40, now - last); last = now;
    if (started && !paused) stepDefense(state, delta);
    drawDefense(ctx, state, aim);
    get('score').textContent = String(state.score).padStart(6, '0');
    get('wave').textContent = String(state.wave).padStart(2, '0');
    get('cities').textContent = `${state.cities.filter(c => c.alive).length} / 6`;
    get('ammo').textContent = String(state.bases.reduce((n, b) => n + b.ammo, 0));
    const notice = started && state.noticeTimer > 0 && !paused ? state.notice + (state.phase === 'recovery' ? ` · ${Math.ceil(state.countdown / 1000)}` : '') : '';
    if (get('notice').textContent !== notice) get('notice').textContent = notice;
    get('combo').textContent = state.combo > 1 && !paused ? `${state.combo}× INTERCEPTION` : '';
    get('status').textContent = !started ? 'DEFENSE SYSTEM READY' : state.phase === 'recovery' ? 'REARMING / CITY BONUS AWARDED' : state.phase === 'over' ? 'SIGNAL LOST' : paused ? 'DEFENSE PAUSED' : `${state.remaining + state.enemies.length} THREATS REMAINING`;
    if (state.phase === 'over' && lastPhase !== 'over') {
      pauseButton.disabled = true; overlay.hidden = false;
      overlay.innerHTML = `<article class="mc2-panel mc2-compact"><span class="mc2-eyebrow">TRANSMISSION ENDED / SECTOR ${String(state.wave).padStart(2, '0')}</span><h1>Until next <em>night.</em></h1><p>${state.score.toLocaleString()} points · ${state.kills} interceptions · Best chain ${state.bestCombo}×</p><button class="mc2-primary" data-retry>Deploy again →</button><button class="mc2-secondary" data-compare>Back to game selection</button></article>`;
      overlay.querySelector('[data-retry]')!.addEventListener('click', start);
      overlay.querySelector('[data-compare]')!.addEventListener('click', onMenu);
    }
    lastPhase = state.phase;
    frame = requestAnimationFrame(loop);
  };
  get('start').addEventListener('click', start);
  get('menu').addEventListener('click', onMenu);
  pauseButton.addEventListener('click', () => setPaused(!paused));
  canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerdown', down);
  window.addEventListener('keydown', key); document.addEventListener('visibilitychange', visibility);
  const observer = new ResizeObserver(resize); observer.observe(canvas);
  resize(); frame = requestAnimationFrame(loop);
  return { cleanup: () => {
    disposed = true; cancelAnimationFrame(frame); observer.disconnect();
    window.removeEventListener('keydown', key); document.removeEventListener('visibilitychange', visibility);
    canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerdown', down); shell.remove();
  } };
}
