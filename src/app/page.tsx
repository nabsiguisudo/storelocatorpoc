import { headers } from "next/headers";
import { StoreLocator } from "@/components/store-locator";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ embed?: string }>;
}) {
  const params = await searchParams;
  await headers();

  return <StoreLocator isEmbedMode={params.embed === "1"} />;
}
