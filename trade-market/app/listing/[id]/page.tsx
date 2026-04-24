import { ServerDetailView } from "@/components/listing/server-detail-view";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ServerDetailView id={id} />;
}
