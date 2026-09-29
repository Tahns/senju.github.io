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
- **Carnet, fin de la chronologie** : vignette à l'encre rouge sous
  « Refermer le carnet » — le mont des Hokage et ses quatre visages, la tour
  du Hokage, les toits et les arbres de Konoha — là où la page restait vide.
- **Lanterne (andon)** de la chambre : papier éclairé depuis le centre (bords
  plus sombres), croisillons de bois en ombre, chapeau et socle — avant,
  un rectangle blanc uniforme dans un cadre.
- **Performance** : la chevelure du modèle arrivait en 114 mèches séparées
  (114 appels de dessin, autant pour les ombres) ; elles sont fusionnées au
  chargement en un seul maillage. Hoko passe de 169 à 56 appels de dessin,
  le rêve de ~550 à ~440 par image (plus les ombres) — rendu identique.
- **Retour « cou trop fin, couleurs à refaire »** :
  - **Cou** épaissi (×1,35) : au chargement, les sommets de peau qui suivent
    l'os du cou s'écartent de son axe, seulement sur le fût du cou (la base
    sous le col et les épaules ne bougent pas, pas d'entonnoir).
  - **Couleurs** : peau plus chaude (le blanc VRoid paraissait délavé), lueur
    propre du modèle réduite pour que le relief ressorte ; étalonnage du rêve
    avec une légère courbe en S et plus de saturation après le tone mapping,
    halo modéré — fini le voile laiteux.
- **Taches de peau au col** : c'était la peau du torse qui traversait le haut
  du modèle. Au chargement, la peau cachée (torse, épaules, haut des bras)
  recule d'1 cm vers ses os ; le col montant olive apparaît net autour du
  cou, même bras levés.
- **Image de partage** refaite avec le nouveau Hoko (cou, couleurs, bras
  croisés) devant la tour et le mont des Hokage ; adresse versionnée pour que
  Discord et les réseaux ne gardent pas l'ancienne en cache ; `twitter:image`.
- **Vidéo refaite** avec le cou épaissi, les nouvelles couleurs, les vrais
  bras croisés et les copeaux.

## Dimanche 27 septembre

- **Couvertures des carnets** : le sceau en bas à droite était cassé
  (écriture verticale écrasée : un trait rouge et « 手 » seul) ; il affiche
  maintenant « 千手 » (et « 忍道 » sur le carnet indigo) en entier.
  « Ouvrir le carnet » ne disparaît plus entre deux pulsations.
- **Étoile filante** : allongé sur le futon, pendant que Hoko regarde le ciel
  par la fenêtre, une étoile filante traverse l'ouverture (sur un carillon)
  juste avant qu'il ne s'endorme — et que le rêve commence.
- **Boîte à musique** : quand elle s'ouvre, on voit son mécanisme — cylindre
  de laiton hérissé de picots qui tourne pendant la mélodie, peigne d'acier
  à douze dents, socle de laiton (avant, un velours rouge presque vide).
- **Plan final** : la bourse gonflée par la pluie de ryō (×1,9, une vraie
  jarre dans le dos) reprend une taille discrète pendant que Hoko se tourne
  vers le mont des Hokage ; la silhouette du plan héroïque est nette.
- **Kanji des chapitres** : au-dessus des sous-titres du rêve, l'idéogramme
  du chapitre tracé au pinceau (剣術 kenjutsu, 雷 foudre, 水遁 Suiton,
  両 ryō, 火影 « Un jour… »). Sur téléphone, le sous-titre ne touche plus
  le bouton « Passer ».
- **Police pinceau complète** : la police japonaise n'était téléchargée que
  pour 9 caractères ; les kanji des chapitres (剣術, 雷, 両, 火影, 夢) et le
  « の » du rouleau « 火の意志 » s'affichaient dans une police de secours. La
  liste couvre maintenant les 35 caractères japonais du site. Kanji ajoutés
  aussi à « Et il rêva… » (夢) et au titre du rêve (千手).
- **Moins d'animations** : si le système du visiteur le demande
  (`prefers-reduced-motion`), plus de secousse de caméra à l'atterrissage
  (l'ouverture en iris était déjà remplacée par un fondu). Vérifié aussi :
  sans WebGL, le carnet s'ouvre directement.
- **Sans WebGL** : la page le détecte d'emblée et ouvre le carnet, sans les
  trois erreurs rouges de three.js dans la console.
- **Mont des Hokage** : visages plus ovales et sculptés dans la roche
  (joues moins gonflées, menton et mâchoire), deux sourcils froncés au lieu
  d'une barre — moins « masques de lion ».
- **Villageois** : ce n'étaient que des capsules à tête de la couleur des
  cheveux ; ils ont maintenant un visage (quatre teintes de peau), des
  cheveux en calotte, des épaules et un bas de kimono évasé — toujours en
  objets instanciés (trois appels de dessin pour les 46 passants).
- **Visages de la falaise retirés** (retour : « horrible ») : la falaise
  derrière Konoha est maintenant nue, avec sa forêt au sommet ; image
  d'aperçu du lien refaite sans eux.
- **Vidéo refaite** : sans les visages de la falaise, avec les kanji des
  chapitres au-dessus des sous-titres, la bourse discrète et les villageois.
- **Carte de fin** : chaque bouton de chapitre porte son kanji (剣術, 水遁,
  両, 火影), comme dans le rêve ; README et SWOT à jour.
- **Réseau lent** : si le modèle de Hoko (4,3 Mo) n'est pas encore arrivé au
  moment du rêve, « Le rêve se prépare… NN % » s'affiche avec l'avancement du
  téléchargement, au lieu d'un écran noir silencieux ; le rêve démarre dès
  qu'il est prêt.
- **Menu « Sélection de la catégorie »**, inspiré d'une candidature vidéo
  façon jeux Naruto Storm (donnée par le propriétaire) : Hoko en 3D en
  contre-plongée dans son aura de chakra, sous un ciel d'orage vert sombre ;
  à gauche le grand mot au pinceau lumineux (Personnage, Apparence,
  Personnalité, Ambitions, Histoire, Nindo, Chronologie) entre deux flèches-
  flammes ; en bas le bandeau de parchemin avec la description ; « Confirmer »
  ouvre le carnet à la bonne page. Chaque catégorie donne une pose et une
  expression à Hoko. Flèches, clavier, molette ou glissé au doigt. Ouvert
  depuis la carte de fin (« Relire la fiche de Hoko ») ou `?at=menu`.
- **Menu dès l'accueil** : lien « Sélection de la catégorie » sur la carte
  d'entrée, qui ouvre directement le menu façon Naruto Storm ; « Retour »
  ramène à l'accueil (ou à la carte de fin si on venait du rêve).
- **Menu : chakra aux mains** — comme dans la vidéo de référence, des arcs
  bleus crépitent autour des mains de Hoko quand elles sont libres (mudra,
  paume tendue, poing levé), avec leur lueur.
- **Menu, finitions** : coup de pinceau vert derrière le mot de la
  catégorie ; « Confirmer » fait foncer la caméra vers le visage de Hoko,
  l'interface glisse et s'efface, puis un flash blanc mène au carnet.
- **Carnet, chapitres de l'histoire** : médaillon doré à la goutte de chakra
  rouge devant « Chapitre I… IV », repris du cadre de la candidature vidéo.
- **Menu, ambiance** : un corbeau traverse le ciel d'orage (comme dans la
  vidéo de référence) ; sur écran tactile, indice « Glisse vers le haut ou
  le bas ».
- **Vidéo refaite façon candidature** (39 s) : elle s'ouvre sur le menu
  « Sélection de la catégorie » (les sept catégories défilent, Hoko change
  de pose), puis enchaîne sur les temps forts du rêve.
- **Menu, corbeau réparé** : il était invisible (culling du volume englobant,
  puis caché derrière la tête de Hoko) ; il passe maintenant bien au-dessus
  de lui, ailes battantes. Indice tactile plus lisible sur l'herbe.
- **Menu, entrée en scène** : la caméra part du ciel au-dessus de Konoha et
  plonge sur Hoko ; puis « Sélection de la catégorie » glisse, le grand mot
  arrive en rebondissant et le bandeau de parchemin se déroule depuis le
  centre (rien de tout ça si les animations sont réduites).
- **Police pinceau servie par le site** : Permanent Marker (licence Apache
  2.0, `public/fonts/`) est maintenant hébergée avec le site. Les titres
  (« Hoko Senju », « Bonne nuit », boutons) et le grand mot du menu sont
  toujours au pinceau, même si Google Fonts est bloqué ou lent — comme les
  menus de la vidéo de référence.
- **Menu, son de sélection** : changer de catégorie fait claquer des
  hyōshigi (claves de bois du théâtre japonais) avec un petit coup de taiko,
  comme les menus des jeux.
- **Menu, description qui s'écrit** : à chaque catégorie, le texte du
  bandeau de parchemin apparaît de gauche à droite, comme tracé au pinceau.
- **4ᵉ de couverture** : bouton « Sélection de la catégorie », qui relance
  la page directement sur le menu façon Naruto Storm (affiché seulement si
  le navigateur sait faire de la 3D).
- **Menu, plaque du personnage** : en haut à droite, comme l'écran de
  sélection des jeux Storm, « Hoko Senju », son nom en japonais (千手 ホコ)
  et ses deux natures de chakra en pastilles (水 Suiton, ✦ Kiminari). Elle
  glisse depuis la droite à l'ouverture ; sur téléphone elle se range sous
  le grand mot.
- **Menu, kanji en filigrane** : derrière le grand mot, un kanji géant et
  translucide au pinceau résume chaque catégorie — 人 (Personnage),
  姿 (Apparence), 心 (Personnalité), 志 (Ambitions), 史 (Histoire),
  忍道 écrit à la verticale (Nindo), 暦 (Chronologie). Il apparaît dans un
  flou à chaque changement.
- **Menu, orage** : toutes les 8 à 14 secondes, un éclair zèbre le ciel
  derrière la falaise, le ciel et Hoko s'éclairent deux fois de
  suite, puis le tonnerre roule au loin (plus sourd que celui du coup de
  sabre chargé). Désactivé avec « réduire les animations ».
- **Menu, shunshin (瞬身)** : en confirmant une catégorie, un tourbillon
  de feuilles se lève autour de Hoko et l'emporte — il disparaît comme
  avec la technique de déplacement instantané, pendant que la caméra fonce
  vers lui et que l'écran blanchit avant d'ouvrir le carnet.
- **Accès au menu mis en avant** : sur l'écran d'accueil et la carte de
  fin, « ✦ Sélection de la catégorie » / « ✦ Relire la fiche de Hoko »
  deviennent un bouton secondaire incliné, vert chakra, au lieu d'un
  simple lien souligné.
- **Menu, roue des catégories** : la catégorie précédente et la suivante
  s'affichent en petit, pâles, au-dessus et en dessous des flèches — on
  voit où on va, comme la roue des menus Storm (clic dessus pour y aller ;
  masquées en portrait, faute de place).
- **Menu, ambiance sonore d'orage** : le menu reprenait l'ambiance du rêve
  en plein jour (oiseaux qui chantent) sous un ciel d'orage. Désormais les
  oiseaux se taisent et le vent souffle plus fort et plus grave ; le
  tonnerre des éclairs complète l'ambiance.
- **Test automatique du menu** (`tools/test/menu.js`) : fait le tour des
  7 catégories (mot, kanji, voisines), confirme et vérifie que le carnet
  s'ouvre à la bonne page.
- **Carnet, page Ambitions** : le bas de la page était vide ; une vignette
  à l'encre y montre l'épée de sa lignée (« Récupérer l'épée de sa
  lignée ») posée sur son support — fourreau, garde, poignée tressée et
  cordon —, dans le même trait que la vignette de la Chronologie.
- **Carnet, fins de chapitre illustrées** : chaque chapitre de l'histoire
  qui s'arrêtait à mi-page se termine par une petite vignette à l'encre —
  la forêt de Takumi (II), la feuille noyée dans l'eau du test de chakra
  (III), un rouleau des récits du clan déroulé (IV).
- **Menu, clin d'œil** : en confirmant une catégorie, Hoko fait un clin
  d'œil et sourit à la caméra qui fonce vers lui, juste avant de
  disparaître dans son tourbillon de feuilles (expression « Blink_R » du
  modèle). SWOT mis à jour (menu, vignettes).
- **Vidéo à partager refaite** (`docs/media/reve.webm`, 40 s) : le menu
  avec toutes ses nouveautés (plaque, kanji, roue, éclair, clin d'œil,
  shunshin), puis les temps forts du rêve. Enregistreur du menu ajouté au
  dépôt (`tools/test/record-menu.js`).

## Lundi 28 septembre

- **Candidature Canva transférée sur le site** : le contenu est désormais celui
  de la présentation Canva « Hyûga par PrinceOFD » — Akira Hyûga, « The vulgar
  child ». Carnet réécrit : présentation et tenues, histoire (chapitre 1),
  caractère (six traits, chacun son kanji et sa couleur), objectifs à court,
  moyen et long terme, HRP (présentation, motivation, disponibilités,
  expérience). Couverture 3D, plaque du menu, accueil, sous-titres du rêve
  (« Trésorier de Konoha », « Un jour… chef du clan Hyûga ») mis à jour ;
  mentions « © PrinceOFD · Naissance Hyûga · Ver. Early Access ».
- **Menu à trois catégories comme le Canva** (Histoire, Personnage, HRP), avec
  une lueur par catégorie (dorée, verte, rose).
- **Écrans des catégories** (`public/js/scene/screens.js`) : après
  « Confirmer », au lieu d'ouvrir le carnet, un écran façon Storm d'après le
  Canva — sélection des chapitres, caractère révélé trait par trait,
  panneaux d'objectifs, présentation HRP — et la pause « Revenir à la
  sélection de la catégorie ? Oui / Non » (ou lire la page dans le carnet).
  Test du menu mis à jour.
- **Rêve façon Hyûga** : Akira a les yeux pâles du Byakugan (iris sans
  pupille, qui s'illuminent à l'activation) et se bat à mains nues (sabre et
  fourreau rangés). Le kenjutsu devient le **Jûken** : garde basse, trois
  frappes de paume à distance (onde de chakra en anneau et éclat blanc), le
  dernier coup « Jûken et Gôken réunis » au ralenti. Le Suiton devient le
  **Hakkeshō Kaiten** : il tourne sur lui-même dans un dôme de chakra à
  bandes tournoyantes, qui éclate. Chapitres de la carte de fin : Jûken,
  Kaiten, Trésorier, Un jour… (anciens liens redirigés).
- **Vêtements** : la peau des bras et du torse traversait les manches dès
  qu'Akira levait les bras. Toute la peau cachée sous le haut et le pantalon
  est retirée du maillage (on garde mains, cou, tête et pieds).
- **Jûken rechorégraphié** : garde basse des Hyûga (pieds au sol, bassin
  abaissé, paumes tournées vers l'avant), pas glissé jusqu'au poteau, rafale
  des 64 paumes (« 2 paumes… 4… 8… 64 ! », buste qui tourne, l'autre main à la
  hanche, éclats d'impact) filmée de trois-quarts, poteau pulvérisé par les
  deux paumes, puis deux Hakke Kûshô à distance ; le Kaiten a des jambes
  corrigées. Outil de test `tools/test/pose-shots.js` (une pose sous plusieurs angles).
- **Transitions façon Canva** : bandeau diagonal qui balaie l'écran, glissé-zoom
  à chaque changement de page, zoom depuis la carte du chapitre vers la lecture
  (et retour), lent zoom sur l'illustration ; bouton « Écouter » pour la voix
  off du chapitre (`public/audio/histoire-1.mp3`, à déposer).
- **Latences** : qualité adaptative plus réactive (dès ~30 images/s, résolution
  jusqu'à 0,75) ; derrière un écran de catégorie, la 3D n'est redessinée
  qu'une image sur trois.
- **Musique** : bande originale officielle de Naruto (publications Aniplex sur
  YouTube) — « Sadness and Sorrow » dans la chambre, « Man of the World » dans le
  menu et les écrans des catégories.
- **Second carnet utile** : le registre des comptes du clan Hyûga, tenu par
  Akira (budget prévisionnel de ses objectifs, notes en marge, bilan).
- **Voix off intégrée** (4 min 12) : fichier fourni optimisé — mono (les deux
  canaux étaient identiques), volume ramené à -16 LUFS avec crêtes à -1,5 dB
  (il saturait à -0,1 dB), bords coupés ; Opus 1,6 Mo + MP3 1,7 Mo de repli
  (au lieu de 4,3 Mo), chargée seulement au clic. Barre de progression, la
  musique et l'ambiance baissent pendant qu'elle parle, pause avec le jeu.
- **Menus façon Canva** : écran titre noir (nom au pinceau, 日向 en badge bleu,
  « Entrer ✕ » qui pulse, mentions en bas à gauche) ; menu avec bandes noires
  « cinéma » et bandeau de parchemin droit bordé de brun ; symboles de
  manette ✕ / ○ partout ; lecture des chapitres dans une fenêtre à barre
  orange ● ■ ▲ avec emblème et fumée ; écran HRP comme le Canva (Akira à
  gauche avec nom et pastilles, présentation à droite, caméra déplacée).
- **Texte de la voix off** : le chapitre 1 complet (11 paragraphes) est calé
  sur la narration (repères trouvés dans les pauses de la voix, débit régulier
  de 14 à 17 caractères par seconde). Quelques fautes corrigées (« inconnues »,
  « en corrélation avec », « des taijutsu-men », « Hyûga »).
- **Deux carnets réorganisés** : le premier est l'histoire lue à voix haute (le
  texte avance mot après mot avec la voix, les pages tournent seules, barre de
  progression dans la barre du carnet) ; le second est la fiche (présentation,
  résumé de l'histoire, caractère, objectifs, HRP). Le registre des comptes est
  retiré. L'écran Histoire suit aussi la voix, paragraphe par paragraphe.
- **Suivi du texte recalé sur la voix** : il y avait un décalage (les mots
  avançaient à vitesse constante dans chaque paragraphe). Chaque mot a
  maintenant son propre instant (`data-w`), calculé sur l'audio : les mots
  n'avancent que quand la voix parle (jamais pendant les silences), et les fins
  de phrases et virgules sont calées sur les pauses réelles (la plupart des
  ponctuations tombent sur une pause). Mise à jour aussi quand on saute dans l'audio.
- **Physique Hyûga** : cheveux presque noirs. (Une longue mèche nouée dans le
  dos a été essayée puis retirée : couleur et texture ne collaient pas à la
  chevelure du modèle.)
- **Histoire sans la 3D** : en carnet seul, un bouton « Histoire » / « Fiche »
  passe de la fiche au carnet de l'histoire lu à voix haute (test
  `tools/test/standalone.js`). Titre en double retiré de la première page du récit.
- **Nettoyage** : dragon d'eau, embruns, arc-en-ciel, traînée et croissants du
  sabre retirés du rêve (~180 lignes, 5 objets de moins dessinés à chaque
  image) ; Hakke Kûshô filmé avec le village en fond ; zoom vers la lecture
  raccourci ; le test du parcours se ferme proprement en cas d'erreur.
- **Image d'aperçu refaite** (`public/img/og.jpg`) : Akira aux yeux du Byakugan
  et aux cheveux noirs, bras croisés devant la tour du Hokage.
- **Audit du modèle** (8 poses × 4 angles, `pose-shots.js`) : la bourse des
  ryō pendait dans le vide à côté de la hanche et la sacoche du bas du dos
  flottait derrière (placées pour l'ancien corps, plus large que le modèle).
  La bourse est recalée contre la hanche, sous l'ourlet du haut ; la sacoche
  est masquée (le gilet peint a déjà sa poche). Rien d'autre à signaler :
  pas de peau à travers les vêtements, mains, cou, bandeau et sandales en place.
- **Silhouette corrigée** : le haut du modèle (un sweat ample, poche kangourou)
  gonflait le ventre et ses manches bouffantes rendaient les bras plus épais
  que les jambes (pantalon très fin). Déformation au chargement : devant du
  ventre et bas du haut resserrés de 30 %, manches affinées (×0,88), jambes du
  pantalon élargies (×1,2, progressivement depuis l'aine). Le haut et le
  pantalon partagent les mêmes sommets : chaque vêtement ne déforme que les siens.
- **Parcours simplifié** : l'accueil n'a plus qu'un bouton « Commencer », qui
  ouvre le menu (Histoire, HRP). « Histoire » lance la chambre et les deux
  carnets (histoire lue à voix haute, puis la fiche) ; quand Akira s'endort,
  une carte « Fin » propose le rêve en bonus (ses chapitres apparaissent après).
  Les écrans Histoire et Personnage du menu, en double avec les carnets, sont retirés.
- **Kaiten comme dans l'anime** : dôme bleu presque opaque aux reflets nuageux
  qui tournent, anneaux de poussière beige, poussière au sol ; les poteaux sont
  soufflés vers l'extérieur, dans l'axe qui part d'Akira, en tournoyant.
- **Proportions et squelette** : haut du bras et cuisse rallongés (ils étaient
  plus courts que l'avant-bras et le tibia), épaules élargies, tête un peu plus
  petite (5,9 → 6,4 têtes), bassin remonté pour garder les pieds au sol.
  Écart squelette d'animation / os du modèle mesuré : 5 à 6 mm dans toutes les poses.
- **Cou** : élargissement plus léger et identique sur le visage et le corps
  (plus de marche à la couture) ; peau sous le col cachée.
- **Blocs noirs dans le ciel du menu** : un pixel invalide se propageait par le
  halo et le flou ; le post-traitement filtre maintenant ces valeurs.
- **« Accélérer » permanent** : « Passer » (qui disparaissait et ne s'arrêtait
  plus) devient un interrupteur ×4 en bas à droite, qu'on active et désactive
  quand on veut ; masqué dans les menus, les cartes et pendant la lecture.
- **Musique** : « Shirohae (The Rain Stops) » (bande originale de Naruto
  Shippûden), choisie par le joueur, dans la chambre et le menu.
- **Voix off calée sur la vraie parole** : le texte décrochait dès le 2ᵉ paragraphe (instants estimés, jusqu'à 4,8 s d'avance) ; `data-t`/`data-w` remesurés par reconnaissance vocale (Whisper small ONNX, transformers.js dans Node), alignés mot à mot sur le texte (615/628 mots reconnus, les autres interpolés), débuts de mots recalés sur la fin des silences ; `book.js` : mots en cache, une seule boucle, recalage aussi sur `timeupdate` ; `voice-book.js` vérifie 40 s de lecture continue.
- **Mains qui se retournaient** (chambre) : la butée de torsion du poignet
  (±95°) sautait d'un bord à l'autre quand l'orientation voulue passait par
  180° (retournement d'environ 170° en une image, en prenant et en rangeant
  les livres, au couvercle de la boîte à musique). La torsion suit maintenant
  le tour le plus proche de l'image précédente ; la prise du livre (paume sur
  le dos, impossible pour la main gauche) devient une prise par le haut, paume
  contre le plat, pouce sur la tranche ; la main au repos part d'une torsion
  neutre. Rêve vérifié : l'interpolation d'Euler des poses suit le chemin
  direct, pas de retournement des mains du modèle.
- **Vidéo à partager refaite** (`docs/media/reve.webm`, 31 s) : écran titre,
  menu (Histoire, HRP, clin d'œil et shunshin), puis Byakugan, rafale des 64
  paumes, Kûshô, Kaiten façon anime, pluie de ryō et final, avec le modèle
  aux nouvelles proportions.
- **Corrections du SWOT** : roue du menu à 2 catégories (l'autre ne s'affiche
  qu'une fois) ; plus de requête vers le portrait absent (erreur 404) ; porte
  ouverte du bout des doigts dans la poignée, paume de côté (le poignet
  devait plier à 116°) ; ~12 Ko de CSS et le code des écrans retirés supprimés.
- **Boîte à musique** : c'était un bloc plein avec le mécanisme posé dessus ;
  le cylindre dépassait de ~4 cm et traversait le couvercle fermé. Coffret
  creux (fond et quatre parois), mécanisme à l'intérieur, sous le couvercle.
- **Mains qui traversaient les livres et la porte** : mesuré phalange par
  phalange (distance à la boîte du livre, au panneau et au creux de la porte),
  jusqu'à 33 mm de paume et 30 mm de doigts dans les livres, 4 mm à la porte.
  Les doigts se referment maintenant comme de vrais doigts (`fitDigits`) :
  toutes les articulations plient ensemble, chaque phalange qui touche
  s'arrête et les suivantes s'enroulent autour. Prise du dos : paume et doigts
  à plat contre le plat, pouce passé autour du dos (nouveau réglage `wrap`,
  pouce un peu allongé) ; livre tenu : doigts derrière, pouces sur la
  couverture ; trajets courbés pour contourner les coins ; porte : doigts
  serrés dont le bout entre dans le creux. Même mise en scène, mêmes durées ;
  plus rien au-delà d'1 mm sur tout le parcours.
- Couverture et dos du carnet de l'histoire : le sceau d'un seul kanji (史)
  affichait « undefined » ; il est maintenant centré.
- Boîte à musique, vraies prises : le coffret, le couvercle et la clé ont une
  forme que les doigts sentent (avant : majeur 26 mm dans le coffret en
  remontant la clé ; maintenant 0). Akira s'approche à 30 cm (le bras
  s'étirait à 80 cm). Couvercle : rebord d'1 cm, le majeur et l'annulaire le
  soulèvent jusqu'à ~35°, puis il s'ouvre sur son élan. Clé : l'ailette plate
  devient une molette crantée (ronde : on la reprend pareil à chaque quart de
  tour), pincée du bout du pouce et de l'index (nouveau réglage `pinch` du
  pouce), paume vers la boîte, dans l'axe de l'avant-bras.
- Musique : plus rien avant la boîte à musique. Le menu jouait à la fois
  Shirohae et la flûte et les tambours du rêve ; il ne garde que le vent de
  l'orage. Shirohae démarre quand Akira a fini de remonter la clé (repli : la
  mélodie de la boîte si YouTube ne charge pas).

## Mardi 29 septembre

- **Hakkeshō Kaiten animé** (« fait une animation pour le tourbillon ») :
  garde basse et souple (genoux fléchis, paume près du visage, l'autre bras
  bas en arc), puis vraie rotation (≈ 2,6 tours/s : montée, plateau, freinage,
  arrêt face au point de départ) partant des hanches ; buste et bras en retard
  sur un ressort (effet de fouet), tête qui garde la cible avant de rattraper,
  bras qui s'ouvrent avec la vitesse (sans jamais se verrouiller), pivot sur le
  pied avant, glissé des pieds puis retour en garde Jûken.
- Dôme de chakra translucide bleu-blanc : stries en spirale qui tournent avec
  lui, bord lumineux, naissance rapide depuis le corps, déchirure en rafale
  à l'arrêt ; filets de chakra autour du corps ; sol creusé en cercle (sillons
  en spirale, herbe couchée qui se relève) ; poussière, feuilles et cailloux
  aspirés puis projetés en spirale ; poteaux soufflés dans le sens de la
  rotation ; caméra qui tourne autour, tremblement ; souffles à chaque tour.
