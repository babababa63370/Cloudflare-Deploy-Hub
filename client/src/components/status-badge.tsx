import { cn } from "@/lib/utils";
import { CheckCircle2, CircleDashed, AlertCircle, XCircle } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();

  const config = {
    running: {
      color: "text-green-600 bg-green-500/10 border-green-500/20",
      icon: CheckCircle2,
      pulse: true,
    },
    pending: {
      color: "text-amber-600 bg-amber-500/10 border-amber-500/20",
      icon: CircleDashed,
      pulse: true,
    },
    failed: {
      color: "text-red-600 bg-red-500/10 border-red-500/20",
      icon: XCircle,
      pulse: false,
    },
    stopped: {
      color: "text-slate-500 bg-slate-500/10 border-slate-500/20",
      icon: AlertCircle,
      pulse: false,
    },
  }[normalizedStatus] || {
    color: "text-slate-500 bg-slate-500/10 border-slate-500/20",
    icon: CircleDashed,
    pulse: false,
  };

  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
        config.color,
        className
      )}
    >
      <div className={cn("flex items-center justify-center", config.pulse && "status-pulse")}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <span className="capitalize">{status}</span>
    </div>
  );
}
