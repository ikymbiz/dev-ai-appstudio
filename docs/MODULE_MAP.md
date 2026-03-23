# Module Map（必読）

> AIが作業する前に必ずこのファイルを読むこと。

## ファイル読込順（index.html内の`<script>`順序）
```
config.js → db.js → ui-labels.js → specs.js → editor.js
→ chat.js → codegen.js → github.js → settings.js → main.js
```

## 依存グラフ
```
config.js    ← 依存なし（全モジュールが参照）
db.js        ← 依存なし（全モジュールが参照）
ui-labels.js ← config.js
specs.js     ← db.js, config.js
editor.js    ← db.js
chat.js      ← db.js, config.js, specs.js, editor.js, settings.js
codegen.js   ← db.js, config.js, specs.js, chat.js, editor.js, settings.js
github.js    ← db.js, config.js, editor.js, chat.js
settings.js  ← db.js, config.js, editor.js, chat.js
main.js      ← 全モジュール（初期化のみ）
```

## 各ファイルの責務と公開関数

### config.js（~130行）— 定数・プロンプト管理
| 公開 | 用途 |
|------|------|
| `PROXY_WORKER_URL` | プロキシワーカーURL定数 |
| `PROVIDER_MODELS` | AIプロバイダ別モデル一覧 |
| `PROMPTS_DATA` | プロンプト・UIラベルデータ |
| `loadPrompts()` | prompts.json読込 → PROMPTS_DATAに格納 |
| `getPrompt(name)` | プロンプトテンプレート取得 |
| `getDefault(fieldId)` | フィールドデフォルト値取得 |
| `getLabel(key)` | UIラベル文字列取得 |
| `getFieldDefaults()` | 全フィールドのデフォルト値マップ |
| `resetFieldDefault(fieldId)` | フィールドを初期値にリセット |

### db.js（~50行）— IndexedDB CRUD ⚠️ インターフェース変更禁止
| 公開 | 用途 |
|------|------|
| `openDB()` | DB接続 → `Promise<IDBDatabase>` |
| `saveToDB(key, value)` | データ保存 |
| `getFromDB(key)` | データ取得 |
| `deleteFromDB(key)` | データ削除 |
| `showToast(msg)` | トースト通知表示 |

### ui-labels.js（~100行）— UIテキスト適用
| 公開 | 用途 |
|------|------|
| `applyUITexts()` | HTML要素にラベル文字列を適用 |

### specs.js（~130行）— 仕様リスト管理
| 公開 | 用途 |
|------|------|
| `getSpecList()` | 仕様リスト取得（localStorage） |
| `saveSpecList(list)` | 仕様リスト保存 |
| `getSpecBackup()` / `saveSpecBackup(list)` | バックアップ操作 |
| `updateSpecBadge()` | バッジ表示更新 |
| `renderSpecCards()` | 仕様カードUI描画 |
| `clearNewSpecFlags()` | NEWフラグクリア |
| `addSpecManual()` | 手動で仕様追加 |
| `specListToString()` | AI連携用テキスト変換 |
| `clearSpecList()` / `restoreSpecList()` | クリア・復元 |

### editor.js（~90行）— CodeMirror + 検索
| 公開 | 用途 |
|------|------|
| `initCodeMirror(initialCode)` | エディタ初期化 |
| `window.getCode()` | 現在のコード取得 |
| `window.setCode(code)` | コード設定 |
| `openSearchModal()` / `closeSearchModal()` | 検索モーダル |
| `performCodeSearch()` | 検索実行 |

### chat.js（~200行）— チャット機能一式
| 公開 | 用途 |
|------|------|
| `chatHistory` | チャット履歴配列 |
| `conversationContext` | 会話コンテキスト文字列 |
| `callLLM({prompt, stream, model, images})` | LLM API呼び出し |
| `askAI()` | チャット送信 |
| `askForPlan()` | 要件おまかせ |
| `loadChatHistory()` | 履歴読込・描画 |
| `createMessageElement(msg)` | メッセージDOM生成 |
| `renderMessageFromHistory(msg)` | 履歴メッセージ描画 |
| `rebuildConversationContext()` | コンテキスト再構築 |
| `confirmReset()` / `resetChatForNewCode(source)` | リセット |
| `extractSpecsFromChat(userText, aiText)` | 仕様自動抽出 |
| `extractUserProfileFromChat(userText, aiText)` | ペルソナ抽出 |
| `showAIQuestionModal()` / `closeAIQuestionModal()` | AI質問モーダル |
| `showProfileProposalModal()` / `closeProfileProposalModal()` / `acceptProfileProposal()` | ペルソナ提案 |

### codegen.js（~70行）— コード生成・検証
| 公開 | 用途 |
|------|------|
| `generateCode()` | AIによるコード生成 |
| `verifySpecCoverage(code)` | 仕様カバレッジ検証 |
| `sendDebugRequest()` | プレビューからの修正依頼 |

### github.js（~130行）— GitHub連携
| 公開 | 用途 |
|------|------|
| `openGitHubImport()` / `closeGitHubImport()` | インポートモーダル |
| `filterImportRepos()` | リポジトリ検索 |
| `backToRepoList()` | ファイル選択 → リポジトリ一覧に戻る |
| `openDeployer()` | デプロイ開始 |
| `openGitHubDeploy()` / `closeGitHubDeploy()` | デプロイモーダル |
| `showDeployStep(step)` | デプロイステップ切替 |
| `saveDeployToken()` | トークン保存 |
| `filterDeployRepos()` | デプロイ先リポジトリ検索 |
| `createNewRepo()` | 新規リポジトリ作成 |
| `executeDeploy()` | デプロイ実行 |
| `openDeployedSite()` | デプロイ先を開く |

### settings.js（~200行）— 設定・テーマ・テンプレート
| 公開 | 用途 |
|------|------|
| `getCurrentApiKey()` | 現在選択中のAPIキー取得 |
| `onProviderChange()` | プロバイダ変更時の処理 |
| `toggleModelSelects()` | モデル選択の有効/無効切替 |
| `autoSaveSettings()` | 設定の自動保存 |
| `loadEncryptedKeys()` / `saveEncryptedKeys(keys)` | APIキー暗号化 |
| `updateKeyExpiryStatus(keys)` | キー有効期限表示 |
| `loadThemeManager()` / `renderThemeGrid()` | テーマ管理 |
| `selectTheme(id)` / `getSelectedThemeCSS()` | テーマ選択 |
| `injectThemeToCode(silent)` | テーマCSS注入 |
| `loadTemplateList()` / `renderTemplateGrid()` | テンプレート管理 |
| `applyTemplate(id)` | テンプレート適用 |

### main.js（~100行）— 初期化・ページ切替・共通UI
| 公開 | 用途 |
|------|------|
| `currentImageBase64` / `currentMimeType` / `currentFileName` | 添付ファイル状態 |
| `showPage(id, btn)` | ページ切替 |
| `autoGrow(element)` | textarea自動伸縮 |
| `toggleAttachmentMenu()` | 添付メニュー開閉 |
| `triggerFile(type)` / `handleAttachment(input)` | 添付処理 |
| `removeAttachment()` | 添付解除 |
| `triggerCodeUpload()` / `handleCodeUpload(input)` | コードアップロード |
| `updatePreview()` | プレビュー更新 |
| `downloadCode()` | コードダウンロード |

## DBキー一覧（IndexedDB 'AIWebStudioBG' → 'tasks'ストア）
| キー | 値の型 | 管理元 |
|------|--------|--------|
| `settings` | Object | settings.js |
| `encryptedApiKeys` | Object(iv, data, ts) | settings.js |
| `chatHistory` | Array | chat.js |
| `currentCode` | String | editor.js |
| `gh_token` | String | settings.js / github.js |
| `customThemes` | Array | settings.js |
| `codeTheme` | String | settings.js |
| `customTemplates` | Array | settings.js |
| `pending_deploy` | Object | github.js |

## localStorage キー一覧
| キー | 値の型 | 管理元 |
|------|--------|--------|
| `specList` | JSON Array | specs.js |
| `specListBackup` | JSON Array | specs.js |
