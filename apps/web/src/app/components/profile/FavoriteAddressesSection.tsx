"use client";

import { useEffect, useState } from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import { FormField } from "@/app/components/ui/FormField";
import { GlassPanel } from "@/app/components/ui/GlassPanel";
import { useGeocoding, type GeocodingResult } from "@/app/hooks/useGeocoding";
import { usersService, type FavoriteAddress } from "@/app/services/users.service";

/** Adresses favorites : liste, ajout par recherche d'adresse, suppression. */
export function FavoriteAddressesSection() {
  const [addresses, setAddresses] = useState<FavoriteAddress[]>([]);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<GeocodingResult | null>(null);
  const [saving, setSaving] = useState(false);
  const suggestions = useGeocoding(picked ? "" : query);

  useEffect(() => {
    void usersService.listAddresses().then((result) => {
      if (result.isOk) setAddresses(result.data);
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

      {addresses.length > 0 && (
        <ul className="flex flex-col gap-2">
          {addresses.map((address) => (
            <li key={address.id} className="uf-inset flex items-center gap-3 rounded-uf-inset py-2 pr-1 pl-4">
              <MapPin size={18} aria-hidden="true" className="shrink-0" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate [font:var(--uf-body)]">{address.label}</span>
                <span className="truncate [font:var(--uf-note)] text-uf-ink-2">{address.address}</span>
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
          ))}
        </ul>
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
            <div className="relative">
              <FormField label="Adresse" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une adresse" />
              {suggestions.length > 0 && (
                <ul className="absolute right-0 left-0 z-10 mt-1 overflow-hidden rounded-uf-inset border border-uf-glass-edge bg-uf-glass-opaque shadow-lg">
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
