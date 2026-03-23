# アーキテクチャ

## 概要
AI Web Studioは、ブラウザ上でAIと対話しながらWebアプリを開発するSPAツール。
単一HTMLファイルだった初期版を、AIによる保守・拡張を容易にするため機能ブロック単位で分割した。

## 設計思想

### なぜこの粒度か
- **AIの作業スコープを限定する**ことが最優先目的
- 各ファイル60〜200行で、AIのコンテキストウィンドウに余裕で収まる
- 「このファイルだけ編集して」と指示でき、他の機能が壊れない

### なぜバンドラーを使わないか
- GitHub Pagesへの直接デプロイを維持するため
- PWAのオフライン動作への影響を避けるため
- 開発環境のセットアップ不要にするため

### なぜES Modulesを使わないか
- 既存のインラインonclickイベント（40箇所以上）との互換性を維持するため
- グローバル関数スタイルのほうが、AIが「この関数はどこ？」を判断しやすいため

## データフロー

```
[ユーザー入力]
     │
     ▼
  chat.js ──→ callLLM() ──→ AI API
     │              │
     │              ▼
     │         [AI応答]
     │              │
     ├──→ extractSpecsFromChat() ──→ specs.js
     ├──→ extractUserProfileFromChat() ──→ settings.js(user-profile)
     │
     ▼
  codegen.js ──→ generateCode() ──→ callLLM()
     │              │
     │              ▼
     │         [生成コード]
     │              │
     ├──→ editor.js (window.setCode)
     ├──→ main.js (updatePreview)
     └──→ verifySpecCoverage() ──→ specs.js
```

## 拡張計画

### Phase 1: 複数ファイル対応（project.js追加）
- `project.js` を新規作成：仮想ファイルシステム
- `editor.js` にタブUI追加
- `codegen.js` のAI出力パースを複数ファイル対応
- `github.js` のデプロイを複数ファイル対応

### Phase 2: エージェント機能（agent.js追加）
- `agent.js` を新規作成：タスクの自律実行オーケストレーター
- 既存モジュールの公開関数を「ツール」として呼び出す
- specs.js → codegen.js → verifySpec のループを自動化

### Phase 3: 全プロバイダ対応（chat.js内callLLM拡張）
- OpenAI, Claude, xAI, Groq の実装を追加
- ストリーミング対応を全プロバイダに拡張
