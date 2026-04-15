import { headers } from "next/headers";

import { StoreManagement } from "@/components/store-management";

export default async function ManagePage() {
  const requestHeaders = await headers();
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const host = requestHeaders.get("host") ?? "localhost:3010";
  const baseUrl = `${protocol}://${host}`;

  return <StoreManagement baseUrl={baseUrl} />;
}
