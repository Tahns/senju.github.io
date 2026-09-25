/*
 * Sons de la scène, tous générés (aucun fichier audio) :
 * pas, porte coulissante, livres, tissu, boîte à musique et grillons.
 *
 * La boîte à musique joue « Sakura Sakura », mélodie traditionnelle
 * japonaise (domaine public), avec un timbre de lames métalliques.
 */

// Notes (en demi-tons depuis La 4 = 440 Hz) et durées (en temps).
const A = 0, B = 2, C = 3, E = -5, F = -4, B3 = -10, C4 = -9, E4 = -5;
const SAKURA = [
    [A, 1], [A, 1], [B, 2],
    [A, 1], [A, 1], [B, 2],
    [A, 1], [B, 1], [C, 1], [B, 1],
    [A, 1], [B, 0.5], [A, 0.5], [F, 2],
    [E, 1], [C4, 1], [E, 1], [F, 1],
    [E, 1], [E4, 0.5], [C4, 0.5], [B3, 2],
    [A, 1], [B, 1], [C, 1], [B, 1],
    [A, 1], [B, 0.5], [A, 0.5], [F, 2],
    [E, 1], [C4, 1], [E, 1], [F, 1],
    [E, 1], [E4, 0.5], [C4, 0.5], [B3, 2],
    [A, 1], [A, 1], [B, 2],
    [A, 1], [A, 1], [B, 2],
    [E, 1], [F, 1], [B, 0.5], [A, 0.5], [F, 1],
    [E, 4]
];
// Basses discrètes, une par mesure de 4 temps.
const BASS = [A - 24, E - 12, A - 24, E - 12, A - 24, E - 12, A - 24, E - 12, A - 24, E - 12, A - 24, E - 12, A - 24, E - 12];

export class SceneAudio {
    constructor() {
        this.ctx = null;
        this.on = true;
        this.music = null;
        // Volumes réglables par le visiteur (0 à 1).
        this.volumes = { music: 0.8, ambience: 0.7, sfx: 0.9 };
    }

    setVolumes(volumes) {
        this.volumes = { ...this.volumes, ...volumes };
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        this.sfx.gain.setTargetAtTime(this.volumes.sfx, t, 0.05);
        if (this.crickets) this.ambience.gain.setTargetAtTime(1.3 * this.volumes.ambience, t, 0.05);
        if (this.music) this.musicBus.gain.setTargetAtTime(this.volumes.music, t, 0.05);
        if (this.dream) this.dreamBus.gain.setTargetAtTime(this.volumes.music, t, 0.05);
    }

    // À appeler lors d'un clic (les navigateurs l'exigent).
    unlock() {
        if (!this.ctx) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;
            const ctx = new Ctx();
            this.ctx = ctx;
            this.master = ctx.createGain();
            this.master.gain.value = this.on ? 1 : 0;
            this.master.connect(ctx.destination);
            this.sfx = ctx.createGain();
            this.sfx.gain.value = this.volumes.sfx;
            this.sfx.connect(this.master);
            this.musicBus = ctx.createGain();
            this.musicBus.gain.value = 0;
            // Réverbération douce (réponse impulsionnelle générée).
            this.reverb = ctx.createConvolver();
            this.reverb.buffer = this.impulse(2.4, 2.6);
            const wet = ctx.createGain();
            wet.gain.value = 0.35;
            this.reverb.connect(wet).connect(this.master);
            this.musicBus.connect(this.master);
            this.musicBus.connect(this.reverb);
            this.sfx.connect(this.reverb);
            this.ambience = ctx.createGain();
            this.ambience.gain.value = 0;
            this.ambience.connect(this.master);
            this.noiseBuffer = this.makeNoise(2);
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    setOn(on) {
        this.on = on;
        if (this.master) this.master.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.1);
    }

    impulse(seconds, decay) {
        const ctx = this.ctx;
        const length = Math.floor(ctx.sampleRate * seconds);
        const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
        for (let c = 0; c < 2; c++) {
            const data = buffer.getChannelData(c);
            for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
        }
        return buffer;
    }

    makeNoise(seconds) {
        const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * seconds, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        return buffer;
    }

    // Souffle de bruit filtré, avec enveloppe (base de la plupart des bruitages).
    noise({ at = 0, duration = 0.2, attack = 0.01, type = 'bandpass', freq = 800, to = null, q = 1, gain = 0.3, pan = 0 }) {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const t = ctx.currentTime + at;
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        src.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = type;
        filter.Q.value = q;
        filter.frequency.setValueAtTime(freq, t);
        if (to) filter.frequency.exponentialRampToValueAtTime(to, t + duration);
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, t);
        env.gain.exponentialRampToValueAtTime(gain, t + attack);
        env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (panner) panner.pan.value = pan;
        src.connect(filter).connect(env);
        (panner ? env.connect(panner) : env).connect(this.sfx);
        src.start(t, Math.random());
        src.stop(t + duration + 0.05);
    }

    tone({ at = 0, freq = 440, to = null, duration = 0.1, gain = 0.1, type = 'sine', dest = null }) {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const t = ctx.currentTime + at;
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        if (to) osc.frequency.exponentialRampToValueAtTime(to, t + duration);
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, t);
        env.gain.exponentialRampToValueAtTime(gain, t + 0.004);
        env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        osc.connect(env).connect(dest || this.sfx);
        osc.start(t);
        osc.stop(t + duration + 0.05);
    }

    /* ---------------- Bruitages ---------------- */

    step(surface = 'tatami') {
        const pan = (Math.random() - 0.5) * 0.3;
        if (surface === 'wood') {
            this.noise({ duration: 0.12, type: 'lowpass', freq: 520, q: 0.8, gain: 0.5, pan });
            if (Math.random() < 0.25) this.tone({ at: 0.03, freq: 180 + Math.random() * 60, to: 140, duration: 0.25, gain: 0.03, type: 'triangle' });
        } else {
            // Tatami : pas feutré, avec le froissement de la paille tressée.
            this.noise({ duration: 0.14, type: 'lowpass', freq: 260, q: 0.6, gain: 0.45, pan });
            this.noise({ at: 0.02, duration: 0.12, type: 'bandpass', freq: 2400, q: 0.7, gain: 0.05, pan });
        }
    }

    door() {
        // Le shoji glisse dans son rail en bois, puis bute.
        this.noise({ duration: 1.25, attack: 0.15, type: 'bandpass', freq: 380, to: 520, q: 2.2, gain: 0.22 });
        this.noise({ duration: 1.2, attack: 0.2, type: 'bandpass', freq: 1800, q: 1.2, gain: 0.04 });
        this.noise({ at: 1.25, duration: 0.09, type: 'lowpass', freq: 700, gain: 0.4 });
    }

    bookTilt() {
        this.noise({ duration: 0.22, type: 'bandpass', freq: 1300, to: 900, q: 1, gain: 0.12 });
    }

    bookSlide() {
        this.noise({ duration: 0.45, attack: 0.05, type: 'bandpass', freq: 2200, to: 1500, q: 0.8, gain: 0.14 });
    }

    bookTap() {
        this.noise({ duration: 0.08, type: 'lowpass', freq: 600, gain: 0.35 });
    }

    cloth() {
        this.noise({ duration: 0.9, attack: 0.2, type: 'bandpass', freq: 1400, to: 600, q: 0.6, gain: 0.13 });
    }

    lid() {
        // Petite charnière qui grince, puis le couvercle s'arrête.
        this.tone({ freq: 900, to: 1300, duration: 0.35, gain: 0.015, type: 'sawtooth' });
        this.noise({ duration: 0.3, type: 'bandpass', freq: 3000, q: 4, gain: 0.03 });
        this.noise({ at: 0.35, duration: 0.05, type: 'lowpass', freq: 900, gain: 0.2 });
    }

    // Remontoir : une série de petits clics de cliquet.
    wind(seconds) {
        const clicks = Math.round(seconds * 11);
        for (let i = 0; i < clicks; i++) {
            this.noise({ at: i / 11 + Math.random() * 0.01, duration: 0.025, type: 'highpass', freq: 3500, gain: 0.12 });
        }
    }

    /* ---------------- Ambiance : grillons dehors ---------------- */

    startCrickets() {
        if (!this.ctx || this.crickets) return;
        const ctx = this.ctx;
        this.ambience.gain.setTargetAtTime(1.3 * this.volumes.ambience, ctx.currentTime, 1.5);
        // Suzumushi : « riiin » aigu et doux, à intervalles irréguliers.
        const chirp = () => {
            const t = ctx.currentTime + 0.05;
            const osc = ctx.createOscillator();
            osc.frequency.value = 4300 + Math.random() * 500;
            const trem = ctx.createOscillator();
            trem.frequency.value = 38 + Math.random() * 10;
            const tremGain = ctx.createGain();
            tremGain.gain.value = 0.5;
            const env = ctx.createGain();
            env.gain.value = 0;
            trem.connect(tremGain).connect(env.gain);
            const level = ctx.createGain();
            const d = 0.25 + Math.random() * 0.35;
            level.gain.setValueAtTime(0.0001, t);
            level.gain.exponentialRampToValueAtTime(0.012 + Math.random() * 0.01, t + 0.03);
            level.gain.exponentialRampToValueAtTime(0.0001, t + d);
            const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
            if (pan) pan.pan.value = (Math.random() - 0.5) * 1.4;
            osc.connect(env).connect(level);
            (pan ? level.connect(pan) : level).connect(this.ambience);
            osc.start(t);
            trem.start(t);
            osc.stop(t + d + 0.05);
            trem.stop(t + d + 0.05);
            this.crickets = setTimeout(chirp, 350 + Math.random() * 1400);
        };
        chirp();
    }

    /* ---------------- Boîte à musique ---------------- */

    // Une lame de peigne : fondamentale et harmoniques qui s'éteignent vite.
    pluck(semitones, time, velocity = 1) {
        const ctx = this.ctx;
        const freq = 440 * Math.pow(2, semitones / 12) * 2; // une octave au-dessus : timbre de boîte à musique
        [[1, 1], [2, 0.32], [3.02, 0.1], [4.16, 0.08], [5.4, 0.04]].forEach(([ratio, amp]) => {
            const osc = ctx.createOscillator();
            osc.frequency.value = freq * ratio;
            const env = ctx.createGain();
            const decay = 1.6 / Math.sqrt(ratio);
            env.gain.setValueAtTime(0.0001, time);
            env.gain.exponentialRampToValueAtTime(0.09 * amp * velocity, time + 0.004);
            env.gain.exponentialRampToValueAtTime(0.0001, time + decay);
            osc.connect(env).connect(this.musicBus);
            osc.start(time);
            osc.stop(time + decay + 0.05);
        });
    }

    startMusic() {
        if (!this.ctx || this.music) return;
        const ctx = this.ctx;
        this.musicBus.gain.cancelScheduledValues(ctx.currentTime);
        this.musicBus.gain.setTargetAtTime(this.volumes.music, ctx.currentTime, 0.4);
        const state = { beat: 60 / 66, index: 0, bar: 0, next: ctx.currentTime + 0.2, beatInBar: 0, slow: 1 };
        this.music = state;
        // Programmation en avance (plus régulier que des minuteurs seuls).
        const schedule = () => {
            while (state.next < ctx.currentTime + 0.4) {
                const [note, beats] = SAKURA[state.index];
                const beat = state.beat * state.slow;
                if (state.beatInBar === 0) {
                    this.pluck(BASS[state.bar % BASS.length], state.next, 0.5);
                    state.bar++;
                }
                this.pluck(note, state.next, 0.9 + Math.random() * 0.15);
                state.next += beats * beat;
                state.beatInBar = (state.beatInBar + beats) % 4;
                state.index++;
                if (state.index >= SAKURA.length) {
                    state.index = 0;
                    state.bar = 0;
                    state.beatInBar = 0;
                    state.next += 2 * beat; // petit silence avant de recommencer
                }
            }
            state.timer = setTimeout(schedule, 100);
        };
        schedule();
    }

    // Le ressort se détend : la mélodie ralentit et s'éteint.
    windDown(seconds) {
        if (!this.music) return;
        const state = this.music;
        const start = performance.now();
        const slowDown = setInterval(() => {
            const k = Math.min(1, (performance.now() - start) / (seconds * 1000));
            state.slow = 1 + k * 1.8;
            if (k >= 1) clearInterval(slowDown);
        }, 100);
        this.musicBus.gain.setTargetAtTime(0.0001, this.ctx.currentTime + seconds * 0.4, seconds * 0.25);
        setTimeout(() => {
            clearTimeout(state.timer);
            this.music = null;
        }, seconds * 1000 + 500);
    }

    /* ---------------- Le rêve ---------------- */

    // Tambour taiko : coup grave dont la hauteur retombe, plus la peau frappée.
    taiko(time, strength = 1, pitch = 58) {
        const ctx = this.ctx;
        const osc = ctx.createOscillator();
        osc.frequency.setValueAtTime(pitch * 1.6, time);
        osc.frequency.exponentialRampToValueAtTime(pitch, time + 0.12);
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, time);
        env.gain.exponentialRampToValueAtTime(0.55 * strength, time + 0.005);
        env.gain.exponentialRampToValueAtTime(0.0001, time + 0.9);
        osc.connect(env).connect(this.dreamBus);
        osc.start(time);
        osc.stop(time + 1);
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 900;
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.25 * strength, time);
        ng.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
        src.connect(f).connect(ng).connect(this.dreamBus);
        src.start(time, Math.random());
        src.stop(time + 0.15);
    }

    // Flûte de bambou (shakuhachi) : son doux, vibrato, souffle.
    flute(semitones, time, duration) {
        const ctx = this.ctx;
        const freq = 440 * Math.pow(2, semitones / 12);
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const osc2 = ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.value = freq * 2;
        const vib = ctx.createOscillator();
        vib.frequency.value = 5.2;
        const vibGain = ctx.createGain();
        vibGain.gain.setValueAtTime(0, time);
        vibGain.gain.linearRampToValueAtTime(freq * 0.012, time + duration * 0.6);
        vib.connect(vibGain).connect(osc.frequency);
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, time);
        env.gain.exponentialRampToValueAtTime(0.13, time + 0.08);
        env.gain.setValueAtTime(0.12, time + Math.max(0.1, duration - 0.15));
        env.gain.exponentialRampToValueAtTime(0.0001, time + duration + 0.1);
        const g2 = ctx.createGain();
        g2.gain.value = 0.12;
        osc.connect(env);
        osc2.connect(g2).connect(env);
        env.connect(this.dreamBus);
        // Souffle.
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const bf = ctx.createBiquadFilter();
        bf.type = 'bandpass';
        bf.frequency.value = freq * 2;
        bf.Q.value = 3;
        const bg = ctx.createGain();
        bg.gain.setValueAtTime(0.0001, time);
        bg.gain.exponentialRampToValueAtTime(0.05, time + 0.05);
        bg.gain.exponentialRampToValueAtTime(0.0001, time + duration);
        src.connect(bf).connect(bg).connect(this.dreamBus);
        [osc, osc2, vib].forEach((o) => { o.start(time); o.stop(time + duration + 0.2); });
        src.start(time, Math.random());
        src.stop(time + duration + 0.1);
    }

    // Musique du rêve : taiko et flûte, mélodie originale en gamme yo.
    startDream() {
        if (!this.ctx || this.dream) return;
        const ctx = this.ctx;
        this.dreamBus = ctx.createGain();
        this.dreamBus.gain.value = 0.0001;
        this.dreamBus.connect(this.master);
        this.dreamBus.connect(this.reverb);
        this.dreamBus.gain.setTargetAtTime(this.volumes.music, ctx.currentTime, 0.8);
        // Gamme yo (ré, mi, sol, la, si) ; demi-tons depuis La 4.
        const D5 = 5, E5 = 7, G5 = 10, A5 = 12, B5 = 14, D6 = 17, B4 = 2, A4 = 0;
        const melody = [
            [D5, 1], [E5, 1], [G5, 1], [A5, 1], [G5, 1.5], [E5, 0.5], [D5, 2],
            [E5, 1], [G5, 1], [A5, 1], [B5, 1], [A5, 4],
            [D6, 1.5], [B5, 0.5], [A5, 1], [G5, 1], [A5, 1], [B5, 1], [A5, 2],
            [G5, 1], [E5, 1], [D5, 1], [B4, 1], [D5, 3], [null, 1],
            [A4, 1], [B4, 1], [D5, 1], [E5, 1], [G5, 2], [E5, 1], [G5, 1],
            [A5, 1], [B5, 1], [D6, 2], [B5, 1], [A5, 1], [G5, 2],
            [E5, 1], [G5, 1], [A5, 1.5], [G5, 0.5], [E5, 1], [D5, 1], [B4, 2],
            [D5, 4], [null, 4]
        ];
        const drums = [1, 0, 0.6, 0.6, 1, 0, 0.5, 0]; // motif « DON . don don DON . don . »
        const beat = 60 / 88;
        const state = { next: ctx.currentTime + 0.3, i: 0, drum: 0, drumNext: ctx.currentTime + 0.3 };
        this.dream = state;
        const schedule = () => {
            const horizon = ctx.currentTime + 0.5;
            while (state.drumNext < horizon) {
                const v = drums[state.drum % drums.length];
                if (v) this.taiko(state.drumNext, v, state.drum % 16 === 0 ? 48 : 58);
                state.drum++;
                state.drumNext += beat / 2;
            }
            while (state.next < horizon) {
                const [note, beats] = melody[state.i % melody.length];
                if (note !== null) this.flute(note, state.next, beats * beat * 0.95);
                state.next += beats * beat;
                state.i++;
            }
            state.timer = setTimeout(schedule, 120);
        };
        schedule();
    }

    stopDream(seconds = 2) {
        if (!this.dream) return;
        this.dreamBus.gain.setTargetAtTime(0.0001, this.ctx.currentTime, seconds / 3);
        const state = this.dream;
        setTimeout(() => clearTimeout(state.timer), seconds * 1000);
        this.dream = null;
    }

    whoosh() {
        this.noise({ duration: 0.28, attack: 0.03, type: 'bandpass', freq: 500, to: 3200, q: 1.2, gain: 0.35 });
        this.tone({ at: 0.05, freq: 5200, to: 3000, duration: 0.25, gain: 0.02, type: 'sine' });
    }

    cut() {
        this.noise({ duration: 0.12, type: 'highpass', freq: 1800, gain: 0.25 });
        this.noise({ at: 0.02, duration: 0.3, type: 'lowpass', freq: 400, gain: 0.3 });
    }

    water(seconds = 2.5) {
        this.noise({ duration: seconds, attack: 0.4, type: 'lowpass', freq: 600, to: 1800, q: 0.7, gain: 0.35 });
        this.noise({ duration: seconds, attack: 0.6, type: 'bandpass', freq: 2500, to: 1200, q: 1.5, gain: 0.08 });
        for (let i = 0; i < 18; i++) this.tone({ at: Math.random() * seconds, freq: 500 + Math.random() * 900, to: 1500 + Math.random() * 800, duration: 0.06, gain: 0.03 });
    }

    splash() {
        this.noise({ duration: 0.9, attack: 0.01, type: 'lowpass', freq: 3000, to: 500, gain: 0.45 });
    }

    // Tintement de pièces d'or.
    coin(at = 0, gain = 0.05) {
        const f = 2400 + Math.random() * 1800;
        [1, 1.51, 2.37].forEach((r, k) => this.tone({ at, freq: f * r, duration: 0.25 - k * 0.06, gain: gain / (k + 1) }));
    }

    coins(count, seconds) {
        for (let i = 0; i < count; i++) this.coin(Math.random() * seconds, 0.02 + Math.random() * 0.04);
    }

    fadeAll(seconds) {
        if (!this.ctx) return;
        this.ambience.gain.setTargetAtTime(0.0001, this.ctx.currentTime, seconds / 3);
    }
}
