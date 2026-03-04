/* ===================================================
   TIMER — Countdown engine + SVG ring animation
   =================================================== */

export class ExamTimer {
    /**
     * @param {Object} opts
     * @param {number} opts.durationMs  — total duration in milliseconds (default 90 min)
     * @param {Function} opts.onTick    — called every second with { remaining, formatted, percent }
     * @param {Function} opts.onWarning — called when < 10 min
     * @param {Function} opts.onCritical — called when < 2 min
     * @param {Function} opts.onTimeUp  — called when time runs out
     */
    constructor(opts = {}) {
        this.durationMs = opts.durationMs || 90 * 60 * 1000; // 90 minutes
        this.onTick = opts.onTick || (() => { });
        this.onWarning = opts.onWarning || (() => { });
        this.onCritical = opts.onCritical || (() => { });
        this.onTimeUp = opts.onTimeUp || (() => { });

        this.intervalId = null;
        this.state = 'idle'; // idle | running | paused | finished
        this._warningFired = false;
        this._criticalFired = false;

        // Restore from sessionStorage if available
        const saved = sessionStorage.getItem('timerStart');
        if (saved) {
            this.startTime = parseInt(saved, 10);
        } else {
            this.startTime = null;
        }
    }

    start() {
        if (this.state === 'running') return;

        if (!this.startTime) {
            this.startTime = Date.now();
            sessionStorage.setItem('timerStart', this.startTime.toString());
        }

        this.state = 'running';
        this._tick(); // immediate first tick
        this.intervalId = setInterval(() => this._tick(), 1000);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.state = 'finished';
    }

    reset() {
        this.stop();
        this.startTime = null;
        this._warningFired = false;
        this._criticalFired = false;
        sessionStorage.removeItem('timerStart');
        this.state = 'idle';
    }

    getRemaining() {
        if (!this.startTime) return this.durationMs;
        const elapsed = Date.now() - this.startTime;
        return Math.max(0, this.durationMs - elapsed);
    }

    _tick() {
        const remaining = this.getRemaining();
        const percent = remaining / this.durationMs;
        const formatted = this._format(remaining);

        this.onTick({ remaining, formatted, percent });

        // Warning threshold: < 10 minutes
        if (remaining <= 10 * 60 * 1000 && !this._warningFired) {
            this._warningFired = true;
            this.onWarning({ remaining, formatted, percent });
        }

        // Critical threshold: < 2 minutes
        if (remaining <= 2 * 60 * 1000 && !this._criticalFired) {
            this._criticalFired = true;
            this.onCritical({ remaining, formatted, percent });
        }

        // Time up
        if (remaining <= 0) {
            this.stop();
            this.onTimeUp();
        }
    }

    _format(ms) {
        const totalSeconds = Math.ceil(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

/**
 * Bind timer to the DOM elements
 */
export function initTimerUI(timer) {
    const timerTime = document.getElementById('timerTime');
    const timerProgress = document.getElementById('timerProgress');
    const circumference = 2 * Math.PI * 44; // r=44

    timer.onTick = ({ formatted, percent }) => {
        timerTime.textContent = formatted;
        const offset = circumference * (1 - percent);
        timerProgress.style.strokeDashoffset = offset;
    };

    timer.onWarning = () => {
        timerTime.classList.add('warning');
        timerProgress.classList.add('warning');
    };

    timer.onCritical = () => {
        timerTime.classList.remove('warning');
        timerTime.classList.add('critical');
        timerProgress.classList.remove('warning');
        timerProgress.classList.add('critical');
    };

    timer.onTimeUp = () => {
        document.dispatchEvent(new CustomEvent('exam:timeup'));
    };

    timer.start();
}
