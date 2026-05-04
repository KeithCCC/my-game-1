import Phaser from 'phaser';

const CHARACTER_ROWS = [
  {
    name: '若手社員',
    role: 'プレイヤー',
    description: '資金調達前の混乱に巻き込まれた主人公。',
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
            <p>移動はWASDまたは矢印キー。攻撃は自動。レベルアップではビジネス用語スキルを選ぶ。</p>
          </div>
          <button class="primary-button" type="button">始業する</button>
        </div>
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
    this.root.querySelector('button')?.addEventListener('click', () => this.startGame());
    this.input.keyboard?.once('keydown-ENTER', () => this.startGame());
  }

  shutdown(): void {
    this.root?.remove();
    this.root = undefined;
  }

  private startGame(): void {
    this.shutdown();
    const debug = new URLSearchParams(window.location.search).has('debug');
    this.scene.start('GameScene', { debug });
  }
}
