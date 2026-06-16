# Codex Prompt: Three-Move Battle Puzzle MVP

あなたはシニアReactゲーム開発者です。以下の仕様で、React + Vite + TypeScript の小型パズルゲームMVPを実装してください。

## 目的
ブラウザで遊べる「3手詰めバトルパズル」を作る。プレイヤーは限られた3手以内で敵を倒す。戦術パズルとして短時間で遊べるKilling Time向けにする。最終的にはモバイル移植しやすい設計にする。

## ゲーム概要
5x5の盤面にプレイヤー、敵、障害物、アイテムが配置されている。プレイヤーは移動または攻撃を1手として行い、3手以内に全敵を倒せばクリア。敵はMVPでは動かさないか、ステージによって固定反撃のみとする。

## 技術要件
- React + Vite + TypeScript
- 外部ゲームエンジンなし
- ゲームロジックは `src/game/battleLogic.ts` に分離
- ステージデータは `src/data/levels.ts`
- UIはCSS Gridで実装
- 操作はクリック/タップベース

## MVP仕様
### 盤面
- 5x5グリッド
- セル種別：empty / wall / player / enemy / item
- プレイヤーは上下左右に1マス移動可能
- wallは通過不可

### アクション
- Move: 隣接セルへ移動。1手消費
- Attack: 隣接する敵を攻撃。1手消費
- Skill: 直線2マス先まで攻撃。1ステージ1回のみ。1手消費

### 敵
- HPを持つ
- 通常敵: HP 1
- Tank敵: HP 2
- MVPでは敵は移動しない
- オプションで、攻撃後に隣接している敵から1ダメージ反撃

### 勝敗
- 3手以内に全敵撃破でクリア
- 3手使い切って敵が残っていれば失敗
- プレイヤーHPが0なら失敗

### ステージ
- まず5ステージ作る
- 各ステージに以下を持たせる
  - gridSize
  - playerStart
  - enemies
  - walls
  - playerHp
  - moveLimit: 3

## 画面仕様
- タイトル
- ステージ番号
- 残り手数
- プレイヤーHP
- Skill使用可否
- 5x5盤面
- 選択中アクション表示
- Move / Attack / Skill ボタン
- Undo / Reset ボタン
- Clear / Failed表示
- Next Levelボタン

## 実装方針
- `getValidActions(state)` を作る
- `applyAction(state, action)` を純粋関数にする
- Undo用に履歴を保持する
- 盤面セルクリック時、選択中アクションに応じて行動する
- 不正アクションは実行せず、簡単なメッセージを表示する

## 完了条件
- `npm install` → `npm run dev` で起動できる
- 5ステージが遊べる
- 移動、攻撃、スキル、Undo、Reset、勝敗判定が動く
- TypeScriptエラーがない
- READMEに起動方法とルールを書く

## 追加の制約
- 見た目はシンプルでよい
- スマホ縦画面で自然に遊べるレイアウトにする
- 実装後、主要ファイル構成と拡張ポイントを説明する
