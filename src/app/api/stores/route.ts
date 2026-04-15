import { NextResponse } from "next/server";

import { StoreFilters, filterStores, stores } from "@/lib/store-utils";
import { StoreType } from "@/types/store";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const filters: StoreFilters = {
    query: searchParams.get("query") ?? undefined,
    type: (searchParams.get("type") as StoreType | "all" | null) ?? "all",
  };

  const result = filterStores(stores, filters);

  return NextResponse.json({
    total: result.length,
    filters,
    stores: result,
  });
}
