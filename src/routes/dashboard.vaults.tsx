import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout for /dashboard/vaults and /dashboard/vaults/$vaultId */
export const Route = createFileRoute("/dashboard/vaults")({
  component: () => <Outlet />,
});
