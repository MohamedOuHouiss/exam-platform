/* ===================================================
   APP.JS — Landing page logic
   =================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const cardQcm = document.getElementById('card-qcm');
    const cardRedaction = document.getElementById('card-redaction');

    // Add basePath to handle GitHub Pages subdirectory
    const basePath = '/exam-platform';

    function navigateTo(url) {
        window.location.href = `${basePath}${url}`;
    }

    cardQcm.addEventListener('click', (e) => {
        navigateTo('/qcm.html');
    });

    cardRedaction.addEventListener('click', (e) => {
        navigateTo('/redaction.html');
    });

    // ── Page entrance animation ──
    document.body.classList.add('page-enter');
});
