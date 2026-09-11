import type { AlertLevel } from "@/app/types/btc-dashboard";

export function alertClasses(level: AlertLevel | string) {
  switch (level) {
    case "extreme":
      return {
        text: "text-alert-extreme",
        bg: "bg-extreme-10",
        border: "border-extreme",
      };
    case "notable":
      return {
        text: "text-alert-notable",
        bg: "bg-notable-10",
        border: "border-notable",
      };
    case "neutral":
      return {
        text: "text-neutral-sage",
        bg: "bg-sage-10",
        border: "border-sage",
      };
    default:
      return {
        text: "text-muted",
        bg: "bg-surface-2",
        border: "hairline",
      };
  }
}
