# 定時サバイバー

日本の起業文化を軽くパロディにした、Vampire Survivors風の2Dブラウザゲームです。
プレイヤーは若手社員として、資金調達前のピッチ資料修正、壁打ち、投資家質問、深夜通知をかわしながら定時まで生き延びます。

## Tech Stack

- TypeScript
- Phaser 3
- Vite
- Jest + ts-jest

## Run

```bash
npm install
npm run dev
```

ブラウザで表示されたURLを開きます。

短縮確認用の60秒モードは、URLに `?debug=1` を付けます。

## Test

```bash
npm test
npm run build
```

## Gameplay

- 移動: `WASD` または矢印キー
- 攻撃: 完全自動
- クリア: 5分間生存して定時退社
- 敗北: HPが0になる
- レベルアップ: 経験値を集めるとビジネス用語スキルを3択で選択

## Initial Weapons

- 議事録ビーム
- 根回しオーラ
- リマインド弾
- 資料修正スプリント
- 合意形成シールド
