import { STATUS_LABEL } from "@/lib/format";
import type { Status } from "@/lib/types";

const STYLE: Record<Status, string> = {
  recommended: "bg-marigold-soft text-marigold-deep",
  confirmed: "bg-leaf-soft text-leaf",
  in_production: "bg-[#E6E9FA] text-ink",
  dispatched: "bg-[#E6E9FA] text-ink",
  delivered: "bg-leaf text-white",
  cancelled: "bg-brick-soft text-brick",
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
