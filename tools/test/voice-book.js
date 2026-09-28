// Carnet de l'histoire lu à voix haute : Akira prend le carnet, « Écouter »,
// saut dans la voix off ; vérifie le paragraphe en cours, la page ouverte et
// les mots déjà lus. Usage : node tools/test/voice-book.js [prefixe_captures]
// (serveur avec requêtes partielles : python3 -m RangeHTTPServer 8765)
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await p.route('**/*', (r) => (r.request().url().startsWith('http://localhost') ? r.continue() : r.abort()));
  let fails = 0;
  try {
    await p.goto('http://localhost:8765/?quality=low&speed=3&at=shelf');
    await p.waitForFunction(() => document.getElementById('scene-start').textContent === 'Entrer', null, { timeout: 120000 });
    await p.click('#scene-start');
    await p.waitForFunction(() => document.documentElement.classList.contains('scene-frozen'), null, { timeout: 200000 });
    const book = await p.evaluate(() => document.getElementById('stage').dataset.book);
    const btn = await p.evaluate(() => !document.getElementById('voice').hidden);
    console.log(book === 'histoire' && btn ? 'ok  ' : 'FAIL', 'carnet', book, 'bouton Écouter', btn);
    if (!(book === 'histoire' && btn)) fails++;
    await p.click('#voice');
    await p.waitForFunction(() => window.__bookVoice && !window.__bookVoice.paused, null, { timeout: 15000 });
    for (const [t, want] of [[100, 'Le clan'], [226, 'Il se mit'], [30, 'Sa mère']]) {
      await p.evaluate((x) => { window.__bookVoice.currentTime = x; }, t);
      await p.waitForTimeout(3500);
      const r = await p.evaluate(() => {
        const cur = document.querySelector('#book p.is-reading');
        const face = cur && cur.closest('.face');
        const read = cur ? cur.querySelectorAll('.w.is-read').length : 0;
        const all = cur ? cur.querySelectorAll('.w').length : 0;
        return { text: cur ? cur.textContent.slice(0, 40) : '', read, all, folio: document.getElementById('folio').textContent };
      });
      const ok = r.text.startsWith(want) && r.read > 0 && r.read <= r.all;
      if (!ok) fails++;
      console.log(ok ? 'ok  ' : 'FAIL', `${t} s → « ${r.text}… » ${r.read}/${r.all} mots lus | ${r.folio}`);
      if (process.argv[2]) await p.screenshot({ path: `${process.argv[2]}-${t}.png` });
    }
  } catch (e) {
    fails++;
    console.log('ERR', e.message.split('\n')[0]);
  }
  console.log(fails ? 'ÉCHEC' : 'carnet lu ok');
  await b.close();
})();
