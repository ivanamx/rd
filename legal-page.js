/**
 * Utilidades para páginas legales — alternancia de idioma en contenido extenso
 */
(function () {
    function syncLegalContent(lang) {
        document.querySelectorAll('[data-lang-content]').forEach(el => {
            const isActive = el.dataset.langContent === lang;
            el.hidden = !isActive;
        });
    }

    function initLegalPage() {
        if (window.I18n) {
            window.I18n.init();
            syncLegalContent(window.I18n.langCode);
            window.addEventListener('languagechange', (e) => {
                syncLegalContent(e.detail?.lang || window.I18n.langCode);
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLegalPage);
    } else {
        initLegalPage();
    }
})();
