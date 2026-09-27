import { createFileRoute } from "@tanstack/react-router"; import { DashboardShell } from "@/components/DashboardShell";
export const Route=createFileRoute("/dashboard")({component:DashboardShell});