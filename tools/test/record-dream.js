// Enregistre le rêve image par image (temps fixe, sous-titres incrustés, fondus entre
// les passages) : node record-dream.js dossier 960 540 24 "0.3-4.6,7.8-14.2" "&quality=mobile"
// puis on assemble les JPEG en vidéo (voir README).
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const fs = require('fs');
const [dir, W, H, FPS, WIN, Q] = process.argv.slice(2);
const wins = WIN.split(',').map(s => s.split('-').map(Number));
(async () => {
  fs.mkdirSync(dir, { recursive: true });
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: +W, height: +H } });
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.route('**/*', (r) => (r.request().url().startsWith('http://localhost') ? r.continue() : r.abort()));
  await p.goto('http://localhost:8765/?at=dream' + (Q || ''), { waitUntil: 'commit' });
  await p.waitForFunction(() => document.getElementById('scene-start').textContent === 'Entrer', null, { timeout: 90000 });
  await p.click('#scene-start');
  await p.waitForFunction(() => document.documentElement.classList.contains('dreaming'), null, { timeout: 120000, polling: 50 });
  await p.evaluate(() => { window.requestAnimationFrame = () => 0; const f = document.getElementById('scene-fade'); f.classList.remove('is-iris'); f.style.opacity = 0; });
  await p.waitForTimeout(300);
  await p.evaluate(() => {
    const gl = document.getElementById('scene');
    const c = document.createElement('canvas'); c.width = gl.width; c.height = gl.height;
    const x = c.getContext('2d');
    const cap = document.getElementById('scene-caption');
    window.__grab = (alpha) => {
      x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
      x.globalAlpha = alpha; x.drawImage(gl, 0, 0, c.width, c.height);
      if (cap.classList.contains('is-visible') && cap.textContent) {
        const s = c.height / 540;
        x.font = `italic ${Math.round(30 * s)}px Georgia, serif`; x.textAlign = 'center';
        x.lineJoin = 'round'; x.lineWidth = 6 * s; x.strokeStyle = 'rgba(40, 16, 90, .9)';
        x.strokeText(cap.textContent, c.width / 2, c.height - 48 * s);
        x.fillStyle = '#fff'; x.fillText(cap.textContent, c.width / 2, c.height - 48 * s);
      }
      x.globalAlpha = 1;
      return c.toDataURL('image/jpeg', 0.92);
    };
  });
  const dt = 1 / +FPS; let lastCap = ''; let t = 0; let n = 0; const t0 = Date.now();
  const end = wins[wins.length - 1][1];
  while (t < end) {
    const w = wins.find(([a, z]) => t >= a && t < z);
    const step = dt; // même pas partout : le scénario ne prend pas de retard
    let alpha = 1;
    // FADE=0.001 : pas de fondu entre les passages (captures isolées).
    if (w) { const fade = +(process.env.FADE || 0.35); alpha = Math.min(1, (t - w[0]) / fade, (w[1] - t) / fade); }
    const url = await p.evaluate(async ([step, alpha, rec]) => {
      window.__scene.step(step, rec); const u = rec ? window.__grab(alpha) : null; await new Promise(r => setTimeout(r, 0));
      const cap = document.getElementById('scene-caption');
      return [u, cap.classList.contains('is-visible') ? cap.textContent : '']; }, [step, alpha, !!w]).then(([u, cap]) => { if (cap !== lastCap) { lastCap = cap; if (cap) console.log('sous-titre', t.toFixed(1), cap); } return u; });
    t += step;
    if (url) { fs.writeFileSync(`${dir}/f${String(n).padStart(4, '0')}.jpg`, Buffer.from(url.split(',')[1], 'base64')); n++; if (n % 48 === 0) console.log('frames', n, 't', t.toFixed(1), ((Date.now() - t0) / n / 1000).toFixed(2) + 's/f'); }
  }
  console.log('done', n);
  await b.close();
})().catch(e => console.log('ERR', e.message));
