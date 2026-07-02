import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import type { ToastMessage } from "../types";

export function Toast({ toast }: { toast: ToastMessage | null }) {
  if (!toast) return null;
  const Icon = toast.kind === "success" ? CheckCircle2 : toast.kind === "error" ? AlertCircle : Info;

  return (
    <div className={`app-toast app-toast--${toast.kind}`} role={toast.kind === "error" ? "alert" : "status"}>
      <Icon size={17} />
      <span>{toast.message}</span>
    </div>
  );
}
