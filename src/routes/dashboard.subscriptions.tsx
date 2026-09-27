import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout for /dashboard/subscriptions and /$subscriptionId */
export const Route = createFileRoute("/dashboard/subscriptions")({
  component: () => <Outlet />,
});
