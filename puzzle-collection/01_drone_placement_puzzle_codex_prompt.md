# Codex Prompt: Drone Placement Puzzle MVP

あなたはシニアReactゲーム開発者です。以下の仕様で、React + Vite + TypeScript の小型パズルゲームMVPを実装してください。

## 目的
ブラウザで遊べる「ドローン配置パズル」を作る。最終的にはReact Native / Expoへ移植しやすいように、ゲームロジックとUIを分離する。

## ゲーム概要
プレイヤーは5x5のグリッド上に防衛ドローンを配置し、敵ユニットがスタートからゴールへ到達するのを防ぐ。各ステージには配置可能なドローン数と電力上限がある。敵のルート、ドローンの射程、コストを考えてクリアを目指す。

## 技術要件
- React + Vite + TypeScript
- 外部ゲームエンジンは使わない
- CSS Modules または通常CSSで実装
- ゲームロジックは `src/game/` に分離
- UIコンポーネントは `src/components/` に分離
- データ定義は `src/data/levels.ts`
- モバイル移植を意識し、クリック操作は将来タップ操作に置き換えやすい構造にする

## MVP仕様
### 盤面
- 5x5 グリッド
- セル種別：empty / path / start / goal / blocked
- 敵はpath上を1マスずつ進む

### ドローン
- 種類はまず2つ
  - Light Drone: cost 1, range 1, damage 1
  - Heavy Drone: cost 2, range 2, damage 2
- pathセルには配置不可
- 電力上限を超えて配置不可
- 配置済みドローンを再クリックで撤去できる

### 敵
- HPを持つ
- ターンごとに1マス進む
- ドローン射程内に入った敵へ自動攻撃
- 敵がgoalに到達したら失敗
- 全敵を倒せばクリア

### ステージ
- まず3ステージ作る
- 各ステージに以下を持たせる
  - grid
  - enemyHp
  - enemyCount
  - powerLimit
  - allowedDrones

## 画面仕様
- タイトル
- ステージ番号
- 電力使用量 / 電力上限
- ドローン選択ボタン
- 5x5グリッド
- Start / Reset ボタン
- Win / Lose 表示
- Next Level ボタン

## 実装方針
- `useGameState` カスタムフックを作る
- ゲーム状態は reducer で管理してもよい
- 1ターン進行関数 `advanceTurn()` をロジック側に置く
- テストしやすい純粋関数を優先する

## 完了条件
- `npm install` → `npm run dev` で起動できる
- 3ステージが遊べる
- ドローン配置、撤去、攻撃、勝敗判定が動く
- TypeScriptエラーがない
- READMEに起動方法とゲームルールを書く

## 追加の制約
- 見た目はシンプルでよいが、スマホ画面幅でも破綻しない
- まず完成を優先し、アニメーションは最小限にする
- 実装後、主要ファイル構成と今後の拡張ポイントを説明する
