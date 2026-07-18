import { InfoPage, type InfoSection } from "@/app/components/ui/InfoPage";

const SECTIONS: InfoSection[] = [
  {
    title: "En bref",
    paragraphs: [
      "L'essentiel pour utiliser UrbanFlow. Les fonctions principales s'utilisent sans compte ; la connexion sert à retrouver vos préférences, vos adresses et votre historique.",
    ],
  },
  {
    title: "Planifier un trajet",
    paragraphs: [
      "Saisissez un départ et une destination. L'application propose la marche seule, le vélo seul, et des combinaisons de transport en commun (tram, bus), chacune avec sa durée, ses correspondances et son empreinte carbone.",
    ],
  },
  {
    title: "Comparer les itinéraires",
    paragraphs: [
      "Les combinaisons de transport sont classées selon un score qui pèse le carbone, le temps et le coût. Avec un compte, ce classement suit vos préférences.",
    ],
  },
  {
    title: "Empreinte carbone",
    paragraphs: [
      "Chaque trajet affiche ses émissions, calculées à partir des facteurs officiels de l'ADEME, en grammes de CO₂ par passager et par kilomètre. La page Mon empreinte suit vos économies dans le temps.",
    ],
  },
  {
    title: "Accessibilité",
    paragraphs: [
      "Activez l'option d'accessibilité dans votre profil : le calcul d'itinéraire bascule en mode fauteuil roulant, sur les portions à pied comme dans les transports.",
    ],
  },
  {
    title: "Compte et données",
    paragraphs: [
      "La connexion, par email ou Google, donne accès au profil, aux adresses favorites et à l'historique. Depuis Mon compte, vous pouvez modifier votre nom, votre mot de passe, et supprimer votre compte.",
    ],
  },
  {
    title: "Adresses favorites",
    paragraphs: [
      "Enregistrez vos lieux fréquents depuis votre profil, avec un nom libre et une adresse recherchée sur la carte.",
    ],
  },
  {
    title: "Pas de transport en commun sur un trajet ?",
    paragraphs: [
      "Si un service de transport est momentanément indisponible, l'application renvoie quand même les itinéraires calculables, comme la marche ou le vélo, plutôt que d'échouer.",
    ],
  },
  {
    title: "Géolocalisation",
    paragraphs: [
      "L'application demande votre position pour vous localiser et améliorer les itinéraires. Vous pouvez refuser : les fonctions cœur restent disponibles.",
    ],
  },
];

export default function AidePage() {
  return <InfoPage title="Aide" sections={SECTIONS} />;
}