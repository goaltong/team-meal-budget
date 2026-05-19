import { ReactNode } from "react";
import { formatKRW, formatDateTime } from "@/lib/format";

export interface TxRow {
  id: string;
  created_at: string;
  type: string;
  amount: number;
  balance_after: number;
  actor_nickname: string;
  memo: string | null;
  restaurant_id: string;
}

export function HistoryItem({ tx, restaurantName }: { tx: TxRow; restaurantName?: string }) {
  const isCharge = tx.type === "charge";
  const isSpend = tx.type === "spend";
  const over = tx.balance_after < 0;
  const sign = isCharge ? "+" : "-";
  const color = isCharge ? "text-success" : "text-destructive";
  const badge: ReactNode = isCharge
    ? <span className="rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-bold text-success">충전</span>
    : isSpend
      ? <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold text-destructive">차감</span>
      : <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">{tx.type}</span>;

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {badge}
            {restaurantName && <span className="truncate text-sm font-semibold text-foreground">{restaurantName}</span>}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {formatDateTime(tx.created_at)} · {tx.actor_nickname}
          </div>
          {tx.memo && <div className="mt-0.5 text-xs text-muted-foreground">메모: {tx.memo}</div>}
        </div>
        <div className="text-right">
          <div className={`text-base font-bold ${color}`}>{sign}{formatKRW(Math.abs(tx.amount)).replace("-", "")}</div>
          <div className="text-[11px] text-muted-foreground">잔액 {formatKRW(tx.balance_after)}</div>
          {over && <div className="text-[10px] font-semibold text-destructive">초과 사용</div>}
        </div>
      </div>
    </div>
  );
}
