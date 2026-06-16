# Codex Prompt: Factory Line Connection Puzzle MVP

あなたはシニアReactゲーム開発者です。以下の仕様で、React + Vite + TypeScript の小型パズルゲームMVPを実装してください。

## 目的
ブラウザで遊べる「工場ライン接続パズル」を作る。素材供給地点から加工機、完成品出口までラインをつなぐ短時間パズルにする。最終的にはモバイルへ移植しやすい構成にする。

## ゲーム概要
プレイヤーは5x5または6x6の盤面にラインタイルを配置・回転させ、素材を正しい加工機へ流し、完成品出口まで接続する。すべての必要ラインがつながればクリア。

## 技術要件
- React + Vite + TypeScript
- 外部ゲームエンジンなし
- ゲームロジックは `src/game/` に分離
- ステージデータは `src/data/levels.ts`
- UIはCSS Gridで盤面表示
- ロジックは純粋関数中心にする

## MVP仕様
### 盤面
- 6x6グリッド
- セル種別：empty / source / machine / output / obstacle / pipe
- source, machine, output, obstacle は固定セル
- pipe はプレイヤーが配置または回転できる

### パイプタイル
- straight: 上下 または 左右
- elbow: 上右 / 右下 / 下左 / 左上
- tee: 3方向接続
- cross: 4方向接続
- クリックで回転
- パレットから選択して空セルに配置
- 配置済みタイルは削除可能

### 接続判定
- sourceから接続探索する
- 接続方向が相互に一致している場合のみ通過可能
- requiredMachinesをすべて通ってoutputに到達すればクリア

### ステージ
- まず3ステージ作る
- 各ステージに以下を持たせる
  - size
  - fixedCells
  - requiredMachines
  - availableTiles
  - moveLimit 任意

## 画面仕様
- タイトル
- ステージ番号
- 残りタイル数
- タイル選択パレット
- 盤面
- Check / Reset ボタン
- Clear 表示
- Next Level ボタン

## 実装方針
- `getConnections(tile)` でタイルの接続方向を返す
- `canConnect(cellA, cellB, direction)` を作る
- `traceFlow(board, level)` で接続状態を計算
- 接続済みセルを視覚的にハイライトする

## 完了条件
- `npm install` → `npm run dev` で起動できる
- 3ステージが遊べる
- タイル選択、配置、回転、削除、接続判定が動く
- TypeScriptエラーがない
- READMEに起動方法とルールを書く

## 追加の制約
- UIはスマホ画面でも操作しやすいサイズにする
- 盤面ロジックはReact Nativeへ移植しやすいようDOM依存を避ける
- 実装後、主要ファイル構成と拡張ポイントを説明する
