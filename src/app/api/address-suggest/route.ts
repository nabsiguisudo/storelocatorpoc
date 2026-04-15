import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", `${query}, Paris, France`);
  url.searchParams.set("limit", "5");
  url.searchParams.set("lang", "fr");
  url.searchParams.set("lat", "48.8566");
  url.searchParams.set("lon", "2.3522");

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "StoreLocatorPOC/1.0",
      Accept: "application/json",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }

  const payload = (await response.json()) as {
    features?: Array<{
      properties?: {
        name?: string;
        street?: string;
        housenumber?: string;
        postcode?: string;
        city?: string;
      };
      geometry?: {
        coordinates?: [number, number];
      };
    }>;
  };

  const suggestions =
    payload.features?.map((feature, index) => {
      const properties = feature.properties ?? {};
      const streetLine = [properties.housenumber, properties.street].filter(Boolean).join(" ");
      const cityLine = [properties.postcode, properties.city].filter(Boolean).join(" ");
      const label = [streetLine || properties.name, cityLine].filter(Boolean).join(", ");

      return {
        id: `${label}-${index}`,
        label,
        address: label,
        city: properties.city || "Paris",
        lat: Number(feature.geometry?.coordinates?.[1]),
        lng: Number(feature.geometry?.coordinates?.[0]),
      };
    }) ?? [];

  return NextResponse.json({ suggestions });
}
