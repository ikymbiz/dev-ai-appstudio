# 開発ルール（厳守）

> AIが作業する際に必ず守るべき制約。MODULE_MAP.mdと併せて読むこと。

## アーキテクチャ制約
- ビルドツール・バンドラー（Vite, Webpack等）は使用禁止
- `<script src="...">` による読込順で動作すること（ES Modules不使用）
- グローバル関数スタイルを維持すること
- index.html内の `onclick` 等インラインイベントはそのまま維持
- CodeMirrorのみ `import()` による動的読込を許可

## 変更時のルール
- **1回の作業で編集するファイルは最大2つまで**（影響範囲を限定するため）
- `db.js` のインターフェース（関数名・引数・戻り値）は変更禁止
- `index.html` 内の `id` 属性は変更禁止（ui-labels.jsが依存）
- 新しいグローバル関数を追加したら `MODULE_MAP.md` に追記すること
- 作業完了後に `CHANGELOG.md` へ記録すること

## コーディング規約
- コメントは日本語で記述
- 変数名・関数名は英語キャメルケース（例: `chatHistory`, `loadChatHistory`）
- DOM要素のidはケバブケース（例: `chat-log`, `spec-modal`）
- エラー通知は `showToast()` を使用（`console.error` も併記）
- HTML文字列の生成ではテンプレートリテラルを使用

## テスト確認項目（変更後に必ずチェック）
1. 各タブ（CHAT / CODE / PREVIEW / SET）が正常に切り替わること
2. チャットの送信・受信・履歴保存が動作すること
3. エディタのコード編集 → PREVIEWへの反映が動作すること
4. 設定の変更が自動保存されること
5. リロード後にチャット履歴・コード・設定が復元されること
6. GitHub Import / Deploy モーダルが開閉すること

## 禁止事項
- APIキーのハードコーディング
- `eval()` の使用
- 外部CDN依存の追加（既存のGoogle Fonts, esm.shを除く）
- `localStorage` への機密情報保存（APIキーは必ず暗号化してIndexedDBへ）
