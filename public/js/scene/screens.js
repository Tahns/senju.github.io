/*
 * Écran de la catégorie HRP, après « Confirmer » dans le menu « Sélection de la
 * catégorie » : mis en page comme la candidature vidéo Canva (personnage à
 * gauche, présentation à droite). L'histoire, le caractère et les objectifs se
 * lisent dans les carnets de la scène (catégorie « Histoire »).
 *
 * Le texte n'est écrit qu'une fois : il est lu dans les pages du carnet
 * (index.html, <main id="book-source">), il suffit donc de modifier le carnet.
 */

const NAME = 'Akira Hyûga';
const NICK = '« The vulgar child »';


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

/* ---------------- Contenu de chaque catégorie ---------------- */
// Chaque écran est une suite d'étapes (« Suivant ») ; `render(step)` remplit le corps.

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

const BUILDERS = { hrp };

/* ---------------- L'écran ---------------- */

export function createScreens({ sound, onExit, onBook, onSide = () => {} }) {
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
    const nextBtn = $('ss-next');
    const dialog = $('ss-dialog');

    let screen = null;
    let step = 0;
    // Bandeau qui balaie l'écran en diagonale (transition des jeux Storm).
    const band = el('div', 'ss-wipe');
    band.setAttribute('aria-hidden', 'true');
    root.append(band);
    function wipe() {
        if (calm()) return;
        band.animate([{ transform: 'translateX(-130%) skewX(-18deg)' }, { transform: 'translateX(130%) skewX(-18deg)' }], { duration: 520, easing: 'cubic-bezier(.5, 0, .3, 1)' });
    }
    let bookPage = 0;

    // Transition façon Canva : glissé-zoom et bandeau quand l'écran change de
    // page (animations en transformations seules : le contenu reste visible).
    const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function draw(fx = false, dir = 0) {
        body.replaceChildren();
        body.className = 'ss-body ss-body--' + screen.key + ' ss-layout--' + screen.layout;
        root.dataset.layout = screen.layout;
        screen.render(step, body, (s) => { if (s !== step) { const d = s > step ? 1 : -1; step = s; sound.select(); draw(false, d); } });
        if (!fx && dir && !calm()) {
            const x = (dir || 1) * 5;
            body.animate([{ transform: `translateX(${x}vw) scale(.97)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2, .8, .2, 1)' });
            wipe();
        }
        title.textContent = screen.titles ? screen.titles[step] : screen.title;
        count.textContent = screen.steps > 1 ? `○ ${step + 1} / ${screen.steps}` : '';
        const last = step >= screen.steps - 1;
        nextBtn.querySelector('span:not(.pad)').textContent = last ? 'Terminer' : 'Suivant';
        if (fx) root.classList.add('is-entering');
    }

    function open(key, page) {
        screen = BUILDERS[key]();
        onSide(screen.side || 1);
        step = 0;
        bookPage = page;
        root.setAttribute('aria-label', screen.title);
        root.classList.remove('is-entering');
        void root.offsetWidth;
        dialog.hidden = true;
        root.hidden = false;
        draw(true);
        wipe();
        nextBtn.focus();
    }

    function close() {
        root.hidden = true;
        dialog.hidden = true;
        screen = null;
    }

    function next() {
        if (step < screen.steps - 1) {
            step++;
            sound.select();
            draw(false, 1);
            return;
        }
        exit();
    }

    function prev() {
        if (step > 0) {
            step--;
            sound.select();
            draw(false, -1);
        }
    }

    function pause(on) {
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
            next();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            prev();
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
