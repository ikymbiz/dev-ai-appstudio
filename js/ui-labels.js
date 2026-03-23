/* ============================================
   ui-labels.js — UIテキストの適用
   依存: config.js
   ============================================ */

function applyUITexts() {
    // Tabs
    document.getElementById('tab-chat').textContent = getLabel('tabChat');
    document.getElementById('tab-editor').textContent = getLabel('tabCode');
    document.getElementById('tab-preview').textContent = getLabel('tabPreview');
    document.getElementById('tab-settings').textContent = getLabel('tabSettings');

    // Chat Header
    document.querySelector('.chat-header .header-title').textContent = getLabel('headerConversation');
    document.querySelector('.chat-header .spec-btn').innerHTML = `${getLabel('specButton')} <span id="spec-badge" class="tab-badge empty">0</span>`;
    document.querySelector('.chat-header .reset-btn').textContent = getLabel('newButton');

    // Floating Generate Container
    document.getElementById('floating-generate-container').querySelector('.generate-btn').innerHTML = getLabel('generateCodeButton');

    // Input Container
    document.querySelector('#attach-menu .menu-item:nth-child(1)').textContent = getLabel('cameraOption');
    document.querySelector('#attach-menu .menu-item:nth-child(2)').textContent = getLabel('galleryOption');
    document.querySelector('#attach-menu .menu-item:nth-child(3)').textContent = getLabel('filesOption');
    document.getElementById('user-prompt').placeholder = getLabel('userPromptPlaceholder');
    document.getElementById('send-btn').textContent = getLabel('sendButton');

    // Editor Actions
    document.querySelector('.action-btn.import-btn').textContent = getLabel('importButton');
    document.querySelector('.action-btn.upload-btn').textContent = getLabel('uploadButton');
    document.querySelector('.action-btn.search-btn').textContent = getLabel('searchButton');
    document.querySelector('.action-btn.download-btn').textContent = getLabel('downloadButton');
    document.querySelector('.action-btn.deploy-btn').textContent = getLabel('deployButton');

    // Debug Panel
    document.getElementById('debug-memo').placeholder = getLabel('debugMemoPlaceholder');
    document.querySelector('.debug-panel .debug-btn').textContent = getLabel('debugRequestButton');

    // Settings Page
    document.querySelector('#p-settings .field:nth-child(1) label').textContent = getLabel('aiProviderLabel');
    document.querySelector('#p-settings .field:nth-child(2) label').textContent = getLabel('chatModelLabel');
    document.querySelector('#p-settings .field:nth-child(3) label').textContent = getLabel('codeModelLabel');
    document.querySelector('.api-key-field[data-provider="gemini"] label').textContent = getLabel('apiKeyGeminiLabel');
    document.querySelector('.api-key-field[data-provider="openai"] label').textContent = getLabel('apiKeyOpenAILabel');
    document.querySelector('.api-key-field[data-provider="claude"] label').textContent = getLabel('apiKeyClaudeLabel');
    document.querySelector('.api-key-field[data-provider="xai"] label').textContent = getLabel('apiKeyXaiLabel');
    document.querySelector('.api-key-field[data-provider="groq"] label').textContent = getLabel('apiKeyGroqLabel');
    document.querySelector('#api-keys-section + .field label').textContent = getLabel('apiKeySecurityLabel');
    document.querySelector('#api-keys-section + .field + .field label').textContent = getLabel('ghTokenLabel');
    document.querySelector('#api-keys-section + .field + .field + .field label').textContent = getLabel('userPersonaLabel');
    document.querySelector('#api-keys-section + .field + .field + .field .reset-default-btn').textContent = getLabel('resetDefaultButton');
    document.getElementById('user-profile').placeholder = getLabel('userPersonaPlaceholder');
    document.querySelector('.field:nth-of-type(6) .field-header label').textContent = getLabel('systemPromptLabel');
    document.querySelector('.field:nth-of-type(6) .reset-default-btn').textContent = getLabel('resetDefaultButton');
    document.querySelector('.field:nth-of-type(7) .field-header label').textContent = getLabel('codePrinciplesLabel');
    document.querySelector('.field:nth-of-type(7) .reset-default-btn').textContent = getLabel('resetDefaultButton');
    document.querySelector('.prompt-details summary').textContent = getLabel('promptTemplatesSummary');
    document.querySelector('.prompt-details .field-header:nth-of-type(1) label').textContent = getLabel('planPromptLabel');
    document.querySelector('.prompt-details .field-header:nth-of-type(1) .reset-default-btn').textContent = getLabel('resetDefaultButton');
    document.querySelector('.prompt-details .field-header:nth-of-type(2) label').textContent = getLabel('suggestPromptLabel');
    document.querySelector('.prompt-details .field-header:nth-of-type(2) .reset-default-btn').textContent = getLabel('resetDefaultButton');
    document.querySelector('.prompt-details .field-header:nth-of-type(3) label').textContent = getLabel('debugPromptLabel');
    document.querySelector('.prompt-details .field-header:nth-of-type(3) .reset-default-btn').textContent = getLabel('resetDefaultButton');
    document.querySelector('.prompt-details .field-header:nth-of-type(4) label').textContent = getLabel('extractPromptLabel');
    document.querySelector('.prompt-details .field-header:nth-of-type(4) .reset-default-btn').textContent = getLabel('resetDefaultButton');
    document.querySelector('.prompt-details .field-header:nth-of-type(5) label').textContent = getLabel('verifyPromptLabel');
    document.querySelector('.prompt-details .field-header:nth-of-type(5) .reset-default-btn').textContent = getLabel('resetDefaultButton');
    document.querySelector('.prompt-details .field-header:nth-of-type(6) label').textContent = getLabel('extractProfilePromptLabel');
    document.querySelector('.prompt-details .field-header:nth-of-type(6) .reset-default-btn').textContent = getLabel('resetDefaultButton');
    document.querySelector('.theme-section label').textContent = getLabel('codeThemeLabel');
    document.querySelector('.template-section label').textContent = getLabel('templatesLabel');

    // Spec Modal
    document.querySelector('#spec-modal .modal-header h3').textContent = getLabel('specModalTitle');
    document.querySelector('#spec-modal .modal-close').textContent = '✕';
    document.querySelector('#spec-modal .modal-body p').textContent = getLabel('specModalDescription');
    document.getElementById('spec-add-input').placeholder = getLabel('specAddPlaceholder');
    document.querySelector('#spec-modal .spec-add-btn').textContent = getLabel('specAddButton');
    document.getElementById('spec-restore-btn').textContent = getLabel('specRestoreButton');
    document.querySelector('#spec-modal .spec-footer-btn.danger').textContent = getLabel('specClearButton');

    // Profile Proposal Modal
    document.querySelector('#profile-proposal-modal .modal-header h3').textContent = getLabel('profileProposalModalTitle');
    document.querySelector('#profile-proposal-modal .modal-close').textContent = '✕';
    document.querySelector('#profile-proposal-modal .modal-body p').textContent = getLabel('profileProposalDescription');
    document.querySelector('#profile-proposal-modal .modal-body div:nth-child(2) label').textContent = getLabel('currentPersonaLabel');
    document.querySelector('#profile-proposal-modal .modal-body div:nth-child(3) label').textContent = getLabel('proposedPersonaLabel');
    document.querySelector('#profile-proposal-modal .modal-body .modal-btn:nth-child(1)').textContent = getLabel('discardButton');
    document.querySelector('#profile-proposal-modal .modal-body .modal-btn:nth-child(2)').textContent = getLabel('applyButton');

    // AI Question Modal
    document.querySelector('#ai-question-modal .modal-header h3').textContent = getLabel('aiQuestionModalTitle');
    document.querySelector('#ai-question-modal .modal-close').textContent = '✕';

    // Search Modal
    document.querySelector('#search-modal .modal-header h3').textContent = getLabel('searchModalTitle');
    document.querySelector('#search-modal .modal-close').textContent = '✕';
    document.getElementById('code-search-input').placeholder = getLabel('searchInputPlaceholder');

    // GitHub Import Modal
    document.querySelector('#gh-import-modal .modal-header h3').textContent = getLabel('ghImportModalTitle');
    document.querySelector('#gh-import-modal .modal-close').textContent = '✕';
    document.getElementById('gh-repo-search').placeholder = getLabel('ghRepoSearchPlaceholder');
    document.querySelector('#gh-step-file .modal-btn').textContent = getLabel('ghBackToRepos');

    // GitHub Deploy Modal
    document.querySelector('#gh-deploy-modal .modal-header h3').textContent = getLabel('ghDeployModalTitle');
    document.querySelector('#gh-deploy-modal .modal-close').textContent = '✕';
    document.getElementById('deploy-token-input').placeholder = getLabel('deployTokenInputPlaceholder');
    document.querySelector('#deploy-step-token .modal-btn').textContent = getLabel('deploySaveAndAuth');
    document.querySelector('#deploy-step-repo .modal-btn').textContent = getLabel('deployNewRepoButton');
    document.getElementById('deploy-repo-search').placeholder = getLabel('deploySearchPlaceholder');
    document.querySelector('#deploy-step-new-repo .modal-btn:nth-child(1)').textContent = getLabel('deployNewRepoBack');
    document.getElementById('new-repo-name').placeholder = getLabel('newRepoNamePlaceholder');
    document.querySelector('#new-repo-private option[value="false"]').textContent = getLabel('newRepoPublicOption');
    document.querySelector('#new-repo-private option[value="true"]').textContent = getLabel('newRepoPrivateOption');
    document.querySelector('#deploy-step-new-repo .modal-btn:nth-child(5)').textContent = getLabel('newRepoCreateButton');
    document.querySelector('#deploy-step-details .modal-btn').textContent = getLabel('deployNewRepoBack');
    document.querySelector('#deploy-step-details div:nth-child(2)').childNodes[0].nodeValue = getLabel('deployTargetRepoPrefix');
    document.getElementById('deploy-branch').placeholder = getLabel('deployBranchPlaceholder');
    document.getElementById('deploy-filepath').placeholder = getLabel('deployFilePlaceholder');
    document.getElementById('deploy-readme-content').placeholder = getLabel('deployReadmePlaceholder');
    document.querySelector('#deploy-gh-pages + span').textContent = getLabel('deployGhPagesCheckbox');
    document.getElementById('deploy-exec-btn').textContent = getLabel('deployExecButton');
    document.querySelector('#deploy-step-success h4').textContent = getLabel('deploySuccessTitle');
    document.getElementById('view-site-btn').textContent = getLabel('viewSiteButton');

    // Background Notify
    document.querySelector('#bg-notify span').textContent = getLabel('bgNotifyText');

    // Theme Editor Modal
    document.getElementById('theme-editor-title').textContent = getLabel('themeEditorModalTitleCreate');
    document.getElementById('te-name').placeholder = getLabel('themeEditorNamePlaceholder');
    document.getElementById('te-icon').placeholder = getLabel('themeEditorIconPlaceholder');
    document.getElementById('te-desc').placeholder = getLabel('themeEditorDescPlaceholder');
    document.querySelector('#theme-editor-modal .modal-btn:nth-of-type(1)').textContent = getLabel('themeEditorSaveButton');
    document.querySelector('#theme-editor-modal .modal-btn:nth-of-type(2)').textContent = getLabel('themeEditorApplyButton');

    // Template Editor Modal
    document.getElementById('tpl-editor-title').textContent = getLabel('templateEditorModalTitleAdd');
    document.getElementById('tple-name').placeholder = getLabel('templateEditorNamePlaceholder');
    document.getElementById('tple-icon').placeholder = getLabel('templateEditorIconPlaceholder');
    document.getElementById('tple-desc').placeholder = getLabel('templateEditorDescPlaceholder');
    document.getElementById('tple-code').placeholder = getLabel('templateEditorCodePlaceholder');
    document.querySelector('#tpl-editor-modal .modal-btn:nth-of-type(1)').textContent = getLabel('templateEditorLoadButton');
    document.querySelector('#tpl-editor-modal .modal-btn:nth-of-type(2)').textContent = getLabel('templateEditorSaveButton');
}
