/*
 * Petit moteur d'animation : des tâches avancent à chaque image, et chaque
 * étape du scénario peut être attendue avec `await`.
 * `scale` accélère tout (bouton « Passer »).
 */
export const ease = {
    linear: (t) => t,
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    out: (t) => 1 - Math.pow(1 - t, 3),
    in: (t) => t * t * t,
    sine: (t) => 0.5 - 0.5 * Math.cos(Math.PI * t)
};

export class Timeline {
    constructor() {
        this.tasks = new Set();
        this.scale = 1;
    }

    update(dt) {
        const step = dt * this.scale;
        [...this.tasks].forEach((task) => task(step));
    }

    wait(seconds) {
        return this.tween(seconds, () => {});
    }

    // Appelle `fn(k)` avec k de 0 à 1 pendant `seconds` secondes.
    tween(seconds, fn, easing = ease.inOut) {
        return new Promise((resolve) => {
            let t = 0;
            fn(0);
            const task = (dt) => {
                t = Math.min(1, t + dt / Math.max(0.0001, seconds));
                fn(easing(t));
                if (t >= 1) {
                    this.tasks.delete(task);
                    resolve();
                }
            };
            this.tasks.add(task);
        });
    }

    // Tâche continue (jusqu'à ce que `fn` renvoie false).
    every(fn) {
        const task = (dt) => {
            if (fn(dt) === false) this.tasks.delete(task);
        };
        this.tasks.add(task);
        return () => this.tasks.delete(task);
    }
}
