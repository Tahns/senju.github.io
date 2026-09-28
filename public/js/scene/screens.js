/*
 * Écrans des catégories, après « Confirmer » dans le menu « Sélection de la
 * catégorie » : mis en page comme la candidature vidéo Canva (écrans des jeux
 * Naruto Storm) — sélection des chapitres de l'histoire, caractère révélé
 * trait par trait, objectifs à court, moyen et long terme, présentation HRP.
 *
 * Le texte n'est écrit qu'une fois : il est lu dans les pages du carnet
 * (index.html, <main id="book-source">), il suffit donc de modifier le carnet.
 */

const NAME = 'Akira Hyûga';
const NICK = '« The vulgar child »';

// Nombre de cases de la sélection des chapitres (les suivantes sont « à suivre »).
const CHAPTER_SLOTS = 8;

function el(tag, className = '', text = '') {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
}

const clean = (t) => t.replace(/\s+/g, ' ').trim();

// Pages du carnet d'après leur nom dans le sommaire (data-toc) ou un sélecteur.
// Les pages peuvent avoir été déplacées dans le livre : on les cherche partout,
// sans doublon (le livre à double page en garde parfois une copie).
function pages(selector) {
    const seen = new Set();
    return Array.from(document.querySelectorAll(`.book-source ${selector}, #book ${selector}`)).filter((s) => {
        const k = s.dataset.toc;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
}

const page = (toc) => pages(`.page[data-toc="${toc}"]`)[0] || null;

// Une liste, avec les petites précisions (<small>) en retrait.
function list(ul) {
    const out = el('ul', 'ss-list');
    ul.querySelectorAll(':scope > li').forEach((li) => {
        const item = el('li');
        const main = li.cloneNode(true);
        main.querySelectorAll('small').forEach((sm) => sm.remove());
        item.append(clean(main.textContent));
        const small = li.querySelector('small');
        if (small) item.append(el('small', '', clean(small.textContent)));
        out.append(item);
    });
    return out;
}

// Découpe une page en panneaux : chaque <h3> ouvre un panneau, qui prend les
// listes et paragraphes qui le suivent.
function panelsOf(section) {
    const out = [];
    let cur = null;
    Array.from(section.children).forEach((n) => {
        if (n.tagName === 'H3') {
            cur = el('section', 'ss-panel');
            cur.append(el('h3', 'ss-panel__title', clean(n.textContent)));
            out.push(cur);
        } else if (cur && n.tagName === 'UL') cur.append(list(n));
        else if (cur && n.tagName === 'P' && !n.classList.contains('book-end')) cur.append(el('p', 'ss-panel__text', clean(n.textContent)));
        else if (cur && n.tagName === 'DIV') n.querySelectorAll('p').forEach((pp) => cur.append(el('p', 'ss-panel__text', clean(pp.textContent))));
        else if (cur && n.tagName === 'DL') {
            n.querySelectorAll(':scope > div').forEach((row) => cur.append(el('p', 'ss-panel__text ss-panel__em', `${clean(row.querySelector('dt').textContent)} : ${clean(row.querySelector('dd').textContent)}`)));
        }
    });
    return out;
}

/* ---------------- Voix off ---------------- */
// Un seul lecteur pour la voix off (Opus si le navigateur le lit, sinon MP3),
// gardé d'un affichage à l'autre ; la musique baisse pendant qu'elle parle.
const voiceHooks = { change() {}, muted: () => false, time() {} };
let voiceAudio = null;
let voiceResume = false;
function voiceSrc(path) {
    const opus = path.replace(/\.mp3$/, '.webm');
    return opus !== path && document.createElement('audio').canPlayType('audio/webm; codecs="opus"') ? opus : path;
}
const clock = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
function updateVoiceUI() {
    const box = document.querySelector('.ss-reader__voice');
    if (!box || !voiceAudio) return;
    const d = voiceAudio.duration || 0;
    const t = voiceAudio.currentTime || 0;
    box.querySelector('.ss-reader__listen').textContent = voiceAudio.paused ? (t > 0 && t < d ? 'Reprendre' : 'Écouter') : 'Pause';
    box.querySelector('.ss-reader__bar span').style.width = d ? `${(t / d) * 100}%` : '0';
    box.querySelector('.ss-reader__time').textContent = d ? `${clock(t)} / ${clock(d)}` : '';
}
function ensureVoice(path) {
    if (!voiceAudio || voiceAudio.dataset.path !== path) {
        if (voiceAudio) voiceAudio.pause();
        voiceAudio = document.createElement('audio');
        voiceAudio.preload = 'metadata';
        voiceAudio.dataset.path = path;
        voiceAudio.src = voiceSrc(path);
        window.__voice = voiceAudio; // pour les tests (tools/test/voice.js)
        voiceAudio.addEventListener('timeupdate', () => { updateVoiceUI(); voiceHooks.time(voiceAudio.currentTime); });
        voiceAudio.addEventListener('play', () => { voiceHooks.change(true); updateVoiceUI(); });
        voiceAudio.addEventListener('pause', () => { voiceHooks.change(false); updateVoiceUI(); });
        voiceAudio.addEventListener('ended', () => { voiceAudio.currentTime = 0; updateVoiceUI(); });
    }
    const a = voiceAudio;
    return a.readyState >= 1 ? Promise.resolve(a) : new Promise((resolve, reject) => {
        a.addEventListener('loadedmetadata', () => resolve(a), { once: true });
        a.addEventListener('error', reject, { once: true });
    });
}
function toggleVoice() {
    if (!voiceAudio) return;
    if (voiceAudio.paused) {
        voiceAudio.muted = voiceHooks.muted();
        voiceAudio.play().catch(() => {});
    } else voiceAudio.pause();
}
function stopVoice() {
    voiceResume = false;
    if (!voiceAudio) return;
    voiceAudio.pause();
    voiceAudio.currentTime = 0;
}

/* ---------------- Contenu de chaque catégorie ---------------- */
// Chaque écran est une suite d'étapes (« Suivant ») ; `render(step)` remplit le corps.

// Personnage : le caractère, révélé trait par trait (trois colonnes par écran,
// comme dans le Canva), puis les objectifs à court, moyen et long terme.
function personnage() {
    const traits = pages('.page[data-toc="Caractère"]').flatMap((p) => Array.from(p.querySelectorAll('.qualities > div'), (d) => ({
        name: clean(d.querySelector('dt').textContent),
        text: clean(d.querySelector('dd').textContent),
        kanji: d.dataset.kanji || '',
        tone: d.dataset.tone || 'gold'
    })));
    // Objectifs : une étape par terme (les pages « … (suite) » rejoignent la précédente).
    const terms = [];
    pages('.page--goals').forEach((p) => {
        const term = p.dataset.term;
        const last = terms[terms.length - 1];
        if (last && last.term === term) last.pages.push(p);
        else terms.push({ term, pages: [p] });
    });
    const nTraits = traits.length;
    const titles = traits.map(() => 'Caractère').concat(terms.map((t) => `Objectifs à ${t.term.toLowerCase()}`));
    return {
        key: 'personnage',
        title: 'Caractère',
        titles,
        tabs: true,
        tab: (step) => (step < nTraits ? 'caractere' : 'objectifs'),
        // Un nouvel « écran » tous les trois traits, puis à chaque terme d'objectifs.
        page: (step) => (step < nTraits ? Math.floor(step / 3) : step),
        tabStep: { caractere: 0, objectifs: nTraits },
        steps: titles.length,
        layout: 'full',
        render(step, body) {
            if (step >= nTraits) {
                const wrap = el('div', 'ss-panels');
                terms[step - nTraits].pages.forEach((p) => panelsOf(p).forEach((pn, i) => {
                    pn.style.setProperty('--i', i);
                    wrap.append(pn);
                }));
                body.append(wrap);
                return;
            }
            const first = Math.floor(step / 3) * 3;
            const row = el('div', 'ss-traits');
            traits.slice(first, first + 3).forEach((t, i) => {
                const shown = first + i <= step;
                const col = el('article', `ss-trait tone-${t.tone}` + (shown ? ' is-shown' : '') + (first + i === step ? ' is-new' : ''));
                col.append(el('h3', 'ss-trait__name', t.name));
                const art = el('div', 'ss-trait__art');
                const k = el('span', '', t.kanji);
                k.setAttribute('lang', 'ja');
                art.append(k);
                art.setAttribute('aria-hidden', 'true');
                col.append(art);
                if (shown) col.append(el('p', 'ss-trait__text', t.text));
                row.append(col);
            });
            body.append(row);
        }
    };
}

// HRP : à gauche le nom et les onglets (comme les pastilles de tenue du
// Canva), la carte de présentation ; Akira en 3D à droite.
function hrp() {
    const hp = pages('.page--hrp');
    const tabs = hp.map((p) => clean(p.querySelector('h2').textContent));
    return {
        key: 'hrp',
        title: 'Présentation HRP',
        // Comme dans le Canva : le personnage à gauche, la présentation à droite.
        side: -1,
        steps: hp.length,
        layout: 'side',
        render(step, body, go) {
            const head = el('div', 'ss-hero');
            const [first, last] = NAME.split(' ');
            head.append(el('p', 'ss-hero__jp', '日向 アキラ'), el('p', 'ss-hero__name', first), el('p', 'ss-hero__name ss-hero__name--2', last), el('p', 'ss-hero__nick', NICK));
            const pills = el('div', 'ss-pills');
            tabs.forEach((t, i) => {
                const b = el('button', 'ss-pill' + (i === step ? ' is-active' : ''), t);
                b.type = 'button';
                b.setAttribute('aria-pressed', String(i === step));
                b.addEventListener('click', () => go(i));
                pills.append(b);
            });
            const card = el('div', 'ss-card');
            const head2 = el('p', 'ss-card__head');
            head2.append(el('span', '', 'Présentation'), el('span', '', 'HRP'));
            card.append(head2);
            panelsOf(hp[step]).forEach((pn) => {
                card.append(el('h3', 'ss-card__title', pn.querySelector('h3').textContent));
                Array.from(pn.children).slice(1).forEach((n) => card.append(n));
            });
            body.append(head, pills, card);
        }
    };
}

function histoire() {
    // Un chapitre peut s'étendre sur plusieurs pages du carnet (même data-chapter).
    const groups = [];
    pages('.page--story').forEach((s) => {
        const key = s.dataset.chapter || s.dataset.toc;
        const g = groups.find((x) => x.key === key);
        if (g) g.pages.push(s);
        else groups.push({ key, pages: [s] });
    });
    const chapters = groups.map(({ pages: ps }, i) => {
        const s = ps[0];
        const paras = ps.flatMap((pg) => Array.from(pg.querySelectorAll('.prose p:not(.to-be-continued)')));
        return {
            label: clean(s.querySelector('.chapter')?.textContent || `Chapitre ${i + 1}`),
            title: clean(s.querySelector('h2')?.textContent || ''),
            summary: clean(s.querySelector('.chapo')?.textContent || ''),
            paras: paras.map((n) => clean(n.textContent)),
            // Instant (en secondes) où la voix off commence chaque paragraphe.
            cues: paras.map((n) => (n.dataset.t === undefined ? null : Number(n.dataset.t))),
            art: ps.map((pg) => pg.querySelector('.vignette')).find(Boolean)?.cloneNode(true) || null,
            // Voix off du chapitre (data-voice sur la page du carnet), si le fichier existe.
            voice: s.dataset.voice || ''
        };
    });
    const state = { chapter: 0, reading: false, para: 0 };
    let api = null;
    // Changement de paragraphe à la main pendant la voix off : la voix suit.
    const seekVoice = (c) => {
        const at = c.cues[state.para];
        if (voiceAudio && !voiceAudio.paused && at !== null && at !== undefined) voiceAudio.currentTime = at;
    };
    // Pendant la voix off, le paragraphe affiché suit la narration.
    voiceHooks.time = (t) => {
        const c = chapters[state.chapter];
        if (!state.reading || !api || !c.cues.length || c.cues[0] === null) return;
        let i = 0;
        while (i + 1 < c.cues.length && c.cues[i + 1] !== null && t >= c.cues[i + 1]) i++;
        if (i !== state.para) { state.para = i; api(); }
    };
    return {
        key: 'histoire',
        title: "Histoire",
        steps: 1,
        layout: 'full',
        get actionLabel() {
            if (!state.reading) return 'Commencer';
            const c = chapters[state.chapter];
            return state.para < c.paras.length - 1 || state.chapter < chapters.length - 1 ? 'Suivant' : 'Terminer';
        },
        reset() { state.chapter = 0; state.reading = false; state.para = 0; stopVoice(); },
        leave: stopVoice,
        // Transitions : la page change quand on entre dans un chapitre ou qu'on en sort.
        page: () => (state.reading ? 'read' : 'grid'),
        // Flèches et « Suivant » : sélection des chapitres, puis lecture paragraphe par paragraphe.
        next() {
            if (!state.reading) { state.reading = true; state.para = 0; return true; }
            const c = chapters[state.chapter];
            if (state.para < c.paras.length - 1) { state.para++; seekVoice(c); return true; }
            if (state.chapter < chapters.length - 1) { state.chapter++; state.para = 0; return true; }
            state.reading = false;
            return true;
        },
        prev() {
            if (!state.reading) return false;
            if (state.para > 0) { state.para--; seekVoice(chapters[state.chapter]); return true; }
            state.reading = false;
            return true;
        },
        move(dir) {
            if (state.reading) return dir > 0 ? this.next() : this.prev();
            state.chapter = (state.chapter + dir + chapters.length) % chapters.length;
            return true;
        },
        render(step, body, go, redraw) {
            api = redraw;
            const c = chapters[state.chapter];
            if (state.reading) {
                const view = el('div', 'ss-reader');
                const frame = el('div', 'ss-reader__frame');
                // Cadre façon fenêtre de lecture du Canva : barre orange ● ■ ▲ et emblème.
                const chrome = el('div', 'ss-reader__chrome', '● ■ ▲');
                chrome.setAttribute('aria-hidden', 'true');
                const badge = el('span', 'ss-reader__badge', '日');
                badge.setAttribute('aria-hidden', 'true');
                view.append(badge);
                frame.append(chrome);
                if (c.art) frame.append(c.art.cloneNode(true));
                frame.append(el('p', 'ss-reader__label', `${c.label} · ${c.title}`));
                const text = el('div', 'ss-reader__text');
                text.append(el('p', 'is-new', c.paras[state.para]), el('p', 'ss-reader__count', `${state.para + 1} / ${c.paras.length}`));
                const back = el('button', 'ss-reader__back', '⟵ Chapitres');
                back.type = 'button';
                back.addEventListener('click', () => { state.reading = false; stopVoice(); api(true); });
                view.append(frame, text, back);
                // « Écouter » (comme dans le Canva) : la voix off du chapitre, avec sa progression.
                if (c.voice) {
                    const box = el('div', 'ss-reader__voice');
                    box.hidden = true;
                    const listen = el('button', 'ss-reader__listen', 'Écouter');
                    listen.type = 'button';
                    listen.addEventListener('click', () => {
                        // Au premier lancement, la voix part du paragraphe affiché.
                        const at = c.cues[state.para];
                        if (voiceAudio && voiceAudio.paused && voiceAudio.currentTime === 0 && at) voiceAudio.currentTime = at;
                        toggleVoice();
                    });
                    const bar = el('span', 'ss-reader__bar');
                    bar.setAttribute('aria-hidden', 'true');
                    bar.append(el('span'));
                    box.append(listen, bar, el('span', 'ss-reader__time'));
                    view.append(box);
                    ensureVoice(c.voice).then(() => { box.hidden = false; updateVoiceUI(); }).catch(() => {});
                }
                body.append(view);
                return;
            }
            const side = el('div', 'ss-chapters__side');
            side.append(el('p', 'ss-chapters__label', c.label), el('p', 'ss-chapters__title', c.title));
            if (c.summary) side.append(el('p', 'ss-chapters__summary', c.summary));
            const stats = el('ul', 'ss-chapters__stats');
            stats.append(el('li', '', `Chapitres finis ${chapters.length}/${CHAPTER_SLOTS}`));
            stats.append(el('li', 'is-next', 'Chapitre suivant : à venir'));
            side.append(stats);
            const grid = el('div', 'ss-chapters__grid');
            grid.setAttribute('role', 'listbox');
            grid.setAttribute('aria-label', 'Chapitres');
            for (let i = 0; i < CHAPTER_SLOTS; i++) {
                const open = i < chapters.length;
                const card = el(open ? 'button' : 'div', 'ss-chapter' + (open ? '' : ' is-locked') + (i === state.chapter ? ' is-active' : ''));
                card.append(el('span', 'ss-chapter__label', `Chapitre ${i + 1}`));
                const art = el('span', 'ss-chapter__art');
                if (open && chapters[i].art) art.append(chapters[i].art.cloneNode(true));
                else art.append(el('span', 'ss-chapter__lock', open ? '' : '0 %'));
                card.append(art);
                if (open) {
                    card.type = 'button';
                    card.setAttribute('role', 'option');
                    card.setAttribute('aria-selected', String(i === state.chapter));
                    card.setAttribute('aria-label', `${chapters[i].label} : ${chapters[i].title}`);
                    card.addEventListener('click', () => {
                        if (state.chapter === i) { state.reading = true; state.para = 0; } else state.chapter = i;
                        api(true);
                    });
                } else {
                    card.setAttribute('aria-hidden', 'true');
                    card.append(el('span', 'ss-chapter__soon', 'À venir'));
                }
                grid.append(card);
            }
            body.append(side, grid);
        }
    };
}

const BUILDERS = { histoire, personnage, hrp };

/* ---------------- L'écran ---------------- */

export function createScreens({ sound, onExit, onBook, onVoice = () => {}, muted = () => false, onSide = () => {} }) {
    voiceHooks.change = onVoice;
    voiceHooks.muted = muted;
    const root = el('div', 'storm-screen scene-only');
    root.id = 'storm-screen';
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.innerHTML = `
        <p class="ss-title" id="ss-title"></p>
        <header class="ss-top">
            <p class="ss-top__pause">Mettez en pause à tout moment</p>
            <p class="ss-top__name">${NAME}</p>
            <p class="ss-top__count" id="ss-count" aria-hidden="true"></p>
        </header>
        <nav class="ss-tabs" id="ss-tabs" aria-label="Caractère et objectifs" hidden>
            <button type="button" data-go="caractere">Caractère</button>
            <button type="button" data-go="objectifs">Objectifs</button>
        </nav>
        <div class="ss-body" id="ss-body" aria-live="polite"></div>
        <div class="ss-actions">
            <button class="storm-menu__action" id="ss-pause" type="button" title="Échap"><span class="pad pad--circle" aria-hidden="true"></span> Pause</button>
            <button class="storm-menu__action storm-menu__action--confirm" id="ss-next" type="button" title="Entrée"><span class="pad pad--cross" aria-hidden="true"></span> <span>Suivant</span></button>
        </div>
        <div class="ss-dialog" id="ss-dialog" role="alertdialog" aria-labelledby="ss-dialog-q" hidden>
            <div class="ss-dialog__box">
                <p class="ss-dialog__q" id="ss-dialog-q">Revenir à la sélection de la catégorie ?</p>
                <div class="ss-dialog__choices">
                    <button type="button" id="ss-yes">Oui</button>
                    <button type="button" id="ss-no">Non</button>
                </div>
                <button type="button" class="ss-dialog__book" id="ss-book">Lire cette page dans le carnet</button>
            </div>
        </div>`;
    document.body.append(root);
    const $ = (id) => root.querySelector('#' + id);
    const body = $('ss-body');
    const title = $('ss-title');
    const count = $('ss-count');
    const tabs = $('ss-tabs');
    const nextBtn = $('ss-next');
    const dialog = $('ss-dialog');

    let screen = null;
    let step = 0;
    let lastPage = null;
    // Bandeau qui balaie l'écran en diagonale (transition des jeux Storm).
    const band = el('div', 'ss-wipe');
    band.setAttribute('aria-hidden', 'true');
    root.append(band);
    function wipe() {
        if (calm()) return;
        band.animate([{ transform: 'translateX(-130%) skewX(-18deg)' }, { transform: 'translateX(130%) skewX(-18deg)' }], { duration: 520, easing: 'cubic-bezier(.5, 0, .3, 1)' });
    }
    let bookPage = 0;

    // Transitions façon Canva : glissé-zoom quand l'écran change de page, et
    // zoom depuis la carte du chapitre (ou retour vers elle). Animations Web
    // en transformations seules : si elles tardent, le contenu reste visible.
    const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function zoomFrom(node, rect) {
        const to = node.getBoundingClientRect();
        if (!rect || !to.width || calm()) return;
        const dx = rect.left + rect.width / 2 - (to.left + to.width / 2);
        const dy = rect.top + rect.height / 2 - (to.top + to.height / 2);
        node.animate([
            { transform: `translate(${dx}px, ${dy}px) scale(${rect.width / to.width}, ${rect.height / to.height})` },
            { transform: 'none' }
        ], { duration: 520, easing: 'cubic-bezier(.2, .8, .2, 1)' });
    }
    function draw(fx = false, dir = 0) {
        const page = screen.page ? screen.page(step) : step;
        const card = body.querySelector('.ss-chapter.is-active');
        const cardRect = card && card.getBoundingClientRect();
        const frame = body.querySelector('.ss-reader__frame');
        const frameRect = frame && frame.getBoundingClientRect();
        const turned = !fx && page !== lastPage;
        lastPage = page;
        body.replaceChildren();
        body.className = 'ss-body ss-body--' + screen.key + ' ss-layout--' + screen.layout;
        root.dataset.layout = screen.layout;
        screen.render(step, body, (s) => { if (s !== step) { const d = s > step ? 1 : -1; step = s; sound.select(); draw(false, d); } }, (click) => {
            if (click) sound.select();
            draw();
        });
        const newFrame = body.querySelector('.ss-reader__frame');
        const newCard = body.querySelector('.ss-chapter.is-active');
        if (cardRect && newFrame) zoomFrom(newFrame, cardRect);
        else if (frameRect && newCard) zoomFrom(newCard, frameRect);
        else if (turned && !calm()) {
            const x = (dir || 1) * 5;
            body.animate([{ transform: `translateX(${x}vw) scale(.97)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2, .8, .2, 1)' });
            wipe();
        }
        title.textContent = screen.titles ? screen.titles[step] : screen.title;
        count.textContent = screen.steps > 1 ? `○ ${step + 1} / ${screen.steps}` : '';
        const last = step >= screen.steps - 1;
        nextBtn.querySelector('span:not(.pad)').textContent = screen.actionLabel || (last ? 'Terminer' : 'Suivant');
        tabs.hidden = !screen.tabs;
        if (screen.tabs) root.dataset.tabs = '';
        else delete root.dataset.tabs;
        const tab = screen.tab && screen.tab(step);
        tabs.querySelectorAll('button').forEach((b) => {
            b.classList.toggle('is-active', b.dataset.go === tab);
            b.setAttribute('aria-pressed', String(b.dataset.go === tab));
        });
        if (fx) root.classList.add('is-entering');
    }

    function open(key, page) {
        screen = BUILDERS[key]();
        if (screen.reset) screen.reset();
        onSide(screen.side || 1);
        step = 0;
        bookPage = page;
        root.setAttribute('aria-label', screen.title);
        root.classList.remove('is-entering');
        void root.offsetWidth;
        dialog.hidden = true;
        root.hidden = false;
        lastPage = null;
        draw(true);
        wipe();
        nextBtn.focus();
    }

    function close() {
        if (screen && screen.leave) screen.leave();
        root.hidden = true;
        dialog.hidden = true;
        screen = null;
    }

    function next() {
        if (screen.next) {
            screen.next();
            sound.select();
            draw();
            return;
        }
        if (step < screen.steps - 1) {
            step++;
            sound.select();
            draw(false, 1);
            return;
        }
        exit();
    }

    function prev() {
        if (screen.prev) {
            if (screen.prev()) { sound.select(); draw(); }
            return;
        }
        if (step > 0) {
            step--;
            sound.select();
            draw(false, -1);
        }
    }

    function pause(on) {
        // La voix off se met en pause avec le jeu, et reprend si on répond « Non ».
        if (on && voiceAudio && !voiceAudio.paused) { voiceResume = true; voiceAudio.pause(); }
        else if (!on && voiceResume) { voiceResume = false; toggleVoice(); }
        dialog.hidden = !on;
        sound.select();
        (on ? $('ss-no') : nextBtn).focus();
    }

    // Retour au menu : le bandeau balaie l'écran, puis le menu revient.
    function exit() {
        wipe();
        setTimeout(() => {
            close();
            onExit();
        }, calm() ? 0 : 260);
    }

    nextBtn.addEventListener('click', next);
    $('ss-pause').addEventListener('click', () => pause(true));
    $('ss-no').addEventListener('click', () => pause(false));
    $('ss-yes').addEventListener('click', exit);
    $('ss-book').addEventListener('click', () => {
        close();
        onBook(bookPage);
    });
    tabs.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-go]');
        if (!b || !screen.tabStep) return;
        const to = screen.tabStep[b.dataset.go];
        const d = to > step ? 1 : -1;
        step = to;
        sound.select();
        draw(false, d);
    });
    // Cliquer à côté de la boîte de dialogue revient à dire « Non ».
    dialog.addEventListener('click', (e) => { if (e.target === dialog) pause(false); });

    document.addEventListener('keydown', (e) => {
        if (!screen || root.hidden) return;
        if (!dialog.hidden) {
            if (e.key === 'Escape') { e.preventDefault(); pause(false); }
            else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                const choices = [$('ss-yes'), $('ss-no'), $('ss-book')];
                const i = choices.indexOf(document.activeElement);
                const d = e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 1;
                choices[(i + d + choices.length) % choices.length].focus();
            }
            return;
        }
        if (e.key === 'Escape') { e.preventDefault(); pause(true); }
        else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            if (screen.move) { screen.move(1); sound.select(); draw(); } else next();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (screen.move) { if (screen.move(-1)) { sound.select(); draw(); } } else prev();
        } else if (e.key === 'Enter' && document.activeElement === document.body) {
            e.preventDefault();
            next();
        }
    });

    return {
        open,
        close,
        get isOpen() { return Boolean(screen); }
    };
}
