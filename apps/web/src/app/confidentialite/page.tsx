import { InfoPage, type InfoSection } from "@/app/components/ui/InfoPage";

const CONTACT_EMAIL = "contact@urbanflowapp.fr";

const SECTIONS: InfoSection[] = [
  {
    title: "En bref",
    paragraphs: [
      "UrbanFlow Mobility traite certaines de vos données pour vous fournir ses services de mobilité. Cette politique explique lesquelles, pourquoi, combien de temps elles sont conservées et quels sont vos droits.",
      "Les fonctions cœur (planification, empreinte carbone, transports à proximité) s'utilisent sans compte. Dernière mise à jour : juillet 2026.",
    ],
  },
  {
    title: "Responsable du traitement",
    paragraphs: [
      `Le responsable du traitement est UrbanFlow Mobility. Pour toute question relative à vos données ou pour exercer vos droits, écrivez à ${CONTACT_EMAIL}.`,
    ],
  },
  {
    title: "Données collectées",
    items: [
      "Compte : adresse email, nom, et soit un mot de passe stocké uniquement sous forme hachée, soit un identifiant de connexion Google.",
      "Préférences de mobilité : pondérations carbone, temps et coût, besoin d'accessibilité, modes préférés, objectif carbone mensuel.",
      "Adresses favorites que vous enregistrez.",
      "Trajets suivis et leur empreinte carbone, lorsqu'ils sont enregistrés depuis un compte.",
      "Position géographique, uniquement après votre consentement, pour vous localiser et calculer des itinéraires.",
    ],
  },
  {
    title: "Finalités et base légale",
    items: [
      "Calculer les itinéraires, gérer votre compte et vos préférences : exécution du service que vous demandez.",
      "Vous géolocaliser et afficher votre position : votre consentement, recueilli avant tout accès à la position.",
      "Estimer et suivre votre empreinte carbone : exécution du service, à partir des trajets que vous enregistrez.",
      "Sécuriser les comptes et prévenir les abus : notre intérêt légitime.",
    ],
  },
  {
    title: "Caractère facultatif",
    paragraphs: [
      "La création d'un compte et le partage de votre position sont facultatifs. Les fonctions cœur restent accessibles sans compte et sans géolocalisation, avec une expérience réduite (saisie manuelle des adresses, pas d'historique). Les informations demandées à l'inscription sont nécessaires à la création du compte.",
    ],
  },
  {
    title: "Destinataires",
    paragraphs: [
      "Vos données ne sont ni vendues ni louées. Pour calculer les itinéraires, les coordonnées de départ et d'arrivée sont transmises à nos prestataires techniques, strictement pour ce calcul. L'hébergement de l'application et de la base de données est également assuré par des sous-traitants.",
    ],
    links: [
      { label: "MapTiler (carte et géocodage)", href: "https://www.maptiler.com/privacy-policy/" },
      { label: "OpenRouteService (marche, vélo, fauteuil)", href: "https://openrouteservice.org/privacy-policy/" },
      { label: "Métromobilité (tram et bus)", href: "https://data.mobilites-m.fr" },
      { label: "Voi (trottinettes)", href: "https://www.voi.com/privacy-policy/" },
    ],
  },
  {
    title: "Transferts hors Union européenne",
    paragraphs: [
      "Certains prestataires, notamment d'hébergement et de cartographie, peuvent traiter des données en dehors de l'Union européenne. Ces transferts sont encadrés par des garanties appropriées, en particulier les clauses contractuelles types de la Commission européenne.",
    ],
  },
  {
    title: "Durée de conservation",
    items: [
      "Compte et préférences : conservés tant que le compte existe, supprimés à sa clôture.",
      "Trajets et empreinte carbone : liés au compte, supprimés avec lui.",
      "Position : traitée en temps réel, non conservée durablement.",
      "Cookie de session : expire à la déconnexion ou après quelques jours d'inactivité.",
    ],
  },
  {
    title: "Cookies",
    paragraphs: [
      "L'application utilise un unique cookie strictement nécessaire : votre jeton de session, httpOnly, inaccessible au JavaScript. Aucun cookie publicitaire ni outil de mesure d'audience tiers, donc aucune bannière de consentement n'est requise.",
    ],
  },
  {
    title: "Décision automatisée",
    paragraphs: [
      "Le classement des itinéraires est calculé automatiquement selon vos préférences. Il ne produit aucune décision ayant un effet juridique ou vous affectant de manière significative.",
    ],
  },
  {
    title: "Vos droits",
    items: [
      "Accès et rectification : vos informations et préférences sont modifiables depuis votre profil.",
      "Effacement : la suppression de votre compte, depuis Mon compte, efface en cascade vos préférences, vos adresses favorites et votre historique carbone.",
      "Retrait du consentement : l'accès à votre position peut être refusé ou révoqué à tout moment dans votre navigateur.",
      `Limitation, opposition et portabilité : sur demande à ${CONTACT_EMAIL}.`,
    ],
  },
  {
    title: "Réclamation",
    paragraphs: [
      "Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la Commission nationale de l'informatique et des libertés (CNIL).",
    ],
    links: [{ label: "www.cnil.fr", href: "https://www.cnil.fr" }],
  },
];

export default function ConfidentialitePage() {
  return <InfoPage title="Confidentialité" sections={SECTIONS} />;
}
