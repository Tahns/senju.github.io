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

    const sources = Array.from(document.querySelectorAll('.book-source'));
    let source = sources[0];
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
    const shelveBtn = document.getElementById('shelve');
    const announcer = document.getElementById('announcer');

    let pages = [];
    let lastPage = 0;
    let innerPages = 0; // sans les deux couvertures

    function usePages(from) {
        source = from;
        pages = Array.from(from.querySelectorAll(':scope > .page'));
        lastPage = pages.length - 1;
        innerPages = pages.length - 2;
    }
    usePages(source);

    // Mode « scène » : le carnet est pris dans la bibliothèque par la scène 3D
    // (public/js/scene/) au lieu d'être affiché directement.
    const sceneMode = document.documentElement.classList.contains('has-scene');
    let shown = !sceneMode;

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
        anims.forEach((anim) => cancelAnimationFrame(anim.frame));
        anims.clear();
        book.textContent = '';
        leaves = [];
        makeCasts();

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
    /*                                                                     */
    /* Pendant qu'elle tourne, une feuille est remplacée par un « fantôme » */
    /* découpé en fines bandes verticales imbriquées : chaque bande tourne */
    /* un peu plus que la précédente, ce qui courbe la page comme du vrai  */
    /* papier. Le bord libre part en premier, la reliure suit.             */
    /* ------------------------------------------------------------------ */

    const CURL = 1.75; // plus c'est grand, plus la page se courbe
    const anims = new Set();
    let castRight = null;
    let castLeft = null;

    function makeCasts() {
        castRight = document.createElement('div');
        castRight.className = 'cast cast--right';
        castLeft = document.createElement('div');
        castLeft.className = 'cast cast--left';
        book.append(castRight, castLeft);
    }

    function makeGhost(leaf, strips) {
        const width = leaf.offsetWidth;
        const height = leaf.offsetHeight;
        const stripWidth = width / strips;
        const ghost = document.createElement('div');
        ghost.className = 'ghost';
        ghost.setAttribute('aria-hidden', 'true');
        ghost.style.left = leaf.offsetLeft + 'px';
        ghost.style.width = width + 'px';

        const sides = Array.from(leaf.children); // [recto, verso]
        const parts = [];
        let parent = ghost;
        for (let i = 0; i < strips; i++) {
            const strip = document.createElement('div');
            strip.className = 'ghost__strip';
            strip.style.left = (i === 0 ? 0 : stripWidth) + 'px';
            strip.style.width = stripWidth + 2 + 'px'; // +2px : pas de jour entre les bandes
            const shades = sides.map((face, side) => {
                const slice = face.cloneNode(false);
                slice.removeAttribute('role');
                slice.removeAttribute('aria-label');
                slice.classList.remove('is-visible');
                const paper = face.querySelector('.paper').cloneNode(true);
                paper.style.inset = 'auto';
                paper.style.top = '0';
                paper.style.width = width + 'px';
                paper.style.height = height + 'px';
                // Le verso est vu en miroir : sa bande n° i part de l'autre bord.
                paper.style.left = -(side === 0 ? i : strips - 1 - i) * stripWidth + 'px';
                const shade = document.createElement('div');
                shade.className = 'ghost__shade';
                slice.append(paper, shade);
                strip.appendChild(slice);
                return shade;
            });
            parent.appendChild(strip);
            parent = strip;
            parts.push({ strip, shades });
        }
        book.appendChild(ghost);
        return { ghost, parts, stripWidth, width };
    }

    function angles(t, wasFlipped) {
        t = Math.max(0, Math.min(1, t));
        const from = wasFlipped ? -180 : 0;
        const span = wasFlipped ? 180 : -180;
        return {
            spine: from + span * Math.pow(t, CURL),
            edge: from + span * (1 - Math.pow(1 - t, CURL))
        };
    }

    // Position horizontale du bord libre (en largeurs de page, depuis la reliure)
    // quand la page courbée est à l'avancement t.
    function reachAt(t, wasFlipped) {
        const { spine, edge } = angles(t, wasFlipped);
        const a = spine * Math.PI / 180;
        const b = edge * Math.PI / 180;
        return Math.abs(b - a) < 1e-4 ? Math.cos(a) : (Math.sin(b) - Math.sin(a)) / (b - a);
    }

    // Inverse de reachAt : quel avancement place le bord libre en r ?
    function tForReach(r, wasFlipped) {
        let lo = 0;
        let hi = 1;
        for (let k = 0; k < 22; k++) {
            const mid = (lo + hi) / 2;
            const past = wasFlipped ? reachAt(mid, true) < r : reachAt(mid, false) > r;
            if (past) lo = mid; else hi = mid;
        }
        return (lo + hi) / 2;
    }

    function darkness(angle, lift) {
        const light = Math.abs(Math.cos(angle * Math.PI / 180));
        return 0.55 * Math.pow(1 - light, 1.25) + 0.05 * lift;
    }

    // Dessine la feuille à l'avancement anim.t (0 = à sa place, 1 = tournée).
    function pose(anim) {
        const t = Math.max(0, Math.min(1, anim.t));
        const { spine, edge } = angles(t, anim.wasFlipped);
        const n = anim.parts.length;
        const bend = (edge - spine) / n;
        const lift = Math.sin(Math.PI * t);

        anim.parts.forEach((part, i) => {
            const a0 = spine + bend * i;
            part.strip.style.transform = 'rotateY(' + (i === 0 ? spine : bend).toFixed(3) + 'deg)';
            // Dégradé continu d'une bande à l'autre : pas d'effet de marches.
            const d0 = darkness(a0, lift).toFixed(3);
            const d1 = darkness(a0 + bend, lift).toFixed(3);
            part.shades[0].style.background = 'linear-gradient(90deg, rgba(28,15,5,' + d0 + '), rgba(28,15,5,' + d1 + '))';
            part.shades[1].style.background = 'linear-gradient(270deg, rgba(28,15,5,' + d0 + '), rgba(28,15,5,' + d1 + '))';
        });
        anim.ghost.style.transform = 'translateZ(' + (lift * 14).toFixed(1) + 'px)';

        // Ombre portée par la page soulevée sur la page du dessous.
        const reach = reachAt(t, anim.wasFlipped);
        const strength = (lift * 0.9).toFixed(3);
        const at = Math.abs(reach) * 100;
        if (reach >= 0) {
            castRight.style.opacity = strength;
            castRight.style.setProperty('--at', at + '%');
            castLeft.style.opacity = 0;
        } else {
            castLeft.style.opacity = single ? 0 : strength;
            castLeft.style.setProperty('--at', 100 - at + '%');
            castRight.style.opacity = 0;
        }
    }

    function setLeafState(leaf, i, isFlipped) {
        leaf.classList.add('no-anim');
        leaf.classList.toggle('is-flipped', isFlipped);
        settleLeaf(leaf, i);
        void leaf.offsetWidth;
        leaf.classList.remove('no-anim');
    }

    function finishAnim(anim) {
        cancelAnimationFrame(anim.frame);
        anims.delete(anim);
        anim.ghost.remove();
        anim.leaf._anim = null;
        anim.leaf.style.visibility = '';
        setLeafState(anim.leaf, anim.index, anim.target === 1 ? !anim.wasFlipped : anim.wasFlipped);
        if (!anims.size) {
            castRight.style.opacity = 0;
            castLeft.style.opacity = 0;
        }
    }

    function startAnim(leaf, i, strips) {
        const anim = Object.assign(makeGhost(leaf, strips), {
            leaf,
            index: i,
            wasFlipped: leaf.classList.contains('is-flipped'),
            t: 0,
            target: 1,
            dragging: false,
            frame: 0,
            last: 0
        });
        anim.ghost.style.zIndex = 1000 + (anim.wasFlipped ? leaves.length - i : i);
        leaf._anim = anim;
        leaf.style.visibility = 'hidden';
        anims.add(anim);
        pose(anim);
        return anim;
    }

    // Fait avancer la feuille vers sa cible (0 ou 1), lentement au départ et à
    // l'arrivée, plus vite au milieu — comme une vraie page qui retombe.
    function run(anim) {
        cancelAnimationFrame(anim.frame);
        anim.last = performance.now();
        const step = (now) => {
            if (!anim.ghost.isConnected) return anims.delete(anim);
            const dt = Math.min(120, now - anim.last);
            anim.last = now;
            const speed = (0.4 + 0.94 * Math.sin(Math.PI * Math.max(0.02, Math.min(0.98, anim.t)))) / TURN_MS;
            anim.t += (anim.target > anim.t ? 1 : -1) * speed * dt;
            if ((anim.target === 1 && anim.t >= 1) || (anim.target === 0 && anim.t <= 0)) {
                anim.t = anim.target;
                pose(anim);
                finishAnim(anim);
                return;
            }
            pose(anim);
            anim.frame = requestAnimationFrame(step);
        };
        anim.frame = requestAnimationFrame(step);
    }

    function turnLeaf(i, strips) {
        const leaf = leaves[i];
        const shouldFlip = i < flipped;
        const anim = leaf._anim;
        if (anim) {
            // Feuille déjà en mouvement : elle repart simplement dans l'autre sens.
            anim.target = shouldFlip !== anim.wasFlipped ? 1 : 0;
            anim.dragging = false;
            run(anim);
            return;
        }
        if (leaf.classList.contains('is-flipped') === shouldFlip) return;
        if (reducedMotion.matches) {
            setLeafState(leaf, i, shouldFlip);
            return;
        }
        run(startAnim(leaf, i, strips));
    }

    function go(target) {
        if (!shown) return;
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
        const many = turning.length > 1;
        const stagger = reducedMotion.matches ? 0 : Math.min(160, 800 / turning.length);

        turning.forEach((i, order) => {
            const leaf = leaves[i];
            clearTimeout(leaf._start);
            // L'état cible est relu au moment de tourner : si l'utilisateur a
            // changé de page entre-temps, la feuille rejoint le bon côté.
            const start = () => turnLeaf(i, many ? 6 : single ? 18 : 16);
            if (order === 0) start();
            else leaf._start = setTimeout(start, order * stagger);
            if (order === 0 || order === turning.length - 1) rustle();
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

        if (!sceneMode) {
            try {
                history.replaceState(null, '', page === 0 ? location.pathname + location.search : '#page-' + page);
            } catch (e) { /* page intégrée (iframe) : on garde l'adresse telle quelle */ }
        }

        if (announce) {
            announcer.textContent = numbers.length
                ? (numbers.length > 1 ? 'Pages ' : 'Page ') + numbers.join(' et ') + ' : ' + label
                : label;
        }
    }

    function buildTocMenu() {
        tocMenu.textContent = '';
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

    let dragged = false;

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

        // « Refermer le carnet » (fin du livre) et « Ranger le livre » (scène).
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href="#fin"], a[href="#ranger"]');
            if (!link) return;
            e.preventDefault();
            if (link.getAttribute('href') === '#fin') go(maxFlipped());
            else shelve();
        });
        if (shelveBtn) shelveBtn.addEventListener('click', shelve);

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
            if (dragged || e.target.closest('a, button, input, textarea, select')) return;
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

        // Attraper une page et la tourner à la main (souris ou doigt).
        let grab = null;
        stage.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            dragged = false;
            const face = e.target.closest('.face.is-visible');
            if (!face || e.target.closest('a, button')) return;
            grab = { x: e.clientX, y: e.clientY, face, id: e.pointerId, anim: null, history: [] };
        });

        stage.addEventListener('pointermove', (e) => {
            if (!grab || e.pointerId !== grab.id) return;
            const dx = e.clientX - grab.x;
            if (!grab.anim) {
                if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(e.clientY - grab.y)) return;
                const forward = dx < 0;
                const onFront = grab.face.classList.contains('face--front');
                // Page de droite → vers la gauche ; page de gauche → vers la droite.
                if (!single && forward !== onFront) { grab = null; return; }
                const index = forward ? flipped : flipped - 1;
                if (index < 0 || (forward && flipped >= maxFlipped()) || !leaves[index] || leaves[index]._anim || reducedMotion.matches) {
                    grab = null;
                    return;
                }
                const leaf = leaves[index];
                grab.anim = startAnim(leaf, index, single ? 18 : 16);
                grab.anim.dragging = true;
                grab.forward = forward;
                const rect = leaf.getBoundingClientRect();
                grab.spine = forward ? rect.left : rect.right;
                grab.width = rect.width;
                // Décalage entre le doigt et le bord libre de la page.
                grab.offset = forward ? rect.right - grab.x : rect.left - grab.x;
                dragged = true;
                try { stage.setPointerCapture(e.pointerId); } catch (err) { /* ignoré */ }
                rustle();
            }
            // Le bord libre de la page reste sous le pointeur.
            const r = Math.max(-1, Math.min(1, (e.clientX + grab.offset - grab.spine) / grab.width));
            grab.anim.t = tForReach(r, grab.anim.wasFlipped);
            pose(grab.anim);
            grab.history.push({ x: e.clientX, time: performance.now() });
            if (grab.history.length > 5) grab.history.shift();
        });

        const release = (e) => {
            if (!grab || e.pointerId !== grab.id) return;
            const { anim, history, forward } = grab;
            grab = null;
            if (!anim) return;
            const first = history[0];
            const last = history[history.length - 1];
            const velocity = first && last && last.time > first.time ? (last.x - first.x) / (last.time - first.time) : 0;
            const flick = forward ? velocity < -0.35 : velocity > 0.35;
            const back = forward ? velocity > 0.35 : velocity < -0.35;
            anim.dragging = false;
            anim.target = e.type !== 'pointercancel' && !back && (anim.t > 0.4 || flick) ? 1 : 0;
            if (anim.target === 1) {
                flipped += forward ? 1 : -1;
                update(true);
            }
            run(anim);
            setTimeout(() => { dragged = false; }, 60);
        };
        stage.addEventListener('pointerup', release);
        stage.addEventListener('pointercancel', release);

        document.addEventListener('keydown', (e) => {
            if (!shown || e.altKey || e.ctrlKey || e.metaKey) return;
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

        // Le livre s'incline vers la souris, comme sur la version d'origine.
        if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
            let frame = 0;
            const tilt = (x, y) => {
                stage.style.setProperty('--tilt-x', (8 - y * 22).toFixed(2) + 'deg');
                stage.style.setProperty('--tilt-y', (x * 26).toFixed(2) + 'deg');
                stage.style.setProperty('--tilt-z', (-2 - x * 4).toFixed(2) + 'deg');
            };
            document.addEventListener('pointermove', (e) => {
                if (reducedMotion.matches || frame || e.pointerType !== 'mouse') return;
                frame = requestAnimationFrame(() => {
                    frame = 0;
                    tilt(e.clientX / window.innerWidth - 0.5, e.clientY / window.innerHeight - 0.5);
                });
            });
            document.documentElement.addEventListener('mouseleave', () => tilt(0, 0));
            if (!reducedMotion.matches) tilt(0, 0);
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

    let leavesStarted = false;
    function fallingLeaves() {
        if (leavesStarted) return;
        leavesStarted = true;
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
            // Pause pendant qu'une page tourne : toute la puissance va à la page.
            if (anims.size) {
                requestAnimationFrame(frame);
                return;
            }
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

    /* ------------------------------------------------------------------ */
    /* Commandes pour la scène 3D                                          */
    /* ------------------------------------------------------------------ */

    // Change de carnet : les pages du carnet actuel retournent à leur source.
    function load(name) {
        const wanted = sources.find((el) => el.dataset.book === name) || sources[0];
        if (wanted === source && leaves.length) return;
        pages.forEach((section) => source.appendChild(section));
        usePages(wanted);
        stage.dataset.book = wanted.dataset.book;
        page = 0;
        buildTocMenu();
        build();
    }

    let onShelve = null;
    let shelving = false;

    function setShown(value) {
        shown = value;
        stage.hidden = false;
        toolbar.hidden = false;
        document.documentElement.classList.toggle('book-open', value);
        stage.inert = !value;
        toolbar.inert = !value;
    }

    // Ouvre un carnet (fermé, sur sa couverture). `done` est appelé quand le
    // lecteur le range.
    function open(name, done) {
        load(name);
        if (flipped !== 0) {
            page = 0;
            build();
        }
        onShelve = done || null;
        shelving = false;
        setShown(true);
        update(false);
        announcer.textContent = titleOf(0) + ' : ' + (pages[0].querySelector('h1') || {}).textContent;
    }

    // Referme le carnet s'il est ouvert, puis le rend à la scène.
    function shelve() {
        if (!shown || shelving) return;
        shelving = true;
        setTocOpen(false);
        const opened = flipped !== 0 && flipped !== leaves.length;
        const turns = opened ? flipped : 0;
        if (opened) go(0);
        const delay = opened ? TURN_MS + Math.min(160, 800 / turns) * (turns - 1) + 150 : 0;
        setTimeout(() => {
            setShown(false);
            shelving = false;
            const done = onShelve;
            onShelve = null;
            if (done) done();
        }, delay);
    }

    // Sans scène (lien « Aller directement au carnet », ou WebGL indisponible).
    function standalone() {
        document.documentElement.classList.remove('has-scene');
        load(sources[0].dataset.book);
        onShelve = null;
        setShown(true);
        update(false);
        fallingLeaves();
    }

    function setSound(on) {
        soundOn = on;
        store.set('senju-sound', on ? 'on' : 'off');
        renderSound();
    }

    window.Carnet = {
        open,
        shelve,
        standalone,
        setSound,
        get sound() { return soundOn; },
        get isOpen() { return shown; },
        get isClosed() { return flipped === 0 || flipped === leaves.length; }
    };

    /* ------------------------------------------------------------------ */
    /* Démarrage                                                           */
    /* ------------------------------------------------------------------ */

    // Le carnet s'ouvre toujours fermé, sur sa couverture. Un lien direct
    // (#page-5) l'ouvre ensuite à la bonne page, en tournant les feuilles.
    const initial = /^#page-(\d+)$/.exec(location.hash);
    page = 0;

    stage.dataset.book = source.dataset.book;
    buildTocMenu();
    build();
    renderSound();
    bindEvents();
    if (sceneMode) {
        setShown(false);
        // Si la scène 3D ne peut pas se charger (navigateur trop ancien), on
        // affiche le carnet. Une erreur de chargement l'affiche aussi (voir
        // index.html), et une connexion très lente finit par y renoncer.
        setTimeout(() => {
            if (!window.SceneLoading) standalone();
        }, 1500);
        setTimeout(() => {
            if (!window.SceneStarted) standalone();
        }, 45000);
    } else {
        setShown(true);
        fallingLeaves();
    }
    requestAnimationFrame(() => document.documentElement.classList.add('is-ready'));
    if (initial && !sceneMode) setTimeout(() => goToPage(parseInt(initial[1], 10)), 1100);
})();
