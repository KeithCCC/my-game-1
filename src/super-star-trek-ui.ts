import {
  createSuperStarTrekState,
  executeSuperStarTrekCommand,
  getShortRangeScan,
  type SuperStarTrekState,
} from './games/super-star-trek';

type MountedGameState = {
  cleanup: () => void;
};

type ShowLanding = () => void;

const QUICK_COMMANDS: Array<{ label: string; value: string; mode: 'run' | 'prefill' }> = [
  { label: 'NAV', value: 'NAV 1 1.0', mode: 'prefill' },
  { label: 'SRS', value: 'SRS', mode: 'run' },
  { label: 'LRS', value: 'LRS', mode: 'run' },
  { label: 'PHA', value: 'PHA 300', mode: 'prefill' },
  { label: 'TOR', value: 'TOR 1', mode: 'prefill' },
  { label: 'SHE', value: 'SHE 500', mode: 'prefill' },
  { label: 'DAM', value: 'DAM', mode: 'run' },
  { label: 'COM', value: 'COM', mode: 'prefill' },
  { label: 'Help', value: 'HELP', mode: 'run' },
];

export function mountSuperStarTrek(gameRoot: HTMLElement, showLanding: ShowLanding): MountedGameState {
  let state = createSuperStarTrekState();
  const root = document.createElement('main');
  root.className = 'trek-game';
  root.setAttribute('aria-label', 'Super Star Trek');
  gameRoot.appendChild(root);

  const runCommand = (input: string): void => {
    executeSuperStarTrekCommand(state, input);
    render();
  };

  const render = (): void => {
    root.innerHTML = `
      <section class="trek-shell">
        <header class="trek-topbar">
          ${renderStat('Stardate', state.stardate.toFixed(1))}
          ${renderStat('Condition', state.condition)}
          ${renderStat('Quadrant', formatCoord(state.enterprise.quadrant))}
          ${renderStat('Sector', formatCoord(state.enterprise.sector))}
          ${renderStat('Energy', String(state.enterprise.energy))}
          ${renderStat('Shields', String(state.enterprise.shields))}
          ${renderStat('Torpedoes', String(state.enterprise.torpedoes))}
          ${renderStat('Klingons', String(state.klingonsRemaining))}
        </header>
        <div class="trek-console-layout">
          <section class="trek-screen" aria-label="Command transcript">
            <div class="trek-title-line">SUPER STAR TREK - COMMAND THE ENTERPRISE</div>
            <pre>${escapeHtml(state.transcript.join('\n'))}</pre>
          </section>
          <aside class="trek-side-panel" aria-label="Current quadrant scan">
            <h2>Short Range Scan</h2>
            <pre>${escapeHtml(getShortRangeScan(state).join('\n'))}</pre>
            <div class="trek-legend">
              <span>&lt;*&gt; Enterprise</span>
              <span>+++ Klingon</span>
              <span>&gt;!&lt; Starbase</span>
              <span>* Star</span>
            </div>
          </aside>
        </div>
        <form class="trek-command-row" data-command-form>
          <label for="trek-command">Command</label>
          <input id="trek-command" name="command" autocomplete="off" spellcheck="false" value="" placeholder="SRS, NAV 1 1.0, PHA 300..." />
          <button class="trek-primary-button" type="submit">Enter</button>
        </form>
        <div class="trek-command-buttons" aria-label="Command shortcuts">
          ${QUICK_COMMANDS.map((command) => `
            <button class="trek-button" type="button" data-command="${command.value}" data-mode="${command.mode}">${command.label}</button>
          `).join('')}
          <button class="trek-button" type="button" data-action="new">New Game</button>
          <button class="trek-button" type="button" data-action="menu">Game Select</button>
        </div>
      </section>
    `;
    const input = root.querySelector<HTMLInputElement>('#trek-command');
    input?.focus();
  };

  const submit = (event: SubmitEvent): void => {
    event.preventDefault();
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) {
      return;
    }
    const formData = new FormData(form);
    const command = String(formData.get('command') ?? '').trim();
    if (command) {
      runCommand(command);
    }
  };

  const click = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const action = target.closest<HTMLButtonElement>('[data-action]')?.dataset.action;
    if (action === 'new') {
      state = createSuperStarTrekState();
      render();
      return;
    }
    if (action === 'menu') {
      showLanding();
      return;
    }
    const commandButton = target.closest<HTMLButtonElement>('[data-command]');
    if (!commandButton) {
      return;
    }
    const command = commandButton.dataset.command ?? '';
    const mode = commandButton.dataset.mode;
    const input = root.querySelector<HTMLInputElement>('#trek-command');
    if (mode === 'prefill') {
      if (input) {
        input.value = command;
        input.focus();
        input.select();
      }
      return;
    }
    runCommand(command);
  };

  root.addEventListener('submit', submit);
  root.addEventListener('click', click);
  render();

  return {
    cleanup: () => {
      root.removeEventListener('submit', submit);
      root.removeEventListener('click', click);
      root.remove();
    },
  };
}

function renderStat(label: string, value: string): string {
  return `<div><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function formatCoord(coord: { x: number; y: number }): string {
  return `${coord.x + 1}-${coord.y + 1}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
