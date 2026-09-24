# Hoko Senju : Fiche Personnage

Le carnet de Hoko Senju, présenté comme un livre relié qu'on feuillette.

**Lien :** https://tahns.github.io/senju.github.io

## La scène d'introduction (3D)

Avant le carnet, une petite scène en 3D, vue à la première personne :

1. Hoko arrive dans le couloir et fait glisser la porte (shoji) de sa chambre.
2. Il se dirige vers la bibliothèque, choisit son carnet, le tire de l'étagère et l'ouvre.
3. Le visiteur lit le carnet, puis clique sur **Ranger** : Hoko remet le livre en place.
4. Il en prend un deuxième (le second carnet), le lit, le range.
5. Il va s'asseoir sur son futon, s'allonge face à la fenêtre et à la lune, la lanterne baisse… Bonne nuit.

- Bouton **Passer** pour accélérer jusqu'au prochain livre, lien « Aller directement au carnet » sur l'écran d'accueil.
- Tout est dessiné en code (aucune image) : `public/js/scene/`.
  - `room.js` : la chambre (tatamis, porte, bibliothèque, futon, lanterne, fenêtre…)
  - `arms.js` : les bras et les mains
  - `main.js` : le scénario, étape par étape (facile à modifier)
- Sans WebGL (vieux navigateurs), ou avec un lien direct `#page-5`, le carnet s'affiche directement.
- Pour tester une étape : `?at=shelf`, `?at=second` ou `?at=bed`, et `?speed=3` pour accélérer.

## Le second carnet

Il est dans `index.html`, dans `<section class="book-source" data-book="second">`.
Remplace les « À compléter » par la fiche de l'autre personnage, et son portrait par `public/img/Apparence-2.jpg`.
Pour changer le titre de sa couverture en 3D, modifie `THEMES.second` dans `public/js/scene/textures.js`.

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

Tout le texte est dans `index.html`, dans `<main id="book-source">`.
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
| `public/vendor/` | Three.js (moteur 3D, licence MIT) |

Base d'origine : Akuma.
