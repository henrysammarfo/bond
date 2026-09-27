import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/Button";
import { loginFn, registerFn } from "@/backend/fns/auth";

const searchSchema = z.object({
  next: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — BOND" },
      { name: "description", content: "Sign in to your BOND treasury workspace." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [orgName, setOrgName] = useState("");

  const login = useMutation({
    mutationFn: () => loginFn({ data: { email, password } }),
    onSuccess: () => void navigate({ to: next || "/dashboard" }),
  });
  const register = useMutation({
    mutationFn: () =>
      registerFn({
        data: { email, password, displayName, orgName },
      }),
    onSuccess: () => void navigate({ to: "/dashboard" }),
  });

  const pending = login.isPending || register.isPending;
  const error = login.error || register.error;

  return (
    <div className="grid min-h-screen place-items-center bg-hero px-5 text-hero-foreground">
      <div className="w-full max-w-md rounded-xl border border-white/15 bg-white/5 p-8 backdrop-blur-xl">
        <Brand inverted />
        <h1 className="mt-8 font-display text-3xl font-semibold">
          {mode === "login" ? "Sign in" : "Create workspace"}
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Server sessions only — no localStorage for auth or balances.
        </p>
        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (mode === "login") login.mutate();
            else register.mutate();
          }}
        >
          {mode === "register" && (
            <>
              <label className="block text-xs text-white/60">
                Display name
                <input
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-2 h-11 w-full rounded-md border border-white/20 bg-black/40 px-3 text-white"
                />
              </label>
              <label className="block text-xs text-white/60">
                Organization
                <input
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="mt-2 h-11 w-full rounded-md border border-white/20 bg-black/40 px-3 text-white"
                />
              </label>
            </>
          )}
          <label className="block text-xs text-white/60">
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-white/20 bg-black/40 px-3 text-white"
            />
          </label>
          <label className="block text-xs text-white/60">
            Password
            <input
              required
              type="password"
              minLength={10}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-white/20 bg-black/40 px-3 text-white"
            />
          </label>
          {error && (
            <p className="text-xs text-red-300">
              {error instanceof Error ? error.message : "Failed"}
            </p>
          )}
          <Button
            type="submit"
            disabled={pending}
            className="h-10 min-h-10 w-full bg-white text-sm font-semibold text-black hover:bg-white/90"
          >
            {pending ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>
        <button
          type="button"
          className="mt-6 text-sm text-white/70 underline"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "Need an org? Register" : "Already have an account? Sign in"}
        </button>
        <p className="mt-6 text-center text-xs text-white/40">
          <Link to="/" className="underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
