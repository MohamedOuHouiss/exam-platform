/* ===================================================
   REDACTION ENGINE — Rédaction state + TinyMCE integration
   Enterprise-level rich text editing for medical exams
   =================================================== */

import { ExamTimer, initTimerUI } from './timer.js';
import { QuestionNavigator } from './navigator.js';
import { AttemptsTracker } from './attempts.js';
import { redactionQuestions } from './data/redaction-demo.js';

class RedactionExam {
    constructor() {
        this.questions = redactionQuestions;
        this.currentIndex = 0;
        this.container = document.getElementById('questionContainer');
        this.direction = 'right';

        // Store HTML content per question
        this.contents = new Map();
        this.editorInstance = null;

        // Pre-compute clinical case groups
        this._caseGroups = this._buildCaseGroups();

        // ── Init modules ──
        this.attempts = new AttemptsTracker(this.questions.length, 3);

        this.navigator = new QuestionNavigator({
            totalQuestions: this.questions.length,
            onNavigate: (index, dir) => this._goTo(index, dir),
            getQuestionState: (index) => this.attempts.getState(index),
        });

        this.timer = new ExamTimer({
            durationMs: 90 * 60 * 1000,
            onTimeUp: () => this._onTimeUp(),
        });

        initTimerUI(this.timer);

        // ── Bind events ──
        this._bindFinishModal();
        this._bindTimeUpModal();

        // ── Restore contents from session ──
        this._restoreContents();

        // ── Render first question ──
        this._render(0);
        this.navigator.updateStates();

        // ── Listen for time-up ──
        document.addEventListener('exam:timeup', () => this._onTimeUp());

        // ── Page entrance ──
        document.body.classList.add('page-enter');
    }

    // ── Build clinical case groups ──

    _buildCaseGroups() {
        const groups = new Map();
        const caseOwners = new Map();

        this.questions.forEach((q, i) => {
            const caseId = q.clinicalCase ? q.id : q.clinicalCaseRef;
            if (caseId) {
                if (!caseOwners.has(caseId)) {
                    const owner = this.questions.find(p => p.id === caseId);
                    caseOwners.set(caseId, {
                        clinicalCase: owner?.clinicalCase || null,
                        indices: [],
                    });
                }
                caseOwners.get(caseId).indices.push(i);
            }
        });

        for (const [caseId, group] of caseOwners.entries()) {
            for (const idx of group.indices) {
                groups.set(idx, {
                    caseId,
                    clinicalCase: group.clinicalCase,
                    indices: group.indices,
                });
            }
        }

        return groups;
    }

    // ── Navigation ──

    _goTo(index, direction) {
        this._saveCurrentContent();

        const prevIndex = this.currentIndex;
        this.direction = direction;
        this.currentIndex = index;

        const prevGroup = this._caseGroups.get(prevIndex);
        const newGroup = this._caseGroups.get(index);
        const sameCaseGroup = prevGroup && newGroup && prevGroup.caseId === newGroup.caseId;

        if (sameCaseGroup) {
            this._renderQuestionOnly(index);
        } else {
            this._render(index);
        }
    }

    _saveCurrentContent() {
        if (this.editorInstance) {
            const content = this.editorInstance.getContent();
            const plainText = this.editorInstance.getContent({ format: 'text' }).trim();
            if (plainText.length > 0 || content.includes('<table')) {
                this.contents.set(this.currentIndex, content);
            }
            this._persistContents();
        }
    }

    // ── Full Render ──

    _render(index) {
        const q = this.questions[index];
        const state = this.attempts.getState(index);
        const group = this._caseGroups.get(index);
        const animClass = this.direction === 'right' ? 'slide-right' : 'slide-left';

        let html = '';

        // Sticky clinical case
        if (group && group.clinicalCase) {
            html += this._renderStickyCase(group);
        }

        // Question card
        html += `<div class="question-card ${animClass}" id="questionCard">`;
        html += this._renderQuestionContent(index, q, state);
        html += `</div>`;

        this.container.innerHTML = html;
        this._initEditor(index, state);
        this._bindQuestionEvents(index, state);
    }

    // ── Partial Render (question only, case stays) ──

    _renderQuestionOnly(index) {
        const q = this.questions[index];
        const state = this.attempts.getState(index);
        const questionCard = document.getElementById('questionCard');

        if (questionCard) {
            questionCard.className = 'question-card fade-only';
            questionCard.innerHTML = this._renderQuestionContent(index, q, state);
            this._initEditor(index, state);
            this._bindQuestionEvents(index, state);

            // Update case indicator
            const indicator = this.container.querySelector('.clinical-case-questions-indicator');
            const group = this._caseGroups.get(index);
            if (indicator && group) {
                const posInGroup = group.indices.indexOf(index) + 1;
                indicator.textContent = `Q${posInGroup} / ${group.indices.length}`;
            }
        } else {
            this._render(index);
        }
    }

    // ── Render question content ──

    _renderQuestionContent(index, q, state) {
        let html = '';

        // Prompt
        html += `
      <div class="redaction-prompt card card-highlight">
        <div class="question-header">
          <div class="question-number">${index + 1}</div>
          <div class="question-meta">
            <span class="badge badge-primary question-type-badge">Rédaction</span>
            <div class="question-text">${q.text}</div>
          </div>
        </div>
      </div>
    `;

        // Editor wrapper
        html += `
      <div class="editor-wrapper ${state.locked ? 'locked' : ''}" id="editorWrapper">
        <textarea id="tinyEditor"></textarea>
        <div class="editor-actions">
          <span class="editor-word-count" id="wordCount">0 mots</span>
          <div style="display: flex; align-items: center; gap: var(--space-sm);">
            <div class="question-attempts">
              <span class="question-attempts-label">Tentatives :</span>
              ${this._renderAttemptDots(state)}
            </div>
            <button class="btn btn-accent btn-sm" id="btnConfirm" ${state.locked ? 'disabled' : ''}>
              ${state.locked ? '🔒 Verrouillé' : 'Valider la réponse'}
            </button>
          </div>
        </div>
      </div>
    `;

        // Nav buttons
        html += `
      <div class="redaction-footer">
        <button class="btn btn-ghost btn-sm" id="btnPrev" ${index === 0 ? 'disabled' : ''}>
          ← Précédent
        </button>
        <button class="btn btn-primary btn-sm" id="btnNext" ${index === this.questions.length - 1 ? 'disabled' : ''}>
          Suivant →
        </button>
      </div>
    `;

        return html;
    }

    // ── Sticky clinical case ──

    _renderStickyCase(group) {
        const posInGroup = group.indices.indexOf(this.currentIndex) + 1;
        return `
      <div class="clinical-case-sticky clinical-case" id="stickyCase">
        <div class="clinical-case-header">
          <span class="clinical-case-icon">🏥</span>
          <span class="clinical-case-title">${group.clinicalCase.title}</span>
          <span class="clinical-case-questions-indicator">Q${posInGroup} / ${group.indices.length}</span>
          <span class="clinical-case-toggle">▼</span>
        </div>
        <div class="clinical-case-body">
          <p>${group.clinicalCase.text}</p>
        </div>
      </div>
    `;
    }

    _initEditor(index, state) {
        if (this.editorInstance) {
            this.editorInstance.destroy();
            this.editorInstance = null;
        }

        const tinymce = window.tinymce;
        if (!tinymce) {
            console.error('TinyMCE not loaded');
            return;
        }

        tinymce.init({
            selector: '#tinyEditor',
            height: 450,
            menubar: false,
            plugins: 'table lists link anchor autoresize',
            toolbar: state.locked ? false : 'undo redo | blocks | bold italic underline | bullist numlist | table | removeformat',
            content_style: `
                body { font-family: 'Inter', sans-serif; font-size: 16px; color: #1a1a2e; line-height: 1.6; }
                table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
                table td, table th { border: 1px solid #e2e8f0; padding: 8px; }
            `,
            readonly: state.locked,
            branding: false,
            promotion: false,
            statusbar: false,
            setup: (editor) => {
                this.editorInstance = editor;
                editor.on('init', () => {
                    const saved = this.contents.get(index);
                    if (saved) editor.setContent(saved);
                    this._updateWordCount();
                });
                editor.on('input Change keyup', () => {
                    this._updateWordCount();
                });
            }
        });
    }

    _updateWordCount() {
        const wc = document.getElementById('wordCount');
        if (this.editorInstance && wc) {
            const text = this.editorInstance.getContent({ format: 'text' }).trim();
            const words = text.length > 0 ? text.split(/\s+/).length : 0;
            wc.textContent = `${words} mot${words !== 1 ? 's' : ''}`;
        }
    }

    // ── Bind events ──

    _bindQuestionEvents(index, state) {
        const btnPrev = document.getElementById('btnPrev');
        const btnNext = document.getElementById('btnNext');
        const btnConfirm = document.getElementById('btnConfirm');

        if (btnPrev) btnPrev.addEventListener('click', () => this.navigator.prev());
        if (btnNext) btnNext.addEventListener('click', () => this.navigator.next());
        if (btnConfirm && !state.locked) {
            btnConfirm.addEventListener('click', () => this._confirmAnswer(index));
        }

        // Clinical case toggle
        const caseHeader = this.container.querySelector('.clinical-case-header');
        if (caseHeader) {
            caseHeader.addEventListener('click', () => {
                const caseEl = caseHeader.closest('.clinical-case');
                caseEl.classList.toggle('collapsed');
            });
        }
    }

    _renderAttemptDots(state) {
        let dots = '<div class="attempt-dots">';
        for (let i = 0; i < 3; i++) {
            const used = i < state.attemptsUsed;
            const isLast = state.attemptsRemaining === 1 && i === state.attemptsUsed;
            dots += `<div class="attempt-dot ${used ? 'used' : ''} ${isLast ? 'last' : ''}"></div>`;
        }
        dots += '</div>';
        return dots;
    }

    // ── Confirm answer ──

    _confirmAnswer(index) {
        if (!this.editorInstance) return;

        const html = this.editorInstance.getContent();
        const text = this.editorInstance.getContent({ format: 'text' }).trim();
        if (text.length === 0 && !html.includes('<table')) return;

        this.contents.set(index, html);
        this.attempts.recordAttempt(index, html);
        this._persistContents();
        this.navigator.updateStates();

        // Re-render to show updated attempts
        const state = this.attempts.getState(index);

        if (state.locked) {
            this._renderQuestionOnly(index);
        } else {
            const attemptsContainer = this.container.querySelector('.question-attempts');
            if (attemptsContainer) {
                attemptsContainer.innerHTML = `
                    <span class="question-attempts-label">Tentatives :</span>
                    ${this._renderAttemptDots(state)}
                `;
            }
        }
    }

    // ── Persistence ──

    _persistContents() {
        try {
            const obj = {};
            for (const [key, val] of this.contents.entries()) {
                obj[key] = val;
            }
            sessionStorage.setItem('redactionContents', JSON.stringify(obj));
        } catch (e) {
            console.warn('Storage quota exceeded or unavailable', e);
        }
    }

    _restoreContents() {
        const saved = sessionStorage.getItem('redactionContents');
        if (saved) {
            try {
                const obj = JSON.parse(saved);
                for (const [key, val] of Object.entries(obj)) {
                    this.contents.set(parseInt(key), val);
                }
            } catch (e) { /* ignore */ }
        }
    }

    // ── Finish exam ──

    _bindFinishModal() {
        const btnFinish = document.getElementById('btnFinish');
        const modal = document.getElementById('finishModal');
        const btnCancel = document.getElementById('btnCancelFinish');
        const btnConfirm = document.getElementById('btnConfirmFinish');
        const modalText = document.getElementById('finishModalText');

        btnFinish.addEventListener('click', () => {
            this._saveCurrentContent();
            const stats = this.attempts.getStats();
            modalText.innerHTML = `Vous avez répondu à <strong>${stats.answered}</strong> question(s) sur <strong>${stats.total}</strong>.`;
            modal.classList.add('active');
        });

        btnCancel.addEventListener('click', () => modal.classList.remove('active'));
        btnConfirm.addEventListener('click', () => this._finishExam());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    }

    _bindTimeUpModal() {
        const modal = document.getElementById('timeUpModal');
        const btnOk = document.getElementById('btnTimeUpOk');
        btnOk.addEventListener('click', () => { window.location.href = '/'; });
    }

    _onTimeUp() {
        this._saveCurrentContent();
        this.attempts.lockAll();
        this.navigator.updateStates();
        this._render(this.currentIndex);
        document.getElementById('timeUpModal').classList.add('active');
    }

    _finishExam() {
        this.timer.stop();
        this.attempts.lockAll();
        sessionStorage.removeItem('timerStart');
        sessionStorage.removeItem('examState');
        sessionStorage.removeItem('redactionContents');
        window.location.href = '/';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new RedactionExam();
});
