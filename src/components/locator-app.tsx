"use client";

import dynamic from "next/dynamic";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { stores as initialStores } from "@/data/stores";
import {
  filterStores,
  getBrandWordmarkLabel,
  getStoreTypeFilterLabel,
  getStoreTypeLabel,
} from "@/lib/store-utils";
import { CoreBrand, Store, StoreType } from "@/types/store";

const STORE_STORAGE_KEY = "store-locator-poc-stores";

const DynamicLocatorMap = dynamic(
  () => import("@/components/locator-map").then((module) => module.LocatorMap),
  {
    ssr: false,
    loading: () => <div className="locator-map locator-map--loading">Loading map…</div>,
  },
);

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
  lat: "48.8566",
  lng: "2.3522",
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

export function LocatorApp({
  isEmbedMode = false,
  baseUrl,
}: {
  isEmbedMode?: boolean;
  baseUrl: string;
}) {
  const [stores, setStores] = useState<Store[]>(initialStores);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<StoreType | "all">("all");
  const [activeStoreId, setActiveStoreId] = useState("hoka-marais");
  const [formState, setFormState] = useState<StoreFormState>(emptyForm);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<"link" | "iframe" | null>(null);
  const hasHydratedLocalData = useRef(false);

  const deferredQuery = useDeferredValue(query);
  const embedUrl =
    typeof window === "undefined"
      ? `${baseUrl}/?embed=1`
      : `${window.location.origin}${window.location.pathname}?embed=1`;

  useEffect(() => {
    try {
      const rawStores = window.localStorage.getItem(STORE_STORAGE_KEY);
      if (rawStores) {
        const parsedStores = JSON.parse(rawStores) as Store[];
        if (Array.isArray(parsedStores) && parsedStores.length > 0) {
          window.setTimeout(() => {
            setStores(parsedStores);
          }, 0);
        }
      }
    } catch {}

    hasHydratedLocalData.current = true;
  }, []);

  useEffect(() => {
    if (!hasHydratedLocalData.current) {
      return;
    }

    window.localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(stores));
  }, [stores]);

  const visibleStores = useMemo(
    () =>
      filterStores(stores, {
        query: deferredQuery,
        type,
      }),
    [deferredQuery, stores, type],
  );

  const activeStore =
    visibleStores.find((store) => store.id === activeStoreId) ?? visibleStores[0] ?? null;

  const iframeSnippet = `<iframe src="${embedUrl}" style="width:100%;height:720px;border:0;" loading="lazy"></iframe>`;

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

    setActiveStoreId(nextStore.id);
    resetForm();
  }

  function handleEdit(store: Store) {
    setEditingStoreId(store.id);
    setFormState(toFormState(store));
  }

  function handleDelete(storeId: string) {
    setStores((currentStores) => currentStores.filter((store) => store.id !== storeId));
    if (activeStoreId === storeId) {
      setActiveStoreId("");
    }
    if (editingStoreId === storeId) {
      resetForm();
    }
  }

  return (
    <div className={`locator-embed ${isEmbedMode ? "is-embed" : "is-admin"}`}>
      {!isEmbedMode ? (
        <section className="control-deck">
          <article className="utility-card">
            <div className="utility-card__header">
              <div>
                <p className="utility-kicker">Embed</p>
                <h2>Iframe link ready to paste</h2>
              </div>
              <span className="sidebar-chip">POC</span>
            </div>

            <label className="utility-field">
              <span>Embed URL</span>
              <div className="copy-row">
                <input readOnly value={embedUrl} />
                <button type="button" onClick={() => copyValue(embedUrl, "link")}>
                  {copiedKey === "link" ? "Copie" : "Copier"}
                </button>
              </div>
            </label>

            <label className="utility-field">
              <span>Iframe snippet</span>
              <div className="copy-block">
                <textarea readOnly value={iframeSnippet} rows={4} />
                <button type="button" onClick={() => copyValue(iframeSnippet, "iframe")}>
                  {copiedKey === "iframe" ? "Copie" : "Copier"}
                </button>
              </div>
            </label>
          </article>

          <article className="utility-card utility-card--management">
            <div className="utility-card__header">
              <div>
                <p className="utility-kicker">Gestion</p>
                <h2>Editer la base de magasins</h2>
              </div>
              <button type="button" className="ghost-button" onClick={resetForm}>
                Nouveau
              </button>
            </div>

            <form className="management-form" onSubmit={handleSubmit}>
              <label>
                <span>Nom du magasin</span>
                <input
                  required
                  value={formState.name}
                  onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
                />
              </label>

              <div className="management-grid">
                <label>
                  <span>Type</span>
                  <select
                    value={formState.type}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        type: event.target.value as StoreType,
                      }))
                    }
                  >
                    <option value="owned">Brand store</option>
                    <option value="partner">Partner</option>
                  </select>
                </label>

                <label>
                  <span>Marque</span>
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
                <span>Brand / partenaire affiche</span>
                <input
                  required
                  value={formState.brand}
                  onChange={(event) => setFormState((current) => ({ ...current, brand: event.target.value }))}
                />
              </label>

              <div className="management-grid">
                <label>
                  <span>Quartier</span>
                  <input
                    required
                    value={formState.area}
                    onChange={(event) => setFormState((current) => ({ ...current, area: event.target.value }))}
                  />
                </label>

                <label>
                  <span>Distance (km)</span>
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
                <span>Adresse</span>
                <input
                  required
                  value={formState.address}
                  onChange={(event) => setFormState((current) => ({ ...current, address: event.target.value }))}
                />
              </label>

              <div className="management-grid">
                <label>
                  <span>Telephone</span>
                  <input
                    required
                    value={formState.phone}
                    onChange={(event) => setFormState((current) => ({ ...current, phone: event.target.value }))}
                  />
                </label>

                <label>
                  <span>Horaires</span>
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
                  <span>Latitude</span>
                  <input
                    required
                    value={formState.lat}
                    onChange={(event) => setFormState((current) => ({ ...current, lat: event.target.value }))}
                  />
                </label>

                <label>
                  <span>Longitude</span>
                  <input
                    required
                    value={formState.lng}
                    onChange={(event) => setFormState((current) => ({ ...current, lng: event.target.value }))}
                  />
                </label>
              </div>

              <label>
                <span>Site web</span>
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
                <span>Magasin actuellement ouvert</span>
              </label>

              <div className="form-actions">
                <button type="submit">{editingStoreId ? "Enregistrer" : "Ajouter"}</button>
                {editingStoreId ? (
                  <button type="button" className="ghost-button" onClick={resetForm}>
                    Annuler
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
                      {store.collectionBrand} • {store.type === "owned" ? "brand" : "partner"}
                    </span>
                  </div>
                  <div className="management-item__actions">
                    <button type="button" className="ghost-button" onClick={() => handleEdit(store)}>
                      Editer
                    </button>
                    <button type="button" className="ghost-button ghost-button--danger" onClick={() => handleDelete(store.id)}>
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      <div className="locator-toolbar">
        <div className="locator-search">
          <input
            type="search"
            aria-label="Search location"
            placeholder="Paris, Ile-de-France FR"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="button">Rechercher</button>
        </div>

        <div className="locator-filters" aria-label="Store type filters">
          {(["all", "owned", "partner"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={value === type ? "is-active" : ""}
              onClick={() => setType(value)}
            >
              {getStoreTypeFilterLabel(value)}
            </button>
          ))}
        </div>
      </div>

      <section className="locator-frame">
        <aside className="locator-sidebar" aria-label="Store list">
          <header className="sidebar-header">
            <div>
              <p className="sidebar-label">Paris selection</p>
              <h1>{visibleStores.length} stores around Paris</h1>
            </div>
            <span className="sidebar-chip">Iframe ready</span>
          </header>

          <div className="store-list">
            {visibleStores.map((store) => (
              <button
                key={store.id}
                type="button"
                className={`store-list-card ${activeStore?.id === store.id ? "is-active" : ""}`}
                onClick={() => setActiveStoreId(store.id)}
              >
                <div className="store-list-card__header">
                  <div>
                    {store.type === "owned" ? (
                      <span className={`brand-wordmark brand-wordmark--${store.collectionBrand.toLowerCase()}`}>
                        {getBrandWordmarkLabel(store.collectionBrand)}
                      </span>
                    ) : (
                      <span className="partner-label">{store.brand}</span>
                    )}
                    <h2>{store.name}</h2>
                    <p>{getStoreTypeLabel(store.type)}</p>
                  </div>
                  <span className="distance-pill">{store.distanceKm.toFixed(1)} km</span>
                </div>

                <div className="store-list-card__meta">
                  <span className={`status-pill ${store.isOpen ? "is-open" : "is-closed"}`}>
                    {store.isOpen ? "Ouvert" : "Ferme"}
                  </span>
                  <span>{store.hoursLabel}</span>
                </div>

                <p className="store-address">{store.address}</p>

                <a
                  className="store-phone"
                  href={`tel:${store.phone.replace(/\s+/g, "")}`}
                  onClick={(event) => event.stopPropagation()}
                >
                  {store.phone}
                </a>
              </button>
            ))}
          </div>
        </aside>

        <div className="locator-map-panel">
          <DynamicLocatorMap
            stores={visibleStores}
            activeStore={activeStore}
            onSelect={setActiveStoreId}
          />
        </div>
      </section>
    </div>
  );
}
