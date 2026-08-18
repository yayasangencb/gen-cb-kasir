import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { useEffect } from "react";

export type SweetAlertProps = {
  type: "success" | "warning" | "error" | "info";
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
};

export function SweetAlertModal({
  type,
  title,
  message,
  confirmText = "OK, Lanjutkan",
  cancelText = "Batal",
  showCancel = false,
  onConfirm,
  onCancel,
}: SweetAlertProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onCancel) onCancel();
      if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onConfirm, onCancel]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl ring-1 ring-slate-200 animate-in zoom-in-95 duration-200">
        {onCancel && (
          <button
            onClick={onCancel}
            className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Icon Animation Container */}
        <div className="mx-auto mb-4 flex items-center justify-center">
          {type === "success" && (
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100/80 animate-bounce">
              <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
              <CheckCircle2 className="h-12 w-12 text-emerald-600 relative z-10" />
            </div>
          )}

          {type === "warning" && (
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-amber-100/80 animate-pulse">
              <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />
              <AlertTriangle className="h-12 w-12 text-amber-600 relative z-10" />
            </div>
          )}

          {type === "error" && (
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-rose-100/80 animate-bounce">
              <XCircle className="h-12 w-12 text-rose-600 relative z-10" />
            </div>
          )}

          {type === "info" && (
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-blue-100/80 animate-pulse">
              <Info className="h-12 w-12 text-[#2952E3] relative z-10" />
            </div>
          )}
        </div>

        {/* Title & Description */}
        <h3 className="text-xl font-black text-[#111827]">{title}</h3>
        {message && <p className="mt-2 text-xs text-slate-500 font-medium leading-relaxed">{message}</p>}

        {/* Buttons */}
        <div className="mt-6 flex items-center justify-center gap-3">
          {showCancel && onCancel && (
            <button
              onClick={onCancel}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 py-3 text-xs font-extrabold text-slate-700 hover:bg-slate-100 transition active:scale-95"
            >
              {cancelText}
            </button>
          )}

          <button
            onClick={onConfirm}
            className={`w-full rounded-2xl py-3 text-xs font-black text-white shadow-lg transition active:scale-95 ${
              type === "warning"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                : type === "error"
                ? "bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800"
                : "bg-gradient-to-r from-[#F97316] to-[#FB923C] hover:from-[#EA580C] hover:to-[#F97316]"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
