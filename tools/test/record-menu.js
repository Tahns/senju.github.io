// Enregistre l'écran titre (1,5 s), puis le menu : les 3 catégories, 2 s
// chacune, en pas fixes (un éclair pendant la 2e), puis « Confirmer » (clin
// d'œil et shunshin).
// node tools/test/record-menu.js dossier 960 540
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const fs = require('fs');
const [dir, W, H] = process.argv.slice(2);
(async () => {
  fs.mkdirSync(dir, { recursive: true });
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: +W, height: +H } });
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.route('**/*', (r) => (r.request().url().startsWith('http://localhost') ? r.continue() : r.abort()));
  await p.goto('http://localhost:8765/?at=menu&quality=mobile', { waitUntil: 'commit' });
  await p.waitForFunction(() => document.getElementById('scene-start').textContent === 'Commencer', null, { timeout: 90000 });
  let n = 0;
  // Écran titre (image fixe).
  await p.waitForTimeout(1500);
  const title = await p.screenshot({ type: 'jpeg', quality: 88 });
  for (let f = 0; f < 36; f++) fs.writeFileSync(`${dir}/f${String(n++).padStart(4, '0')}.jpg`, title);
  await p.click('#scene-start');
  await p.waitForFunction(() => !document.getElementById('storm-menu').hidden, null, { timeout: 120000 });
  await p.evaluate(() => { window.requestAnimationFrame = () => 0; document.querySelectorAll('.scene-sound').forEach(e => e.style.display = 'none'); });
  for (let c = 0; c < 3; c++) {
    if (c) await p.evaluate(() => document.getElementById('storm-next').click());
    // Un éclair pendant la 2e catégorie.
    if (c === 1) await p.evaluate(() => window.__scene.dream.strikeNow());
    for (let f = 0; f < 48; f++) {
      await p.evaluate(async () => { window.__scene.step(1 / 24, true); await new Promise(r => setTimeout(r, 0)); });
      const buf = await p.screenshot({ type: 'jpeg', quality: 88, timeout: 60000 });
      fs.writeFileSync(`${dir}/f${String(n++).padStart(4, '0')}.jpg`, buf);
    }
    console.log('categorie', c, n);
  }
  // Confirmer : clin d'œil et shunshin (sans la bascule vers le carnet).
  await p.evaluate(() => { window.__scene.dream.menuConfirm(); document.getElementById('storm-menu').classList.add('is-confirming'); });
  for (let f = 0; f < 22; f++) {
    await p.evaluate(async () => { window.__scene.step(1 / 24, true); await new Promise(r => setTimeout(r, 0)); });
    const buf = await p.screenshot({ type: 'jpeg', quality: 88, timeout: 60000 });
    fs.writeFileSync(`${dir}/f${String(n++).padStart(4, '0')}.jpg`, buf);
  }
  console.log('confirm', n);
  await b.close();
})().catch(e => console.log('ERR', e.message));
