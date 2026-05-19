import { ReactNode } from "react";

interface Props {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  children?: ReactNode;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  onConfirm,
  onCancel,
  destructive,
  children,
}: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-card p-5 shadow-xl sm:rounded-2xl">
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
        {children && <div className="mt-3">{children}</div>}
        <div className="mt-5 flex gap-2">
          <button
            onClick={onCancel}
            className="h-12 flex-1 rounded-xl bg-secondary font-semibold text-secondary-foreground active:scale-[0.98]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`h-12 flex-1 rounded-xl font-semibold active:scale-[0.98] ${
              destructive
                ? "bg-destructive text-destructive-foreground"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
