import { Badge } from "@/components/ui/badge";
import { CERT_STATUS_LABEL } from "@/content/certifications";
import type { CertStatus } from "@/lib/data/types";
import { cn } from "@/lib/utils";

const STYLE: Record<CertStatus, string> = {
  planned: "bg-muted text-muted-foreground",
  studying: "bg-accent text-accent-foreground",
  applied: "bg-primary text-primary-foreground",
  passed: "bg-success text-success-foreground",
  failed: "bg-destructive/15 text-destructive",
  paused: "bg-muted text-muted-foreground line-through",
};

export function CertStatusBadge({ status }: { status: CertStatus }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", STYLE[status])}>
      {CERT_STATUS_LABEL[status]}
    </Badge>
  );
}
