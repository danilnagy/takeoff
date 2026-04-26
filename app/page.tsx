import { PdfUploader } from "@/components/PdfUploader";

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="flex items-center justify-between border-b border-gray-200 pb-5">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal text-ink">Takeoff</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Upload architectural PDFs, set scale, then measure counts, lengths, and areas directly on the drawing.
            </p>
          </div>
        </header>
        <PdfUploader />
      </div>
    </main>
  );
}
