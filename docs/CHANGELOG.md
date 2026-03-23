# 変更履歴

## v2.0.0 — 2026-03-24 : モジュール分割
### 概要
単一HTMLファイル（1268行）を機能ブロック単位で12ファイル + 6ドキュメントに分割。
動作は完全に同一を維持（リファクタリングのみ、機能追加なし）。

### 変更内容
- `index.html` → HTML構造のみ（ロジック・CSS除去）
- `styles.css` → CSS全量を外部ファイル化
- `js/config.js` → 定数・モデル一覧・プロンプト管理
- `js/db.js` → IndexedDB CRUD + トースト通知
- `js/ui-labels.js` → UIテキスト適用（applyUITexts）
- `js/specs.js` → 仕様リスト管理（CRUD・スワイプ・バッジ）
- `js/editor.js` → CodeMirror初期化・検索
- `js/chat.js` → チャット送受信・履歴・LLM通信・仕様抽出・ペルソナ抽出
- `js/codegen.js` → コード生成・仕様検証・デバッグ依頼
- `js/github.js` → GitHub Import / Deploy
- `js/settings.js` → APIキー暗号化・自動保存・テーマ・テンプレート
- `js/main.js` → 初期化・ページ切替・添付・プレビュー・ダウンロード
- `docs/MODULE_MAP.md` → ファイル構成・依存関係・公開関数一覧
- `docs/RULES.md` → 開発制約・コーディング規約
- `docs/ARCHITECTURE.md` → 設計思想・拡張計画
- `docs/BACKLOG.md` → 未着手タスク
- `docs/KNOWN_ISSUES.md` → 既知の不具合
- `docs/CHANGELOG.md` → 本ファイル

### 分割の原則
- 1ファイル = 1つの完結した機能ブロック
- グローバル関数スタイル維持（バンドラー不要）
- `<script src>` 順序による依存解決

---

## v1.0.0 — 初期版
- 単一 `index.html`（1268行）で全機能を実装
- AI Web Studio として動作するSPA
