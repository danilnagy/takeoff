import { PageGrid } from "@/components/PageGrid";

export default function DocumentPage({
  params
}: {
  params: { document_uuid: string };
}) {
  return <PageGrid documentId={params.document_uuid} />;
}
