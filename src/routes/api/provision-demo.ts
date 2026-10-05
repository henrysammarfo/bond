import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";
import { provisionDemoLogin } from "@/backend/demo/provision-login";

export const Route = createFileRoute("/api/provision-demo")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const headerSecret = request.headers.get("x-bond-provision-secret");
        const body = (await request.json().catch(() => ({}))) as { secret?: string };
        const secret = headerSecret ?? body.secret;
        const expected = process.env.PROVISION_SECRET;

        if (!expected) {
          return Response.json({ error: "Provision endpoint is not configured." }, { status: 503 });
        }
        if (!secret) {
          return Response.json({ error: "Missing provision secret." }, { status: 401 });
        }

        const got = Buffer.from(secret);
        const want = Buffer.from(expected);
        if (got.length !== want.length || !timingSafeEqual(got, want)) {
          return Response.json({ error: "Forbidden." }, { status: 403 });
        }

        const result = await provisionDemoLogin();
        return Response.json(result);
      },
    },
  },
});
