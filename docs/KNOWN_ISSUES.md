# 既知の不具合・制限事項

## ISSUE-001: callLLMがGemini以外で未実装
- **影響**: OpenAI / Claude / xAI / Groq を選択するとエラー
- **原因**: `chat.js` の `callLLM()` 末尾で `throw Error` している
- **対象ファイル**: `chat.js`（callLLM関数）
- **回避策**: AIプロバイダーにGeminiを選択する

## ISSUE-002: ストリーミングがGemini+APIキー時のみ動作
- **影響**: Proxy経由の場合やその他プロバイダでは非ストリーム（一括表示）
- **対象ファイル**: `chat.js`（askAI関数内の分岐）
- **回避策**: Gemini APIキーを設定する

## ISSUE-003: Proxy Worker URLがハードコード
- **影響**: ワーカーが停止するとAPIキーなし時の動作が不可能
- **対象ファイル**: `config.js`（PROXY_WORKER_URL定数）
- **回避策**: APIキーを設定して直接API呼び出しを使用する

## 制限事項
- コード生成は単一HTMLファイルのみ対応（複数ファイル未対応）
- 大規模コード（30,000文字超）はverifySpecCoverageで切り詰められる
- APIキーは2週間で自動消去（セキュリティ仕様）
