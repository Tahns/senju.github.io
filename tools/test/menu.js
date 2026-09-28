// Menu « Sélection de la catégorie » : ouvre le menu depuis l'accueil, fait le
// tour des 2 catégories (mot, kanji, voisines), puis confirme la dernière
// demandée : vérifie l'écran de la catégorie (façon Storm), le parcourt avec
// « Suivant », puis passe par la pause (« Lire cette page dans le carnet »)
// et vérifie que le carnet s'ouvre à la bonne page.
// SHOTS=prefixe : capture de chaque étape de l'écran (prefixe-0.png, …).
// Usage : node tools/test/menu.js [touches avant Confirmer, ex. "ArrowUp,ArrowUp"]
// BASE=https://tahns.github.io/senju.github.io/ : teste le site en ligne.
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const EXPECT = [['Histoire', '史', 3], ['HRP', '己', 9]];
const BASE = process.env.BASE || 'http://localhost:8765/';
(async () => {
  const keys = (process.argv[2] || 'ArrowDown').split(',').filter(Boolean);
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const [w, h] = (process.env.VIEWPORT || '960x600').split('x').map(Number);
  const touch = w < h;
  const p = await b.newPage({ viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch, ignoreHTTPSErrors: true });
  let errors = 0;
  p.on('pageerror', (e) => { errors++; console.log('PAGEERROR', e.message); });
  await p.route('**/*', (r) => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()));
  try {
    await p.goto(BASE + '?quality=low&t=' + Date.now(), { waitUntil: 'commit' });
    await p.waitForFunction(() => document.getElementById('scene-start').textContent === 'Commencer', null, { timeout: 120000 });
    await p.click('#scene-start');
    await p.waitForFunction(() => !document.getElementById('storm-menu').hidden, null, { timeout: 180000 });
    const read = () => p.evaluate(() => ['storm-word', 'storm-kanji', 'storm-near-prev', 'storm-near-next'].map((id) => document.getElementById(id).textContent));
    let fails = 0;
    for (let i = 0; i < EXPECT.length; i++) {
      const [word, kanji] = EXPECT[i];
      const got = await read();
      const want = [word, kanji, EXPECT[(i + EXPECT.length - 1) % EXPECT.length][0], EXPECT[(i + 1) % EXPECT.length][0]];
      const ok = got.every((v, k) => v === want[k]);
      if (!ok) fails++;
      console.log(ok ? 'ok  ' : 'FAIL', got.join(' | '));
      await p.keyboard.press('ArrowDown');
    }
    // Retour au début (tour complet), puis les touches demandées.
    for (const k of keys) await p.keyboard.press(k);
    const word = await p.textContent('#storm-word');
    const page = EXPECT.find(([wd]) => wd === word)[2];
    await p.click('#storm-confirm');
    await p.waitForFunction(() => { const s = document.getElementById('storm-screen'); return s && !s.hidden; }, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    const screenTitle = await p.textContent('#ss-title');
    console.log('écran', screenTitle, '|', (await p.textContent('#ss-body')).replace(/\s+/g, ' ').trim().slice(0, 90));
    if (!(await p.textContent('#ss-body')).trim()) { fails++; console.log('FAIL écran vide'); }
    // Quelques « Suivant » (sans quitter l'écran), avec captures si demandé.
    for (let s = 0; s < +(process.env.STEPS || 3); s++) {
      if (process.env.SHOTS) await p.screenshot({ path: `${process.env.SHOTS}-${s}.png` });
      const label = await p.textContent('#ss-next span:not(.pad)');
      if (label === 'Terminer') break;
      await p.click('#ss-next');
      await p.waitForTimeout(700);
    }
    await p.keyboard.press('Escape');
    await p.waitForFunction(() => !document.getElementById('ss-dialog').hidden);
    await p.waitForTimeout(500);
    if (process.env.SHOTS) await p.screenshot({ path: `${process.env.SHOTS}-pause.png` });
    await p.click('#ss-book');
    await p.waitForFunction((n) => location.hash === '#page-' + n, page, { timeout: 120000 });
    console.log('confirmé', word, '→ #page-' + page);
    console.log(fails || errors ? 'ÉCHEC' : 'menu ok');
  } catch (e) {
    console.log('ERR', e.message.split('\n')[0]);
  }
  await b.close();
})();
