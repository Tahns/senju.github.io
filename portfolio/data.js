// ============================================================
//  TOUT LE CONTENU DU PORTFOLIO EST ICI.
//  Modifie ce fichier, la page se met à jour toute seule.
//  Laisse un champ vide ("") ou une liste vide ([]) pour le masquer.
// ============================================================

window.PORTFOLIO = {
  nom: "Ton Nom",
  titre: "Ton poste / métier",
  localisation: "Ville, France",
  accroche:
    "Une phrase courte qui résume qui tu es et ce que tu apportes. Par exemple : développeur web passionné par les interfaces soignées et les projets utiles.",
  photo: "https://avatars.githubusercontent.com/u/161220499?v=4",
  disponible: "Ouvert aux opportunités",

  liens: {
    linkedin: "https://www.linkedin.com/in/ton-profil/",
    github: "https://github.com/Tahns",
    email: "", // ex : "prenom.nom@mail.com"
    cv: "", // ex : "cv.pdf" (dépose le fichier dans le dossier portfolio/)
  },

  apropos: [
    "Présente-toi en quelques phrases : ton parcours, ce qui te motive, le type de projets ou de poste que tu recherches.",
    "Tu peux reprendre la section « Infos » de ton LinkedIn ici.",
  ],

  experiences: [
    {
      poste: "Intitulé du poste",
      entreprise: "Entreprise",
      periode: "2024 — Aujourd'hui",
      description:
        "Deux ou trois lignes sur tes missions et tes résultats concrets. Reprends tes expériences LinkedIn.",
    },
    {
      poste: "Intitulé du poste précédent",
      entreprise: "Entreprise",
      periode: "2022 — 2024",
      description: "Missions principales, outils utilisés, réussites.",
    },
  ],

  formation: [
    {
      diplome: "Nom du diplôme",
      ecole: "École / Université",
      periode: "2020 — 2022",
    },
  ],

  competences: [
    { groupe: "Langages", items: ["HTML", "CSS", "JavaScript"] },
    { groupe: "Outils", items: ["Git", "GitHub", "VS Code"] },
    { groupe: "Soft skills", items: ["Autonomie", "Organisation", "Rédaction"] },
  ],

  projets: [
    {
      nom: "Fiche personnage interactive",
      description:
        "Un livre animé en HTML/CSS/JS : les pages se tournent pour présenter l'histoire, les ambitions et l'apparence d'un personnage de jeu de rôle.",
      tags: ["HTML", "CSS", "JavaScript"],
      lien: "https://tahns.github.io/senju.github.io/",
      code: "https://github.com/Tahns/senju.github.io",
    },
    {
      nom: "Politique France",
      description: "Décris ce projet en une ou deux phrases : son but et ce que tu as réalisé.",
      tags: ["HTML"],
      lien: "",
      code: "https://github.com/Tahns/politique-france",
    },
  ],

  langues: ["Français — natif", "Anglais — à préciser"],
};
