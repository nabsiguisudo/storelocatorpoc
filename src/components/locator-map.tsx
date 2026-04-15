"use client";

import { divIcon, latLngBounds } from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";

import { Store } from "@/types/store";

const parisCenter: [number, number] = [48.8566, 2.3522];

function FitBounds({ stores, activeStore }: { stores: Store[]; activeStore: Store | null }) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();

    if (activeStore) {
      map.flyTo([activeStore.lat, activeStore.lng], 15, {
        animate: true,
        duration: 0.6,
      });
      return;
    }

    if (stores.length > 0) {
      const bounds = latLngBounds(stores.map((store) => [store.lat, store.lng]));
      map.fitBounds(bounds.pad(0.18));
    }
  }, [activeStore, map, stores]);

  return null;
}

function createMarker(store: Store, isActive: boolean) {
  const variant =
    store.type === "owned"
      ? `locator-pin--owned-${store.collectionBrand.toLowerCase()}`
      : "locator-pin--partner";
  const badge =
    store.type === "owned"
      ? `<span class="locator-marker__badge locator-marker__badge--${store.collectionBrand.toLowerCase()}">${store.collectionBrand}</span>`
      : "";

  return divIcon({
    className: "",
    html: `<span class="locator-marker ${isActive ? "is-active" : ""}">${badge}<span class="locator-pin ${variant}${isActive ? " is-active" : ""}"></span></span>`,
    iconSize: [68, 64],
    iconAnchor: [34, 52],
  });
}

export function LocatorMap({
  stores,
  activeStore,
  onSelect,
}: {
  stores: Store[];
  activeStore: Store | null;
  onSelect: (storeId: string) => void;
}) {
  return (
    <MapContainer
      center={parisCenter}
      zoom={12}
      scrollWheelZoom
      className="locator-map"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />

      <FitBounds stores={stores} activeStore={activeStore} />

      {stores.map((store) => (
        <Marker
          key={store.id}
          position={[store.lat, store.lng]}
          icon={createMarker(store, activeStore?.id === store.id)}
          eventHandlers={{
            click: () => onSelect(store.id),
          }}
        >
          {activeStore?.id === store.id ? (
            <Tooltip
              permanent
              direction="right"
              offset={[18, -16]}
              className="store-map-tooltip"
              opacity={1}
            >
              <div className="store-map-tooltip__inner">
                <strong>{store.name}</strong>
                <span>{store.address}</span>
                <span>{store.hoursLabel}</span>
                <span>{store.phone}</span>
              </div>
            </Tooltip>
          ) : null}
        </Marker>
      ))}
    </MapContainer>
  );
}
