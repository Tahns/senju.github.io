# SWOT — Carnet de Hoko Senju

Revue complète du projet au 25 septembre (soir), après le passage de Hoko
adulte sur un vrai modèle anime. Les faiblesses sont classées par visibilité :
on corrige d'abord ce qu'un visiteur remarque en premier.

## Forces

- **Concept unique** : la fiche RP se vit comme un court film interactif
  (chambre, boîte à musique, carnet qu'on feuillette, rêve à la troisième
  personne) au lieu d'une page statique.
- **Hoko adulte crédible** : vrai modèle anime de jeu (VRoid, CC0) en tenue de
  jōnin (gilet olive à poches, bandeau de Konoha, sabre), animé par toutes les
  poses du rêve, clignements, poing fermé sur le sabre.
- **Rêve spectaculaire** : Konoha complet (maisons à étages, tour du Hokage,
  mont des Hokage, villageois, oiseaux), herbe animée, croissants de sabre,
  dragon d'eau, pluie de ryō dorés, profondeur de champ et halo.
- **Carnet soigné** : couverture en cuir, pages qui se courbent sous le doigt,
  sons de papier, sommaire, chronologie, fermeture du livre.
- **Robustesse** : repli sur le carnet sans WebGL ou si le processeur graphique
  lâche, tête de secours si le modèle ne se charge pas, qualité adaptative et
  palier mobile, fichiers versionnés contre le cache.
- **Léger à héberger** : aucun outil de build, GitHub Pages suffit ; ~5,5 Mo
  au total dont 4,3 Mo pour le modèle, chargé en arrière-plan.
- **Libre de droits** : tout est dessiné en code, le modèle est en CC0.

## Faiblesses

| # | Faiblesse | Visibilité | Piste |
|---|-----------|-----------|-------|
| F1 | ~~Tourbillon rouge du dos coupé en deux~~ | — | Corrigé : décalque 3D sur le dos |
| F2 | ~~Reste de capuche~~ | — | Corrigé : capuche masquée, col montant olive du gilet |
| F3 | ~~Visage toujours neutre~~ | — | Corrigé : détermination au sabre et au Suiton, joie sous les ryō, sourire final ; clignements réparés |
| F4 | Bras de la chambre (première personne) encore procéduraux, d'un autre style que Hoko adulte | Moyenne | Réutiliser les mains/manches du modèle |
| F5 | Portrait de la fiche vide (« Portrait à venir ») + erreur 404 dans la console | Moyenne | Image du joueur (la fiche décrit Hoko à 12 ans : un portrait du modèle adulte ne conviendrait pas) |
| F6 | ~~L'aperçu Claude n'affiche pas le modèle~~ | — | Corrigé : repli sur une copie base64 du modèle |
| F7 | Jamais testé sur un vrai téléphone ni une vraie carte graphique (seulement un rendu logiciel) | Moyenne (risque) | Test par le propriétaire ; réglages `?quality=` en secours |
| F8 | « Et il rêva… », les actes et la carte de fin ne sont pas présentés aux lecteurs d'écran de façon structurée | Faible | Rôles ARIA, résumé textuel du rêve |
| F9 | ~~Tests automatiques hors du dépôt~~ | — | Corrigé : `tools/test/` (parcours complet, plans du rêve) |

## Opportunités

- **Expressions et gestes** : regard déterminé pendant le kenjutsu, sourire sous
  les ryō, clin d'œil final ; micro-mouvements des doigts.
- **Cheveux et vêtements vivants** : les os « secondaires » du modèle (mèches,
  cordons) peuvent onduler au vent.
- **Plus de scènes dans le rêve** : combat contre un adversaire, conseil au
  bureau du Hokage, remise de la veste de jōnin.
- **Hoko enfant** dans la chambre (miroir, reflet dans la fenêtre) avec un
  modèle VRoid plus jeune.
- **Chapitres** sur la carte de fin (déjà : « Revoir le rêve ») ; mode photo.
- **Portrait de la fiche** généré depuis le modèle 3D, dans le style du carnet.
- **Partage** : l'image d'aperçu montre déjà le nouveau Hoko ; une courte vidéo
  du rêve donnerait envie d'ouvrir le lien.

## Menaces

- **Appareils faibles** : modèle animé + post-traitement + milliers de feuilles
  sur mobile d'entrée de gamme (paliers et `degrade()` en place, à vérifier en vrai).
- **Réseau lent** : 4,3 Mo de modèle ; s'il n'est pas arrivé au moment du rêve,
  le rêve attend (la chambre dure ~2 min, donc rarement bloquant).
- **Services tiers** : lecteur YouTube, Google Fonts (replis en place).
- **Navigateurs** : WebP et workers modules requis (Safari 15+), WebGL2.
- **Mises à jour** : oublier `python3 tools/version.py` après une modification
  peut servir un mélange d'anciens et de nouveaux fichiers pendant ~10 min.
- **Attentes de style** : le rendu dépend du goût (Zenkai RP / Naruto Storm) ;
  chaque retour peut remettre en cause un choix de style.

## Plan (ordre de passage)

1. F1 — tourbillon du dos en décalque 3D.
2. F2 — capuche entièrement repliée.
3. F3 — expressions pendant les actes du rêve.
4. F4 — bras de la chambre au style du modèle.
5. F5 — portrait de la fiche (si pas d'image fournie).
6. F6/F9 — aperçu Claude avec le modèle, tests dans le dépôt.
