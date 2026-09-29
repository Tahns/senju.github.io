/*
 * Musique : « Shirohae (The Rain Stops) », bande originale de Naruto
 * Shippûden (Yasuharu Takanashi), fournie par le joueur. Elle ne commence que
 * quand Akira remonte la boîte à musique (aucune musique avant, menu compris).
 * Fichier hébergé avec le site (public/audio/shirohae.webm en Opus, .mp3 en
 * secours) : plus besoin de YouTube, qui refusait souvent la lecture intégrée.
 * Si le fichier ne se lit pas, c'est la mélodie de la boîte à musique qui joue.
 */
const SHIROHAE = { src: 'public/audio/shirohae', title: 'Shirohae', by: 'Naruto Shippûden OST' };
export const TRACKS = { room: SHIROHAE, menu: SHIROHAE };

export class Radio {
    constructor() {
        this.card = document.getElementById('radio');
        this.audio = null;
        this.volume = 0.6;
        this.playing = false;
        this.fadeTimer = 0;
        this.current = TRACKS.room;
    }

    // Prépare l'élément audio.
    load() {
        if (this.audio) return Promise.resolve(this);
        const audio = new Audio();
        const opus = audio.canPlayType('audio/webm; codecs="opus"');
        audio.src = `${this.current.src}.${opus ? 'webm' : 'mp3'}`;
        audio.loop = true;
        audio.volume = this.volume;
        audio.addEventListener('playing', () => { this.playing = true; });
        audio.addEventListener('pause', () => { this.playing = false; });
        this.audio = audio;
        // Appelé au clic sur « Commencer » : une lecture muette, aussitôt en
        // pause, débloque le son pour plus tard (Safari/iPhone l'exige).
        audio.muted = true;
        audio.play().then(() => { audio.pause(); audio.currentTime = 0; audio.muted = false; }).catch(() => { audio.muted = false; });
        return Promise.resolve(this);
    }

    // Lance la musique ; renvoie true si elle joue vraiment.
    async play() {
        await this.load();
        clearInterval(this.fadeTimer);
        this.card.querySelector('b').textContent = this.current.title;
        this.card.querySelector('small').textContent = this.current.by;
        this.audio.volume = this.volume;
        try {
            await this.audio.play();
        } catch (e) {
            return false;
        }
        this.card.hidden = false;
        requestAnimationFrame(() => this.card.classList.add('is-on'));
        return true;
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        clearInterval(this.fadeTimer);
        if (this.audio) this.audio.volume = this.volume;
    }

    // Baisse progressivement le son jusqu'à l'arrêt (quand Akira s'endort).
    fadeOut(seconds) {
        if (!this.audio || !this.playing) return;
        clearInterval(this.fadeTimer);
        const start = performance.now();
        const from = this.audio.volume;
        this.fadeTimer = setInterval(() => {
            const k = Math.min(1, (performance.now() - start) / (seconds * 1000));
            this.audio.volume = from * (1 - k);
            if (k >= 1) {
                clearInterval(this.fadeTimer);
                this.audio.pause();
                this.card.classList.remove('is-on');
                setTimeout(() => { this.card.hidden = true; }, 600);
            }
        }, 100);
    }

    stop() {
        if (this.audio) this.audio.pause();
        this.card.classList.remove('is-on');
        this.card.hidden = true;
    }
}
