export type StopKind = "origin" | "stop" | "transfer" | "destination";

/** Point d'un trajet, d'après la page Composants. Décoratif : le nom de l'arrêt est écrit à côté. */
export function StopNode({ kind }: { kind: StopKind }) {
    if (kind === "origin") {
        return <span aria-hidden="true" data-kind={kind} className="block size-4 box-border rounded-full border-[3px] border-uf-ink" />;
    }
    if (kind === "transfer") {
        return (
            <span aria-hidden="true" data-kind={kind} className="flex size-4 box-border items-center justify-center rounded-full border-2 border-uf-ink">
                <span className="size-1.5 rounded-full bg-uf-ink" />
            </span>
        );
    }
    if (kind === "destination") {
        return <span aria-hidden="true" data-kind={kind} className="block size-4 rounded-[5px] bg-uf-ink" />;
    }
    return (
        <span aria-hidden="true" data-kind={kind} className="flex size-4 items-center justify-center">
            <span className="size-2 rounded-full bg-uf-ink" />
        </span>
    );
}
