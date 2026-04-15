import { stores } from "@/data/stores";
import { Store, StoreType } from "@/types/store";

export type StoreFilters = {
  query?: string;
  type?: StoreType | "all";
};

const typePriority: Record<StoreType, number> = {
  owned: 2,
  partner: 1,
};

export function filterStores(sourceStores: Store[], filters: StoreFilters): Store[] {
  const query = filters.query?.trim().toLowerCase();

  return sourceStores
    .filter((store) => {
      if (filters.type && filters.type !== "all" && store.type !== filters.type) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        store.name,
        store.city,
        store.area,
        store.brand,
        store.address,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    })
    .sort((left, right) => {
      const scoreDiff = typePriority[right.type] - typePriority[left.type];

      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return left.distanceKm - right.distanceKm;
    });
}

export function getStoreTypeLabel(type: StoreType) {
  switch (type) {
    case "owned":
      return "HOKA Brand Store";
    case "partner":
      return "Partner Store";
  }
}

export function getStoreTypeFilterLabel(type: StoreType | "all") {
  switch (type) {
    case "all":
      return "All Stores";
    case "owned":
      return "Brand Stores";
    case "partner":
      return "Partners";
  }
}

export function getBrandWordmarkLabel(brand: Store["collectionBrand"]) {
  return brand;
}

export { stores };
