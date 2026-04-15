import { headers } from "next/headers";
import { LocatorApp } from "@/components/locator-app";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ embed?: string }>;
}) {
  const params = await searchParams;
  const requestHeaders = await headers();
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const host = requestHeaders.get("host") ?? "localhost:3010";
  const baseUrl = `${protocol}://${host}`;

  return <LocatorApp isEmbedMode={params.embed === "1"} baseUrl={baseUrl} />;
}
