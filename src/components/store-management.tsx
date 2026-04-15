"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useStoredStores } from "@/lib/store-storage";
import { Locale, translations } from "@/lib/translations";
import { CoreBrand, Store, StoreType } from "@/types/store";

type StoreFormState = {
  id?: string;
  name: string;
  brand: string;
  collectionBrand: CoreBrand;
  type: StoreType;
  city: string;
  area: string;
  address: string;
  phone: string;
  website: string;
  lat: string;
  lng: string;
  distanceKm: string;
  hoursLabel: string;
  isOpen: boolean;
};

type AddressSuggestion = {
  id: string;
  label: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
};

const emptyForm: StoreFormState = {
  name: "",
  brand: "",
  collectionBrand: "HOKA",
  type: "owned",
  city: "Paris",
  area: "",
  address: "",
  phone: "",
  website: "",
  lat: "",
  lng: "",
  distanceKm: "1.0",
  hoursLabel: "10h - 19h",
  isOpen: true,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toFormState(store: Store): StoreFormState {
  return {
    id: store.id,
    name: store.name,
    brand: store.brand,
    collectionBrand: store.collectionBrand,
    type: store.type,
    city: store.city,
    area: store.area,
    address: store.address,
    phone: store.phone,
    website: store.website,
    lat: String(store.lat),
    lng: String(store.lng),
    distanceKm: String(store.distanceKm),
    hoursLabel: store.hoursLabel,
    isOpen: store.isOpen,
  };
}

function toStore(form: StoreFormState): Store {
  const slug = slugify(form.name || `${form.collectionBrand}-${form.area}`);

  return {
    id: form.id ?? slug,
    slug,
    name: form.name,
    brand: form.brand,
    collectionBrand: form.collectionBrand,
    type: form.type,
    city: form.city,
    area: form.area,
    address: form.address,
    phone: form.phone,
    website: form.website || "https://example.com",
    lat: Number(form.lat),
    lng: Number(form.lng),
    distanceKm: Number(form.distanceKm),
    hoursLabel: form.hoursLabel,
    isOpen: form.isOpen,
  };
}

export function StoreManagement({ baseUrl }: { baseUrl: string }) {
  const { stores, setStores } = useStoredStores();
  const [locale, setLocale] = useState<Locale>("fr");
  const [formState, setFormState] = useState<StoreFormState>(emptyForm);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<"link" | "iframe" | null>(null);
  const [geocodeState, setGeocodeState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [suggestionState, setSuggestionState] = useState<"idle" | "loading" | "empty">("idle");
  const t = translations[locale];
  const embedUrl = useMemo(() => `${baseUrl}/?embed=1`, [baseUrl]);
  const iframeSnippet = `<iframe src="${embedUrl}" style="width:100%;height:720px;border:0;" loading="lazy"></iframe>`;

  async function requestGeocode(address: string, city: string) {
    if (!address.trim()) {
      setGeocodeState("idle");
      return;
    }

    setGeocodeState("loading");

    try {
      const response = await fetch("/api/geocode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address,
          city,
        }),
      });

      if (!response.ok) {
        throw new Error("geocode_failed");
      }

      const data = (await response.json()) as { lat: number; lng: number };
      setFormState((current) => ({
        ...current,
        lat: String(data.lat),
        lng: String(data.lng),
      }));
      setGeocodeState("success");
    } catch {
      setGeocodeState("error");
    }
  }

  useEffect(() => {
    if (!formState.address.trim()) {
      setGeocodeState("idle");
      setSuggestions([]);
      setSuggestionState("idle");
      return;
    }

    const timeout = window.setTimeout(() => {
      void requestGeocode(formState.address, formState.city);
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [formState.address, formState.city]);

  useEffect(() => {
    const query = formState.address.trim();

    if (query.length < 3) {
      setSuggestions([]);
      setSuggestionState("idle");
      return;
    }

    const timeout = window.setTimeout(async () => {
      setSuggestionState("loading");

      try {
        const response = await fetch(`/api/address-suggest?q=${encodeURIComponent(query)}`);
        const data = (await response.json()) as { suggestions: AddressSuggestion[] };
        setSuggestions(data.suggestions);
        setSuggestionState(data.suggestions.length > 0 ? "idle" : "empty");
      } catch {
        setSuggestions([]);
        setSuggestionState("empty");
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [formState.address]);

  async function copyValue(value: string, key: "link" | "iframe") {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1800);
    } catch {}
  }

  function resetForm() {
    setFormState(emptyForm);
    setEditingStoreId(null);
    setGeocodeState("idle");
    setSuggestions([]);
    setSuggestionState("idle");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextStore = toStore(formState);

    setStores((currentStores) => {
      if (editingStoreId) {
        return currentStores.map((store) => (store.id === editingStoreId ? nextStore : store));
      }

      return [nextStore, ...currentStores];
    });

    resetForm();
  }

  function handleEdit(store: Store) {
    setEditingStoreId(store.id);
    setFormState(toFormState(store));
    setGeocodeState("idle");
    setSuggestions([]);
    setSuggestionState("idle");
  }

  function handleDelete(storeId: string) {
    setStores((currentStores) => currentStores.filter((store) => store.id !== storeId));
    if (editingStoreId === storeId) {
      resetForm();
    }
  }

  const geocodeMessage =
    geocodeState === "loading"
      ? t.geocodeStatusLoading
      : geocodeState === "success"
        ? t.geocodeStatusSuccess
        : geocodeState === "error"
          ? t.geocodeStatusError
          : t.geocodeStatusIdle;

  function applySuggestion(suggestion: AddressSuggestion) {
    setFormState((current) => ({
      ...current,
      address: suggestion.address,
      city: suggestion.city,
      lat: String(suggestion.lat),
      lng: String(suggestion.lng),
    }));
    setGeocodeState("success");
    setSuggestions([]);
    setSuggestionState("idle");
  }

  return (
    <div className="management-screen">
      <div className="locator-topbar">
        <div>
          <p className="sidebar-label">{t.managementDescription}</p>
          <h1>{t.managementTitle}</h1>
        </div>

        <div className="topbar-actions">
          <label className="language-switcher">
            <span>{t.languageLabel}</span>
            <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
              <option value="fr">FR</option>
              <option value="en">EN</option>
            </select>
          </label>

          <Link className="topbar-link" href="/">
            {t.storeLocatorLink}
          </Link>
        </div>
      </div>

      <section className="control-deck">
        <article className="utility-card">
          <div className="utility-card__header">
            <div>
              <p className="utility-kicker">Embed</p>
              <h2>{t.embedTitle}</h2>
            </div>
          </div>

          <p className="utility-copy">{t.embedDescription}</p>

          <label className="utility-field">
            <span>{t.embedUrl}</span>
            <div className="copy-row">
              <input readOnly value={embedUrl} />
              <button type="button" onClick={() => copyValue(embedUrl, "link")}>
                {copiedKey === "link" ? t.copied : t.copy}
              </button>
            </div>
          </label>

          <label className="utility-field">
            <span>{t.iframeSnippet}</span>
            <div className="copy-block">
              <textarea readOnly value={iframeSnippet} rows={4} />
              <button type="button" onClick={() => copyValue(iframeSnippet, "iframe")}>
                {copiedKey === "iframe" ? t.copied : t.copy}
              </button>
            </div>
          </label>
        </article>

        <article className="utility-card utility-card--management">
          <div className="utility-card__header">
            <div>
              <p className="utility-kicker">Gestion</p>
              <h2>{t.managementTitle}</h2>
            </div>
            <button type="button" className="ghost-button" onClick={resetForm}>
              {t.newStore}
            </button>
          </div>

          <form className="management-form" onSubmit={handleSubmit}>
            <label>
              <span>{t.storeName}</span>
              <input
                required
                value={formState.name}
                onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
              />
            </label>

            <div className="management-grid">
              <label>
                <span>{t.storeType}</span>
                <select
                  value={formState.type}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      type: event.target.value as StoreType,
                    }))
                  }
                >
                  <option value="owned">{t.brandStore}</option>
                  <option value="partner">{t.partnerStore}</option>
                </select>
              </label>

              <label>
                <span>{t.brand}</span>
                <select
                  value={formState.collectionBrand}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      collectionBrand: event.target.value as CoreBrand,
                      brand:
                        current.type === "owned" ? (event.target.value as CoreBrand) : current.brand,
                    }))
                  }
                >
                  <option value="HOKA">HOKA</option>
                  <option value="UGG">UGG</option>
                  <option value="TEVA">TEVA</option>
                </select>
              </label>
            </div>

            <label>
              <span>{t.displayBrand}</span>
              <input
                required
                value={formState.brand}
                onChange={(event) => setFormState((current) => ({ ...current, brand: event.target.value }))}
              />
            </label>

            <div className="management-grid">
              <label>
                <span>{t.area}</span>
                <input
                  required
                  value={formState.area}
                  onChange={(event) => setFormState((current) => ({ ...current, area: event.target.value }))}
                />
              </label>

              <label>
                <span>{t.distance}</span>
                <input
                  required
                  type="number"
                  step="0.1"
                  value={formState.distanceKm}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, distanceKm: event.target.value }))
                  }
                />
              </label>
            </div>

            <label>
              <span>{t.address}</span>
              <input
                required
                value={formState.address}
                onChange={(event) => setFormState((current) => ({ ...current, address: event.target.value }))}
              />
            </label>

            <div className="suggestion-panel">
              <span>{t.addressSuggestions}</span>
              {suggestionState === "loading" ? (
                <p className="suggestion-status">{t.suggestionLoading}</p>
              ) : null}
              {suggestionState === "empty" ? (
                <p className="suggestion-status">{t.suggestionEmpty}</p>
              ) : null}
              {suggestions.length > 0 ? (
                <div className="suggestion-list">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      className="suggestion-item"
                      onClick={() => applySuggestion(suggestion)}
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="geocode-row">
              <button
                type="button"
                className="ghost-button"
                disabled={geocodeState === "loading"}
                onClick={() => void requestGeocode(formState.address, formState.city)}
              >
                {t.geocodeButton}
              </button>
              <span className={`geocode-note is-${geocodeState}`}>{geocodeMessage}</span>
            </div>

            <div className="management-grid">
              <label>
                <span>{t.phone}</span>
                <input
                  required
                  value={formState.phone}
                  onChange={(event) => setFormState((current) => ({ ...current, phone: event.target.value }))}
                />
              </label>

              <label>
                <span>{t.hours}</span>
                <input
                  required
                  value={formState.hoursLabel}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, hoursLabel: event.target.value }))
                  }
                />
              </label>
            </div>

            <div className="management-grid">
              <label>
                <span>{t.latitude}</span>
                <input
                  required
                  value={formState.lat}
                  onChange={(event) => setFormState((current) => ({ ...current, lat: event.target.value }))}
                />
              </label>

              <label>
                <span>{t.longitude}</span>
                <input
                  required
                  value={formState.lng}
                  onChange={(event) => setFormState((current) => ({ ...current, lng: event.target.value }))}
                />
              </label>
            </div>

            <label>
              <span>{t.website}</span>
              <input
                value={formState.website}
                onChange={(event) => setFormState((current) => ({ ...current, website: event.target.value }))}
              />
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={formState.isOpen}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, isOpen: event.target.checked }))
                }
              />
              <span>{t.currentlyOpen}</span>
            </label>

            <div className="form-actions">
              <button type="submit">{editingStoreId ? t.save : t.add}</button>
              {editingStoreId ? (
                <button type="button" className="ghost-button" onClick={resetForm}>
                  {t.cancel}
                </button>
              ) : null}
            </div>
          </form>

          <div className="management-list">
            {stores.map((store) => (
              <div key={store.id} className="management-item">
                <div>
                  <strong>{store.name}</strong>
                  <span>
                    {store.collectionBrand} • {store.type === "owned" ? t.brandStore : t.partnerStore}
                  </span>
                </div>
                <div className="management-item__actions">
                  <button type="button" className="ghost-button" onClick={() => handleEdit(store)}>
                    {t.edit}
                  </button>
                  <button
                    type="button"
                    className="ghost-button ghost-button--danger"
                    onClick={() => handleDelete(store.id)}
                  >
                    {t.remove}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
