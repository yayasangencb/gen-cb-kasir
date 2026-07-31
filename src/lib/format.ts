export function rupiah(n: number): string {
  return "Rp" + Math.round(n || 0).toLocaleString("id-ID");
}

export function queueLabel(n: number): string {
  return String(n).padStart(3, "0");
}

export function dateTimeID(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export function timeID(iso: string): string {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export function durationSince(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.max(0, Math.floor(ms / 60000));
  if (min < 60) return `${min} menit`;
  const h = Math.floor(min / 60);
  return `${h} jam ${min % 60} menit`;
}

export function percent(now: number, before: number): number | null {
  if (!before) return null;
  return ((now - before) / before) * 100;
}
