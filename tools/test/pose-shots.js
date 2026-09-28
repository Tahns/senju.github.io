// Captures d'une pose d'Akira adulte sous plusieurs angles (vérifier les
// vêtements, les mains, les nouvelles poses) sans jouer le rêve.
// Usage : node tools/test/pose-shots.js <pose> <prefixe> ['[[cam],[cible]],…'] [JSON rotations des mains]
// ex. : node tools/test/pose-shots.js palmR shot '' '{"handR":[-1.2,0,0]}'
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const fs = require('fs');
const [pose = 'stand', tag = 'pose', shotsArg, handsArg] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const [vw, vh] = (process.env.VIEWPORT || '800x600').split('x').map(Number);
  const p = await b.newPage({ viewport: { width: vw, height: vh } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route('**/*', (r) => (r.request().url().startsWith('http://localhost') ? r.continue() : r.abort()));
  await p.goto('http://localhost:8765/?at=dream&quality=high', { waitUntil: 'commit' });
  await p.waitForFunction(() => document.getElementById('scene-start').textContent === 'Entrer', null, { timeout: 90000 });
  await p.click('#scene-start');
  await p.waitForFunction(() => window.__scene.dream && document.documentElement.classList.contains('dreaming'), null, { timeout: 120000 });
  await p.evaluate(() => { window.__scene.timeline.update = () => {}; window.requestAnimationFrame = () => 0; });
  await p.waitForTimeout(3000);
  if (process.env.GRIP) await p.evaluate((g) => { window.__GRIP = g; }, process.env.GRIP); // GRIP=0.95 : poings fermés
  const shots = shotsArg ? JSON.parse(shotsArg) : [
    [[0, 1.3, 2.2], [0, 1.1, 0]], [[1.9, 1.3, 1.1], [0, 1.1, 0]], [[-1.9, 1.3, 1.1], [0, 1.1, 0]], [[0, 1.4, -2.2], [0, 1.1, 0]],
    [[0.4, 1.55, 1.0], [0, 1.35, 0]], [[-0.7, 1.2, 0.9], [0, 1.0, 0]]
  ];
  for (let i = 0; i < shots.length; i++) {
    const url = await p.evaluate(([pose, hands, pos, look]) => {
      const d = window.__scene.dream; const n = d.ninja;
      n.root.position.set(0, 0, 0); n.root.rotation.y = 0;
      n.setValues(n.poseValues(pose));
      const g = +(window.__GRIP || 0);
      if (n.avatar) { n.avatar.grip('right', g); n.avatar.grip('left', g); }
      Object.entries(hands || {}).forEach(([j, r]) => n.J[j].rotation.set(...r));
      d.setCamera(pos, look);
      d.update(0.016, 10);
      n.setValues(n.poseValues(pose));
      Object.entries(hands || {}).forEach(([j, r]) => n.J[j].rotation.set(...r));
      d.update(0.001, 10);
      d.setCamera(pos, look);
      d.render();
      return document.getElementById('scene').toDataURL('image/jpeg', 0.85);
    }, [pose, handsArg ? JSON.parse(handsArg) : null, ...shots[i]]);
    fs.writeFileSync(`${tag}-${i}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log('errors', errs.slice(0, 8));
  await b.close();
})().catch((e) => console.log('ERR', e.message.slice(0, 300)));
