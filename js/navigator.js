/* ===================================================
   NAVIGATOR — Question nav sidebar + keyboard shortcuts
   =================================================== */

export class QuestionNavigator {
    /**
     * @param {Object} opts
     * @param {number} opts.totalQuestions
     * @param {Function} opts.onNavigate — called with (questionIndex, direction)
     * @param {Function} opts.getQuestionState — returns { answered, locked } for a given index
     */
    constructor(opts) {
        this.total = opts.totalQuestions || 40;
        this.onNavigate = opts.onNavigate || (() => { });
        this.getQuestionState = opts.getQuestionState || (() => ({}));
        this.currentIndex = 0;

        this.grid = document.getElementById('navGrid');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.sidebar = document.getElementById('navSidebar');
        this.toggle = document.getElementById('navToggle');

        this._buildPills();
        this._bindKeyboard();
        this._bindMobileToggle();
        this._updateActive(0);
    }

    _buildPills() {
        this.pills = [];
        for (let i = 0; i < this.total; i++) {
            const pill = document.createElement('button');
            pill.className = 'nav-pill';
            pill.textContent = i + 1;
            pill.setAttribute('aria-label', `Question ${i + 1}`);
            pill.addEventListener('click', () => {
                const direction = i > this.currentIndex ? 'right' : 'left';
                this.goTo(i, direction);
                // Close mobile nav
                if (window.innerWidth <= 1024) {
                    this.sidebar.classList.remove('open');
                }
            });
            this.grid.appendChild(pill);
            this.pills.push(pill);
        }
    }

    _bindKeyboard() {
        document.addEventListener('keydown', (e) => {
            // Don't capture if user is typing in an input/textarea/editor
            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.closest('.ql-editor')) return;

            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                this.next();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                this.prev();
            }
        });
    }

    _bindMobileToggle() {
        if (this.toggle) {
            this.toggle.addEventListener('click', () => {
                this.sidebar.classList.toggle('open');
            });
        }

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 1024 &&
                this.sidebar.classList.contains('open') &&
                !this.sidebar.contains(e.target) &&
                e.target !== this.toggle) {
                this.sidebar.classList.remove('open');
            }
        });
    }

    goTo(index, direction = 'right') {
        if (index < 0 || index >= this.total) return;
        const prevIndex = this.currentIndex;
        this.currentIndex = index;
        this._updateActive(index);
        this.onNavigate(index, direction);

        // Scroll pill into view
        this.pills[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    next() {
        if (this.currentIndex < this.total - 1) {
            this.goTo(this.currentIndex + 1, 'right');
        }
    }

    prev() {
        if (this.currentIndex > 0) {
            this.goTo(this.currentIndex - 1, 'left');
        }
    }

    _updateActive(index) {
        this.pills.forEach((pill, i) => {
            pill.classList.remove('active');
            if (i === index) {
                pill.classList.add('active');
            }
        });
    }

    /**
     * Refresh all pill states + progress bar.
     * Call this after answer changes.
     */
    updateStates() {
        let answered = 0;
        for (let i = 0; i < this.total; i++) {
            const state = this.getQuestionState(i);
            const pill = this.pills[i];

            pill.classList.remove('answered', 'locked');

            if (state.locked) {
                pill.classList.add('locked');
                answered++;
            } else if (state.answered) {
                pill.classList.add('answered');
                answered++;
            }
        }

        // Update progress
        const pct = (answered / this.total) * 100;
        this.progressFill.style.width = `${pct}%`;
        this.progressText.textContent = `${answered} / ${this.total}`;
    }
}
