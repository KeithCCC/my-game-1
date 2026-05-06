import Phaser from 'phaser';
import playerSheetUrl from '../../assets/player-characters.png';

type PlayerGender = 'male' | 'female';

const CHARACTER_ROWS = [
  {
    name: '若手社員',
    role: 'プレイヤー',
    description: '開始時に男の子か女の子を選ぶ主人公。',
    behavior: 'WASD / 矢印キーで移動し、自動攻撃で定時まで生存する。',
  },
  {
    name: '細かい指摘する先輩',
    role: '敵',
    description: 'ピッチ資料や作業内容に細かく赤入れしてくる先輩。',
    behavior: '序盤から多く出現する基本敵。',
  },
  {
    name: '話が長いお局さん',
    role: '敵',
    description: '相談のはずが長話になり、じわじわ時間を削ってくる存在。',
    behavior: 'やや硬く、じわじわ距離を詰める。',
  },
  {
    name: '詰めてくる課長',
    role: '敵',
    description: '回答に詰まると一気に圧を強めてくる中間管理職。',
    behavior: '中盤以降に増え、速度と圧力が高い。',
  },
  {
    name: '粗探しする部長',
    role: '敵',
    description: '細部の抜け漏れを探し、重めの確認を積み上げてくる。',
    behavior: '終盤に出る高耐久の大型敵。',
  },
  {
    name: '突然連絡してくる社長',
    role: '敵',
    description: '時間帯を問わず急な連絡と追加確認を投げてくる。',
    behavior: '小さく速く、終盤のラッシュで混ざる。',
  },
];

export class MenuScene extends Phaser.Scene {
  private root?: HTMLDivElement;
  private selectedGender: PlayerGender = 'male';

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.root = document.createElement('div');
    this.root.className = 'screen menu-screen';
    this.root.innerHTML = `
      <section class="screen-panel menu-panel">
        <div class="menu-heading">
          <div>
            <h1>定時サバイバー</h1>
            <p>若手社員として、資金調達前のピッチ文化に巻き込まれながら定時まで生き延びる。</p>
            <p>主人公を選んでから始業する。移動はWASDまたは矢印キー。攻撃は自動。</p>
          </div>
          <button class="primary-button" type="button" data-start>始業する</button>
        </div>

        <section class="player-select" aria-label="主人公を選択">
          <h2>主人公を選択</h2>
          <div class="player-card-grid">
            ${this.renderPlayerCard('male', '眼鏡の男の子', '真面目そうな新卒タイプ。資料を抱えて走る。')}
            ${this.renderPlayerCard('female', '眼鏡の女の子', '落ち着いた若手社員タイプ。会議と通知を切り抜ける。')}
          </div>
        </section>

        <section class="character-section" aria-label="登場キャラクター">
          <h2>登場キャラクター</h2>
          <div class="table-wrap">
            <table class="character-table">
              <thead>
                <tr>
                  <th>キャラクター</th>
                  <th>役割</th>
                  <th>説明</th>
                  <th>ゲーム内挙動</th>
                </tr>
              </thead>
              <tbody>
                ${CHARACTER_ROWS.map(
                  (row) => `
                    <tr>
                      <td><strong>${row.name}</strong></td>
                      <td>${row.role}</td>
                      <td>${row.description}</td>
                      <td>${row.behavior}</td>
                    </tr>
                  `,
                ).join('')}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    `;
    document.body.appendChild(this.root);
    this.root.addEventListener('click', (event) => this.handleClick(event));
    this.input.keyboard?.once('keydown-ENTER', () => this.startGame());
    this.updateSelectedCard();
  }

  shutdown(): void {
    this.root?.remove();
    this.root = undefined;
  }

  private renderPlayerCard(gender: PlayerGender, label: string, description: string): string {
    const y = gender === 'male' ? 0 : -160;
    return `
      <button class="player-card" type="button" data-gender="${gender}">
        <span class="player-preview" style="background-image: url('${playerSheetUrl}'); background-position: 0px ${y}px;"></span>
        <strong>${label}</strong>
        <span>${description}</span>
      </button>
    `;
  }

  private handleClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const genderButton = target.closest<HTMLButtonElement>('[data-gender]');
    if (genderButton?.dataset.gender === 'male' || genderButton?.dataset.gender === 'female') {
      this.selectedGender = genderButton.dataset.gender;
      this.updateSelectedCard();
      return;
    }

    if (target.closest('[data-start]')) {
      this.startGame();
    }
  }

  private updateSelectedCard(): void {
    this.root?.querySelectorAll<HTMLButtonElement>('[data-gender]').forEach((button) => {
      const selected = button.dataset.gender === this.selectedGender;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  private startGame(): void {
    this.shutdown();
    const debug = new URLSearchParams(window.location.search).has('debug');
    this.scene.start('GameScene', { debug, playerGender: this.selectedGender });
  }
}
