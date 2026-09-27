import { createFileRoute } from "@tanstack/react-router";
import { ScanPage } from "@/components/DashboardPages";

export const Route = createFileRoute("/dashboard/scan")({
  component: ScanPage,
});
