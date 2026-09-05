import './style.css';
import playerUrl from '../../../assets/player-characters.png';
import { AstraAudio } from './audio';
import { createRun, updateRun } from './simulation';
import { chooseUpgrade, isEvolved } from './progression';
import { UPGRADES, WEAPONS, type UpgradeId } from './model';
import { AstraRenderer, type Gender } from './render';
import { loadAudio, loadRecords, save } from './persistence';

export function mountPageSurvivor2(container: HTMLElement, onExit: () => void): { cleanup: () => void } {
  const root = document.createElement('main');
  root.className = 'astra-game';
  root.setAttribute('aria-label', 'Page Survivor 2 定時サバイバー2 ASTRA');
  root.innerHTML = `
    <canvas class="astra-canvas" tabindex="0" aria-label="オフィス戦場。WASDまたは矢印キーで移動、スペースでダッシュ。"></canvas>
    <div class="astra-hud" hidden>
      <header class="astra-topbar">
        <div class="astra-brand"><b>ASTRA<span> / 02</span></b><small>定時サバイバー2</small></div>
        <div class="astra-clock" data-clock></div>
        <div class="astra-controls"><button data-action="mute" aria-label="音声を切り替え">音 ON</button><button data-action="pause" aria-label="一時停止">Ⅱ</button></div>
      </header>
      <div class="astra-mission" data-mission></div>
      <div class="astra-boss" data-boss hidden></div>
      <div class="astra-announcement" data-banner aria-live="polite"></div>
      <footer class="astra-bottom"><div class="astra-vitals" data-vitals></div><div class="astra-loadout" data-loadout></div><div class="astra-dash"><button data-action="dash" data-dash>SPACE<br><small>ダッシュ</small></button></div></footer>
      <div class="astra-xp"><span data-xp-fill></span><b data-xp-label></b></div>
      <div class="astra-touch-hint">左側をドラッグして移動</div><div class="astra-stick" hidden><i></i></div>
    </div>
    <div class="astra-overlay"></div>`;
  container.appendChild(root);
  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
  const hud = root.querySelector<HTMLElement>('.astra-hud')!;
  const overlay = root.querySelector<HTMLElement>('.astra-overlay')!;
  const find = (name: string): HTMLElement => root.querySelector<HTMLElement>(`[data-${name}]`)!;
  const clock = find('clock'), mission = find('mission'), boss = find('boss'), banner = find('banner');
  const vitals = find('vitals'), loadout = find('loadout'), dash = find('dash'), xpFill = find('xp-fill'), xpLabel = find('xp-label');
  const audio = new AstraAudio(loadAudio());
  const renderer = new AstraRenderer(canvas);
  const events = new AbortController();
  let run = createRun(), gender: Gender = 'male', title = true, paused = false, disposed = false;
  let assetsReady = false, loadError = '', starting = false, recorded = false;
  let records = loadRecords(), frame = 0, last = performance.now(), hudTimer = 0, panelKey = '';
  let dashQueued = false;
  const keys = new Set<string>();
  let touch: { id: number; x: number; y: number; dx: number; dy: number } | undefined;

  const portrait = (g: Gender, large = false): string => `<span class="astra-portrait ${large ? 'is-large' : ''} ${g}" style="background-image:url('${playerUrl}')" aria-hidden="true"></span>`;
  const time = (seconds: number): string => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
  const settings = (): string => `<div class="astra-audio-settings"><label>BGM <input aria-label="BGM音量" data-volume="music" type="range" min="0" max="100" value="${audio.settings.music * 100}"></label><label>効果音 <input aria-label="効果音音量" data-volume="effects" type="range" min="0" max="100" value="${audio.settings.effects * 100}"></label><button data-action="mute">${audio.settings.muted ? '音 OFF' : '音 ON'}</button></div>`;

  function showPanel(): void {
    const key = title ? `title:${gender}:${assetsReady}:${loadError}` : paused ? 'paused' : `${run.status}:${run.level}:${run.choices.join()}`;
    if (key === panelKey) return;
    panelKey = key;
    overlay.hidden = !title && !paused && run.status === 'playing';
    hud.hidden = title;
    hud.inert = !overlay.hidden;
    canvas.tabIndex = overlay.hidden ? 0 : -1;
    if (overlay.hidden) { overlay.innerHTML = ''; return; }
    if (title) {
      overlay.innerHTML = `<section class="astra-title">
        <div class="astra-title-top"><span class="astra-wordmark">ASTRA <b>GAMES</b></span><button class="astra-text-button" data-action="exit">← ゲーム一覧</button></div>
        <div class="astra-title-grid"><div class="astra-title-copy">
          <div class="astra-eyebrow"><i></i> PAGE SURVIVOR 2 <span>THE ASTRA EDITION</span></div>
          <h1>今日こそ、<br><em>定時で帰る。</em></h1>
          <p class="astra-intro">押し寄せる仕事。終わらない会議。<br>スキルを育てて、最後の5分を生き抜こう。</p>
          <div class="astra-title-actions"><button class="astra-primary" data-action="start" ${!assetsReady ? 'disabled' : ''}>${loadError ? '読込失敗' : assetsReady ? '始業する <span>→</span>' : '素材を読み込み中…'}</button><span class="astra-run-note">5 MIN + BOSS<br><b>自動攻撃 × ローグライト</b></span></div>
          ${loadError ? `<p class="astra-error" role="alert">${loadError} ゲーム一覧に戻り、再度お試しください。</p>` : ''}
          <div class="astra-keys"><span><kbd>W A S D</kbd> 移動</span><span><kbd>SPACE</kbd> ダッシュ</span><span><kbd>P</kbd> 一時停止</span></div><p class="astra-slot-note">武器3枠・補助3枠。組み合わせを選んで、自分だけの装備に。</p>
        </div>
        <aside class="astra-dossier"><div class="astra-dossier-top"><span>EMPLOYEE FILE</span><b>社員証 / 002</b></div>
          <div class="astra-hero-portrait">${portrait(gender, true)}<span class="astra-seal">退社<br>希望</span></div>
          <div class="astra-person"><h2>若手社員</h2><span>好きな主人公で出勤 / 性能は共通</span></div>
          <div class="astra-character-picker"><button data-gender="male" aria-pressed="${gender === 'male'}">${portrait('male')}<span>眼鏡の男の子</span></button><button data-gender="female" aria-pressed="${gender === 'female'}">${portrait('female')}<span>眼鏡の女の子</span></button></div>
          <div class="astra-id-footer"><span>DEPARTMENT / SURVIVAL</span><span>|||| ||| |||||| ||</span></div>
        </aside></div>
        <div class="astra-title-bottom"><div><span class="astra-small-label">YOUR RECORD</span><strong>${records.wins} <small>退社成功</small> <i>／</i> ${records.bestKills} <small>BEST 撃破</small></strong></div><p>拾う。選ぶ。進化する。<br><span>Lv.5の武器 ＋ 対応するLv.2の補助能力で武器進化。</span></p>${settings()}</div>
      </section>`;
      return;
    }
    if (paused) {
      const build = (Object.keys(UPGRADES) as UpgradeId[]).filter(id => run.levels[id] && id !== 'coffee').map(id => `<span style="color:${UPGRADES[id].color}">${UPGRADES[id].icon} ${UPGRADES[id].name} <b>Lv.${run.levels[id]}</b></span>`).join('');
      overlay.innerHTML = `<section class="astra-dialog" role="dialog" aria-modal="true" aria-labelledby="astra-dialog-title"><span class="astra-eyebrow">TAKE A BREATH</span><h2 id="astra-dialog-title">ちょっと、休憩。</h2><p>時間は止まっています。次の一手を考えよう。</p><div class="astra-pause-build">${build}</div>${settings()}<button class="astra-primary" data-action="resume">仕事に戻る →</button><button class="astra-secondary" data-action="restart">最初からやり直す</button><button class="astra-text-button" data-action="exit">ゲーム一覧へ</button><p class="astra-small-label">WASD / 矢印：移動　SPACE：ダッシュ　P / ESC：再開</p></section>`;
    } else if (run.status === 'upgrade') {
      overlay.innerHTML = `<section class="astra-upgrade-panel" role="dialog" aria-modal="true" aria-labelledby="astra-dialog-title"><span class="astra-eyebrow">LEVEL ${run.level} / SKILL ACQUIRED</span><h2 id="astra-dialog-title">次の、切り札。</h2><p>ひとつ選んで、あなたの戦い方をつくろう。選択中は時間が止まります。<br>武器 ${WEAPONS.filter(id => run.levels[id]).length}/3枠　・　補助 ${(['focus','haste','magnet','armor'] as UpgradeId[]).filter(id => run.levels[id]).length}/3枠</p><div class="astra-upgrade-grid">${run.choices.map((id, index) => {
        const u = UPGRADES[id], level = run.levels[id];
        return `<button class="astra-upgrade-card" data-upgrade="${id}" style="--skill-color:${u.color}"><span class="astra-upgrade-top"><kbd>${index + 1}</kbd><b>${level ? 'LEVEL UP' : 'NEW SKILL'}</b></span><span class="astra-skill-icon">${u.icon}</span><h3>${u.name}</h3><span class="astra-level-dots">${id === 'coffee' ? '+35 HP' : Array.from({ length: u.max }, (_, i) => `<i class="${i < level ? 'filled' : i === level ? 'next' : ''}"></i>`).join('')}</span><p>${u.description}</p><span class="astra-recipe">${u.partner ? `進化：Lv.5 ＋ ${UPGRADES[u.partner].name} Lv.2` : id === 'haste' ? 'リマインド弾の進化条件' : id === 'armor' ? '根回しオーラの進化条件' : '成長はこのプレイに適用されます'}</span><span class="astra-pick">獲得する ↗</span></button>`;
      }).join('')}</div></section>`;
    } else {
      const won = run.status === 'won';
      overlay.innerHTML = `<section class="astra-dialog astra-result" role="dialog" aria-modal="true" aria-labelledby="astra-dialog-title"><span class="astra-eyebrow">${won ? 'MISSION COMPLETE' : 'ANOTHER DAY, ANOTHER TRY'}</span><h2 id="astra-dialog-title">${won ? 'お先に、失礼します。' : '今日は、ここまで。'}</h2><p>${won ? '最後の会議を突破。定時退社、成功！' : '次は違うスキルの組み合わせを試してみよう。'}</p><div class="astra-result-stats"><div><b>${time(run.time)}</b><span>生存時間</span></div><div><b>${run.kills}</b><span>撃破数</span></div><div><b>${run.level}</b><span>到達レベル</span></div></div><div class="astra-result-build">${WEAPONS.filter(id => run.levels[id]).map(id => `<span style="color:${UPGRADES[id].color}">${UPGRADES[id].icon} ${isEvolved(run, id) ? UPGRADES[id].evolution : UPGRADES[id].name} Lv.${run.levels[id]}</span>`).join('')}</div><p>最高撃破数 ${records.bestKills} ／ 退社成功 ${records.wins} 回</p><button class="astra-primary" data-action="restart">もう一度、出勤する →</button><button class="astra-text-button" data-action="exit">ゲーム一覧へ</button></section>`;
    }
    queueMicrotask(() => overlay.querySelector<HTMLButtonElement>('button')?.focus());
  }
  function refreshHud(): void {
    const mute = root.querySelector<HTMLButtonElement>('.astra-controls [data-action="mute"]')!;
    mute.textContent = audio.settings.muted ? '音 OFF' : '音 ON';
    mute.setAttribute('aria-pressed', String(audio.settings.muted));
    clock.innerHTML = `<b>${time(run.time)}</b><span>${run.time >= 300 ? '最終会議を終わらせろ' : `定時まで ${time(Math.max(0, 300 - run.time))}`}</span>`;
    mission.innerHTML = `<span>OFFICE FLOOR 02</span><b>${run.time >= 300 ? '社長を倒して退社する' : run.time >= 270 ? '締切ラッシュ' : run.time >= 180 ? '最終準備' : run.time >= 90 ? '会議を突破せよ' : '経験値を集めて強化しよう'}</b><small>撃破 ${run.kills}　／　Lv.${run.level}</small>`;
    const chief = run.enemies.filter(e => e.boss).sort((a, b) => b.boss - a.boss)[0];
    boss.hidden = !chief;
    if (chief) boss.innerHTML = `<div><span>${['', '詰めてくる課長', '粗探しする部長', '緊急招集の社長'][chief.boss]}</span><b>${chief.hp < chief.maxHp * .5 ? '激昂 / 予兆を見て回避' : '予告された赤い範囲から離れよう'}</b></div><i><em style="width:${Math.max(0, chief.hp / chief.maxHp * 100)}%"></em></i>`;
    banner.textContent = run.bannerTime > 0 ? run.banner : '';
    banner.classList.toggle('is-visible', run.bannerTime > 0);
    vitals.innerHTML = `<div><b>HP</b><span>${Math.ceil(run.player.hp)} <small>/ ${run.player.maxHp}</small></span></div><i><em style="width:${run.player.hp / run.player.maxHp * 100}%;background:${run.player.hp < 30 ? '#ff8b91' : '#82e3bf'}"></em></i><small>コーヒーで回復 / ◇で経験値を一括回収</small>`;
    loadout.innerHTML = WEAPONS.map(id => `<div title="${UPGRADES[id].name}" class="${run.levels[id] ? 'is-equipped' : ''}" style="--skill-color:${UPGRADES[id].color}"><b>${UPGRADES[id].icon}</b><span>${run.levels[id] ? isEvolved(run, id) ? '進化' : `Lv.${run.levels[id]}` : '—'}</span></div>`).join('');
    dash.innerHTML = run.player.dashCooldown > 0 ? `${run.player.dashCooldown.toFixed(1)}<small>再使用まで</small>` : 'SPACE<small>ダッシュ ↗</small>';
    dash.classList.toggle('is-ready', run.player.dashCooldown <= 0);
    xpFill.style.width = `${Math.min(100, run.xp / run.xpNext * 100)}%`;
    xpLabel.textContent = `Lv.${run.level}　 EXP ${run.xp} / ${run.xpNext}`;
  }
  function clearInput(): void {
    keys.clear(); touch = undefined; dashQueued = false;
    root.querySelector<HTMLElement>('.astra-stick')!.hidden = true;
  }
  async function start(): Promise<void> {
    if (!assetsReady || starting || disposed) return;
    starting = true;
    clearInput(); run = createRun(); recorded = false; title = false; paused = false;
    panelKey = ''; last = performance.now();
    showPanel(); refreshHud();
    canvas.focus();
    await audio.start();
    if (!disposed && !audio.available) { run.banner = '音声を開始できませんでした。ゲームはそのまま遊べます。'; run.bannerTime = 5; }
    starting = false;
  }
  function pause(value: boolean): void {
    if (title || run.status === 'won' || run.status === 'lost') return;
    paused = value; clearInput(); panelKey = '';
    if (value) audio.pause(); else { void audio.start(); canvas.focus(); }
    showPanel();
  }
  function toggleMute(): void {
    audio.setSettings({ ...audio.settings, muted: !audio.settings.muted }); save(audio.settings);
    root.querySelectorAll<HTMLButtonElement>('[data-action="mute"]').forEach(b => { b.textContent = audio.settings.muted ? '音 OFF' : '音 ON'; b.setAttribute('aria-pressed', String(audio.settings.muted)); });
  }
  root.addEventListener('click', (event) => {
    const target = (event.target as Element).closest<HTMLElement>('button');
    if (!target) return;
    if (target.dataset.gender) { gender = target.dataset.gender as Gender; showPanel(); return; }
    if (target.dataset.upgrade) { chooseUpgrade(run, target.dataset.upgrade as UpgradeId); clearInput(); showPanel(); canvas.focus(); return; }
    switch (target.dataset.action) {
      case 'start': case 'restart': void start(); break;
      case 'exit': onExit(); break;
      case 'pause': pause(true); break;
      case 'resume': pause(false); break;
      case 'mute': toggleMute(); break;
      case 'dash': dashQueued = true; canvas.focus(); break;
    }
  }, { signal: events.signal });
  root.addEventListener('input', (event) => {
    const input = event.target as HTMLInputElement;
    if (input.dataset.volume === 'music' || input.dataset.volume === 'effects') {
      audio.setSettings({ ...audio.settings, [input.dataset.volume]: Number(input.value) / 100 }); save(audio.settings);
    }
  }, { signal: events.signal });
  window.addEventListener('keydown', event => {
    if (event.key === 'Tab' && !overlay.hidden) {
      const focusable = [...overlay.querySelectorAll<HTMLElement>('button:not(:disabled),input')];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    if (title || (event.target instanceof HTMLInputElement)) return;
    const key = event.key.toLowerCase();
    if (key === ' ' && !overlay.hidden && event.target instanceof HTMLButtonElement) return;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'escape'].includes(key)) event.preventDefault();
    if (!event.repeat && (key === 'p' || key === 'escape')) { pause(!paused); return; }
    if (!event.repeat && key === 'm') toggleMute();
    if (paused) return;
    if (run.status === 'upgrade') {
      const index = Number(key) - 1;
      if (!event.repeat && run.choices[index]) { chooseUpgrade(run, run.choices[index]); clearInput(); showPanel(); canvas.focus(); }
      return;
    }
    if (run.status !== 'playing') return;
    keys.add(key);
    if (key === ' ' && !event.repeat) dashQueued = true;
  }, { signal: events.signal });
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()), { signal: events.signal });
  window.addEventListener('blur', () => { clearInput(); if (!title && run.status === 'playing') pause(true); }, { signal: events.signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInput(); if (!title && (run.status === 'playing' || run.status === 'upgrade')) pause(true); } }, { signal: events.signal });
  window.addEventListener('resize', () => renderer.resize(), { signal: events.signal });
  const stick = root.querySelector<HTMLElement>('.astra-stick')!;
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' || title || paused || run.status !== 'playing' || touch) return;
    canvas.setPointerCapture(e.pointerId);
    touch = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
    stick.hidden = false; stick.style.left = `${e.clientX}px`; stick.style.top = `${e.clientY}px`;
  }, { signal: events.signal });
  canvas.addEventListener('pointermove', e => {
    if (!touch || touch.id !== e.pointerId) return;
    const dx = e.clientX - touch.x, dy = e.clientY - touch.y, length = Math.max(40, Math.hypot(dx, dy));
    touch.dx = dx / length; touch.dy = dy / length;
    stick.querySelector<HTMLElement>('i')!.style.transform = `translate(${touch.dx * 30}px,${touch.dy * 30}px)`;
  }, { signal: events.signal });
  const touchEnd = (e: PointerEvent): void => { if (touch?.id === e.pointerId) { touch = undefined; stick.hidden = true; } };
  canvas.addEventListener('pointerup', touchEnd, { signal: events.signal });
  canvas.addEventListener('pointercancel', touchEnd, { signal: events.signal });

  function loop(now: number): void {
    if (disposed) return;
    const dt = Math.min((now - last) / 1000, .05); last = now;
    const x = touch?.dx ?? ((keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0));
    const y = touch?.dy ?? ((keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0));
    if (!title && !paused) updateRun(run, dt, { x, y, dash: dashQueued });
    dashQueued = false;
    if (!recorded && (run.status === 'won' || run.status === 'lost')) {
      recorded = true; clearInput();
      records = { runs: records.runs + 1, wins: records.wins + Number(run.status === 'won'), bestKills: Math.max(records.bestKills, run.kills), bestTime: Math.max(records.bestTime, run.time) };
      save(records);
    }
    audio.setBoss(run.enemies.some(e => e.boss > 0));
    for (const sound of new Set(run.sounds)) audio.play(sound);
    run.sounds = [];
    renderer.draw(run, gender, !paused && !title && run.status === 'playing' && Boolean(x || y));
    hudTimer -= dt;
    if (hudTimer <= 0) { refreshHud(); hudTimer = .1; }
    showPanel();
    frame = requestAnimationFrame(loop);
  }
  renderer.ready.then(() => { if (!disposed) { assetsReady = true; showPanel(); } }).catch((e: Error) => { if (!disposed) { loadError = e.message; showPanel(); } });
  showPanel(); refreshHud(); frame = requestAnimationFrame(loop);
  return { cleanup: () => { disposed = true; events.abort(); cancelAnimationFrame(frame); audio.dispose(); root.remove(); } };
}
