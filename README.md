# Hoko Senju : Fiche Personnage

Le carnet de Hoko Senju, présenté comme un livre relié qu'on feuillette.

**Lien :** https://tahns.github.io/senju.github.io

## La scène d'introduction (3D)

Avant le carnet, une petite scène en 3D, vue à la première personne :

1. Hoko arrive dans le couloir et fait glisser la porte (shoji) de sa chambre.
2. Il va au coffre près de l'entrée et remonte une boîte à musique en laque : la musique « SD NIGHT » de VEN1 démarre (lecteur YouTube officiel, dans un coin). Si YouTube ne se charge pas, la boîte joue « Sakura Sakura ».
3. Il se dirige vers la bibliothèque : l'index gauche fait basculer son carnet, la main gauche le prend par le dos (les bras ne se croisent jamais) et il l'ouvre.
4. Le visiteur lit le carnet, puis clique sur **Ranger** : Hoko remet le livre en place et le redresse du bout du doigt.
5. Il prend un deuxième carnet (vierge), le feuillette, le range.
6. Il s'allonge sur son futon, regarde les étoiles par la fenêtre ouverte, la boîte à musique ralentit, ses yeux se ferment…
7. **Le rêve** (à la troisième personne) : Hoko adulte, jōnin de Konoha, sur un rocher d'entraînement au-dessus du village. Maître du sabre, maître du Suiton, et chef de la section économique : une pluie de ryō remplit le trésor du village… et ses poches.

- Bouton son en haut à droite : volumes Musique / Ambiance / Effets, mémorisés.
- Style des écrans inspiré des serveurs Naruto RP (lettrage pinceau, violet et magenta), rêve au rendu lisse façon Zenkai RP : ombrage doux, herbe qui ondule, profondeur de champ et halo lumineux. Konoha est construit en entier : rues en terre, maisons à étages en bois et enduit, balcons, auvents, enseignes, réservoirs d'eau ronds, poteaux électriques, arbres touffus, tour du Hokage et mont des Hokage.
- Bruitages et musique générés (pas, porte, livres, boîte à musique, grillons, taiko et flûte dans le rêve), activés par défaut, avec un bouton pour couper le son.
- Bouton **Passer** pour accélérer jusqu'au prochain livre, lien « Aller directement au carnet » sur l'écran d'accueil.
- Tout est dessiné en code (aucune image) : `public/js/scene/`.
  - `room.js` : la chambre (tatamis, porte, bibliothèque, futon, lanterne, fenêtre…)
  - `arms.js` : les bras et les mains
  - `main.js` : le scénario, étape par étape (facile à modifier)
  - `dream.js`, `ninja.js` : le rêve et Hoko adulte
  - `village.js`, `post.js` : Konoha (fusionné par matériau pour rester léger) et le post-traitement du rêve
  - `audio.js` : sons et musiques
  - `radio.js` : la musique YouTube (pour la changer, modifie `VIDEO` et le titre dans `index.html`)
- Sans WebGL (vieux navigateurs), ou avec un lien direct `#page-5`, le carnet s'affiche directement.
- Après chaque modification des fichiers JS/CSS : `python3 tools/version.py` (numéros de version anti-cache dans index.html).
- Pour tester une étape : `?at=shelf`, `?at=second`, `?at=bed` ou `?at=dream`, et `?speed=3` pour accélérer.

## Le second carnet

C'est un carnet vierge (couverture indigo, pages réglées sans texte), dans `index.html` :
`<section class="book-source" data-book="second">`. Pour l'écrire plus tard, remplace les pages
vierges par des `<section class="page">` comme dans le premier carnet. Le titre de sa couverture 3D
est dans `THEMES.second` (`public/js/scene/textures.js`).

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
