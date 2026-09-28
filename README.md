# Akira Hyûga : Naissance Hyûga

La candidature d'Akira Hyûga, « The vulgar child », transférée depuis la présentation
Canva « Hyûga par PrinceOFD » : histoire, caractère, objectifs et présentation HRP,
présentés comme un carnet relié qu'on feuillette, avec une scène 3D et des écrans
façon jeux Naruto Storm.

**Lien :** https://tahns.github.io/senju.github.io

## La scène d'introduction (3D)

Avant le carnet, une petite scène en 3D, vue à la première personne :

1. Akira arrive dans le couloir et fait glisser la porte (shoji) de sa chambre.
2. Il va au coffre près de l'entrée et remonte une boîte à musique en laque : la musique « Sadness and Sorrow » (bande originale de Naruto, publication officielle Aniplex) démarre dans le lecteur YouTube officiel, dans un coin. Si YouTube ne se charge pas, la boîte joue « Sakura Sakura ».
3. Il se dirige vers la bibliothèque : l'index gauche fait basculer le carnet de son histoire, la main gauche le prend par le dos (les bras ne se croisent jamais) et il l'ouvre.
4. Le visiteur lit l'histoire (ou l'écoute avec **Écouter** : le texte avance avec la voix), puis clique sur **Ranger** : Akira remet le livre en place et le redresse du bout du doigt.
5. Il prend un deuxième carnet, la fiche d'Akira, le feuillette, le range.
6. Il s'allonge sur son futon, regarde les étoiles par la fenêtre ouverte, la boîte à musique ralentit, ses yeux se ferment…
7. **Le rêve** (à la troisième personne) : Akira adulte, jōnin de Konoha, sur un rocher d'entraînement au-dessus du village. Il active son **Byakugan** (les yeux s'illuminent), brise trois poteaux à distance d'une onde de paume (**Jûken**, le dernier coup « Jûken et Gôken réunis », au ralenti), tourne sur lui-même dans le dôme de chakra du **Hakkeshō Kaiten**, puis devient **trésorier de Konoha** (son objectif « Comptabilité ») : une pluie de ryō dorés remplit le trésor du village… et ses poches. Final : « Un jour… chef du clan Hyûga ».
8. Carte de fin : recommencer, **revoir le rêve** (ou un chapitre : Jûken, Kaiten, trésorier, « Un jour… ») ou **relire la fiche** par le menu.

### Le menu « Sélection de la catégorie » (d'après le Canva)

Comme dans la candidature Canva : trois catégories, **Histoire** (lueur dorée), **Personnage** (verte) et **HRP** (rose), avec le grand mot au pinceau entre deux flèches-flammes, un kanji en filigrane (史, 人, 己) et le bandeau de parchemin (« Vivre l'histoire d'Akira Hyûga », « Personnalité et caractère d'une personne », « Informations personnelles »). Akira adulte en 3D, en contre-plongée dans son aura, sous un ciel d'orage ; à droite la plaque « Akira Hyûga » (日向 アキラ, « The vulgar child », styles Jûken et Gôken). **Confirmer** : clin d'œil, tourbillon de feuilles (shunshin), flash blanc, puis l'écran de la catégorie :

- **Histoire** : sélection des chapitres (8 cases, « Chapitres finis 1/8 », les suivantes à venir) puis lecture du chapitre, image encadrée et texte en dessous.
- **Personnage** : le **Caractère** révélé trait par trait sur trois colonnes (Reconnaissant, Développement, Vulgaire, puis Acharné, Relax, Impartial), puis les **Objectifs** à court, moyen et long terme en panneaux ; onglets Caractère / Objectifs en haut à droite.
- **HRP** : nom et pastilles à gauche (Présentation, Disponibilités), carte de présentation, Akira en 3D à droite.
- **Échap** (« Mettez en pause à tout moment ») : « Revenir à la sélection de la catégorie ? Oui / Non », ou « Lire cette page dans le carnet ».

Le texte des écrans est lu dans les pages du carnet (`index.html`) : on ne l'écrit qu'une fois. Code : `public/js/scene/screens.js`. Flèches, clavier (↑ ↓ ← → Entrée Échap), molette ou glissé au doigt. Accessible depuis l'accueil (« Sélection de la catégorie »), la carte de fin, ou `?at=menu`.

- Bouton son en haut à droite : volumes Musique / Ambiance / Effets, mémorisés.
- Style des écrans inspiré des serveurs Naruto RP (lettrage pinceau, violet et magenta), rêve au rendu lisse façon Zenkai RP : ombrage doux, herbe qui ondule, profondeur de champ et halo lumineux. Konoha est construit en entier : rues en terre, maisons à étages en bois et enduit, balcons, auvents, enseignes, réservoirs d'eau ronds, poteaux électriques, arbres touffus, tour du Hokage, falaise boisée, villageois et oiseaux.
- Bruitages et musique générés (pas, porte, livres, boîte à musique, grillons, taiko et flûte dans le rêve), activés par défaut, avec un bouton pour couper le son.
- Bouton **Passer** pour accélérer jusqu'au prochain livre, liens « Sélection de la catégorie » et « Aller directement au carnet » sur l'écran d'accueil.
- Police pinceau (Permanent Marker, licence Apache 2.0) servie par le site : `public/fonts/`.
- Tout est dessiné en code (aucune image, sauf l'aperçu de partage `public/img/og.jpg`) : `public/js/scene/`.
  - `room.js` : la chambre (tatamis, porte, bibliothèque, futon, lanterne, fenêtre…)
  - `arms.js` : les bras et les mains
  - `main.js` : le scénario, étape par étape (facile à modifier)
  - `dream.js`, `ninja.js` : le rêve et Akira adulte (tenue de jōnin, clignements, respiration, cheveux au vent)
  - `avatar.js` : Akira adulte est un vrai modèle anime (`public/models/hoko.vrm`), recopiant les poses du squelette d'animation de `ninja.js`
  - `sdf.js`, `sculpt.js`, `head.js`, `head-worker.js` : tête sculptée de secours si le modèle ne se charge pas
  - `village.js`, `post.js` : Konoha (fusionné par matériau pour rester léger, villageois, oiseaux) et le post-traitement du rêve
  - `audio.js` : sons et musiques
  - `radio.js` : la musique YouTube (pour la changer, modifie `VIDEO` et le titre dans `index.html`)
- Sans WebGL (vieux navigateurs), si le processeur graphique lâche, ou avec un lien direct `#page-5`, le carnet s'affiche directement.
- Tests automatiques de la scène : `tools/test/` (voir son README).
- Vidéo à partager (menu puis temps forts du rêve, 40 s) : [`docs/media/reve.webm`](docs/media/reve.webm) (refaite avec `tools/test/record-menu.js` et `tools/test/record-dream.js`).
- Suivi des améliorations : `docs/SWOT.md` (forces, faiblesses, plan) et `docs/JOURNAL.md`.
- Après chaque modification des fichiers JS/CSS : `python3 tools/version.py` (numéros de version anti-cache dans index.html).
- Qualité : automatique (palier « mobile » sur écran tactile), ou forcée avec `?quality=low`, `?quality=mobile` ou `?quality=high`.
- Pour tester une étape : `?at=shelf`, `?at=second`, `?at=bed` ou `?at=dream`, et `?speed=3` pour accélérer.
- Chapitres du rêve (liens de la carte de fin) : `?at=dream&chapitre=juken`, `kaiten`, `ryo` ou `final` (les anciens liens `kenjutsu` et `suiton` restent valables).
- Menu « Sélection de la catégorie » (façon Naruto Storm) : `?at=menu`, ou « Relire la fiche d'Akira » sur la carte de fin.

## Les deux carnets

1. **Le carnet de l'histoire** (couverture indigo, sceau 史), pris en premier dans la scène : le
   chapitre 1 en entier, lu à voix haute. Le bouton **Écouter** de la barre du carnet lance la voix
   off (`public/audio/histoire-1.webm`, ou `.mp3` si le navigateur ne lit pas l'Opus) : les mots
   déjà lus reprennent l'encre, le mot en cours est surligné, le reste est estompé, et les pages
   tournent seules. Chaque paragraphe porte l'instant où la voix le commence (`data-t`, en secondes).
   Dans `index.html` : `<section class="book-source" data-book="histoire">`.
2. **La fiche** (cuir rouge, sceau 日向), prise ensuite : présentation, résumé de l'histoire,
   caractère, objectifs et HRP. C'est aussi le carnet affiché sans la scène 3D et par les liens
   `#page-N` ; un bouton « Histoire » y ouvre alors le carnet de l'histoire (avec la voix). Dans `index.html` : `<main id="book-source" data-book="fiche">`.

Les titres des couvertures 3D sont dans `THEMES` (`public/js/scene/textures.js`).

## Ce que fait le site

- Le carnet s'ouvre **fermé, sur sa couverture**. On l'ouvre d'un clic.
- On tourne les pages en 3D : double page sur ordinateur, page simple sur téléphone.
  La page se courbe comme du vrai papier, avec ombres et lumière, et on peut
  l'attraper à la souris ou au doigt pour la tourner à la main.
- Le livre s'incline selon la position de la souris.
- À la fin, le livre **se referme** sur la 4ᵉ de couverture (bouton « Refermer le carnet » sur la dernière page). Depuis là, « Revenir à la couverture » le referme côté face.
- Pour naviguer : flèches ← →, clic sur une page, attraper la page, `Début` / `Fin`, sommaire cliquable, menu en bas, bouton 📕 pour refermer.
- Lien direct vers une page, par exemple `…/#page-7`. Le livre démarre fermé puis s'ouvre à cette page.
- Son de page en option (🔈), plein écran (`F`), feuilles qui tombent en arrière-plan.
- Accessible : lecteur d'écran, clavier, respect du réglage « réduire les animations ».
- Sans JavaScript, ou à l'impression, les pages s'affichent l'une sous l'autre.

## Modifier le contenu

Tout le texte est dans `index.html`, dans `<main id="book-source">` (repris de la présentation Canva). Les écrans des catégories le relisent : traits du caractère dans `<dl class="qualities">` (kanji et couleur dans `data-kanji` / `data-tone`), objectifs dans les pages `page--goals` (`data-term` : court, moyen, long terme ; chaque `<h3>` devient un panneau), chapitres dans les pages `page--story`, HRP dans les pages `page--hrp`.
Chaque `<section class="page">` correspond à une page, dans l'ordre.

- Sur ordinateur, les pages vont par deux : 1 à gauche et 2 à droite, puis 3 et 4, etc.
  Si tu ajoutes une page, ajoutes-en une deuxième pour garder un nombre pair entre les deux couvertures.
- `data-toc="…"` donne le nom de la page dans le menu du bas.
- Pour changer le sommaire écrit dans le carnet, modifie les liens `#page-N` de la page « Sommaire ».

## Portrait

Dépose l'image du personnage dans `public/img/Apparence.jpg`. Elle apparaît dans le cadre de la page « Apparence ».
Sans image, le cadre affiche « Portrait à venir ».

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | Contenu du carnet |
| `public/css/style.css` | Mise en page, papier, couverture en cuir, animations |
| `public/js/book.js` | Feuilletage, navigation, son, feuilles qui tombent |
| `public/img/` | Emblème de Konoha (SVG), favicon, portrait |
| `public/js/scene/` | Scène 3D de la chambre |
| `public/vendor/` | Three.js et son chargeur glTF (moteur 3D, licence MIT) |
| `public/models/hoko.vrm` | Modèle d'Akira adulte : « HairSample_Male » du projet VRoid (pixiv), publié en CC0 ; allégé (textures WebP) et recoloré (yeux pâles du Byakugan, cheveux presque noirs avec une longue mèche nouée dans le dos, gilet de jōnin peint, bleu nuit) |

