// Parcours complet : ne prend des captures qu'aux moments clés (moins de charge).
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
(async () => {
  const [query, prefix] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 960, height: 600 }, ignoreHTTPSErrors: true });
  const t0 = Date.now(); const T = () => ((Date.now() - t0) / 1000).toFixed(0);
  p.on('pageerror', e => console.log(T(), 'PAGEERROR', e.stack));
  p.on('crash', () => console.log(T(), 'CRASH')); p.on('console', m => { if (m.type() === 'error' && !/404|RETRIES/.test(m.text())) console.log(T(), 'console', m.text().slice(0, 200)); });
  await p.goto('http://localhost:8765/?' + query, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__scene && document.getElementById('scene-start').textContent === 'Entrer', null, { timeout: 90000 });
  await p.click('#scene-start');
  const stamps = (process.argv[4] || '').split(',').filter(Boolean).map(Number);
  await p.evaluate(() => { window.__t = 0; const tl = window.__scene.timeline; const u = tl.update.bind(tl); tl.update = (dt) => { window.__t += dt * tl.scale; u(dt); }; });
  for (let round = 0; round < 3; round++) {
    const r = await p.waitForFunction((st) => {
      if (!document.getElementById('scene-end').hidden) return 'end';
      if (document.documentElement.classList.contains('scene-frozen')) return 'read';
      const next = st.find(s => !window.__shot || s > window.__shot);
      if (next !== undefined && window.__t >= next) { window.__shot = next; return 'shot:' + next; }
      return false;
    }, stamps, { timeout: 250000, polling: 300 }).then(h => h.jsonValue());
    console.log(T(), r, await p.evaluate(() => window.__t.toFixed(1)));
    if (r === 'end') { await p.waitForTimeout(1200); await p.screenshot({ path: `${prefix}-end.png` }); break; }
    if (r.startsWith('shot')) { await p.screenshot({ path: `${prefix}-${r.slice(5)}.png` }); round--; continue; }
    const book = await p.evaluate(() => document.getElementById('stage').dataset.book);
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${prefix}-read-${book}.png` });
    await p.evaluate(() => window.Carnet.shelve());
    await p.waitForFunction(() => !document.documentElement.classList.contains('scene-thawing') && !document.documentElement.classList.contains('scene-frozen'), null, { timeout: 30000 });
  }
  await b.close();
})().catch(e => console.log('ERR', e.message.slice(0, 200)));
