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
- **Final du rêve** : Hoko se tourne vers le mont des Hokage et lève le
  poing (« Un jour… ») ; le compteur de ryō s'efface pour ce dernier plan.
- **Accessibilité** : résumé de la scène pour les lecteurs d'écran, lié à
  la carte d'accueil.
- **Katana dans le bon sens** : rengainé, la lame est dans le fourreau et
  la poignée dépasse au-dessus de l'épaule (avant, c'était l'inverse) ;
  lame argentée bien lisible en main.
- Tests : les scripts coupent les ressources externes et n'attendent plus
  le chargement complet (le worker de la tête bloquait Playwright).
- **Coups de sabre plus larges et naturels** : chaque coup s'arme (sabre
  loin derrière l'épaule, tiré en arrière, ou bas) puis balaie tout l'arc
  en fente : diagonale descendante, balayage horizontal, coupe remontante ;
  croissants de lumière agrandis.
- **Traînée de la lame** : un ruban lumineux suit la lame pendant les coups
  de sabre (seulement quand elle bouge vite), le geste se lit en entier.
- **Aura de chakra** : pendant les mudras du Suiton, une flamme bleue
  translucide monte autour de Hoko, avec des étincelles qui s'élèvent.
- **Lucioles** : elles dérivent et clignotent dans le jardin, derrière la
  fenêtre ouverte de la chambre.
- **Correctif particules** : la poussière dans la lumière de la chambre et
  les feuilles qui volent dans le rêve disparaissaient selon l'angle de vue
  (volume englobant calculé avant leur placement) ; elles sont toujours
  dessinées maintenant.
- **Kiminari** (la 2ᵉ nature de chakra de la fiche) : au dernier coup de
  sabre, la lame se charge de foudre — arcs électriques qui crépitent,
  halo et lumière bleutés — avec le sous-titre « Kiminari : la lame
  chargée de foudre ».
- **Son de la foudre** : crépitement électrique quand la lame se charge.
- **Carte de fin** : la dernière image du rêve (Hoko face au mont des
  Hokage) reste en fond, floutée, qui dérive lentement derrière « Bonne nuit ».
- **Arc-en-ciel** : après le jaillissement du dragon d'eau, un arc-en-ciel
  doux apparaît au loin au-dessus du village, puis s'efface.
- **Correctifs téléphone (portrait)** : plus de trait de lumière vertical
  quand Hoko dégaine (la traînée de la lame repart à zéro quand le sabre
  passe du dos à la main) ; dernier plan recadré, Hoko n'est plus coupé au
  bord de l'écran.
- **Téléphone en portrait (suite)** : le compteur de ryō tient dans l'écran
  (il débordait sous le bouton son) ; pendant le rêve, si un plan pensé pour
  l'écran large allait couper Hoko au bord, la caméra pivote juste assez pour
  le garder dans le cadre. Test : `VIEWPORT=390x780 node tools/test/flow.js …`.
- **Ambiance sonore du rêve** : en plein jour, les grillons de la chambre se
  taisent ; on entend des oiseaux (petites phrases sifflées, à gauche et à
  droite) et un vent doux qui enfle et retombe. Au réveil, la nuit et les
  grillons reviennent.
- **Entrée dans le rêve** : au lieu d'un simple fondu du noir, le rêve
  s'ouvre depuis le centre de l'écran, dans un cercle cerclé de lumière
  chaude qui s'élargit, sur un carillon qui monte (fondu simple si les
  animations sont réduites).
- **Carnet** : sceau rouge du clan (千手) tamponné au bas de la fiche
  d'identité, encre pleine et irrégulière, légèrement de travers comme un
  vrai hanko.
- **Vidéo du rêve** (`docs/media/reve.webm`, 27 s, 3,8 Mo) : les temps forts
  (chute, kenjutsu et Kiminari, Suiton, pluie de ryō, final) avec les
  sous-titres, à partager. Enregistrée image par image par
  `tools/test/record-dream.js`, donc fluide malgré le rendu logiciel.
- **Pièce lancée** plus grande et scintillante : on la voit enfin monter
  au-dessus de Hoko pendant la pluie de ryō.
- **Coucher de soleil** pour le final du rêve : pendant « Un jour… », le
  ciel passe à l'indigo et à l'orangé, la lumière devient dorée et le
  contre-jour s'embrase sur Hoko et le village. La dernière image de la
  carte de fin garde cette lumière.
- Enregistreur vidéo : même pas de temps partout (le scénario ne prend plus
  de retard pendant l'avance rapide), instants des sous-titres affichés.
- **Chapitres du rêve** sur la carte de fin : Kenjutsu, Suiton, Ryō,
  « Un jour… ». Le rêve défile en silence, écran noir, jusqu'au chapitre
  choisi (quelques secondes), puis s'ouvre en iris
  (`?at=dream&chapitre=suiton`).
- **Caméra plus douce** (retour : « mouvements trop brusques ») : la caméra
  suit ses plans avec un amorti (plus de départ ni d'arrêt sec), les plans
  courts durent plus longtemps avec une accélération douce, la secousse
  d'atterrissage est plus légère.
- **Traînée du coup final** : le ruban de la lame garde tout l'arc du geste
  et s'efface doucement ; au coup chargé de foudre, il est plus long, plus
  large et bleu électrique.
- **Correctif** : un horodatage d'image en retard pouvait faire reculer la
  scène d'un instant (pas de temps négatif) ; c'est bloqué.
- **Chambre, regards plus doux** : les mouvements de tête suivent une
  accélération sinusoïdale (vitesse de pointe presque divisée par deux) et
  les rotations enchaînées dans le même sens (vers l'étagère, vers le futon)
  ne marquent plus d'arrêt au milieu.
- **Vidéo refaite** avec la caméra douce, la traînée du coup final, le
  Suiton en entier et le coucher de soleil (27 s).
- **Futon** : la couverture indigo à motif asanoha était presque noire à la
  lueur de la lanterne (une dalle sombre) ; indigo plus clair, motif plus
  net.
- **Aura de chakra** refaite : plus de « tube de verre » ; des langues de
  flamme irrégulières qui montent et s'effilent, surtout visibles sur les
  bords, et une silhouette qui ondule.
- **Dragon d'eau** : il a enfin une tête (crâne, museau, mâchoire
  entrouverte, cornes, moustaches, crinière, yeux lumineux) au bout du
  ruban ; il monte en spirale autour de Hoko, marque une pause en haut, puis
  s'envole vers le ciel au-dessus du village (avant, il partait vers la
  caméra, hors de l'image) ; la caméra lève les yeux pour le suivre et les
  embruns l'accompagnent.
- Outil `dream-shots.js` : compatible avec la caméra amortie (`setCamera`),
  option `DRAGON=0.5` pour voir le dragon déroulé.
- **Plan héroïque** pendant « Hoko Senju — jōnin de Konoha » : la caméra
  s'approche en trois-quarts puis pousse jusqu'à un gros plan sur le visage
  et le bandeau (léger sourire assuré), avant de repartir pour le kenjutsu ;
  Hoko ne porte la main au sabre qu'une fois la caméra éloignée.
- **Onde de choc** à l'atterrissage : une nappe claire au front déchiqueté
  qui court sur l'herbe, au lieu d'un anneau blanc plein.
- **Foudre du Kiminari** enfin visible : arcs plus épais (cœur blanc et
  lueur bleue), zigzags plus amples, un arc qui jaillit de la pointe ; la
  lame se charge un instant avant le coup final.
- **Konoha s'allume** au coucher du soleil : les fenêtres des maisons
  rougeoient (shoji dorés, vitres ambrées, rais de lumière entre les
  volets) et les lanternes rouges brillent, un peu après que le ciel a
  viré à l'orange.
- **Sons** : grondement grave quand le dragon d'eau surgit ; claquement de
  tonnerre et roulement quand la lame chargée de foudre frappe.
- **Vidéo refaite** (28 s) : plan héroïque, dragon à tête, foudre visible,
  village qui s'allume au coucher du soleil.
- **Bras croisés** refaits : les avant-bras se croisent vraiment contre la
  poitrine et les mains se referment sur les bras (avant, mains à plat,
  doigts tendus qui dépassaient — visible dans le gros plan du titre).
- **Coupes de sabre** : à chaque poteau tranché, une gerbe de copeaux clairs
  jaillit et retombe à plat dans l'herbe, et la souche montre une face de
  coupe en bois frais.
- **Titres sur téléphone** : « Hoko Senju » et « Bonne nuit » avaient une
  copie fantôme décalée (relief violet fixé en pixels, trop grand pour un
  petit titre) ; contour et relief sont maintenant proportionnels à la
  taille du texte.
