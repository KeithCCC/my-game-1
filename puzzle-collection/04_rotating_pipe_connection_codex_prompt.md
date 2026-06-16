# Codex Prompt: Rotating Pipe Connection Puzzle MVP

あなたはシニアReactゲーム開発者です。以下の仕様で、React + Vite + TypeScript の小型パズルゲームMVPを実装してください。

## 目的
ブラウザで遊べる「回転パイプ接続パズル」を作る。プレイヤーは盤面上のパイプを回転させ、水源からゴールまで接続する。短時間で1ステージを遊べるKilling Time向けにする。

## ゲーム概要
固定配置されたパイプタイルをクリックで回転させ、水源から出口まで正しくつなぐ。すべての出口に水が届けばクリア。

## 技術要件
- React + Vite + TypeScript
- 外部ゲームエンジンなし
- ロジックは `src/game/pipeLogic.ts` に分離
- ステージ定義は `src/data/levels.ts`
- UIはCSS Gridで実装
- モバイル移植を意識し、DOM依存ロジックを避ける

## MVP仕様
### 盤面
- 5x5グリッド
- セル種別：source / outlet / pipe / empty / blocked
- sourceとoutletは固定
- pipeはクリックで90度回転

### パイプ種類
- straight: 2方向
- elbow: 2方向
- tee: 3方向
- cross: 4方向
- cap: 1方向

### 接続判定
- sourceからBFSまたはDFSで水の到達範囲を計算
- 隣接セルとの接続方向が双方一致する場合のみ流れる
- 全outletに到達すればクリア

### ステージ
- まず5ステージ作る
- 各ステージは初期回転状態を持つ
- moveCountを記録する

## 画面仕様
- タイトル
- ステージ番号
- 回転回数
- 盤面
- Resetボタン
- Checkボタン
- Clear表示
- Next Levelボタン

## 実装方針
- `rotateTile(tile)` を純粋関数にする
- `getOpenDirections(tile)` を作る
- `computeFlow(board)` で到達セルを返す
- 到達済みセルをハイライトする
- Checkボタンだけでなく、回転ごとに自動判定してもよい

## 完了条件
- `npm install` → `npm run dev` で起動できる
- 5ステージが遊べる
- 回転、リセット、接続判定、クリア判定が動く
- TypeScriptエラーがない
- READMEに起動方法とルールを書く

## 追加の制約
- グリッドセルはタップしやすいサイズにする
- タイル形状はテキスト記号やCSS表現でよい
- 実装後、主要ファイル構成と拡張ポイントを説明する
