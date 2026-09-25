# SWOT — Carnet de Hoko Senju

Revue complète du projet (fiche, scène 3D, rêve), mise à jour à chaque relance
autonome. Les faiblesses sont classées par visibilité : on corrige d'abord ce
qu'un visiteur remarque en premier.

## Forces

- **Expérience unique** : une fiche de personnage vécue comme un court film
  interactif (entrée dans la chambre, boîte à musique, carnet qu'on feuillette,
  rêve à la troisième personne), là où les autres fiches RP sont des pages statiques.
- **Carnet soigné** : couverture, pages qui se courbent sous le doigt, sons de
  papier réalistes, sommaire, chronologie, fermeture du livre.
- **Aucune dépendance de build** : HTML, CSS et modules JS servis tels quels
  par GitHub Pages ; three.js est embarqué.
- **Tout est procédural** : textures, sons, musique de secours, village,
  personnage, donc rien à télécharger en plus.
- **Replis robustes** : sans WebGL, sans module ou en cas d'erreur, le carnet
  s'ouvre seul ; qualité adaptative ; `?quality=low`.
- **Rendu du rêve moderne** : ombrage lisse, herbe animée, profondeur de
  champ, halo, village complet façon Konoha.

## Faiblesses

| # | Faiblesse | Visibilité | État |
|---|-----------|-----------|------|
| F1 | Tête et visage de Hoko adulte peu crédibles (« mannequin ») | Très forte | Refaite par sculpture SDF (25/09) — à affiner (expression, regard) |
| F2 | Animations du ninja rigides : poses interpolées, pas de respiration visible, pas de clignement | Forte | Clignements, respiration, regard et pans du bandeau ajoutés (25/09) — reste : transitions entre poses |
| F3 | Mains simples (paume + capsules) | Moyenne | À faire |
| F4 | Rêve lourd sur mobile (post-traitement, milliers de feuilles) | Moyenne | Replis : `degrade()`, qualité basse |
| F5 | Portrait de la fiche vide (« Portrait à venir ») + 404 dans la console | Moyenne | En attente de l'image du joueur |
| F6 | Chargement initial : three.js 676 Ko + polices, sans barre de progression | Moyenne | Progression réelle sur le bouton (25/09) |
| F7 | Pas de chapitrage : impossible de revoir directement le rêve ou la boîte à musique | Faible | Lien « Revoir le rêve » sur la carte de fin (25/09) |
| F8 | Musique YouTube parfois bloquée (bloqueurs, réseaux d'entreprise) | Faible | Repli Sakura en place |
| F9 | Accessibilité de la scène (lecteurs d'écran, clavier) | Faible | Bouton « Passer », lien direct vers le carnet |

## Opportunités

- **Vie du personnage** : clignements, respiration, regard qui suit la caméra,
  cape/pans du bandeau au vent, petits gestes entre les actes.
- **Rêve plus cinématographique** : lettrage de titre à l'écran, ralenti sur
  les coupes, éclaboussures au sol, reflets dans l'eau.
- **Menu des scènes** sur la carte de fin (revoir : le carnet, le rêve).
- **Carte de partage** (image Open Graph) montrant la chambre ou le rêve.
- **Portrait généré** à partir du modèle 3D si le joueur n'a pas d'image.
- **Mode photo** dans le rêve (caméra libre, capture).

## Menaces

- **GPU faibles / mobiles** : risque de saccades ou de perte de contexte WebGL.
- **Navigateurs** : workers modules (Safari < 15), WebGL2 absent.
- **Services tiers** : API YouTube, Google Fonts (bloqués ou lents).
- **Cache GitHub Pages** : un visiteur peut garder d'anciens modules après une
  mise à jour (versions mélangées).
- **Poids qui grossit** à chaque amélioration : garder un œil sur le temps de
  construction du rêve et la taille des fichiers.

## Plan (ordre de passage)

1. F1 — finaliser la tête (regard, sourcils, ombrage doux du visage).
2. F2 — clignements, respiration, micro-mouvements, pans du bandeau.
3. F6 — écran de chargement avec progression réelle.
4. F7 — chapitres sur la carte de fin.
5. F3 — mains plus fines.
6. Menace cache — paramètre de version sur les modules.
