"use client";

import { useEffect, useState } from "react";
import { Home, MapPin, Plus, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import { FormField } from "@/app/components/ui/FormField";
import { GlassPanel } from "@/app/components/ui/GlassPanel";
import { useGeocoding, type GeocodingResult } from "@/app/hooks/useGeocoding";
import { usersService, type FavoriteAddress } from "@/app/services/users.service";

/** Adresses favorites : liste, ajout par recherche d'adresse, suppression, choix du domicile. */
export function FavoriteAddressesSection() {
  const [addresses, setAddresses] = useState<FavoriteAddress[]>([]);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<GeocodingResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [homeFailed, setHomeFailed] = useState(false);
  const suggestions = useGeocoding(picked ? "" : query);

  useEffect(() => {
    void usersService.listAddresses().then((result) => {
      if (!result.isOk) return;
      setAddresses(result.data);
      setLoaded(true);
    });
  }, []);

  function resetForm() {
    setAdding(false);
    setLabel("");
    setQuery("");
    setPicked(null);
  }

  async function handleAdd() {
    if (!picked || !label.trim()) return;
    setSaving(true);
    const result = await usersService.createAddress({
      label: label.trim(),
      address: picked.label,
      latitude: picked.latitude,
      longitude: picked.longitude,
    });
    setSaving(false);
    if (result.isOk) {
      setAddresses((previous) => [...previous, result.data]);
      resetForm();
    }
  }

  async function handleDelete(id: string) {
    const result = await usersService.deleteAddress(id);
    if (result.isOk) setAddresses((previous) => previous.filter((address) => address.id !== id));
  }

  async function handleSetHome(id: string) {
    setHomeFailed(false);
    const result = await usersService.setHomeAddress(id);
    if (!result.isOk) {
      setHomeFailed(true);
      return;
    }
    setAddresses((previous) => previous.map((address) => ({ ...address, isHome: address.id === id })));
  }

  const hasHome = addresses.some((address) => address.isHome);

  return (
    <GlassPanel as="section" aria-labelledby="tes-adresses" className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <h2 id="tes-adresses" className="[font:var(--uf-time)]">Tes adresses</h2>
        {!adding && (
          <Button variant="inset" onClick={() => setAdding(true)}>
            <Plus size={16} aria-hidden="true" />
            Ajouter
          </Button>
        )}
      </div>

      {addresses.length === 0 && !adding && (
        <p className="[font:var(--uf-body)] font-medium text-uf-ink-2">Aucune adresse enregistrée.</p>
      )}

      {loaded && !hasHome && !adding && (
        <p className="[font:var(--uf-note)]">Indique ton domicile pour voir ton dernier retour le soir.</p>
      )}

      {addresses.length > 0 && (
        <ul className="flex flex-col gap-2">
          {addresses.map((address) => {
            const Icon = address.isHome ? Home : MapPin;
            return (
              <li key={address.id} className="uf-inset flex items-center gap-3 rounded-uf-inset py-2 pr-1 pl-4">
                <Icon size={18} aria-hidden="true" className="shrink-0" />
                <span className="flex min-w-0 flex-1 flex-col items-start">
                  <span className="max-w-full truncate [font:var(--uf-body)]">{address.label}</span>
                  <span className="max-w-full truncate [font:var(--uf-note)] text-uf-ink-2">{address.address}</span>
                  {address.isHome ? (
                    <span className="[font:var(--uf-note)] font-bold">Chez moi</span>
                  ) : (
                    <Button
                      variant="text"
                      onClick={() => handleSetHome(address.id)}
                      aria-label={`${address.label} : c'est chez moi`}
                      className="-ml-3"
                    >
                      C&apos;est chez moi
                    </Button>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(address.id)}
                  aria-label={`Supprimer ${address.label}`}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full"
                >
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {homeFailed && (
        <p role="alert" className="[font:var(--uf-note)] font-bold">
          Domicile non enregistré. Réessaie dans un instant.
        </p>
      )}

      {adding && (
        <div className="flex flex-col gap-3">
          <FormField label="Nom" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Pharmacie de maman" />

          {picked ? (
            <div className="uf-inset flex items-center gap-3 rounded-uf-inset py-1 pr-1 pl-4">
              <MapPin size={18} aria-hidden="true" className="shrink-0" />
              <span className="flex-1 truncate [font:var(--uf-body)] font-medium">{picked.label}</span>
              <Button variant="text" onClick={() => setPicked(null)}>
                Changer
              </Button>
            </div>
          ) : (
            <div>
              <FormField label="Adresse" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une adresse" />
              {suggestions.length > 0 && (
                <ul className="mt-1 overflow-hidden rounded-uf-inset border border-uf-glass-edge bg-uf-glass-opaque">
                  {suggestions.map((suggestion, index) => (
                    <li key={index}>
                      <button
                        type="button"
                        onClick={() => {
                          setPicked(suggestion);
                          setQuery("");
                        }}
                        className="flex min-h-11 w-full flex-col justify-center px-4 py-2 text-left"
                      >
                        <span className="truncate [font:var(--uf-body)] font-bold">{suggestion.name}</span>
                        {suggestion.detail && <span className="truncate [font:var(--uf-note)] text-uf-ink-2">{suggestion.detail}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="primary" onClick={handleAdd} disabled={saving || !picked || !label.trim()} className="flex-1">
              {saving ? "Ajout…" : "Enregistrer"}
            </Button>
            <Button variant="text" onClick={resetForm}>
              Annuler
            </Button>
          </div>
        </div>
      )}
    </GlassPanel>
  );
}
