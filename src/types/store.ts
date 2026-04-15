export type StoreType = "owned" | "partner";
export type CoreBrand = "HOKA" | "UGG" | "TEVA";

export type Store = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  collectionBrand: CoreBrand;
  type: StoreType;
  city: string;
  area: string;
  address: string;
  phone: string;
  website: string;
  lat: number;
  lng: number;
  distanceKm: number;
  hoursLabel: string;
  isOpen: boolean;
};
