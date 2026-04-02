/* ============================================
   config.js — 定数・モデル一覧・プロンプト管理
   依存: なし
   ============================================ */

const PROXY_WORKER_URL = 'https://green-credit-a6fb.ikymbiz.workers.dev';

const PROVIDER_MODELS = {
    gemini: { chat: [['gemini-2.5-flash','2.5 Flash'],['gemini-3-flash-preview','3 Flash'],['gemini-2.5-pro','2.5 Pro'],['deep-research-pro-preview-12-2025','Deep Research']], code: [['gemini-2.5-flash','2.5 Flash'],['gemini-3.1-pro-preview','3.1 Pro'],['gemini-2.5-pro','2.5 Pro']] },
    openai: { chat: [['gpt-4o','GPT-4o'],['gpt-4o-mini','GPT-4o mini'],['o3-mini','o3-mini']], code: [['gpt-4o','GPT-4o'],['gpt-4.1','GPT-4.1'],['o3-mini','o3-mini']] },
    claude: { chat: [['claude-sonnet-4-20250514','Claude Sonnet 4'],['claude-haiku-3-5-20241022','Haiku 3.5']], code: [['claude-sonnet-4-20250514','Sonnet 4'],['claude-opus-4-20250918','Opus 4']] },
    xai: { chat: [['grok-3','Grok 3'],['grok-3-mini','Grok 3 Mini']], code: [['grok-3','Grok 3']] },
    groq: { chat: [['llama-3.3-70b-versatile','Llama 3.3 70B'],['mixtral-8x7b-32768','Mixtral 8x7B']], code: [['llama-3.3-70b-versatile','Llama 3.3 70B']] }
};

/* === プロンプト管理 === */
let PROMPTS_DATA = null;

async function loadPrompts() {
    // ハードコードされたデフォルトのプロンプトとUIテキスト（prompts.jsonの初期値）
    PROMPTS_DATA = {
        defaults: {
            'system-prompt': "# Role: Senior Full-Stack & Mobile App Engineer (Android/PWA Expert)\n\n## 🛠 Coding Principles (Mandatory)\n1. **Analyze First:** Deeply understand the current code, data structure, and logic before proposing changes.\n2. **Minimal Intervention:** Do NOT refactor or delete existing code unless explicitly requested. Preserve the user's UI and logic.\n3. **Plan-Act-Verify:** - [Plan] Provide a brief modification plan.\n   - [Act] Execute the code changes accurately.\n   - [Verify] Self-check: \"Is the goal met?\" & \"Are unintended areas unchanged?\"\n\n## 📱 Tech Stack & Mobile Optimization\n- **Core:** HTML5, Tailwind CSS (CDN), Vanilla JavaScript. Single-file (SFC) preferred.\n- **Android/PWA Ready:** - Implementation of manifest.json, Service Worker (offline-ready), and SVG-based Favicon.\n  - Safe-area support (env(safe-area-inset-*)), theme-color meta, and 48x48dp touch targets.\n  - History API for Android back-button handling.\n- **Design:** Modern UI, Dark Mode (auto/toggle), Ripple effects, and full responsiveness.\n\n## 🔋 Advanced Features & UX\n- **Data:** Secure **IndexedDB** for local persistence. JSON **Import/Export** with validation.\n- **AI Integration:** Support Gemini (Default: gemini-2.5-flash), Claude, GPT, xAI.\n- **Settings UI:** Implement screens for API Key management (No hardcoding!) and Dynamic System Prompt editing.\n- **Visibility:** Real-time status indicators (Spinners/\"Thinking...\"). Use **Page Visibility API** to maintain async tasks in background/multitasking.\n\n## ⚖️ Compliance & Security\n- **Google Play Policy:** Ensure \"Minimum Functionality\" (not a web mirror). Include a Privacy Policy UI section.\n- **Security:** Zero hardcoded keys. Sanitize inputs to prevent XSS.\n\n## 📝 Output Rules\n- **Response Language:** Japanese.\n- **Code Comments:** Japanese.\n- **Quality:** High-performance, clean, and ready-to-install code.",
            'user-profile': "28歳の女性フリーランス。Instagram運用代行と小規模事業者向けの発信支援をしており、顧客向けに使える予約フォーム、診断ページ、簡易会員ページなどのWebアプリをAIで素早く作りたいと考えている。デザインにはこだわりがある一方、JavaScriptやバックエンドの知識は浅く、HTML・CSSベースで見た目が整った画面をまず作り、必要な機能はAIに聞きながら足していくタイプ。外注コストを抑えつつ、自分でプロトタイプを作ってすぐ提案できることを重視している。",
            'code-principles': "日本語で答えること！\n\n1. Analyze First: Deeply understand current code/context before proposing changes.\n2. Minimal Intervention: Do NOT refactor or delete existing code unless requested. Preserve UI/logic.\n3. Plan-Act-Verify: Provide a brief plan -> Execute code -> Verify no unintended changes or omissions."
        },
        prompts: {
            plan: "あなたはプロのWeb開発ディレクターです。ユーザーのアイディアを具体化し、実装（BUILD）に向けた設計図を作成します。\n{systemPrompt}\nプロファイル: {prof}\nガイドライン:\n1. アプリ名、ターゲット、機能をヒアリング。\n2. 簡潔に箇条書きで返答。\n3. コードは書かず、仕様合意に徹する。\n4. 仕様が固まったら「素晴らしいプランです。⚡️コードを作成 ボタンから実装を開始しましょう」と促す。\n5. ユーザーの要望がまだ曖昧な場合や、次のステップを提案したい場合は、会話の最後に「次に進むための要件を提案しましょうか？✨ 要件をおまかせ ボタンから次のステップを提案できます。」と応答する。\n\n【現在の仕様リスト】\n{specList}\n\n【直近の会話】\n{recentChat}\n{codeContext}",
            suggest: "現在の会話履歴とコードを元に、次に開発すべき最適な要件やアイデアを具体的に提案してください。もし要件が不足していれば、自律的に補完して完全なプランを提示してください。",
            debug: "あなたはプロのWeb開発ディレクターです。次の修整依頼に対して、バグの報告かどうか判断してください。バグの場合は要因を確認してください。要因が判明したら改善策を検討してください。要因が判明しない場合は、要因切分けのためのログや反応を取得するためのコードを検討してください。最後に、前回のコード生成から現在までで修整する要件を整理してください。\n【修正依頼】\n{memoText}",
            extract: "以下のユーザーとAIの直近のやり取りから、実装すべき要件・修正点・仕様変更を抽出してください。\n\n【ユーザーの発言】\n{userMessage}\n\n【AIの応答】\n{aiResponse}\n\n【既存の仕様リスト】\n{existingSpecs}\n\n【ルール】\n- 既存リストと重複する項目は除外すること\n- 新規の項目のみ出力すること\n- 出力はJSON配列のみ（例: [\"項目1\", \"項目2\"]）\n- 抽出すべき新規項目がなければ空配列 [] を返すこと\n- JSON以外のテキストは一切出力しないこと",
            verify: "以下の仕様リストと生成されたコードを照合し、取り込まれていない（漏れている）要件を特定してください。\n\n【仕様リスト】\n{specList}\n\n【生成されたコード】\n{generatedCode}\n\n【ルール】\n- 各仕様がコード内に実装されているか1つずつ確認すること\n- 漏れている項目のみJSON配列で返すこと（例: [\"漏れ項目1\", \"漏れ項目2\"]）\n- 全て網羅されている場合は空配列 [] を返すこと\n- JSON以外のテキストは一切出力しないこと",
            extractProfile: '以下の会話から、ユーザーの好みや開発におけるペルソナ（使用技術、デザインの好み等）に関する新しい情報があれば抽出してください。\n現在のペルソナ:\n{currentProfile}\nユーザーの発言:\n{userText}\nAIの応答:\n{aiText}\n\n【ルール】\n- 既存と重複しない新情報のみを抽出し、ペルソナを充実させた「更新後の文章全体」を生成してください。\n- ユーザーの好みや開発スタイルに関する情報のみ抽出し、システムの機能要件や具体的な仕様に関する記述は絶対に含めないでください。\n- 新情報がなければ空のJSON `{}` を返してください。\n- 更新がある場合は `{ "newProfile": "更新後の文章全体" }` 形式のJSONのみ出力すること。'
        },
        ui: {
            tabChat: "CHAT", tabCode: "CODE", tabPreview: "PREVIEW", tabSettings: "SET",
            headerConversation: "CONVERSATION", specButton: "📋 仕様", newButton: "＋ New",
            generateCodeButton: "⚡️ コードを作成 (BUILD)",
            cameraOption: "📸 カメラ", galleryOption: "🖼️ ギャラリー", filesOption: "📁 ファイル",
            userPromptPlaceholder: "例：ダークモードのTodoアプリを作りたい...", sendButton: "↑",
            importButton: "📥 Import", uploadButton: "Upload", searchButton: "🔍 Search",
            downloadButton: "Download", deployButton: "🚀 Deploy",
            debugMemoPlaceholder: "修正したい点を入力...", debugRequestButton: "修正を依頼",
            aiProviderLabel: "AI PROVIDER", chatModelLabel: "CHAT MODEL", codeModelLabel: "CODE MODEL",
            apiKeyGeminiLabel: "API KEY — GEMINI", apiKeyOpenAILabel: "API KEY — OPENAI",
            apiKeyClaudeLabel: "API KEY — CLAUDE", apiKeyXaiLabel: "API KEY — GROK (xAI)",
            apiKeyGroqLabel: "API KEY — GROQ", apiKeySecurityLabel: "API KEY SECURITY",
            ghTokenLabel: "GITHUB TOKEN", userPersonaLabel: "ユーザーペルソナ", resetDefaultButton: "↺ 初期値",
            systemPromptLabel: "SYSTEM PROMPT", codePrinciplesLabel: "CODE PRINCIPLES",
            promptTemplatesSummary: "PROMPT TEMPLATES（詳細設定）", planPromptLabel: "PLANプロンプト",
            suggestPromptLabel: "要件おまかせ", debugPromptLabel: "修正依頼",
            extractPromptLabel: "仕様抽出", verifyPromptLabel: "漏れ検証", extractProfilePromptLabel: "ペルソナ抽出",
            codeThemeLabel: "CODE THEME（コードに反映）", templatesLabel: "TEMPLATES",
            specModalTitle: "📋 仕様・修正リスト", specModalDescription: "※項目を左にスワイプして編集・削除ができます",
            specAddPlaceholder: "仕様・修正点を追加...", specAddButton: "＋",
            specRestoreButton: "↩ 前回のリストに戻す", specClearButton: "🗑 リストをクリア",
            noSpecsMessage: "仕様項目はありません",
            toastSpecExists: "既に同じ仕様が存在します", toastSpecAdded: "仕様を追加しました",
            toastSpecUpdated: "仕様を更新しました", toastSpecCleared: "クリアしました",
            toastSpecRestored: "復元しました", toastEmptySpecs: "空です",
            profileProposalModalTitle: "💡 ユーザーペルソナの更新提案",
            profileProposalDescription: "AIが会話から新しいペルソナ情報を抽出しました。更新しますか？",
            currentPersonaLabel: "現在のペルソナ", proposedPersonaLabel: "提案されたペルソナ",
            discardButton: "破棄する", applyButton: "適用する",
            toastProfileUpdated: "ユーザーペルソナを更新しました",
            aiQuestionModalTitle: "❓ AIからの質問",
            aiQuestionPromptMissingReqs: "未実装の要件が残っています。これらの修正を依頼しますか？",
            aiQuestionOptionFix: "⚡️修正を依頼", aiQuestionOptionSuggest: "✨要件をおまかせ",
            aiSystemMsgSpecsUpdated: "📋 仕様リスト更新（+{count}件）",
            aiSystemMsgMissingReqs: "⚠️ 未実装の要件があります:\n",
            aiSystemMsgAllSpecsCovered: "✅ 全仕様を網羅しました",
            aiSystemMsgInitial: "AI Web Studio 起動。\n要件を教えてください。プランが固まったら「⚡️コードを作成」ボタンを表示します。",
            aiSystemMsgReset: "リセットしました。\n要件を教えてください。",
            aiSystemMsgCodeLoaded: "{source} からコードを読み込みました。\n修正したい点があれば教えてください。",
            aiSystemMsgThinking: "考案中...", aiSystemMsgBuildingCode: "構築中...",
            aiSystemMsgBuildComplete: "✨ 構築完了。PREVIEWを確認してください。",
            aiSystemMsgBuildError: "エラー:", toastInputRequired: "入力が必要です",
            toastSettingsSaved: "設定を自動保存しました", toastDefaultRestored: "デフォルト値に戻しました",
            toastCodeMissing: "コードがありません", toastDownloadStarted: "ダウンロード開始",
            toastThemeSaved: "保存しました", toastThemeApplied: "反映しました",
            toastTemplateSaved: "保存しました", tabButtonResetConfirm: "リセットしますか？",
            tabButtonOverwriteConfirm: "上書きしますか？", tokenNotSetAlert: "GitHubトークンが設定されていません。",
            ghImportModalTitle: "📥 GitHub Import", ghRepoSearchPlaceholder: "リポジトリを検索...",
            ghLoading: "読込中...", ghError: "エラー", ghFilePrefix: "📄", ghBackToRepos: "← 戻る",
            ghDeployModalTitle: "🚀 GitHub Deploy", deployTokenInputPlaceholder: "ghp_...",
            deploySaveAndAuth: "保存 & 認証", deployNewRepoButton: "＋ 新規リポジトリ",
            deploySearchPlaceholder: "検索...", deployNewRepoBack: "← 戻る",
            newRepoNamePlaceholder: "リポジトリ名", newRepoPublicOption: "Public (公開)",
            newRepoPrivateOption: "Private (非公開)", newRepoCreateButton: "✨ 作成",
            newRepoCreating: "作成中...", newRepoError: "❌ エラー",
            deployTargetLabel: "Target:", deployBranchPlaceholder: "Branch",
            deployFilePlaceholder: "File", deployReadmePlaceholder: "README内容...",
            deployGhPagesCheckbox: "GitHub Pages有効化", deployExecButton: "🚀 デプロイ実行",
            deploying: "デプロイ中...", deploySuccess: "✅ 成功！", deployError: "❌ エラー",
            deploySuccessTitle: "🎉 デプロイ成功！", ghPagesCountdownPreparing: "公開準備中...",
            ghPagesReady: "✨ 公開されました！", deployUrlLabel: "URL:",
            viewSiteButton: "🌐 サイトを見る", bgNotifyText: "バックグラウンドで生成中...",
            themeEditorModalTitleCreate: "🎨 テーマを作成", themeEditorNamePlaceholder: "My Theme",
            themeEditorIconPlaceholder: "🎨", themeEditorDescPlaceholder: "説明",
            themeEditorSaveButton: "💾 保存", themeEditorApplyButton: "⚡ 反映",
            themeDeleteConfirm: "削除しますか？",
            templateEditorModalTitleAdd: "📄 テンプレートを追加", templateEditorNamePlaceholder: "My Template",
            templateEditorIconPlaceholder: "📄", templateEditorDescPlaceholder: "説明",
            templateEditorCodePlaceholder: "<!DOCTYPE html>...",
            templateEditorLoadButton: "📁 読込", templateEditorSaveButton: "💾 保存",
            templateDeleteConfirm: "削除しますか？",
            templateAddButton: "追加",
            specClearConfirm: "仕様リストをクリアしますか？",
            specDeleteConfirm: "この仕様を削除しますか？",
            userPersonaPlaceholder: "ペルソナを入力...",
            aiQuestionOptionFixAlt: "⚡️修正を依頼",
            aiQuestionOptionFixPrompt: "未実装の要件を修正してください",
            chatSpinnerThinking: "考案中...", chatSpinnerBuilding: "構築中...",
            chatSpinnerInterrupted: "⚠️ 中断されました。",
            chatMsgEdit: "✏️", chatMsgSave: "💾", chatMsgDelete: "🗑️",
            searchModalTitle: "🔍 Find in Code", searchInputPlaceholder: "Find...",
            deployTargetRepoPrefix: "Target: ",
            deployStatusSuccess: "✅ 成功！",
            deployStatusError: "❌ エラー",
            deployStatusCreating: "作成中...",
            deployStatusDeploying: "デプロイ中...",
            keyExpiryStatusNotSaved: "キー未保存。設定から入力してください。",
            keyExpiryStatusExpired: "期限切れです",
            keyExpiryStatusRemaining: "残り{remaining}日で自動消去されます",
            aiSystemMsgInterrupted: "⚠️ 中断されました。",

            // § デプロイ進行ステータス (github.js 要件1)
            deployingTokenCheck   : "GitHubトークンの有効性を確認中...",
            deployingPrepareFiles : "デプロイファイルを準備中...",
            deployingMainFile     : "メインファイルをアップロード中...",
            deployingReadmeFile   : "READMEファイルを更新中...",
            deployingGhPages      : "GitHub Pagesを有効化中...",

            // § エラーメッセージ (github.js 要件2)
            deployMainFileError   : "メインファイルのアップロードに失敗しました。",
            deployReadmeFileError : "READMEファイルの更新に失敗しました。",
            networkError          : "ネットワーク接続に問題があるようです。インターネット接続を確認してください。",

            // § トークン検証 (github.js 要件3)
            tokenInvalidAlert     : "GitHubトークンが無効か、必要な権限がありません。設定を確認してください。",
        }
    };

    try {
        const res = await fetch('./prompts.json');
        if (res.ok) {
            const loadedPrompts = await res.json();
            if (loadedPrompts.defaults) {
                Object.assign(PROMPTS_DATA.defaults, loadedPrompts.defaults);
            }
            if (loadedPrompts.prompts) {
                for (const [key, value] of Object.entries(loadedPrompts.prompts)) {
                    if (value && value.template) {
                        PROMPTS_DATA.prompts[key] = value.template;
                    } else if (typeof value === 'string') {
                        PROMPTS_DATA.prompts[key] = value;
                    }
                }
            }
            if (loadedPrompts.ui) {
                Object.assign(PROMPTS_DATA.ui, loadedPrompts.ui);
            }
        } else {
            console.warn('prompts.json could not be loaded. Using hardcoded defaults.');
        }
    } catch (e) {
        console.warn('Error fetching prompts.json. Using hardcoded defaults.', e);
    }
}

function getPrompt(name) { return PROMPTS_DATA?.prompts?.[name] || ''; }
function getDefault(fieldId) { return PROMPTS_DATA?.defaults?.[fieldId] || ''; }
function getLabel(key) { return PROMPTS_DATA?.ui?.[key] || ''; }

function getFieldDefaults() {
    return {
        'system-prompt': getDefault('system-prompt'),
        'user-profile': getDefault('user-profile'),
        'code-principles': getDefault('code-principles'),
        'prompt-plan': getPrompt('plan'),
        'prompt-suggest': getPrompt('suggest'),
        'prompt-debug': getPrompt('debug'),
        'prompt-extract': getPrompt('extract'),
        'prompt-verify': getPrompt('verify'),
        'prompt-extractProfile': getPrompt('extractProfile')
    };
}

function resetFieldDefault(fieldId) {
    const def = getFieldDefaults()[fieldId];
    if (def !== undefined) {
        document.getElementById(fieldId).value = def;
        autoSaveSettings();
        showToast(getLabel('toastDefaultRestored'));
    }
}
