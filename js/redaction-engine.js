/* ===================================================
   REDACTION ENGINE — Rédaction state + Quill integration
   Performance-optimised, sticky clinical cases
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

        // Store Quill deltas per question
        this.deltas = new Map();
        this.quillInstance = null;

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

        // ── Custom Table UI ──
        this._buildTablePicker();
        this._buildTableContextMenu();
        document.addEventListener('editor:showTablePicker', (e) => this._showTablePicker(e.detail.button, e.detail.quill));

        // ── Bind events ──
        this._bindFinishModal();
        this._bindTimeUpModal();

        // ── Restore deltas from session ──
        this._restoreDeltas();

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
        this._saveCurrentDelta();

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

    _saveCurrentDelta() {
        if (this.quillInstance) {
            const delta = this.quillInstance.getContents();
            const text = this.quillInstance.getText().trim();
            if (text.length > 0) {
                this.deltas.set(this.currentIndex, delta);
            }
            this._persistDeltas();
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
        this._initQuill(index, state);
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
            this._initQuill(index, state);
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
        <div id="quillEditor"></div>
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

    _initQuill(index, state) {
        const editorEl = document.getElementById('quillEditor');
        if (!editorEl) return;

        const Quill = window.Quill;
        if (!Quill) {
            console.error('Quill not loaded');
            return;
        }

        this.quillInstance = new Quill('#quillEditor', {
            theme: 'snow',
            placeholder: 'Rédigez votre réponse ici...',
            readOnly: state.locked,
            modules: {
                table: true,
                toolbar: state.locked ? false : {
                    container: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                        ['table'],
                        ['clean'],
                    ],
                    handlers: {
                        table: function () {
                            document.dispatchEvent(new CustomEvent('editor:showTablePicker', {
                                detail: {
                                    button: document.querySelector('.ql-table'),
                                    quill: this.quill
                                }
                            }));
                        }
                    }
                }
            },
        });

        // Inject SVG for the table button since Quill doesn't provide a default one for Snow
        const tableBtn = document.querySelector('.ql-table');
        if (tableBtn && !tableBtn.innerHTML.trim()) {
            tableBtn.innerHTML = `<svg viewBox="0 0 18 18"><rect class="ql-stroke" height="12" width="14" x="2" y="3"></rect><line class="ql-stroke" x1="2" x2="16" y1="7" y2="7"></line><line class="ql-stroke" x1="2" x2="16" y1="11" y2="11"></line><line class="ql-stroke" x1="7" x2="7" y1="3" y2="15"></line><line class="ql-stroke" x1="11" x2="11" y1="3" y2="15"></line></svg>`;
        }

        // Restore saved content
        const savedDelta = this.deltas.get(index);
        if (savedDelta) {
            this.quillInstance.setContents(savedDelta);
        }

        // Word count & Table Context Menu
        this._updateWordCount();
        this.quillInstance.on('text-change', () => {
            this._updateWordCount();
        });
        this.quillInstance.on('selection-change', (range) => {
            if (range) {
                const format = this.quillInstance.getFormat(range);
                if (format && format.table) {
                    setTimeout(() => {
                        this._showTableContextMenu(this.quillInstance);
                    }, 50);
                    return;
                }
            }
            this._hideTableContextMenu();
        });
    }

    _updateWordCount() {
        const wc = document.getElementById('wordCount');
        if (this.quillInstance && wc) {
            const text = this.quillInstance.getText().trim();
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
        if (!this.quillInstance) return;

        const text = this.quillInstance.getText().trim();
        if (text.length === 0) return;

        const delta = this.quillInstance.getContents();
        this.deltas.set(index, delta);

        this.attempts.recordAttempt(index, text);
        this._persistDeltas();
        this.navigator.updateStates();

        // Re-render to show updated attempts
        const state = this.attempts.getState(index);
        const attemptsContainer = this.container.querySelector('.question-attempts');
        const btnConfirm = document.getElementById('btnConfirm');

        if (state.locked) {
            // Full re-render for lock state
            this._renderQuestionOnly(index);
        } else if (attemptsContainer) {
            // Minimal update: just dots and button
            attemptsContainer.innerHTML = `
        <span class="question-attempts-label">Tentatives :</span>
        ${this._renderAttemptDots(state)}
      `;
        }
    }

    // ── Custom Table UI Methods ──

    _buildTablePicker() {
        if (document.getElementById('tablePickerPopup')) return;
        const popup = document.createElement('div');
        popup.className = 'table-picker-popup';
        popup.id = 'tablePickerPopup';

        const grid = document.createElement('div');
        grid.className = 'table-picker-grid';

        for (let r = 1; r <= 8; r++) {
            for (let c = 1; c <= 8; c++) {
                const cell = document.createElement('div');
                cell.className = 'table-picker-cell';
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.addEventListener('mouseover', () => this._highlightTablePickerSelection(r, c));
                cell.addEventListener('click', () => {
                    this._insertSpecificTable(r, c);
                    this._hideTablePicker();
                });
                grid.appendChild(cell);
            }
        }

        const info = document.createElement('div');
        info.className = 'table-picker-info';
        info.id = 'tablePickerInfo';
        info.textContent = '1x1';

        popup.appendChild(grid);
        popup.appendChild(info);
        document.body.appendChild(popup);

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.ql-table') && !e.target.closest('.table-picker-popup')) {
                this._hideTablePicker();
            }
        });
    }

    _showTablePicker(button, quill) {
        if (!button) return;
        this.activeQuillForTable = quill;
        const rect = button.getBoundingClientRect();
        const popup = document.getElementById('tablePickerPopup');
        popup.style.left = `${rect.left}px`;
        popup.style.top = `${rect.bottom + 8}px`;
        popup.classList.add('active');
        this._highlightTablePickerSelection(1, 1);
    }

    _hideTablePicker() {
        const popup = document.getElementById('tablePickerPopup');
        if (popup) popup.classList.remove('active');
    }

    _highlightTablePickerSelection(rows, cols) {
        const popup = document.getElementById('tablePickerPopup');
        if (!popup) return;
        const cells = popup.querySelectorAll('.table-picker-cell');
        cells.forEach(cell => {
            const r = parseInt(cell.dataset.row);
            const c = parseInt(cell.dataset.col);
            if (r <= rows && c <= cols) cell.classList.add('highlight');
            else cell.classList.remove('highlight');
        });
        document.getElementById('tablePickerInfo').textContent = `${cols}x${rows}`;
        this.selectedTableRows = rows;
        this.selectedTableCols = cols;
    }

    _insertSpecificTable(rows, cols) {
        if (this.activeQuillForTable) {
            const tableModule = this.activeQuillForTable.getModule('table');
            tableModule.insertTable(rows, cols);
        }
    }

    _buildTableContextMenu() {
        if (document.getElementById('tableContextMenu')) return;
        const menu = document.createElement('div');
        menu.className = 'table-context-menu';
        menu.id = 'tableContextMenu';

        const btns = [
            { id: 'btnInsertColLeft', icon: '<svg viewBox="0 0 24 24"><path d="M15 4v16h2V4h-2zm4 0v16h2V4h-2zM9 4v16h2V4H9zM5 4v16h2V4H5z"/></svg>', title: 'Insérer colonne à gauche', action: 'insertColumnLeft' },
            { id: 'btnInsertColRight', icon: '<svg viewBox="0 0 24 24"><path d="M19 4v16h2V4h-2zm-4 0v16h2V4h-2zm-4 0v16h2V4h-2zM3 4v16h2V4H3z"/></svg>', title: 'Insérer colonne à droite', action: 'insertColumnRight' },
            { divider: true },
            { id: 'btnInsertRowAbove', icon: '<svg viewBox="0 0 24 24"><path d="M4 15h16v-2H4v2zm0 4h16v-2H4v2zm0-8h16V9H4v2zm0-6v2h16V5H4z"/></svg>', title: 'Insérer ligne au-dessus', action: 'insertRowAbove' },
            { id: 'btnInsertRowBelow', icon: '<svg viewBox="0 0 24 24"><path d="M4 19h16v-2H4v2zm0-4h16v-2H4v2zm0-4h16V9H4v2zm0-6h16V3H4v2z"/></svg>', title: 'Insérer ligne en-dessous', action: 'insertRowBelow' },
            { divider: true },
            { id: 'btnDeleteRow', icon: '<svg viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>', title: 'Supprimer la ligne', action: 'deleteRow', danger: true },
            { id: 'btnDeleteCol', icon: '<svg viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>', title: 'Supprimer la colonne', action: 'deleteColumn', danger: true },
            { id: 'btnDeleteTable', icon: '<svg viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>', title: 'Supprimer le tableau', action: 'deleteTable', danger: true }
        ];

        btns.forEach(b => {
            if (b.divider) {
                const div = document.createElement('div');
                div.className = 'menu-divider';
                menu.appendChild(div);
                return;
            }
            const btn = document.createElement('button');
            btn.innerHTML = b.icon;
            btn.title = b.title;
            if (b.danger) btn.classList.add('danger');

            btn.addEventListener('click', () => {
                if (this.activeQuillForTable) {
                    const tableModule = this.activeQuillForTable.getModule('table');
                    if (tableModule && typeof tableModule[b.action] === 'function') {
                        tableModule[b.action]();
                    }
                }
                this._hideTableContextMenu();
            });
            menu.appendChild(btn);
        });

        document.body.appendChild(menu);

        document.addEventListener('mousedown', (e) => {
            if (!e.target.closest('.table-context-menu') && !e.target.closest('td')) {
                this._hideTableContextMenu();
            }
        });
    }

    _showTableContextMenu(quill) {
        const sel = quill.getSelection();
        if (!sel) return;
        this.activeQuillForTable = quill;
        const bounds = quill.getBounds(sel.index);
        const editorRect = quill.container.getBoundingClientRect();
        const menu = document.getElementById('tableContextMenu');
        if (!menu) return;
        menu.style.left = `${editorRect.left + bounds.left + (bounds.width / 2)}px`;
        menu.style.top = `${editorRect.top + bounds.top - 12 + window.scrollY}px`;
        menu.classList.add('active');
    }

    _hideTableContextMenu() {
        const menu = document.getElementById('tableContextMenu');
        if (menu) menu.classList.remove('active');
    }

    // ── Persistence ──

    _persistDeltas() {
        try {
            const obj = {};
            for (const [key, val] of this.deltas.entries()) {
                obj[key] = val;
            }
            sessionStorage.setItem('redactionDeltas', JSON.stringify(obj));
        } catch (e) {
            console.warn('Storage quota exceeded or unavailable', e);
        }
    }

    _restoreDeltas() {
        const saved = sessionStorage.getItem('redactionDeltas');
        if (saved) {
            try {
                const obj = JSON.parse(saved);
                for (const [key, val] of Object.entries(obj)) {
                    this.deltas.set(parseInt(key), val);
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
            this._saveCurrentDelta();
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
        this._saveCurrentDelta();
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
        sessionStorage.removeItem('redactionDeltas');
        window.location.href = '/';
    }
}

// ── Initialize on DOM ready ──
document.addEventListener('DOMContentLoaded', () => {
    new RedactionExam();
});
