"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";

import { filterStores, getBrandWordmarkLabel } from "@/lib/store-utils";
import { Locale, translations } from "@/lib/translations";
import { useStoredStores } from "@/lib/store-storage";
import { StoreType } from "@/types/store";

const DynamicLocatorMap = dynamic(
  () => import("@/components/locator-map").then((module) => module.LocatorMap),
  {
    ssr: false,
    loading: () => <div className="locator-map locator-map--loading">Loading map...</div>,
  },
);

export function StoreLocator({
  isEmbedMode = false,
}: {
  isEmbedMode?: boolean;
}) {
  const { stores } = useStoredStores();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<StoreType | "all">("all");
  const [activeStoreId, setActiveStoreId] = useState("hoka-marais");
  const [locale, setLocale] = useState<Locale>("fr");
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const t = translations[locale];

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

  const typeOptions = [
    { value: "all" as const, label: t.allStores },
    { value: "owned" as const, label: t.brandStores },
    { value: "partner" as const, label: t.partners },
  ];

  const handleLocateUser = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationStatus(t.locationUnsupported);
      return;
    }

    setIsLocating(true);
    setLocationStatus(null);

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserLocation([coords.latitude, coords.longitude]);
        setActiveStoreId("");
        setLocationStatus(t.locationReady);
        setIsLocating(false);
      },
      (error) => {
        setLocationStatus(
          error.code === error.PERMISSION_DENIED ? t.locationDenied : t.locationUnavailable,
        );
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  };

  return (
    <div className={`locator-screen ${isEmbedMode ? "is-embed" : ""}`}>
      <div className="locator-topbar">
        <div>
          <p className="sidebar-label">{t.locatorSubtitle}</p>
          <h1>{t.locatorTitle}</h1>
        </div>

        <div className="topbar-actions">
          <label className="language-switcher">
            <span>{t.languageLabel}</span>
            <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
              <option value="fr">FR</option>
              <option value="en">EN</option>
            </select>
          </label>

          {!isEmbedMode ? (
            <Link className="topbar-link" href="/manage">
              {t.adminLink}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="locator-layout">
        <aside className="locator-sidebar locator-sidebar--filters">
          <div className="sidebar-panel">
            <label className="search-block">
              <span>{t.searchButton}</span>
              <input
                type="search"
                placeholder={t.searchPlaceholder}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>

            <div className="location-tools">
              <button
                type="button"
                className="ghost-button location-button"
                onClick={handleLocateUser}
                disabled={isLocating}
              >
                {isLocating ? t.locating : t.locateMe}
              </button>

              {locationStatus ? <p className="location-note">{locationStatus}</p> : null}
            </div>
          </div>

          <div className="sidebar-panel">
            <p className="filter-title">{t.typeLabel}</p>
            <div className="filter-stack">
              {typeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`filter-chip ${type === option.value ? "is-active" : ""}`}
                  onClick={() => setType(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-panel sidebar-panel--count">
            <strong>{visibleStores.length}</strong>
            <span>{t.aroundParis}</span>
          </div>
        </aside>

        <aside className="locator-sidebar locator-sidebar--results" aria-label="Store list">
          <header className="sidebar-header">
            <div>
              <p className="sidebar-label">{t.locatorSubtitle}</p>
              <h2>{visibleStores.length} {t.aroundParis}</h2>
            </div>
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
                    <h3>{store.name}</h3>
                    <p>{store.type === "owned" ? t.brandStore : t.partnerStore}</p>
                  </div>
                  <span className="distance-pill">{store.distanceKm.toFixed(1)} km</span>
                </div>

                <div className="store-list-card__meta">
                  <span className={`status-pill ${store.isOpen ? "is-open" : "is-closed"}`}>
                    {store.isOpen ? t.open : t.closed}
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
            userLocation={userLocation}
            userLocationLabel={t.youAreHere}
          />
        </div>
      </div>
    </div>
  );
}
