export interface NavigationItem {
    label: string;
    href: string;
}

/** Les seuls écrans réels aujourd'hui. Cercle et Routines arriveront avec les étapes 4 et 5. */
export const NAVIGATION_ITEMS: NavigationItem[] = [
    { label: "Maintenant", href: "/" },
    { label: "Historique", href: "/trips" },
    { label: "Carbone", href: "/carbon" },
    { label: "Profil", href: "/profile" },
];

/** L'accueil n'est actif que sur « / » ; les autres onglets le restent sur leurs sous-pages. */
export function isActiveRoute(pathname: string, href: string): boolean {
    if (href === "/") {
        return pathname === "/";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
}
