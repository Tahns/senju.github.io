const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const fs = require('fs');
const q = process.argv[2] || '';
const tag = process.argv[3] || 'v';
const W = +(process.argv[4] || 900), H = +(process.argv[5] || 560);
const port = process.argv[6] || '8765';
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: W, height: H } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text().slice(0, 200)); });
  await p.goto(`http://localhost:${port}/?at=dream&speed=0.8` + q, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.getElementById('scene-start').textContent === 'Entrer', null, { timeout: 90000 });
  await p.click('#scene-start');
  await p.waitForFunction(() => window.__scene.dream && document.documentElement.classList.contains('dreaming'), null, { timeout: 120000 });
  await p.evaluate(() => { window.__scene.timeline.update = () => {}; window.requestAnimationFrame = () => 0; });
  await p.waitForTimeout(6000);
  if (process.env.T) await p.evaluate((t) => { window.__T = t; }, process.env.T);
  const shots = JSON.parse(process.argv[7] || 'null') || [
    [[0.12, 1.92, 0.62], [0, 1.9, 0]],
    [[0.5, 1.9, 7.5], [0, 1.5, 0]],
    [[3.6, 1.7, 3.6], [0, 1.55, 0]],
    [[-2.5, 4.8, 9.5], [0, 1.2, -2]],
    [[1.6, 1.4, 3.4], [0, 1.05, 0]],
    [[-0.55, 1.95, -0.75], [0, 1.75, 0]],
  ];
  for (let i = 0; i < shots.length; i++) {
    const url = await p.evaluate(([pos, look]) => {
      const d = window.__scene.dream; const c = d.camera; c.position.set(...pos); c.lookAt(...look);
      d.update(0.016, +(window.__T || 10));
      const t = performance.now();
      if (d.render) d.render(); else window.__scene.renderer.render(d.scene, d.camera);
      const url = document.getElementById('scene').toDataURL('image/jpeg', 0.9);
      console.warn('render ms', Math.round(performance.now() - t));
      return url;
    }, shots[i]);
    fs.writeFileSync(`${tag}-${i}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log('errors', errs.slice(0, 12));
  await b.close();
})().catch(e => console.log('ERR', e.message.slice(0, 300)));
