import LogoutClient from "./LogoutClient";

interface Props {
  searchParams: Promise<{ reason?: string }>;
}

export default async function LogoutPage({ searchParams }: Props) {
  const params = await searchParams;
  return <LogoutClient reason={params.reason || "manual"} />;
}
