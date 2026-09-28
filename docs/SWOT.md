# SWOT : Akira Hyûga, Naissance Hyûga

Revue au 28 septembre (soir), après le parcours simplifié, le Kaiten façon
anime, les corrections du modèle, des mains et du suivi de la voix off. Les
faiblesses sont classées par visibilité : on corrige d'abord ce qu'un
visiteur remarque en premier.

## Forces

- **Un parcours clair** : « Commencer » ouvre le menu (Histoire, HRP).
  « Histoire » lance la chambre et les deux carnets. Quand Akira s'endort, une
  carte « Fin » propose le rêve en bonus. Plus de doublons entre menu, carnets
  et rêve.
- **Tout le Canva, en carnets** :
  - le carnet de l'histoire, lu à voix haute ;
  - la fiche : présentation, résumé, caractère (6 traits), objectifs à court,
    moyen et long terme, HRP.
  Le texte n'est écrit qu'une fois, dans `index.html`.
- **Voix off calée sur la vraie parole** : chaque mot a son instant, mesuré par
  reconnaissance vocale (615 mots sur 628 reconnus). Le texte s'encre mot après
  mot, les pages tournent seules et la musique baisse pendant la voix. Vérifié
  en lecture continue, sans décalage. La voix est optimisée (1,6 Mo, chargée au clic).
- **Le style du Canva** : écran titre noir, menu avec bandes « cinéma » et
  bandeau de parchemin, symboles ✕ / ○, écran HRP (personnage à gauche,
  présentation à droite), pause « Oui / Non ».
- **Un rêve façon Hyûga** :
  - Byakugan (yeux pâles qui s'illuminent) ;
  - Jûken : garde basse, rafale des 64 paumes, Hakke Kûshô ;
  - Kaiten comme dans l'anime : dôme bleu nuageux, anneaux de poussière,
    poteaux soufflés vers l'extérieur ;
  - pluie de ryō du trésorier, puis « Un jour… chef du clan Hyûga ».
- **Un modèle corrigé** :
  - proportions humaines (6,4 têtes, bras et cuisses rallongés) ;
  - ventre et jambes rééquilibrés, cou sans couture ;
  - peau qui ne traverse plus les vêtements ;
  - mains qui ne se retournent plus.
  L'écart entre le squelette d'animation et le modèle est de 5 à 6 mm.
- **Confort** : interrupteur « Accélérer » (×4) permanent, réglages de volume,
  musique choisie par le joueur (« Shirohae »).
- **Robustesse** :
  - qualité adaptative ;
  - post-traitement protégé contre les pixels invalides ;
  - repli sur le carnet seul (avec l'histoire et la voix) si la 3D manque ;
  - fichiers versionnés contre le cache.
- **Tests automatiques** (`tools/test/`) : menu, parcours complet, carnet lu
  (précision au mot et lecture continue), carnet seul, poses, enregistrement
  vidéo.
- **Partage** : image d'aperçu et vidéo de 31 s refaites avec la version finale.

## Faiblesses

| # | Faiblesse | Visibilité | Piste |
|---|-----------|-----------|-------|
| F1 | Rien n'a été vu sur un vrai appareil : fluidité, son, lecteur YouTube, voix Opus sur Safari, téléphone. Tout est testé en rendu logiciel et sans son. | Haute (risque) | Tour complet sur ordinateur et téléphone par le joueur, puis corrections |
| F2 | ~~Roue du menu « HRP / HRP »~~ | — | Corrigé : avec 2 catégories, l'autre ne s'affiche qu'une fois |
| F3 | Coupe du modèle VRoid : cheveux courts, alors qu'un Hyûga les porte souvent longs. Les cheveux noirs et le Byakugan sont faits. | Moyenne | Modèle VRoid dédié (cheveux longs dans la même texture, tenue du clan) |
| F4 | Images du Canva non reprises (captures de l'anime, pour les droits) : portrait « à venir » (l'erreur 404 est corrigée). | Moyenne | Illustrations du joueur (portrait, tenues Chûnin / Enfant) |
| F5 | Un seul chapitre écrit sur 8 (« Chapitres écrits : 1 sur 8 »). | Moyenne | Chapitres suivants, avec leur voix off (même outil de calage) |
| F6 | Deux écarts voulus entre l'écrit et la voix : « en corrélation **avec** » et « **des taijutsu-men** » (fautes de la narration corrigées à l'écrit ; le suivi n'est pas gêné). | Faible | Réenregistrer ces deux phrases si besoin |
| F7 | ~~Main repliée sur la porte~~ | — | Corrigé : bout des doigts dans la poignée, paume de côté (la main gauche reste retenue de ~7° en portant le livre, invisible) |
| F8 | ~~Code des écrans retirés~~ | — | Corrigé : ~12 Ko de CSS et le code des onglets, zooms et chapitres retirés |
| F9 | Poids au premier chargement : ~4 Mo de modèle et ~0,7 Mo de three.js (la voix n'est chargée qu'au clic). | Faible | Modèle allégé (textures, maillage) |

## Opportunités

- **Un vrai Akira** : un modèle VRoid Hyûga (cheveux longs, tenue du clan)
  serait le gain le plus visible.
- **Le dojo de son histoire** : le récit se termine sur le dojo qu'il veut
  bâtir. Une scène finale du rêve au dojo relierait l'histoire, le rêve et les
  objectifs.
- **La voix off ailleurs** : le système mot à mot et l'outil de calage par
  reconnaissance vocale sont prêts. On peut lire aussi la fiche (caractère,
  objectifs) ou les prochains chapitres.
- **Byakugan plus marqué** : veines autour des yeux à l'activation.
- **Partage** : la vidéo et l'image d'aperçu sont prêtes pour Discord et les
  réseaux.

## Menaces

- **Contenus tiers** : la vidéo YouTube de la musique peut être retirée ou
  bloquée (repli : boîte à musique, orage). L'univers Naruto est une œuvre
  protégée, utilisée ici en création de fan.
- **Données personnelles publiques** : la partie HRP (âge, métier,
  disponibilités, heures de jeu) est en ligne, et le dépôt est public.
- **Appareils faibles** : modèle animé, post-traitement et herbe sur mobile
  d'entrée de gamme (paliers de qualité en place, à confirmer en vrai).
- **Navigateurs** : WebGL2 requis pour la scène ; l'Opus peut manquer sur les
  anciens Safari (repli MP3 automatique).
- **Mises à jour** : oublier `python3 tools/version.py` après une modification
  peut mélanger anciens et nouveaux fichiers pendant ~10 min.
- **Attentes de style** : chaque retour peut remettre en cause un choix. Le
  Canva et les captures de l'anime servent d'arbitre.

## Plan (ordre de passage)

1. F1 : tour complet sur un vrai ordinateur et un vrai téléphone, retours en captures.
2. F3 : modèle Hyûga.
3. F4, F5 : illustrations et chapitres suivants fournis par le joueur.
4. F9 : allègement du modèle.
