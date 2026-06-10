/**
 * Renderizado del perfil público de banda (solo lectura).
 */
(function (global) {
    const state = {
        audio: null,
        playingId: null,
        heroMuted: false
    };

    function t(key, vars = {}) {
        return global.I18n ? global.I18n.t(key, vars) : key;
    }

    function isEn() {
        return global.I18n?.langCode === 'en';
    }

    function escAttr(str) {
        return String(str ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }

    function escHtml(str) {
        return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
    }

    function renderStars(rating) {
        const full = Math.floor(rating);
        const half = rating - full >= 0.5;
        let stars = '';
        for (let i = 0; i < full; i++) stars += '<i class="fas fa-star"></i>';
        if (half) stars += '<i class="fas fa-star-half-alt"></i>';
        const empty = 5 - full - (half ? 1 : 0);
        for (let i = 0; i < empty; i++) stars += '<i class="far fa-star"></i>';
        return stars;
    }

    function formatMoney(n) {
        const locale = global.I18n?.getLocale() || 'es-MX';
        return new Intl.NumberFormat(locale, { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n || 0);
    }

    function formatShowDate(iso) {
        if (!iso) return '—';
        try {
            return new Date(iso + 'T12:00:00').toLocaleDateString(isEn() ? 'en-US' : 'es-MX', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
            });
        } catch (_) {
            return iso;
        }
    }

    function formatHours(h) {
        if (!h && h !== 0) return '—';
        const hrs = Math.floor(h);
        const mins = Math.round((h - hrs) * 60);
        if (mins === 0) return `${hrs}${t('productos.profileHours')}`;
        return `${hrs}${t('productos.profileHours')} ${mins}m`;
    }

    function normalizeBand(banda) {
        if (!banda) return null;
        const precioRaw = banda.precio || 0;
        const precio = precioRaw >= 10000 ? Math.round(precioRaw / 100) : precioRaw;
        const muestras = (banda.muestras || banda.canciones || []).map((c, i) => ({
            id: c.id || `track-${i}`,
            titulo: c.titulo,
            nombre: c.nombre || (c.archivo ? c.archivo.split('/').pop() : ''),
            dataUrl: c.dataUrl || c.archivo
        }));

        return {
            id: banda.id,
            nombre: banda.nombre,
            genero: banda.genero || '',
            descripcion: banda.descripcion || '',
            duracion: banda.duracion || '',
            precio,
            rating: banda.estrellas ?? banda.rating ?? 0,
            avatar: banda.avatar || banda.imagen || '',
            cover: banda.cover || banda.imagen || '',
            coverVideo: banda.coverVideo || null,
            heroLink: banda.heroLink || null,
            premium: !!banda.premium,
            galeria: banda.galeria || [],
            lugares: banda.lugares || [],
            muestras,
            stats: banda.stats || null,
            proximosShows: banda.proximosShows || [],
            showsRecientes: banda.showsRecientes || [],
            topVenues: banda.topVenues || banda.management?.venues?.topVenues || []
        };
    }

    function renderGallery(galeria) {
        if (!galeria?.length) {
            return `<p class="bpp-empty">${t('productos.profileNoGallery')}</p>`;
        }
        return galeria.map(item => {
            const isVideo = item.type === 'video' || /\.(mp4|webm|mov)$/i.test(item.url || '');
            const media = isVideo
                ? `<video src="${escAttr(item.url)}" controls playsinline preload="metadata"></video>`
                : `<img src="${escAttr(item.url)}" alt="${escAttr(item.caption || '')}" loading="lazy">`;
            return `
                <figure class="bpp-gallery-item">
                    ${isVideo ? '<span class="bpp-gallery-type"><i class="fas fa-video"></i></span>' : ''}
                    ${media}
                    ${item.caption ? `<figcaption class="bpp-gallery-caption">${escHtml(item.caption)}</figcaption>` : ''}
                </figure>
            `;
        }).join('');
    }

    function renderTracks(muestras) {
        if (!muestras?.length) {
            return `<p class="bpp-empty">${t('productos.profileNoTracks')}</p>`;
        }
        return muestras.map(track => `
            <div class="bpp-track" data-track-id="${escAttr(track.id)}">
                <button class="bpp-track-play" type="button" data-src="${escAttr(track.dataUrl)}" data-id="${escAttr(track.id)}" aria-label="${t('common.play')}">
                    <i class="fas fa-play"></i>
                </button>
                <div class="bpp-track-info">
                    <span class="bpp-track-title">${escHtml(track.titulo)}</span>
                    <span class="bpp-track-meta">${escHtml(track.nombre)}</span>
                </div>
            </div>
        `).join('');
    }

    function renderUpcomingShows(shows) {
        if (!shows?.length) return `<p class="bpp-empty">${t('productos.profileNoVenues')}</p>`;
        return shows.map(show => {
            const confirmed = show.status === 'confirmado';
            return `
                <div class="bpp-show-row">
                    <div class="bpp-show-date">${formatShowDate(show.fecha)}</div>
                    <div class="bpp-show-info">
                        <span class="bpp-show-venue">${escHtml(show.venue)}</span>
                    </div>
                    <span class="bpp-show-status ${confirmed ? 'confirmed' : 'pending'}">
                        ${confirmed ? t('productos.profileStatusConfirmed') : t('productos.profileStatusPending')}
                    </span>
                </div>
            `;
        }).join('');
    }

    function renderRecentShows(shows) {
        if (!shows?.length) return `<p class="bpp-empty">—</p>`;
        return shows.map(show => `
            <div class="bpp-show-row recent">
                <div class="bpp-show-date">${formatShowDate(show.fecha)}</div>
                <div class="bpp-show-info">
                    <span class="bpp-show-venue">${escHtml(show.venue)}</span>
                    <span class="bpp-show-meta">${formatHours(show.hours)}</span>
                </div>
            </div>
        `).join('');
    }

    function renderTopVenues(venues) {
        if (!venues?.length) return `<p class="bpp-empty">—</p>`;
        return venues.map(venue => `
            <div class="bpp-venue-row">
                <div class="bpp-venue-row-info">
                    <span class="bpp-venue-row-name">${escHtml(venue.name)}</span>
                    <span class="bpp-venue-row-meta">${venue.shows} ${t('productos.profileVenueShows')} · ${formatShowDate(venue.lastDate)}</span>
                </div>
            </div>
        `).join('');
    }

    function renderVenueTags(lugares) {
        if (!lugares?.length) return `<p class="bpp-empty">${t('bandas.noVenues')}</p>`;
        return lugares.map(lugar => `
            <span class="bpp-public-venue-tag"><i class="fas fa-map-marker-alt"></i> ${escHtml(lugar)}</span>
        `).join('');
    }

    function stopAudio(container) {
        if (state.audio) {
            state.audio.pause();
            state.audio = null;
        }
        state.playingId = null;
        container?.querySelectorAll('.bpp-track-play.playing').forEach(btn => {
            btn.classList.remove('playing');
            btn.innerHTML = '<i class="fas fa-play"></i>';
        });
    }

    function updateMuteButton(container, isMuted) {
        const btn = container.querySelector('#bandHeroMuteBtn');
        if (!btn) return;
        const icon = btn.querySelector('i');
        if (icon) icon.className = isMuted ? 'fas fa-volume-xmark' : 'fas fa-volume-high';
        btn.setAttribute('aria-pressed', isMuted ? 'true' : 'false');
        btn.setAttribute('aria-label', t(isMuted ? 'productos.profileHeroUnmute' : 'productos.profileHeroMute'));
    }

    function initHeroVideo(container) {
        const video = container.querySelector('.bpp-cover-video');
        if (!video) return;
        video.muted = state.heroMuted;
        video.volume = state.heroMuted ? 0 : 1;
        updateMuteButton(container, state.heroMuted);
        video.play().catch(() => {
            if (state.heroMuted) return;
            const wrap = video.closest('.bpp-cover-wrap--video');
            if (!wrap) return;
            wrap.addEventListener('click', () => {
                video.muted = false;
                video.volume = 1;
                state.heroMuted = false;
                updateMuteButton(container, false);
                video.play().catch(() => {});
            }, { once: true });
        });
    }

    function bindEvents(container, profile, options = {}) {
        const videoModal = options.videoModal;
        const videoPlayer = options.videoPlayer;
        const videoModalBackdrop = options.videoModalBackdrop;
        const videoModalClose = options.videoModalClose;

        const closeVideoModal = (resumeHero = true) => {
            if (!videoModal || !videoPlayer) return;
            videoPlayer.pause();
            videoPlayer.removeAttribute('src');
            videoPlayer.load();
            videoModal.classList.remove('open');
            videoModal.setAttribute('aria-hidden', 'true');
            if (resumeHero) initHeroVideo(container);
        };

        container.querySelector('#bandHeroMuteBtn')?.addEventListener('click', e => {
            e.stopPropagation();
            const video = container.querySelector('.bpp-cover-video');
            if (!video) return;
            state.heroMuted = !state.heroMuted;
            video.muted = state.heroMuted;
            if (!state.heroMuted) video.volume = 1;
            updateMuteButton(container, state.heroMuted);
            video.play().catch(() => {});
        });

        container.querySelector('#bandHeroVideoLink')?.addEventListener('click', e => {
            e.preventDefault();
            const src = e.currentTarget.dataset.video;
            if (!src || !videoModal || !videoPlayer) return;
            container.querySelector('.bpp-cover-video')?.pause();
            stopAudio(container);
            videoPlayer.src = src;
            videoModal.classList.add('open');
            videoModal.setAttribute('aria-hidden', 'false');
            videoPlayer.play().catch(() => {});
        });

        if (videoModalClose && !videoModalClose.dataset.bppBound) {
            videoModalClose.dataset.bppBound = '1';
            videoModalClose.addEventListener('click', () => closeVideoModal(true));
            videoModalBackdrop?.addEventListener('click', () => closeVideoModal(true));
        }

        container.querySelectorAll('.bpp-track-play').forEach(btn => {
            btn.addEventListener('click', () => {
                const src = btn.dataset.src;
                const id = btn.dataset.id;
                if (!src) return;
                if (state.playingId === id) {
                    stopAudio(container);
                    return;
                }
                stopAudio(container);
                container.querySelector('.bpp-cover-video')?.pause();
                state.audio = new Audio(src);
                state.playingId = id;
                btn.classList.add('playing');
                btn.innerHTML = '<i class="fas fa-pause"></i>';
                state.audio.play().catch(() => stopAudio(container));
                state.audio.onended = () => stopAudio(container);
            });
        });
    }

    function render(container, banda, options = {}) {
        const profile = normalizeBand(banda);
        if (!profile || !container) return null;

        const coverHtml = profile.coverVideo
            ? `<div class="bpp-cover-wrap bpp-cover-wrap--video">
                    <video class="bpp-cover-video" src="${escAttr(profile.coverVideo)}" autoplay loop playsinline></video>
                    <button type="button" class="bpp-cover-mute-btn" id="bandHeroMuteBtn" aria-pressed="false" aria-label="${escAttr(t('productos.profileHeroMute'))}">
                        <i class="fas fa-volume-high" aria-hidden="true"></i>
                    </button>
               </div>`
            : profile.cover
                ? `<div class="bpp-cover-wrap"><img class="bpp-cover" src="${escAttr(profile.cover)}" alt=""></div>`
                : '';

        const heroLinkHtml = profile.heroLink?.video
            ? `<p class="bpp-hero-link-wrap">
                    <a href="#" class="bpp-hero-link" id="bandHeroVideoLink" data-video="${escAttr(profile.heroLink.video)}">${escHtml(profile.heroLink.text || 'we like soccer')}</a>
               </p>`
            : '';

        const avatarHtml = profile.avatar
            ? `<img src="${escAttr(profile.avatar)}" alt="${escAttr(profile.nombre)}" class="bpp-avatar">`
            : `<div class="bpp-avatar-fallback"><i class="fas fa-guitar"></i></div>`;

        const statsHtml = profile.stats ? `
            <div class="bpp-stats">
                <div class="bpp-stat">
                    <span class="bpp-stat-value">${(profile.stats.vistas || 0).toLocaleString()}</span>
                    <span class="bpp-stat-label">${t('productos.profileStatViews')}</span>
                </div>
                <div class="bpp-stat">
                    <span class="bpp-stat-value">${profile.stats.reservas || 0}</span>
                    <span class="bpp-stat-label">${t('productos.profileStatBookings')}</span>
                </div>
                <div class="bpp-stat">
                    <span class="bpp-stat-value">${profile.stats.shows || 0}</span>
                    <span class="bpp-stat-label">${t('productos.profileStatShows')}</span>
                </div>
            </div>
        ` : '';

        container.innerHTML = `
            <div class="bpp-hero-block">
                ${coverHtml}
                <div class="bpp-hero bpp-hero-overlap">
                    <div class="bpp-hero-inner">
                        <div class="bpp-avatar-wrap">${avatarHtml}</div>
                        <div class="bpp-hero-info">
                            <div class="bpp-badges">
                                ${profile.premium ? `<span class="bpp-premium-badge"><i class="fas fa-crown"></i> ${t('productos.profilePremium')}</span>` : ''}
                                ${profile.genero ? `<span class="bpp-genre-badge"><i class="fas fa-music"></i> ${escHtml(profile.genero)}</span>` : ''}
                            </div>
                            <h1 class="bpp-name">${escHtml(profile.nombre)}</h1>
                            <div class="bpp-rating">
                                <span class="bpp-stars" aria-hidden="true">${renderStars(profile.rating)}</span>
                                <span class="bpp-rating-num">${Number(profile.rating).toFixed(1)}</span>
                            </div>
                            ${heroLinkHtml}
                            <p class="bpp-public-desc">${escHtml(profile.descripcion)}</p>
                            <div class="bpp-public-meta">
                                ${profile.duracion ? `<span><i class="fas fa-clock"></i> ${escHtml(profile.duracion)}</span>` : ''}
                                ${profile.precio ? `<span><i class="fas fa-tag"></i> ${formatMoney(profile.precio)}</span>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            ${statsHtml}
            <div class="bpp-content">
                ${profile.proximosShows.length ? `
                    <div class="bpp-card" id="bppUpcomingCard">
                        <div class="bpp-card-header">
                            <h3 class="bpp-card-title"><i class="fas fa-calendar-check"></i> ${t('productos.profileUpcoming')}</h3>
                            ${global.BandShowsCalendar ? global.BandShowsCalendar.renderCardHeaderBtn() : ''}
                        </div>
                        <div class="bpp-shows-list">${renderUpcomingShows(profile.proximosShows)}</div>
                    </div>
                ` : ''}
                ${profile.showsRecientes.length ? `
                    <div class="bpp-card">
                        <h3 class="bpp-card-title"><i class="fas fa-history"></i> ${t('productos.profileRecent')}</h3>
                        <div class="bpp-shows-list">${renderRecentShows(profile.showsRecientes)}</div>
                    </div>
                ` : ''}
                ${profile.topVenues.length ? `
                    <div class="bpp-card full">
                        <h3 class="bpp-card-title"><i class="fas fa-trophy"></i> ${t('productos.profileTopVenues')}</h3>
                        <div class="bpp-venue-rows">${renderTopVenues(profile.topVenues)}</div>
                    </div>
                ` : ''}
                ${profile.galeria.length ? `
                    <div class="bpp-card full">
                        <h3 class="bpp-card-title"><i class="fas fa-images"></i> ${t('productos.profileGallery')}</h3>
                        <div class="bpp-gallery bpp-public-gallery">${renderGallery(profile.galeria)}</div>
                    </div>
                ` : ''}
                <div class="bpp-card full">
                    <h3 class="bpp-card-title"><i class="fas fa-map-marker-alt"></i> ${t('productos.profileVenues')}</h3>
                    <div class="bpp-public-venues">${renderVenueTags(profile.lugares)}</div>
                </div>
                <div class="bpp-card full">
                    <h3 class="bpp-card-title"><i class="fas fa-headphones"></i> ${t('productos.profileTracks')}</h3>
                    <div class="bpp-tracks">${renderTracks(profile.muestras)}</div>
                </div>
            </div>
        `;

        bindEvents(container, profile, options);
        global.BandShowsCalendar?.bindShowsCalendar(
            container.querySelector('#bppUpcomingCard'),
            profile.proximosShows
        );
        initHeroVideo(container);
        return profile;
    }

    global.BandPublicProfile = {
        normalizeBand,
        render
    };
})(window);
