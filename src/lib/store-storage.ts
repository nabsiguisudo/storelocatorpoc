"use client";

import { useEffect, useRef, useState } from "react";

import { stores as initialStores } from "@/data/stores";
import { Store } from "@/types/store";

const STORE_STORAGE_KEY = "store-locator-poc-stores";

export function useStoredStores() {
  const [stores, setStores] = useState<Store[]>(initialStores);
  const hasHydrated = useRef(false);

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

    hasHydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hasHydrated.current) {
      return;
    }

    window.localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(stores));
  }, [stores]);

  return { stores, setStores };
}
