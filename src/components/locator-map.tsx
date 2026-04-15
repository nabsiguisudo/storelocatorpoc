"use client";

import { divIcon, latLngBounds } from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";

import { Store } from "@/types/store";

const parisCenter: [number, number] = [48.8566, 2.3522];

function FitBounds({ stores, activeStore }: { stores: Store[]; activeStore: Store | null }) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();

    if (activeStore) {
      map.flyTo([activeStore.lat, activeStore.lng], 13, {
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

  return divIcon({
    className: "",
    html: `<span class="locator-pin ${variant}${isActive ? " is-active" : ""}"></span>`,
    iconSize: [24, 34],
    iconAnchor: [12, 34],
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
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
        />
      ))}
    </MapContainer>
  );
}
