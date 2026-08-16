import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type AlertTone = "danger" | "warning" | "success" | "info";

const config: Record<AlertTone, { icon: typeof Info; classes: string }> = {
  danger: {
    icon: XCircle,
    classes: "bg-danger-soft border-danger/30 text-danger-soft-foreground",
  },
  warning: {
    icon: AlertTriangle,
    classes: "bg-warning-soft border-warning/30 text-warning-soft-foreground",
  },
  success: {
    icon: CheckCircle2,
    classes: "bg-success-soft border-success/30 text-success-soft-foreground",
  },
  info: {
    icon: Info,
    classes: "bg-info-soft border-info/30 text-info-soft-foreground",
  },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: AlertTone;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { icon: Icon, classes } = config[tone];

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-md border px-4 py-3 text-[13.5px] leading-relaxed", classes, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="flex-1">
        {title && <p className="font-medium">{title}</p>}
        <div className={title ? "mt-0.5 opacity-90" : undefined}>{children}</div>
      </div>
    </div>
  );
}
