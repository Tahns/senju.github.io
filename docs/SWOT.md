# SWOT : Akira Hyûga, Naissance Hyûga

Revue complète au 28 septembre, après le transfert de la candidature Canva
(« Hyûga par PrinceOFD ») sur le site. Les faiblesses sont classées par
visibilité : on corrige d'abord ce qu'un visiteur remarque en premier.

## Forces

- **Le Canva en entier, en mieux** : histoire, caractère (6 traits), objectifs
  à court, moyen et long terme, présentation HRP. Le texte n'est écrit qu'une
  fois, dans le carnet (`index.html`) : les écrans du menu le relisent.
- **Le style du Canva reproduit** :
  - écran titre noir (« Entrer ✕ ») ;
  - sélection de la catégorie à trois entrées (Histoire, Personnage, HRP), avec
    bandes noires, bandeau de parchemin et symboles de manette ✕ / ○ ;
  - écrans de catégorie : sélection des chapitres, caractère révélé trait par
    trait, objectifs en panneaux, HRP avec le personnage à gauche ;
  - pause « Revenir à la sélection de la catégorie ? Oui / Non » ;
  - transitions (bandeau, glissé-zoom, zoom depuis la carte du chapitre).
- **L'histoire lue à voix haute** : le premier carnet suit la voix off mot
  après mot. Chaque mot a son instant, calculé sur l'audio (activité de la
  voix, fins de phrases calées sur les pauses). Les pages tournent seules et la
  musique baisse pendant la voix. L'écran Histoire suit aussi la voix.
- **Voix off optimisée** : mono, -16 LUFS, Opus 1,6 Mo (MP3 de repli), chargée
  seulement au clic.
- **Mise en scène 3D unique** : chambre vue à la première personne, deux
  carnets pris dans la bibliothèque (l'histoire, puis la fiche), puis un rêve
  façon Hyûga :
  - Byakugan (yeux pâles qui s'illuminent) ;
  - Jûken : garde basse, rafale des 64 paumes, Hakke Kûshô ;
  - Hakkeshō Kaiten ;
  - pluie de ryō du trésorier (son objectif « Comptabilité ») ;
  - « Un jour… chef du clan Hyûga ».
- **Menu vivant** : Akira en 3D dans son aura, une pose par catégorie, orage,
  shunshin et clin d'œil en confirmant.
- **Musique officielle** : bande originale de Naruto publiée par Aniplex sur
  YouTube, « Sadness and Sorrow » dans la chambre et « Man of the World » dans
  le menu. Replis en place (boîte à musique, ambiance d'orage).
- **Corrections de rendu** : la peau ne traverse plus les vêtements, les pieds
  restent au sol dans les gardes basses.
- **Robustesse** :
  - le carnet s'affiche seul si WebGL manque ou si la carte graphique lâche ;
  - qualité adaptative dès ~30 images/s, 3D allégée derrière les écrans ;
  - fichiers versionnés contre le cache.
- **Tests automatiques** dans `tools/test/` : menu, voix off de l'écran,
  carnet lu (précision au mot), parcours complet, poses sous plusieurs angles.
- **Léger à héberger** : pas d'outil de build, GitHub Pages suffit ; tout est
  dessiné en code, sauf le modèle 3D (CC0) et la voix.

## Faiblesses

| # | Faiblesse | Visibilité | Piste |
|---|-----------|-----------|-------|
| F1 | Physique d'un Hyûga en partie : cheveux noirs et yeux du Byakugan faits ; la coupe reste celle du modèle VRoid (cheveux courts). | Moyenne | Modèle VRoid dédié (cheveux longs dans la même texture, tenue du clan) |
| F2 | Jamais vérifié sur un vrai appareil pendant ces changements : fluidité, son, lecteurs YouTube, voix Opus sur Safari. Tout a été testé en rendu logiciel, sans son. | Haute (risque) | Tour complet sur ordinateur et téléphone par le propriétaire |
| F3 | ~~Histoire inaccessible sans la 3D~~ | — | Corrigé : bouton « Histoire » / « Fiche » dans la barre du carnet seul |
| F4 | Images du Canva non reprises (captures de l'anime, pour les droits) : traits illustrés par des kanji, portrait « à venir » (et une erreur 404 dans la console). | Moyenne | Illustrations du joueur (portrait, tenues Chûnin / Enfant) |
| F5 | Un seul chapitre écrit sur 8 : la grille des chapitres est surtout faite de cases « À venir ». | Moyenne | Écrire les chapitres suivants (le carnet et l'écran les prennent automatiquement) |
| F6 | Suivi du texte encore approximatif au milieu des longues phrases sans pause (instants calculés sur l'énergie de la voix, pas par reconnaissance vocale). | Faible à moyenne | Recalage manuel d'un passage signalé, ou transcription horodatée si un outil devient accessible |
| F7 | ~~Vidéo et image d'aperçu anciennes~~ | — | Corrigé : toutes deux refaites |
| F8 | ~~Restes du rêve de Hoko~~ | — | Corrigé : code retiré, Kûshô filmé vers le village |
| F9 | Zoom vers la lecture raccourci ; à confirmer sur un appareil lent. | Faible | Désactiver en qualité basse si besoin |
| F10 | Poids au premier chargement : ~4 Mo de modèle + ~0,7 Mo de three.js (la voix n'est chargée qu'au clic). | Faible | Modèle allégé (textures, maillage) |

## Opportunités

- **Un vrai Akira** : un modèle VRoid Hyûga (cheveux longs, Byakugan, tenue du
  clan) serait le gain le plus visible de tout le site.
- **Le rêve de son histoire** : le récit se termine sur le dojo qu'il veut bâtir
  pour rallier les maîtres du taijutsu et les Hyûga. Une scène finale au dojo
  relierait l'histoire, le rêve et les objectifs.
- **Byakugan plus marqué** : veines autour des yeux à l'activation, vision à
  360° (effet de caméra).
- **Voix off ailleurs** : le Canva avait « Écouter » ; le caractère et les
  objectifs pourraient être lus aussi. Le système mot à mot est prêt pour tout
  texte avec son audio.
- **Chapitres qui se débloquent** : « Chapitres finis 1/8 » se remplit tout seul
  à chaque chapitre écrit ; la carte du chapitre peut recevoir une image.
- **Partage** : nouvelle vidéo (menu façon Canva, carnet qui suit la voix, Jûken)
  et nouvelle image d'aperçu pour les liens (Discord, réseaux).

## Menaces

- **Contenus tiers** : les vidéos YouTube de la bande originale peuvent être
  retirées ou bloquées selon le pays (replis en place). L'univers Naruto reste
  une œuvre protégée, utilisée ici en création de fan.
- **Données personnelles publiques** : la partie HRP (âge, métier,
  disponibilités, heures de jeu) est en ligne, visible de tous, et le dépôt est
  public.
- **Appareils faibles** : modèle animé, post-traitement et herbe sur mobile
  d'entrée de gamme (paliers de qualité en place, à confirmer en vrai).
- **Navigateurs** : WebGL2 requis pour la scène ; lecture de l'Opus variable sur
  les anciens Safari (repli MP3 choisi automatiquement).
- **Mises à jour** : oublier `python3 tools/version.py` après une modification
  peut servir un mélange d'anciens et de nouveaux fichiers pendant ~10 min.
- **Attentes de style** : chaque retour peut remettre en cause un choix. Le
  Canva sert de référence : à garder comme arbitre.

## Plan (ordre de passage)

1. F2 : tour complet sur un vrai ordinateur et un vrai téléphone (son, YouTube,
   voix, fluidité), puis corrections.
2. F1 : modèle Hyûga (cheveux longs, tenue).
3. F7 : nouvelle vidéo et nouvelle image d'aperçu.
4. F3 : carnet de l'histoire accessible sans la 3D.
5. F4, F5 : illustrations et chapitres fournis par le joueur.
6. F8, F9, F10 : nettoyage, zoom, poids.
