/* ===================================================
   APP.JS — Landing page logic
   =================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const cardQcm = document.getElementById('card-qcm');
    const cardRedaction = document.getElementById('card-redaction');

    // ── Ripple effect on cards ──
    function addRipple(e, el) {
        const rect = el.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        el.style.setProperty('--ripple-x', `${x}%`);
        el.style.setProperty('--ripple-y', `${y}%`);
    }

    // ── Navigate to exam ──
    function navigateTo(url) {
        // Clear any previous exam session
        sessionStorage.removeItem('examState');
        sessionStorage.removeItem('timerStart');

        // Use View Transition API if available
        if (document.startViewTransition) {
            document.startViewTransition(() => {
                window.location.href = url;
            });
        } else {
            // Fallback: fade out then navigate
            document.body.style.opacity = '0';
            document.body.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                window.location.href = url;
            }, 300);
        }
    }

    // ── Card click handlers ──
    cardQcm.addEventListener('click', (e) => {
        addRipple(e, cardQcm);
        navigateTo('/qcm.html');
    });

    cardRedaction.addEventListener('click', (e) => {
        addRipple(e, cardRedaction);
        navigateTo('/redaction.html');
    });

    // ── Keyboard support ──
    [cardQcm, cardRedaction].forEach(card => {
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });
    });

    // ── Page entrance animation ──
    document.body.classList.add('page-enter');
});
