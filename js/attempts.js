/* ===================================================
   ATTEMPTS — 3-try answer enforcement module
   =================================================== */

export class AttemptsTracker {
    /**
     * @param {number} totalQuestions
     * @param {number} maxAttempts — default 3
     */
    constructor(totalQuestions = 40, maxAttempts = 3) {
        this.total = totalQuestions;
        this.maxAttempts = maxAttempts;

        // State: array of { answer: any, attemptsUsed: number, locked: boolean }
        this.state = [];
        for (let i = 0; i < totalQuestions; i++) {
            this.state.push({ answer: null, attemptsUsed: 0, locked: false });
        }

        // Restore from sessionStorage
        this._restore();
    }

    /**
     * Check if a question can still be edited
     */
    canEdit(qIndex) {
        return !this.state[qIndex].locked;
    }

    /**
     * Record an attempt (answer change) for a question.
     * Returns { success, attemptsRemaining, locked }
     */
    recordAttempt(qIndex, value) {
        const q = this.state[qIndex];

        if (q.locked) {
            return { success: false, attemptsRemaining: 0, locked: true };
        }

        // If first answer or answer changed
        if (q.answer === null || !this._isEqual(q.answer, value)) {
            q.answer = value;
            q.attemptsUsed++;

            if (q.attemptsUsed >= this.maxAttempts) {
                q.locked = true;
            }

            this._save();

            return {
                success: true,
                attemptsRemaining: this.maxAttempts - q.attemptsUsed,
                locked: q.locked,
            };
        }

        // Same answer, no change counted
        return {
            success: true,
            attemptsRemaining: this.maxAttempts - q.attemptsUsed,
            locked: q.locked,
        };
    }

    /**
     * Get the state of a single question
     */
    getState(qIndex) {
        const q = this.state[qIndex];
        return {
            answer: q.answer,
            attemptsUsed: q.attemptsUsed,
            attemptsRemaining: this.maxAttempts - q.attemptsUsed,
            answered: q.answer !== null,
            locked: q.locked,
        };
    }

    /**
     * Get overall statistics
     */
    getStats() {
        let answered = 0;
        let locked = 0;
        for (const q of this.state) {
            if (q.answer !== null) answered++;
            if (q.locked) locked++;
        }
        return { answered, locked, total: this.total };
    }

    /**
     * Lock all questions (on time up)
     */
    lockAll() {
        for (const q of this.state) {
            q.locked = true;
        }
        this._save();
    }

    // ── Private ──

    _isEqual(a, b) {
        // Deep-ish comparison for arrays (QCM multi-select)
        if (Array.isArray(a) && Array.isArray(b)) {
            return a.length === b.length && a.every((v, i) => v === b[i]);
        }
        return JSON.stringify(a) === JSON.stringify(b);
    }

    _save() {
        try {
            sessionStorage.setItem('examState', JSON.stringify(this.state));
        } catch (e) {
            console.warn('Storage quota exceeded or unavailable', e);
        }
    }

    _restore() {
        const saved = sessionStorage.getItem('examState');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length === this.total) {
                    this.state = parsed;
                }
            } catch (e) {
                // Ignore corrupt data
            }
        }
    }
}
