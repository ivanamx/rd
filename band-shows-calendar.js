/**
 * Calendario de próximos shows (vista semana / mes) para el perfil de banda.
 */
(function (global) {
    const state = {
        shows: [],
        view: 'month',
        anchorDate: new Date(),
        modalBound: false
    };

    function t(key, vars = {}) {
        return global.I18n ? global.I18n.t(key, vars) : key;
    }

    function isEn() {
        return global.I18n?.langCode === 'en';
    }

    function escHtml(str) {
        return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
    }

    function parseShowDate(iso) {
        if (!iso) return null;
        return new Date(iso + 'T12:00:00');
    }

    function dateKey(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function getShowsMap(shows) {
        const map = new Map();
        (shows || []).forEach(show => {
            if (!show?.fecha) return;
            if (!map.has(show.fecha)) map.set(show.fecha, []);
            map.get(show.fecha).push(show);
        });
        return map;
    }

    function formatMoney(n) {
        const locale = global.I18n?.getLocale() || 'es-MX';
        return new Intl.NumberFormat(locale, { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n || 0);
    }

    function startOfWeek(d) {
        const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        date.setDate(date.getDate() - date.getDay());
        return date;
    }

    function addDays(d, n) {
        const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        date.setDate(date.getDate() + n);
        return date;
    }

    function formatPeriodLabel() {
        const locale = isEn() ? 'en-US' : 'es-MX';
        if (state.view === 'month') {
            const monthNames = global.I18n?.getMonthNames() || [];
            const m = state.anchorDate;
            return `${monthNames[m.getMonth()] || ''} ${m.getFullYear()}`;
        }
        const start = startOfWeek(state.anchorDate);
        const end = addDays(start, 6);
        const fmt = (d, withYear) => d.toLocaleDateString(locale, {
            day: 'numeric',
            month: 'short',
            ...(withYear ? { year: 'numeric' } : {})
        });
        const sameYear = start.getFullYear() === end.getFullYear();
        return `${fmt(start, !sameYear)} – ${fmt(end, true)}`;
    }

    function renderCardHeaderBtn() {
        return `
            <button type="button" class="bpp-shows-cal-btn" id="bppShowsCalBtn">
                <i class="fas fa-calendar-alt" aria-hidden="true"></i>
                <span>${t('productos.profileCalendar')}</span>
            </button>
        `;
    }

    function renderShowChip(show) {
        const confirmed = show.status === 'confirmado';
        const fee = show.fee ? `<span class="bpp-scal-chip-fee">${formatMoney(show.fee)}</span>` : '';
        return `
            <div class="bpp-scal-chip ${confirmed ? 'confirmed' : 'pending'}">
                <span class="bpp-scal-chip-venue">${escHtml(show.venue)}</span>
                ${fee}
                <span class="bpp-scal-chip-status">${confirmed ? t('productos.profileStatusConfirmed') : t('productos.profileStatusPending')}</span>
            </div>
        `;
    }

    function renderMonthView(showsMap) {
        const monthNames = global.I18n?.getMonthNames() || [];
        const dayNames = global.I18n?.getDayNames() || [];
        const year = state.anchorDate.getFullYear();
        const monthIdx = state.anchorDate.getMonth();
        const firstDay = new Date(year, monthIdx, 1).getDay();
        const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
        const todayKey = dateKey(new Date());

        let html = dayNames.map(d => `<div class="bpp-scal-day-name">${d}</div>`).join('');

        for (let i = 0; i < firstDay; i++) {
            html += '<div class="bpp-scal-day empty"></div>';
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const key = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayShows = showsMap.get(key) || [];
            const classes = ['bpp-scal-day'];
            if (dayShows.length) classes.push('has-show');
            if (key === todayKey) classes.push('today');

            const chips = dayShows.map(show => {
                const confirmed = show.status === 'confirmado';
                return `<span class="bpp-scal-dot ${confirmed ? 'confirmed' : 'pending'}" title="${escHtml(show.venue)}"></span>`;
            }).join('');

            html += `
                <div class="${classes.join(' ')}" data-date="${key}">
                    <span class="bpp-scal-day-num">${day}</span>
                    ${chips ? `<span class="bpp-scal-dots">${chips}</span>` : ''}
                </div>
            `;
        }

        const monthShows = (state.shows || []).filter(show => {
            const d = parseShowDate(show.fecha);
            return d && d.getFullYear() === year && d.getMonth() === monthIdx;
        });

        const listHtml = monthShows.length
            ? monthShows.map(show => {
                const d = parseShowDate(show.fecha);
                const dayLabel = d ? d.toLocaleDateString(isEn() ? 'en-US' : 'es-MX', { weekday: 'short', day: 'numeric', month: 'short' }) : show.fecha;
                return `
                    <div class="bpp-scal-list-item">
                        <span class="bpp-scal-list-date">${dayLabel}</span>
                        ${renderShowChip(show)}
                    </div>
                `;
            }).join('')
            : `<p class="bpp-scal-empty">${t('productos.profileCalNoShows')}</p>`;

        return `
            <div class="bpp-scal-month-grid">${html}</div>
            <div class="bpp-scal-month-list">
                <h4 class="bpp-scal-list-title">${monthNames[monthIdx]} ${year}</h4>
                ${listHtml}
            </div>
        `;
    }

    function renderWeekView(showsMap) {
        const dayNames = global.I18n?.getDayNames() || [];
        const start = startOfWeek(state.anchorDate);
        const todayKey = dateKey(new Date());
        let hasAny = false;

        const cols = Array.from({ length: 7 }, (_, i) => {
            const date = addDays(start, i);
            const key = dateKey(date);
            const dayShows = showsMap.get(key) || [];
            if (dayShows.length) hasAny = true;
            const isToday = key === todayKey;

            const showsHtml = dayShows.length
                ? dayShows.map(renderShowChip).join('')
                : `<span class="bpp-scal-week-empty">—</span>`;

            return `
                <div class="bpp-scal-week-col ${isToday ? 'today' : ''}">
                    <div class="bpp-scal-week-head">
                        <span class="bpp-scal-week-day">${dayNames[i]}</span>
                        <span class="bpp-scal-week-num">${date.getDate()}</span>
                    </div>
                    <div class="bpp-scal-week-body">${showsHtml}</div>
                </div>
            `;
        }).join('');

        if (!hasAny) {
            return `<p class="bpp-scal-empty bpp-scal-empty-week">${t('productos.profileCalNoShows')}</p>${cols}`;
        }

        return `<div class="bpp-scal-week-grid">${cols}</div>`;
    }

    function renderCalendar() {
        const modal = document.getElementById('bppShowsCalModal');
        if (!modal) return;

        const showsMap = getShowsMap(state.shows);
        const periodEl = modal.querySelector('#bppScalPeriod');
        const bodyEl = modal.querySelector('#bppScalBody');

        if (periodEl) periodEl.textContent = formatPeriodLabel();

        modal.querySelectorAll('.bpp-scal-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === state.view);
        });

        bodyEl.innerHTML = state.view === 'week'
            ? renderWeekView(showsMap)
            : renderMonthView(showsMap);
    }

    function changePeriod(delta) {
        if (state.view === 'month') {
            const d = state.anchorDate;
            state.anchorDate = new Date(d.getFullYear(), d.getMonth() + delta, 1);
        } else {
            state.anchorDate = addDays(startOfWeek(state.anchorDate), delta * 7);
        }
        renderCalendar();
    }

    function setView(view) {
        state.view = view;
        renderCalendar();
    }

    function refreshModalLabels() {
        const modal = document.getElementById('bppShowsCalModal');
        if (!modal) return;
        const title = modal.querySelector('#bppScalTitle');
        if (title) {
            title.innerHTML = `<i class="fas fa-calendar-check" aria-hidden="true"></i> ${t('productos.profileCalTitle')}`;
        }
        modal.querySelectorAll('.bpp-scal-tab').forEach(tab => {
            tab.textContent = tab.dataset.view === 'week'
                ? t('productos.profileCalWeek')
                : t('productos.profileCalMonth');
        });
    }

    function openModal(shows) {
        state.shows = shows || [];
        state.view = 'month';
        const first = state.shows[0]?.fecha;
        state.anchorDate = first ? parseShowDate(first) : new Date();
        ensureModal();
        refreshModalLabels();
        renderCalendar();
        const modal = document.getElementById('bppShowsCalModal');
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
    }

    function closeModal() {
        const modal = document.getElementById('bppShowsCalModal');
        if (!modal) return;
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
    }

    function bindModalEvents() {
        if (state.modalBound) return;
        state.modalBound = true;

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('bppShowsCalModal');
                if (modal?.classList.contains('open')) closeModal();
            }
        });

        document.addEventListener('click', e => {
            const modal = document.getElementById('bppShowsCalModal');
            if (!modal?.classList.contains('open')) return;

            if (e.target.closest('#bppScalClose') || e.target.closest('#bppScalBackdrop')) {
                closeModal();
                return;
            }
            if (e.target.closest('#bppScalPrev')) {
                changePeriod(-1);
                return;
            }
            if (e.target.closest('#bppScalNext')) {
                changePeriod(1);
                return;
            }
            const tab = e.target.closest('.bpp-scal-tab');
            if (tab?.dataset.view) {
                setView(tab.dataset.view);
            }
        });
    }

    function ensureModal() {
        if (document.getElementById('bppShowsCalModal')) return;

        const modal = document.createElement('div');
        modal.id = 'bppShowsCalModal';
        modal.className = 'bpp-shows-cal-modal';
        modal.setAttribute('aria-hidden', 'true');
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-labelledby', 'bppScalTitle');
        modal.innerHTML = `
            <div class="bpp-shows-cal-backdrop" id="bppScalBackdrop"></div>
            <div class="bpp-shows-cal-panel">
                <div class="bpp-shows-cal-head">
                    <h3 class="bpp-shows-cal-title" id="bppScalTitle">
                        <i class="fas fa-calendar-check" aria-hidden="true"></i>
                        ${t('productos.profileCalTitle')}
                    </h3>
                    <button type="button" class="bpp-shows-cal-close" id="bppScalClose" aria-label="${t('productos.modalClose')}">
                        <i class="fas fa-times" aria-hidden="true"></i>
                    </button>
                </div>
                <div class="bpp-scal-toolbar">
                    <div class="bpp-scal-tabs">
                        <button type="button" class="bpp-scal-tab active" data-view="month">${t('productos.profileCalMonth')}</button>
                        <button type="button" class="bpp-scal-tab" data-view="week">${t('productos.profileCalWeek')}</button>
                    </div>
                    <div class="bpp-scal-nav">
                        <button type="button" class="bpp-scal-nav-btn" id="bppScalPrev" aria-label="${t('common.back')}">
                            <i class="fas fa-chevron-left" aria-hidden="true"></i>
                        </button>
                        <span class="bpp-scal-period" id="bppScalPeriod"></span>
                        <button type="button" class="bpp-scal-nav-btn" id="bppScalNext" aria-label="${t('common.continue')}">
                            <i class="fas fa-chevron-right" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>
                <div class="bpp-scal-body" id="bppScalBody"></div>
            </div>
        `;
        document.body.appendChild(modal);
        bindModalEvents();
    }

    function bindShowsCalendar(container, shows) {
        if (!container || !shows?.length) return;
        ensureModal();
        container.querySelector('#bppShowsCalBtn')?.addEventListener('click', () => openModal(shows));
    }

    global.BandShowsCalendar = {
        renderCardHeaderBtn,
        bindShowsCalendar,
        ensureModal,
        openModal,
        closeModal
    };
})(window);
