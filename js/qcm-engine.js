/* ===================================================
   QCM ENGINE — QCM exam state & rendering
   Performance-optimised, always multi-select, sticky clinical cases
   =================================================== */

import { ExamTimer, initTimerUI } from './timer.js';
import { QuestionNavigator } from './navigator.js';
import { AttemptsTracker } from './attempts.js';
import { qcmQuestions } from './data/qcm-demo.js';

class QCMExam {
    constructor() {
        this.questions = qcmQuestions;
        this.currentIndex = 0;
        this.container = document.getElementById('questionContainer');
        this.direction = 'right';

        // Pre-compute clinical case groups for sticky behavior
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

        // ── Render first question ──
        this._render(0);
        this.navigator.updateStates();

        // ── Listen for time-up ──
        document.addEventListener('exam:timeup', () => this._onTimeUp());

        // ── Page entrance ──
        document.body.classList.add('page-enter');
    }

    // ── Build clinical case groups ──
    // Maps each question index to its case group info

    _buildCaseGroups() {
        const groups = new Map();
        const caseOwners = new Map(); // caseId -> { clinicalCase, indices[] }

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

        // Map each index to its group
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
        const prevIndex = this.currentIndex;
        this.direction = direction;
        this.currentIndex = index;

        // Check if we're staying in the same clinical case group
        const prevGroup = this._caseGroups.get(prevIndex);
        const newGroup = this._caseGroups.get(index);
        const sameCaseGroup = prevGroup && newGroup && prevGroup.caseId === newGroup.caseId;

        if (sameCaseGroup) {
            // Only swap the question part, keep clinical case pinned
            this._renderQuestionOnly(index);
        } else {
            this._render(index);
        }
    }

    // ── Full Render (with clinical case) ──

    _render(index) {
        const q = this.questions[index];
        const state = this.attempts.getState(index);
        const group = this._caseGroups.get(index);
        const animClass = this.direction === 'right' ? 'slide-right' : 'slide-left';

        let html = '';

        // Sticky clinical case (rendered outside the question card)
        if (group && group.clinicalCase) {
            html += this._renderStickyCase(group);
        }

        // Question card
        html += `<div class="question-card card ${animClass}" id="questionCard">`;
        html += this._renderQuestionContent(index, q, state);
        html += `</div>`;

        this.container.innerHTML = html;
        this._bindQuestionEvents(index, state);
    }

    // ── Partial Render (question only, case stays) ──

    _renderQuestionOnly(index) {
        const q = this.questions[index];
        const state = this.attempts.getState(index);
        const questionCard = document.getElementById('questionCard');

        if (questionCard) {
            // Remove old animation classes, force reflow, add new
            questionCard.className = 'question-card card fade-only';
            questionCard.innerHTML = this._renderQuestionContent(index, q, state);
            this._bindQuestionEvents(index, state);

            // Update case question indicator
            const indicator = this.container.querySelector('.clinical-case-questions-indicator');
            const group = this._caseGroups.get(index);
            if (indicator && group) {
                const posInGroup = group.indices.indexOf(index) + 1;
                indicator.textContent = `Q${posInGroup} / ${group.indices.length}`;
            }
        } else {
            // Fallback: full render
            this._render(index);
        }
    }

    // ── Render question content (reusable) ──

    _renderQuestionContent(index, q, state) {
        let html = '';

        // Question header (no type badge — all are multi-select)
        html += `
      <div class="question-header">
        <div class="question-number">${index + 1}</div>
        <div class="question-meta">
          <div class="question-text">${q.text}</div>
        </div>
      </div>
    `;

        // Options (always checkbox / multi-select)
        html += `<div class="options-list">`;
        for (const opt of q.options) {
            const isSelected = this._isOptionSelected(state.answer, opt.letter);
            const selectedClass = isSelected ? 'selected' : '';
            const lockedClass = state.locked ? 'locked' : '';

            html += `
        <div class="option-item ${selectedClass} ${lockedClass}" data-letter="${opt.letter}">
          <div class="option-checkbox"></div>
          <span class="option-letter">${opt.letter}.</span>
          <span class="option-text">${opt.text}</span>
        </div>
      `;
        }
        html += `</div>`;

        // Footer
        html += `
      <div class="question-footer">
        <div class="question-attempts">
          <span class="question-attempts-label">Tentatives :</span>
          ${this._renderAttemptDots(state)}
        </div>
        <div class="question-nav-btns">
          <button class="btn btn-ghost btn-sm" id="btnPrev" ${index === 0 ? 'disabled' : ''}>
            ← Précédent
          </button>
          <button class="btn btn-primary btn-sm" id="btnNext" ${index === this.questions.length - 1 ? 'disabled' : ''}>
            Suivant →
          </button>
        </div>
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

    // ── Bind events (after render) ──

    _bindQuestionEvents(index, state) {
        // Option clicks — optimised: toggle classes instead of re-rendering
        if (!state.locked) {
            const options = this.container.querySelectorAll('.option-item:not(.locked)');
            options.forEach(opt => {
                opt.addEventListener('click', () => this._onOptionClick(opt, index));
            });
        }

        // Nav buttons
        const btnPrev = document.getElementById('btnPrev');
        const btnNext = document.getElementById('btnNext');
        if (btnPrev) btnPrev.addEventListener('click', () => this.navigator.prev());
        if (btnNext) btnNext.addEventListener('click', () => this.navigator.next());

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

    _isOptionSelected(answer, letter) {
        if (!answer) return false;
        if (Array.isArray(answer)) return answer.includes(letter);
        return answer === letter;
    }

    // ── Option click — optimised DOM manipulation ──

    _onOptionClick(optEl, qIndex) {
        const letter = optEl.getAttribute('data-letter');
        const state = this.attempts.getState(qIndex);

        // Always multi-select: toggle in array
        const current = Array.isArray(state.answer) ? [...state.answer] : [];
        const idx = current.indexOf(letter);
        if (idx === -1) {
            current.push(letter);
            current.sort();
        } else {
            current.splice(idx, 1);
        }
        const newAnswer = current.length > 0 ? current : null;

        // Record the attempt
        if (newAnswer !== null) {
            const result = this.attempts.recordAttempt(qIndex, newAnswer);

            // If locked after this attempt, re-render to show lock state
            if (result.locked) {
                this._renderQuestionOnly(qIndex);
                this.navigator.updateStates();
                return;
            }
        }

        // Optimised: toggle class directly instead of full re-render
        optEl.classList.toggle('selected');
        const checkbox = optEl.querySelector('.option-checkbox');
        // No need to manipulate checkbox — CSS handles it via .selected parent

        // Update attempt dots without full re-render
        const attemptsContainer = this.container.querySelector('.question-attempts');
        if (attemptsContainer && newAnswer !== null) {
            const newState = this.attempts.getState(qIndex);
            attemptsContainer.innerHTML = `
        <span class="question-attempts-label">Tentatives :</span>
        ${this._renderAttemptDots(newState)}
      `;
        }

        this.navigator.updateStates();
    }

    // ── Finish exam ──

    _bindFinishModal() {
        const btnFinish = document.getElementById('btnFinish');
        const modal = document.getElementById('finishModal');
        const btnCancel = document.getElementById('btnCancelFinish');
        const btnConfirm = document.getElementById('btnConfirmFinish');
        const modalText = document.getElementById('finishModalText');

        btnFinish.addEventListener('click', () => {
            const stats = this.attempts.getStats();
            modalText.innerHTML = `Vous avez répondu à <strong>${stats.answered}</strong> question(s) sur <strong>${stats.total}</strong>.`;
            modal.classList.add('active');
        });

        btnCancel.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        btnConfirm.addEventListener('click', () => {
            this._finishExam();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    }

    _bindTimeUpModal() {
        const modal = document.getElementById('timeUpModal');
        const btnOk = document.getElementById('btnTimeUpOk');
        btnOk.addEventListener('click', () => {
            window.location.href = '/';
        });
    }

    _onTimeUp() {
        this.attempts.lockAll();
        this.navigator.updateStates();
        this._render(this.currentIndex);
        const modal = document.getElementById('timeUpModal');
        modal.classList.add('active');
    }

    _finishExam() {
        this.timer.stop();
        this.attempts.lockAll();
        sessionStorage.removeItem('timerStart');
        sessionStorage.removeItem('examState');
        window.location.href = '/';
    }
}

// ── Initialize on DOM ready ──
document.addEventListener('DOMContentLoaded', () => {
    new QCMExam();
});
