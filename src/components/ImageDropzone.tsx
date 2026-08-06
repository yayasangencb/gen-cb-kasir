import { Camera, CheckCircle2, Image as ImageIcon, Loader2, Trash2, UploadCloud } from "lucide-react";
import { useState } from "react";

export function ImageDropzone({
  imageUrl,
  uploading = false,
  onImageSelected,
  onUrlDropped,
  onImageRemoved,
  label = "Foto Produk (Maks. 10 MB)",
}: {
  imageUrl: string | null;
  uploading?: boolean;
  onImageSelected: (file: File) => Promise<void> | void;
  onUrlDropped?: (url: string) => Promise<void> | void;
  onImageRemoved?: () => void;
  label?: string;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const isBusy = uploading || internalLoading;

  const triggerBusy = () => {
    setInternalLoading(true);
    setTimeout(() => {
      setInternalLoading(false);
    }, 800);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    triggerBusy();

    // 1. Check if dropped item is a local File from disk
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setLocalPreview(url);
        try {
          await onImageSelected(file);
        } catch (err) {
          console.error("Drop file error:", err);
        }
        return;
      }
    }

    // 2. Check if dropped item is an Image / Link dragged from another website or tab!
    let droppedUrl =
      e.dataTransfer.getData("URL") ||
      e.dataTransfer.getData("text/uri-list") ||
      e.dataTransfer.getData("text/plain");

    if (!droppedUrl) {
      const html = e.dataTransfer.getData("text/html");
      if (html) {
        const match = html.match(/src=["'](https?:\/\/[^"']+|data:image\/[^"']+)["']/i);
        if (match && match[1]) droppedUrl = match[1];
      }
    }

    if (
      droppedUrl &&
      (droppedUrl.startsWith("http://") ||
        droppedUrl.startsWith("https://") ||
        droppedUrl.startsWith("data:image/"))
    ) {
      setLocalPreview(droppedUrl);
      if (onUrlDropped) {
        try {
          await onUrlDropped(droppedUrl);
        } catch (err) {
          console.error("Drop URL error:", err);
        }
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      triggerBusy();
      const url = URL.createObjectURL(file);
      setLocalPreview(url);
      try {
        await onImageSelected(file);
      } catch (err) {
        console.error("File selection error:", err);
      }
      e.target.value = "";
    }
  };

  const activeImage = imageUrl || localPreview;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="block text-xs font-bold text-[color:var(--brand-deep)]">{label}</span>
        {activeImage && !isBusy && (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
            <CheckCircle2 className="h-3.5 w-3.5" /> Foto Siap
          </span>
        )}
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col sm:flex-row items-center gap-4 rounded-3xl p-4 border-2 border-dashed transition-all ${
          isDragging
            ? "border-[color:var(--brand)] bg-[color:var(--brand)]/10 scale-[1.01] shadow-lg"
            : activeImage
            ? "border-emerald-500/50 bg-emerald-50/20 shadow-xs"
            : "border-border/80 bg-secondary/60 hover:border-[color:var(--brand)]/50 hover:bg-secondary"
        }`}
      >
        {/* Preview Square */}
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-white border border-border flex items-center justify-center shadow-xs">
          {activeImage ? (
            <img src={activeImage} alt="Preview Foto" className="h-full w-full object-cover" />
          ) : (
            <div className="text-center p-2 text-muted-foreground">
              <Camera className="mx-auto h-8 w-8 opacity-40 text-[color:var(--brand-deep)]" />
              <span className="text-[10px] font-extrabold block mt-1 text-muted-foreground">Rasio 1:1</span>
            </div>
          )}

          {isBusy && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white text-[11px] font-extrabold gap-1">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
              <span>Memproses...</span>
            </div>
          )}
        </div>

        {/* Dropzone Instruction & File Trigger */}
        <div className="flex-1 space-y-2 text-center sm:text-left">
          {isDragging ? (
            <div className="text-sm font-black text-[color:var(--brand)] animate-pulse">
              Lepaskan gambar di sini (File / Dari Tab Lain)...
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-bold text-foreground">
                <UploadCloud className="h-4 w-4 text-[color:var(--brand)]" />
                <span>Tarik & Lepas Foto (File Komputer / Tab Web Lain)</span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">
                Atau klik tombol di bawah untuk memilih gambar dari perangkat/kamera.
              </p>
            </>
          )}

          <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-1">
            <label className="btn-brand cursor-pointer inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold shadow-xs transition active:scale-95">
              {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
              {isBusy ? "Mengunggah..." : activeImage ? "Ganti Foto" : "Pilih Foto / Kamera"}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
                disabled={isBusy}
              />
            </label>

            {activeImage && onImageRemoved && (
              <button
                type="button"
                onClick={() => {
                  setLocalPreview(null);
                  onImageRemoved();
                }}
                className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-red-600 ring-1 ring-border hover:bg-red-50 transition active:scale-95"
              >
                <Trash2 className="h-3.5 w-3.5" /> Hapus Foto
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
