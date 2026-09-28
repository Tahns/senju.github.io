// Carnet de l'histoire lu à voix haute : Akira prend le carnet, « Écouter »,
// saut dans la voix off ; vérifie le paragraphe en cours, la page ouverte et
// les mots déjà lus. Usage : node tools/test/voice-book.js [prefixe_captures]
// (serveur avec requêtes partielles : python3 -m RangeHTTPServer 8765 ; autre port : PORT=8768)
// (Sélecteurs limités à .leaf : pendant qu'une page tourne, le « fantôme » en
// contient des copies, paragraphes compris.)
// Termine par ~40 s de lecture continue en vitesse réelle : le mot surligné
// doit suivre l'instant de la voix sur plusieurs paragraphes et pages.
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await p.route('**/*', (r) => (r.request().url().startsWith('http://localhost') ? r.continue() : r.abort()));
  let fails = 0;
  try {
    await p.goto(`http://localhost:${process.env.PORT || 8765}/?quality=low&speed=3&at=shelf`, { waitUntil: 'commit' });
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
        const cur = document.querySelector('#book .leaf p.is-reading');
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
    // Précision au mot : chaque paragraphe a un instant par mot, et à l'instant
    // d'un mot donné, exactement les mots jusqu'à lui sont colorés.
    const check = await p.evaluate(async () => {
      const a = window.__bookVoice;
      a.pause();
      const res = [];
      const ps = [...document.querySelectorAll('#book .leaf p[data-w]')];
      for (const [pi, wi] of [[1, 10], [4, 20], [9, 30]]) {
        const pp = ps[pi];
        const times = pp.dataset.w.split(',').map(Number);
        const words = pp.querySelectorAll('.w').length;
        a.currentTime = times[wi] + 0.02;
        await new Promise((r) => a.addEventListener('seeked', r, { once: true }));
        await new Promise((r) => setTimeout(r, 100));
        res.push({ pi, wi, same: times.length === words, read: pp.querySelectorAll('.w.is-read').length, now: pp.querySelector('.w.is-now')?.textContent });
      }
      return res;
    });
    check.forEach((c) => {
      const ok = c.same && c.read === c.wi + 1;
      if (!ok) fails++;
      console.log(ok ? 'ok  ' : 'FAIL', `paragraphe ${c.pi + 1}, mot ${c.wi + 1} « ${c.now} » : ${c.read} mots colorés${c.same ? '' : ' (nombre de mots différent !)'}`);
    });
    // Lecture continue : de 60 s à 102 s (paragraphes 3 à 5, une page tournée), un
    // relevé par seconde ; le mot surligné doit être celui de l'instant lu
    // (à un mot près : le relevé et l'image ne tombent pas au même instant).
    const run = await p.evaluate(async () => {
      const a = window.__bookVoice;
      a.currentTime = 60;
      await new Promise((r) => a.addEventListener('seeked', r, { once: true }));
      await a.play();
      const ps = [...document.querySelectorAll('#book .leaf p[data-w]')];
      const out = [];
      while (a.currentTime < 102 && !a.paused) {
        await new Promise((r) => setTimeout(r, 1000));
        const t = a.currentTime;
        let pi = -1;
        ps.forEach((pp, k) => { if (t >= Number(pp.dataset.t)) pi = k; });
        const times = ps[pi].dataset.w.split(',').map(Number);
        let want = 0;
        while (want < times.length && times[want] <= t + 0.06) want++;
        const cur = document.querySelector('#book .leaf p.is-reading');
        const words = cur ? [...cur.querySelectorAll('.w')] : [];
        const now = cur ? words.findIndex((w) => w.classList.contains('is-now')) + 1 : 0;
        const face = cur && cur.closest('.face');
        out.push({ t, pi, same: cur === ps[pi], want, now, shown: Boolean(face && face.classList.contains('is-visible')), word: words[now - 1]?.textContent });
      }
      a.pause();
      return out;
    });
    let bad = 0;
    run.forEach((r) => {
      const ok = r.same && r.shown && Math.abs(r.now - r.want) <= 1;
      if (!ok) { bad++; console.log('FAIL', `${r.t.toFixed(2)} s : paragraphe ${r.pi + 1}, mot ${r.now} « ${r.word} » au lieu du mot ${r.want}${r.shown ? '' : ' (page non visible)'}`); }
    });
    const paras = new Set(run.map((r) => r.pi)).size;
    const ok = run.length >= 35 && paras >= 3 && !bad;
    if (!ok) fails++;
    console.log(ok ? 'ok  ' : 'FAIL', `lecture continue : ${run.length} relevés sur ${paras} paragraphes, ${bad} décalé(s)`);
  } catch (e) {
    fails++;
    console.log('ERR', e.message.split('\n')[0]);
  }
  console.log(fails ? 'ÉCHEC' : 'carnet lu ok');
  await b.close();
})();
