/*
 * Musique de la chambre : « SD NIGHT » de VEN1, jouée par le lecteur officiel
 * YouTube (petit lecteur visible dans un coin, comme YouTube l'exige).
 * Si YouTube ne se charge pas, la scène garde la mélodie de la boîte à musique.
 */
const VIDEO = '6vNq-TcCRjo';

export class Radio {
    constructor() {
        this.card = document.getElementById('radio');
        this.player = null;
        this.ready = null;
        this.volume = 0.6;
        this.playing = false;
        this.fadeTimer = 0;
    }

    // Charge l'API YouTube et prépare le lecteur (sans jouer).
    load() {
        if (this.ready) return this.ready;
        this.ready = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('YouTube indisponible')), 10000);
            const create = () => {
                try {
                    this.player = new window.YT.Player('radio-player', {
                        width: 200,
                        height: 113,
                        videoId: VIDEO,
                        playerVars: { playsinline: 1, loop: 1, playlist: VIDEO, rel: 0, modestbranding: 1 },
                        events: {
                            onReady: () => {
                                clearTimeout(timeout);
                                this.player.setVolume(Math.round(this.volume * 100));
                                resolve(this);
                            },
                            onStateChange: (e) => {
                                this.playing = e.data === window.YT.PlayerState.PLAYING;
                            },
                            onError: () => reject(new Error('Vidéo indisponible'))
                        }
                    });
                } catch (error) {
                    reject(error);
                }
            };
            if (window.YT && window.YT.Player) {
                create();
                return;
            }
            const previous = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                if (previous) previous();
                create();
            };
            const script = document.createElement('script');
            script.src = 'https://www.youtube.com/iframe_api';
            script.onerror = () => reject(new Error('YouTube bloqué'));
            document.head.appendChild(script);
        });
        this.ready.catch(() => {});
        return this.ready;
    }

    // Lance la musique ; renvoie true si elle joue vraiment au bout de quelques secondes.
    async play() {
        try {
            await this.load();
        } catch (e) {
            return false;
        }
        this.card.hidden = false;
        requestAnimationFrame(() => this.card.classList.add('is-on'));
        this.player.setVolume(Math.round(this.volume * 100));
        this.player.playVideo();
        for (let i = 0; i < 20; i++) {
            await new Promise((r) => setTimeout(r, 200));
            if (this.playing) return true;
        }
        this.card.classList.remove('is-on');
        this.card.hidden = true;
        return false;
    }

    setVolume(volume) {
        this.volume = volume;
        clearInterval(this.fadeTimer);
        if (this.player && this.player.setVolume) this.player.setVolume(Math.round(volume * 100));
    }

    // Baisse progressivement le son jusqu'à l'arrêt (quand Hoko s'endort).
    fadeOut(seconds) {
        if (!this.player || !this.playing) return;
        clearInterval(this.fadeTimer);
        const start = performance.now();
        const from = this.volume;
        this.fadeTimer = setInterval(() => {
            const k = Math.min(1, (performance.now() - start) / (seconds * 1000));
            this.player.setVolume(Math.round(from * (1 - k) * 100));
            if (k >= 1) {
                clearInterval(this.fadeTimer);
                this.player.pauseVideo();
                this.card.classList.remove('is-on');
                setTimeout(() => { this.card.hidden = true; }, 600);
            }
        }, 100);
    }

    stop() {
        if (this.player && this.player.pauseVideo) this.player.pauseVideo();
        this.card.classList.remove('is-on');
        this.card.hidden = true;
    }
}
