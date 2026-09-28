// Carnet seul (sans la scène 3D, lien #page-N) : la fiche s'ouvre, le bouton
// « Histoire » passe au carnet de l'histoire, « Écouter » lance la voix off et
// colore les mots ; « Fiche » y revient. Usage : node tools/test/standalone.js [capture.png]
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await p.route('**/*', (r) => (r.request().url().startsWith('http://localhost') ? r.continue() : r.abort()));
  let fails = 0;
  const check = (ok, msg) => { if (!ok) fails++; console.log(ok ? 'ok  ' : 'FAIL', msg); };
  try {
    await p.goto('http://localhost:8765/#page-1');
    await p.waitForTimeout(2500);
    check(await p.evaluate(() => document.getElementById('stage').dataset.book) === 'fiche', 'la fiche s\'ouvre');
    check(await p.isVisible('#switch-book'), 'bouton « ' + (await p.textContent('#switch-book')).trim() + ' » visible');
    await p.click('#switch-book');
    await p.waitForTimeout(1200);
    check(await p.evaluate(() => document.getElementById('stage').dataset.book) === 'histoire', 'carnet de l\'histoire ouvert');
    check(await p.isVisible('#voice'), 'bouton Écouter visible');
    await p.click('#voice');
    await p.waitForFunction(() => window.__bookVoice && !window.__bookVoice.paused, null, { timeout: 15000 });
    await p.evaluate(() => { window.__bookVoice.currentTime = 60; });
    await p.waitForTimeout(3000);
    const r = await p.evaluate(() => ({ read: document.querySelectorAll('#book .w.is-read').length, cur: document.querySelector('#book p.is-reading')?.textContent.slice(0, 30) }));
    check(r.read > 50 && r.cur && r.cur.startsWith('La branche'), `voix à 60 s : « ${r.cur}… », ${r.read} mots lus`);
    if (process.argv[2]) await p.screenshot({ path: process.argv[2] });
    await p.click('#switch-book');
    await p.waitForTimeout(1200);
    check(await p.evaluate(() => document.getElementById('stage').dataset.book) === 'fiche' && await p.evaluate(() => window.__bookVoice.paused), 'retour à la fiche, voix arrêtée');
  } catch (e) {
    fails++;
    console.log('ERR', e.message.split('\n')[0]);
  }
  console.log(fails ? 'ÉCHEC' : 'carnet seul ok');
  await b.close();
})();
