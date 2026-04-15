import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { address?: string; city?: string };
  const address = body.address?.trim();
  const city = body.city?.trim() || "Paris";

  if (!address) {
    return NextResponse.json({ error: "missing_address" }, { status: 400 });
  }

  const query = `${address}, ${city}, France`;
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "1");
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
    return NextResponse.json({ error: "geocode_failed" }, { status: 502 });
  }

  const payload = (await response.json()) as {
    features?: Array<{
      geometry?: { coordinates?: [number, number] };
    }>;
  };
  const first = payload.features?.[0];

  if (!first) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    lat: Number(first.geometry?.coordinates?.[1]),
    lng: Number(first.geometry?.coordinates?.[0]),
  });
}
