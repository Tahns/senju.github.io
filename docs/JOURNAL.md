# Journal des améliorations autonomes

Chaque relance : une faiblesse du [SWOT](SWOT.md) corrigée, testée (parcours
complet + captures), publiée (PR fusionnée, déploiement vérifié).

## Vendredi 25 septembre

- **Rendu lisse façon Zenkai RP** (PR #9) : village de Konoha détaillé,
  herbe, ciel, profondeur de champ, halo ; plus de contours noirs.
- **Tenue d'après les modèles jōnin** et **tête sculptée d'un bloc** (PR #10) :
  gilet olive à col montant, poches, pantalon droit ; tête, visage et
  chevelure fondus en une seule surface, calculés dans un worker.
- SWOT rédigé.
- **Vie du personnage** : clignements (visage yeux fermés), respiration,
  regard qui flâne, pans du bandeau qui flottent.
- **Chargement** : pourcentage réel sur le bouton « Chargement… ».
- **Carte de fin** : lien « Revoir le rêve ».
- **Pluie de ryō** : pièces plus grandes et d'un or plus vif, posées sur
  l'herbe (et non cachées dedans), paillettes dorées et lueur chaude
  pendant l'acte de la section économique.
- **Cadrage** : plan rapproché pendant la pluie de ryō ; arbres plus
  touffus (plus de feuilles, cœur moins sombre).
- **Kenjutsu** : lame avec un fil lumineux, coups de sabre en croissants
  de lumière (vifs au bout, qui s'effacent).
- **Suiton** : vrai dragon d'eau — un tube d'eau translucide, écume qui
  file, qui s'enroule autour de Hoko puis jaillit ; embruns plus fins.
- **Anti-cache** : chaque fichier est versionné (`tools/version.py`), la
  carte d'import redirige chaque module vers sa version.
- **Chambre** : bonsaï refait en lisse (pot émaillé, mousse, tronc
  tortueux, coussins de feuillage), comme le reste de la scène.
- **Partage** : image d'aperçu (Open Graph / Twitter) tirée du rêve.
- **Mobile** : palier de qualité intermédiaire automatique sur écran
  tactile (moins d'herbe, ombres 1024, flou sans multi-échantillonnage) ;
  `?quality=low|mobile|high` pour forcer.
- **Mains** : doigts en deux phalanges, repliés comme une main détendue,
  pouce articulé ; vraie pose « bras croisés ».
- **Village vivant** : villageois qui marchent dans les rues, oiseaux qui
  tournent au-dessus des toits.
- **Visage** : tête un peu plus grande (proportions anime), cou plus
  épais, modelé des joues ; les gros plans ne sont plus flous (mise au
  point minimale ramenée à 30 cm).
- **Correctif** : le lien « Revoir le rêve » ouvrait le carnet (il était
  intercepté comme « Relire le carnet »).
- **Robustesse** : si le processeur graphique lâche (contexte WebGL
  perdu), le carnet s'ouvre au lieu d'un écran noir.
- **Cheveux au vent** dans le rêve (les pointes ondulent).
- **Crédits** : mention « Base Akuma » retirée (4ᵉ de couverture et README), à la demande.
- README mis à jour.
- **Tête refaite (3ᵉ version)**, jugée « horrible » avant : construction
  anime propre — crâne rond, bas du visage arrondi rogné en V par la
  mâchoire, petit menton, cou attaché derrière la mâchoire ; plus de bosses
  ni de coutures. Chevelure en vraies mèches (rubans épais et effilés,
  couchés sur le crâne, rejetés en arrière, pointes dressées devant) sur une
  calotte lisse ; construite en 0,5 s au lieu de 4 s.
- Outil `tools/head-preview.html` : la tête seule, de face, 3/4, profil, dos.
- **Hoko adulte = un vrai modèle anime.** La tête faite en code était jugée
  « triangle », « Mii ». On utilise maintenant le modèle VRoid « HairSample_Male »
  (CC0, libre de droits) : visage et cheveux d'anime de vrai jeu. Allégé de
  19 à 4,3 Mo (textures WebP), yeux et cheveux passés au brun, gilet de
  jōnin (poches à rouleaux, tourbillon dans le dos) peint sur son sweat,
  manches bleu nuit, capuche repliée. Son squelette recopie les poses du rêve
  (reciblage), les doigts se ferment sur la poignée du sabre, il cligne des
  yeux. Bandeau et plaque ajustés à sa tête ; sandales, bandes, étui, bourse
  et fourreau conservés. Proportions du squelette d'animation calées sur le
  modèle. Image de partage refaite.
- **Finitions du modèle** : tourbillon rouge en décalque 3D sur le dos (il
  était coupé en deux), capuche masquée et col montant olive du gilet,
  cheveux qui ondulent au vent, expressions pendant le rêve (détermination
  au sabre et au Suiton, rire sous la pluie de ryō, sourire final) ;
  clignements réparés (les noms des formes du visage n'étaient pas lus : on
  passe par la table d'expressions du modèle).

## Samedi 26 septembre

- **Entrée du rêve** : Hoko tombe du ciel, se réceptionne accroupi sur le
  rocher dans un nuage de poussière (coup sourd de taiko), puis se relève
  bras croisés pendant que le titre apparaît.
- **Tests dans le dépôt** : `tools/test/flow.js` (parcours complet) et
  `tools/test/dream-shots.js` (plans du rêve), documentés.
- **Réception plus forte** : nuage de poussière plus dense, onde de choc
  sur l'herbe, secousse de caméra.
- **Ralenti** sur le troisième coup de sabre (le temps ralentit puis repart).
- **Aperçu Claude avec le vrai modèle** : si le `.vrm` n'est pas servi, le
  modèle est chargé depuis une copie en base64 (`hoko.vrm.txt`, publiée
  seulement avec l'aperçu).
