/*
 * Carnet de Hoko Senju — livre interactif.
 *
 * Le contenu vit dans index.html (<main id="book-source">, une <section class="page"> par page).
 * Ce script range ces pages dans des feuilles (recto / verso) et gère :
 *   - le feuilletage en 3D (double page sur grand écran, page simple sur mobile),
 *   - la navigation : boutons, clavier, clic sur les pages, glisser au doigt, sommaire,
 *   - les liens directs (#page-5), le son des pages, le plein écran,
 *   - les feuilles qui tombent en arrière-plan.
 */
(() => {
    'use strict';

    const TURN_MS = 900; // doit correspondre à --turn-duration dans style.css
    const SINGLE_QUERY = '(max-width: 760px), (orientation: portrait) and (max-width: 1100px)';

    const source = document.getElementById('book-source');
    const stage = document.getElementById('stage');
    const book = document.getElementById('book');
    const toolbar = document.getElementById('toolbar');
    const prevBtn = document.getElementById('prev');
    const nextBtn = document.getElementById('next');
    const folio = document.getElementById('folio');
    const progressBar = document.getElementById('progress-bar');
    const tocToggle = document.getElementById('toc-toggle');
    const tocMenu = document.getElementById('toc-menu');
    const soundBtn = document.getElementById('sound');
    const fullscreenBtn = document.getElementById('fullscreen');
    const closeBtn = document.getElementById('close');
    const announcer = document.getElementById('announcer');

    const pages = Array.from(source.querySelectorAll(':scope > .page'));
    const lastPage = pages.length - 1;
    const innerPages = pages.length - 2; // sans les deux couvertures

    const singleMedia = window.matchMedia(SINGLE_QUERY);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    let single = false;
    let leaves = [];
    let flipped = 0; // nombre de feuilles tournées
    let page = 0; // première page visible (index dans `pages`)

    const store = {
        get(key) {
            try { return window.localStorage.getItem(key); } catch (e) { return null; }
        },
        set(key, value) {
            try { window.localStorage.setItem(key, value); } catch (e) { /* stockage indisponible */ }
        }
    };

    /* ------------------------------------------------------------------ */
    /* Construction du livre                                               */
    /* ------------------------------------------------------------------ */

    function makeFace(pageIndex, side) {
        const face = document.createElement('div');
        face.className = 'face face--' + side;
        const paper = document.createElement('div');
        paper.className = 'paper';

        if (pageIndex === null) {
            face.classList.add('face--blank');
        } else {
            const section = pages[pageIndex];
            const isCover = pageIndex === 0 || pageIndex === lastPage;
            if (isCover) face.classList.add('face--cover');
            face.dataset.page = pageIndex;
            face.setAttribute('role', 'group');
            face.setAttribute('aria-label', isCover ? section.dataset.toc : 'Page ' + pageIndex);
            paper.appendChild(section);
            if (!isCover) {
                const number = document.createElement('span');
                number.className = 'folio';
                number.setAttribute('aria-hidden', 'true');
                number.textContent = pageIndex;
                paper.appendChild(number);
            }
        }

        face.appendChild(paper);
        return face;
    }

    function build() {
        single = singleMedia.matches;
        stage.dataset.mode = single ? 'single' : 'spread';
        book.textContent = '';
        leaves = [];

        const count = single ? pages.length : Math.ceil(pages.length / 2);
        for (let i = 0; i < count; i++) {
            const leaf = document.createElement('div');
            leaf.className = 'leaf';
            if (single) {
                leaf.append(makeFace(i, 'front'), makeFace(null, 'back'));
            } else {
                const back = 2 * i + 1 <= lastPage ? 2 * i + 1 : null;
                leaf.append(makeFace(2 * i, 'front'), makeFace(back, 'back'));
            }
            book.appendChild(leaf);
            leaves.push(leaf);
        }

        flipped = pageToFlipped(page);
        leaves.forEach((leaf, i) => {
            leaf.classList.toggle('is-flipped', i < flipped);
            settleLeaf(leaf, i);
        });
        update(false);
    }

    function pageToFlipped(p) {
        return single ? p : Math.floor((p + 1) / 2);
    }

    function maxFlipped() {
        // En page simple, on s'arrête sur la dernière page au lieu de la tourner.
        return single ? leaves.length - 1 : leaves.length;
    }

    function visiblePages() {
        if (single) return [flipped];
        const list = [];
        if (flipped > 0) list.push(2 * flipped - 1);
        if (2 * flipped <= lastPage) list.push(2 * flipped);
        return list;
    }

    function settleLeaf(leaf, i) {
        const isFlipped = leaf.classList.contains('is-flipped');
        leaf.style.zIndex = isFlipped ? i + 1 : leaves.length - i;
    }

    /* ------------------------------------------------------------------ */
    /* Feuilletage                                                         */
    /* ------------------------------------------------------------------ */

    function go(target) {
        target = Math.max(0, Math.min(maxFlipped(), target));
        if (target === flipped) return;

        const forward = target > flipped;
        const turning = [];
        if (forward) {
            for (let i = flipped; i < target; i++) turning.push(i);
        } else {
            for (let i = flipped - 1; i >= target; i--) turning.push(i);
        }

        flipped = target;
        const instant = reducedMotion.matches;
        const stagger = instant ? 0 : Math.min(140, 700 / turning.length);

        turning.forEach((i, order) => {
            const leaf = leaves[i];
            clearTimeout(leaf._start);
            leaf._start = setTimeout(() => {
                // L'état cible est relu au moment de tourner : si l'utilisateur a
                // changé de page entre-temps, la feuille rejoint le bon côté.
                const shouldFlip = i < flipped;
                if (leaf.classList.contains('is-flipped') === shouldFlip) return;
                leaf.style.zIndex = 1000 + (forward ? i : leaves.length - i);
                leaf.classList.add('is-turning');
                leaf.classList.toggle('is-flipped', shouldFlip);
                if (order === 0 || order === turning.length - 1) rustle();
                clearTimeout(leaf._end);
                leaf._end = setTimeout(() => {
                    leaf.classList.remove('is-turning');
                    settleLeaf(leaf, i);
                }, instant ? 0 : TURN_MS);
            }, order * stagger);
        });

        update(true);
    }

    function goToPage(p) {
        go(pageToFlipped(Math.max(0, Math.min(lastPage, p))));
    }

    const next = () => go(flipped + 1);
    const prev = () => go(flipped - 1);

    /* ------------------------------------------------------------------ */
    /* Interface                                                           */
    /* ------------------------------------------------------------------ */

    function titleOf(p) {
        return pages[p].dataset.toc || 'Page ' + p;
    }

    function update(announce) {
        const visible = visiblePages();
        page = visible[0];

        book.classList.toggle('is-closed-front', !single && flipped === 0);
        book.classList.toggle('is-closed-back', !single && flipped === leaves.length);
        book.style.setProperty('--stack-left', Math.min(flipped, 6));
        book.style.setProperty('--stack-right', Math.min(leaves.length - flipped - 1, 6));

        // Seules les pages visibles sont atteignables au clavier / lecteur d'écran.
        book.querySelectorAll('.face').forEach((face) => {
            const shown = face.dataset.page !== undefined && visible.includes(Number(face.dataset.page));
            face.inert = !shown;
            face.classList.toggle('is-visible', shown);
        });

        const numbers = visible.filter((p) => p > 0 && p < lastPage);
        // « Histoire — La forêt » → « Histoire », « Ambitions (suite) » → « Ambitions »
        const label = visible
            .map((p) => titleOf(p).split(/ — | \(/)[0])
            .filter((t, i, all) => all.indexOf(t) === i)
            .join(' · ');
        folio.innerHTML = '';
        const strong = document.createElement('b');
        strong.textContent = label;
        folio.appendChild(strong);
        if (numbers.length) {
            const small = document.createElement('small');
            small.textContent = numbers.join('–') + ' / ' + innerPages;
            folio.appendChild(small);
        }

        progressBar.style.transform = 'scaleX(' + flipped / maxFlipped() + ')';
        prevBtn.disabled = flipped === 0;
        nextBtn.disabled = flipped === maxFlipped();

        tocMenu.querySelectorAll('a').forEach((a) => {
            const current = visible.includes(Number(a.dataset.page));
            a.toggleAttribute('aria-current', current);
        });

        closeBtn.disabled = flipped === 0;

        if (history.replaceState) {
            history.replaceState(null, '', page === 0 ? location.pathname + location.search : '#page-' + page);
        }

        if (announce) {
            announcer.textContent = numbers.length
                ? (numbers.length > 1 ? 'Pages ' : 'Page ') + numbers.join(' et ') + ' : ' + label
                : label;
        }
    }

    function buildTocMenu() {
        pages.forEach((section, p) => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = '#page-' + p;
            a.dataset.page = p;
            a.innerHTML = '<span></span><small></small>';
            a.firstChild.textContent = titleOf(p);
            a.lastChild.textContent = p > 0 && p < lastPage ? p : '';
            li.appendChild(a);
            tocMenu.appendChild(li);
        });
    }

    function setTocOpen(open) {
        tocMenu.hidden = !open;
        tocToggle.setAttribute('aria-expanded', String(open));
        if (open) {
            const current = tocMenu.querySelector('[aria-current]');
            (current || tocMenu.querySelector('a')).focus();
        }
    }

    /* ------------------------------------------------------------------ */
    /* Son des pages (généré, aucun fichier audio)                         */
    /* ------------------------------------------------------------------ */

    let audio = null;
    let soundOn = store.get('senju-sound') === 'on';

    function rustle() {
        if (!soundOn) return;
        try {
            audio = audio || new (window.AudioContext || window.webkitAudioContext)();
            const duration = 0.45;
            const buffer = audio.createBuffer(1, audio.sampleRate * duration, audio.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < data.length; i++) {
                const t = i / data.length;
                data[i] = (Math.random() * 2 - 1) * Math.pow(Math.sin(Math.PI * t), 2) * (0.6 + 0.4 * Math.random());
            }
            const noise = audio.createBufferSource();
            noise.buffer = buffer;
            const filter = audio.createBiquadFilter();
            filter.type = 'bandpass';
            filter.Q.value = 0.8;
            filter.frequency.setValueAtTime(900, audio.currentTime);
            filter.frequency.exponentialRampToValueAtTime(3800, audio.currentTime + duration);
            const gain = audio.createGain();
            gain.gain.value = 0.22;
            noise.connect(filter).connect(gain).connect(audio.destination);
            noise.start();
        } catch (e) { /* Web Audio indisponible */ }
    }

    function renderSound() {
        soundBtn.setAttribute('aria-pressed', String(soundOn));
        soundBtn.classList.toggle('is-on', soundOn);
    }

    /* ------------------------------------------------------------------ */
    /* Évènements                                                          */
    /* ------------------------------------------------------------------ */

    let swiped = false;

    function bindEvents() {
        prevBtn.addEventListener('click', prev);
        nextBtn.addEventListener('click', next);
        closeBtn.addEventListener('click', () => go(0));

        tocToggle.addEventListener('click', () => setTocOpen(tocMenu.hidden));
        tocMenu.addEventListener('keydown', (e) => {
            const links = Array.from(tocMenu.querySelectorAll('a'));
            const index = links.indexOf(document.activeElement);
            if (e.key === 'ArrowDown') links[(index + 1) % links.length].focus();
            else if (e.key === 'ArrowUp') links[(index - 1 + links.length) % links.length].focus();
            else return;
            e.preventDefault();
        });
        document.addEventListener('click', (e) => {
            if (!tocMenu.hidden && !e.target.closest('.toolbar__center')) setTocOpen(false);
        });

        // Liens internes (sommaire du carnet et menu).
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="#page-"]');
            if (!link) return;
            e.preventDefault();
            const inMenu = tocMenu.contains(link);
            if (inMenu) setTocOpen(false);
            goToPage(parseInt(link.getAttribute('href').slice(6), 10));
            if (inMenu) tocToggle.focus();
        });

        // Clic sur une page : droite = suivante, gauche = précédente.
        book.addEventListener('click', (e) => {
            if (swiped || e.target.closest('a, button, input, textarea, select')) return;
            if (window.getSelection && String(window.getSelection())) return;
            const face = e.target.closest('.face');
            if (!face) return;
            if (single) {
                const rect = face.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                if (x > 0.6) next();
                else if (x < 0.3) prev();
            } else if (face.classList.contains('face--front')) {
                next();
            } else {
                prev();
            }
        });

        // Glisser au doigt / à la souris.
        let start = null;
        stage.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            start = { x: e.clientX, y: e.clientY, t: Date.now() };
            swiped = false;
        });
        stage.addEventListener('pointerup', (e) => {
            if (!start) return;
            const dx = e.clientX - start.x;
            const dy = e.clientY - start.y;
            const quick = Date.now() - start.t < 800;
            start = null;
            if (quick && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
                swiped = true;
                dx < 0 ? next() : prev();
                setTimeout(() => { swiped = false; }, 50);
            }
        });
        stage.addEventListener('pointercancel', () => { start = null; });

        document.addEventListener('keydown', (e) => {
            if (e.altKey || e.ctrlKey || e.metaKey) return;
            if (e.target.closest && e.target.closest('input, textarea, select')) return;
            switch (e.key) {
                case 'ArrowRight':
                case 'PageDown':
                    next(); break;
                case 'ArrowLeft':
                case 'PageUp':
                    prev(); break;
                case 'Home':
                    go(0); break;
                case 'End':
                    go(maxFlipped()); break;
                case 'Escape':
                    if (tocMenu.hidden) return;
                    setTocOpen(false);
                    tocToggle.focus();
                    break;
                case 'f':
                case 'F':
                    toggleFullscreen(); break;
                default:
                    return;
            }
            e.preventDefault();
        });

        window.addEventListener('hashchange', () => {
            const match = /^#page-(\d+)$/.exec(location.hash);
            if (match) goToPage(parseInt(match[1], 10));
        });

        const onModeChange = () => {
            if (singleMedia.matches !== single) build();
        };
        if (singleMedia.addEventListener) singleMedia.addEventListener('change', onModeChange);
        else singleMedia.addListener(onModeChange);

        soundBtn.addEventListener('click', () => {
            soundOn = !soundOn;
            store.set('senju-sound', soundOn ? 'on' : 'off');
            renderSound();
            rustle();
        });

        fullscreenBtn.addEventListener('click', toggleFullscreen);
        const canFullscreen = document.fullscreenEnabled || document.webkitFullscreenEnabled;
        if (!canFullscreen) fullscreenBtn.hidden = true;

        // Léger basculement du livre qui suit le pointeur.
        if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
            let frame = 0;
            stage.addEventListener('pointermove', (e) => {
                if (reducedMotion.matches || frame) return;
                frame = requestAnimationFrame(() => {
                    frame = 0;
                    const x = e.clientX / window.innerWidth - 0.5;
                    const y = e.clientY / window.innerHeight - 0.5;
                    stage.style.setProperty('--tilt-x', (-y * 4).toFixed(2) + 'deg');
                    stage.style.setProperty('--tilt-y', (x * 5).toFixed(2) + 'deg');
                });
            });
            stage.addEventListener('pointerleave', () => {
                stage.style.setProperty('--tilt-x', '0deg');
                stage.style.setProperty('--tilt-y', '0deg');
            });
        }
    }

    function toggleFullscreen() {
        const root = document.documentElement;
        if (document.fullscreenElement || document.webkitFullscreenElement) {
            (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        } else if (root.requestFullscreen) {
            root.requestFullscreen().catch(() => {});
        } else if (root.webkitRequestFullscreen) {
            root.webkitRequestFullscreen();
        }
    }

    /* ------------------------------------------------------------------ */
    /* Feuilles qui tombent                                                */
    /* ------------------------------------------------------------------ */

    function fallingLeaves() {
        const canvas = document.getElementById('leaves');
        const ctx = canvas.getContext && canvas.getContext('2d');
        if (!ctx) return;

        const colors = ['#6f8f3a', '#8aa04a', '#b58a2e', '#a4502a', '#557a33'];
        let width = 0;
        let height = 0;
        let ratio = 1;
        let items = [];
        let running = false;
        let last = 0;

        function resize() {
            ratio = Math.min(window.devicePixelRatio || 1, 2);
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width * ratio;
            canvas.height = height * ratio;
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            const count = Math.round(Math.min(26, Math.max(10, width / 60)));
            while (items.length < count) items.push(spawn(true));
            items.length = count;
        }

        function spawn(anywhere) {
            return {
                x: Math.random() * width,
                y: anywhere ? Math.random() * height : -30,
                size: 7 + Math.random() * 9,
                speed: 18 + Math.random() * 32,
                drift: 10 + Math.random() * 30,
                phase: Math.random() * Math.PI * 2,
                spin: (Math.random() - 0.5) * 2,
                angle: Math.random() * Math.PI * 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 0.25 + Math.random() * 0.4
            };
        }

        function drawLeaf(l) {
            ctx.save();
            ctx.translate(l.x, l.y);
            ctx.rotate(l.angle);
            ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(l.phase * 1.3)));
            ctx.globalAlpha = l.alpha;
            ctx.fillStyle = l.color;
            ctx.beginPath();
            ctx.moveTo(0, -l.size);
            ctx.quadraticCurveTo(l.size * 0.75, 0, 0, l.size);
            ctx.quadraticCurveTo(-l.size * 0.75, 0, 0, -l.size);
            ctx.fill();
            ctx.strokeStyle = 'rgba(30, 20, 10, .35)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(0, -l.size * 0.9);
            ctx.lineTo(0, l.size * 1.25);
            ctx.stroke();
            ctx.restore();
        }

        function frame(now) {
            if (!running) return;
            const dt = Math.min(0.05, (now - last) / 1000 || 0);
            last = now;
            ctx.clearRect(0, 0, width, height);
            items.forEach((l, i) => {
                l.phase += dt;
                l.y += l.speed * dt;
                l.x += Math.sin(l.phase) * l.drift * dt;
                l.angle += l.spin * dt;
                if (l.y > height + 30) items[i] = spawn(false);
                drawLeaf(l);
            });
            requestAnimationFrame(frame);
        }

        function start() {
            if (running || reducedMotion.matches || document.hidden) return;
            running = true;
            last = performance.now();
            requestAnimationFrame(frame);
        }

        function stop() {
            running = false;
            ctx.clearRect(0, 0, width, height);
        }

        resize();
        window.addEventListener('resize', resize);
        document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
        const onMotion = () => (reducedMotion.matches ? stop() : start());
        if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', onMotion);
        start();
    }

    /* ------------------------------------------------------------------ */
    /* Démarrage                                                           */
    /* ------------------------------------------------------------------ */

    // Le carnet s'ouvre toujours fermé, sur sa couverture. Un lien direct
    // (#page-5) l'ouvre ensuite à la bonne page, en tournant les feuilles.
    const initial = /^#page-(\d+)$/.exec(location.hash);
    page = 0;

    stage.hidden = false;
    toolbar.hidden = false;
    buildTocMenu();
    build();
    renderSound();
    bindEvents();
    fallingLeaves();
    requestAnimationFrame(() => document.documentElement.classList.add('is-ready'));
    if (initial) setTimeout(() => goToPage(parseInt(initial[1], 10)), 1100);
})();
