import { PdfViewer } from "@/components/PdfViewer";

export default function PageViewerRoute({
  params
}: {
  params: { document_uuid: string; page_num: string };
}) {
  return (
    <PdfViewer
      documentId={params.document_uuid}
      pageNumber={Number(params.page_num)}
    />
  );
}
