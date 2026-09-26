# Tests de la scène

Rendu logiciel (sans carte graphique) avec Playwright + Chromium. Le site doit
être servi en local :

```sh
python3 -m http.server 8765          # à la racine du dépôt
```

## Parcours complet

```sh
node tools/test/flow.js "quality=low&speed=3" full ""
```

Joue toute la scène (chambre → carnets → lit → rêve) en triple vitesse, range
les carnets automatiquement et affiche les erreurs de la page. Il se termine
par `end` et une capture `full-end.png` quand tout va bien. Troisième
argument : des instants (en secondes de scène) où prendre des captures, par
exemple `"5,10,15"`.

Téléphone en portrait (écran tactile simulé) : `VIEWPORT=390x780 node tools/test/flow.js …`.

## Plans du rêve

```sh
node tools/test/dream-shots.js "&quality=high" plan 900 600 8765 '[[[0.4,1.6,0.95],[0,1.55,0]]]'
```

Place la caméra du rêve à chaque position `[caméra, cible]` et enregistre
`plan-0.jpg`, `plan-1.jpg`… (utile pour vérifier Hoko adulte de près).

Si Playwright n'est pas installé globalement, indiquer son chemin avec la
variable `PLAYWRIGHT`.

## Vidéo du rêve

```sh
node tools/test/record-dream.js video 960 540 24 "0.3-4.6,7.8-14.2,15.3-20.2,21.2-24.5,29.6-34" "&quality=mobile"
cat video/f*.jpg | ffmpeg -f image2pipe -framerate 24 -c:v mjpeg -i - -c:v libvpx -b:v 1.6M -pix_fmt yuv420p reve.webm
```

La scène avance d'un pas fixe (`__scene.step(dt, dessiner)`), donc la vidéo
est fluide même si le rendu logiciel est lent ; hors des passages demandés,
le rêve avance sans être dessiné. Les intervalles sont en secondes de rêve.
