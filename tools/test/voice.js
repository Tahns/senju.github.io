// Voix off de l'écran Histoire : ouvre le chapitre 1, lance « Écouter », saute
// dans la narration et vérifie que le paragraphe affiché suit la voix.
// Usage : node tools/test/voice.js
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await p.route('**/*', (r) => (r.request().url().startsWith('http://localhost') ? r.continue() : r.abort()));
  let fails = 0;
  try {
    await p.goto('http://localhost:8765/?quality=low');
    await p.waitForFunction(() => document.getElementById('scene-start').textContent === 'Entrer', null, { timeout: 120000 });
    await p.click('#scene-intro .scene-card__link--menu');
    await p.waitForFunction(() => !document.getElementById('storm-menu').hidden, null, { timeout: 180000 });
    await p.click('#storm-confirm');
    await p.waitForFunction(() => { const s = document.getElementById('storm-screen'); return s && !s.hidden; }, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await p.click('#ss-next');
    await p.waitForFunction(() => { const v = document.querySelector('.ss-reader__voice'); return v && !v.hidden; }, null, { timeout: 30000 });
    console.log('format', await p.evaluate(() => window.__voice.currentSrc.split('/').pop()));
    await p.click('.ss-reader__listen');
    await p.waitForFunction(() => !window.__voice.paused, null, { timeout: 10000 });
    for (const [t, want] of [[100, 5], [218, 10], [20, 2]]) {
      await p.evaluate((x) => { window.__voice.currentTime = x; }, t);
      await p.waitForTimeout(1500);
      const got = await p.textContent('.ss-reader__count');
      const ok = got.startsWith(want + ' /');
      if (!ok) fails++;
      console.log(ok ? 'ok  ' : 'FAIL', `${t} s → paragraphe ${got}`, '|', (await p.textContent('.ss-reader__text p')).slice(0, 50));
    }
    console.log('bouton', await p.textContent('.ss-reader__listen'), '|', await p.textContent('.ss-reader__time'));
  } catch (e) {
    fails++;
    console.log('ERR', e.message.split('\n')[0]);
  }
  console.log(fails ? 'ÉCHEC' : 'voix ok');
  await b.close();
})();
