"use client";

import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ShieldCheck, UserRound, X } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";

const TOKEN_KEY = "trade_market_cloudflow_token";
const USER_KEY = "trade_market_cloudflow_user";

type LoginUser = {
  id: string;
  name: string;
  email: string;
};

type LoginResponse = {
  token: string;
  user: LoginUser;
};

type AuthMode = "signin" | "signup";
type SignInStep = "credentials" | "totp";

function parseError(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && value !== null) {
    const message = (value as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "Unknown error";
    }
  }

  return "Unknown error";
}

export function AuthModal() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [signInStep, setSignInStep] = useState<SignInStep>("credentials");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");

  const [signupLogin, setSignupLogin] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupRepeatPassword, setSignupRepeatPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !open) {
      return;
    }

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted, open]);

  function saveSession(session: LoginResponse) {
    window.localStorage.setItem(TOKEN_KEY, session.token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
    window.dispatchEvent(new CustomEvent("cloudflow-auth-updated"));
  }

  function resetTransientState() {
    setError(null);
    setSignInStep("credentials");
    setPassword("");
    setTotp("");
  }

  function closeModal() {
    setOpen(false);
    setMode("signin");
    resetTransientState();
  }

  function openModal() {
    setOpen(true);
    setMode("signin");
    resetTransientState();
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    resetTransientState();
  }

  async function submitSignUp() {
    if (
      !signupLogin.trim() ||
      !signupEmail.trim() ||
      !signupPassword.trim() ||
      !signupRepeatPassword.trim()
    ) {
      setError("Login, email and both password fields are required");
      return;
    }

    if (signupPassword !== signupRepeatPassword) {
      setError("Passwords do not match");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupLogin.trim(),
          email: signupEmail.trim(),
          password: signupPassword,
        }),
      });

      const payload = (await response.json().catch(() => null)) as LoginResponse | { message?: string } | null;

      if (!response.ok) {
        throw new Error(parseError(payload));
      }

      saveSession(payload as LoginResponse);
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitSignIn() {
    if (signInStep === "credentials") {
      if (!identifier.trim() || !password.trim()) {
        setError("Email/Login and password are required");
        return;
      }
      setError(null);
      setSignInStep("totp");
      return;
    }

    if (totp.trim() && !/^\d{6}$/.test(totp.trim())) {
      setError("TOTP code must contain 6 digits");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          totp: totp.trim() || undefined,
        }),
      });

      const payload = (await response.json().catch(() => null)) as LoginResponse | { message?: string } | null;

      if (!response.ok) {
        throw new Error(parseError(payload));
      }

      saveSession(payload as LoginResponse);
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();

    if (mode === "signup") {
      await submitSignUp();
      return;
    }

    await submitSignIn();
  }

  const modeButtons: Array<{ key: AuthMode; label: string }> = [
    { key: "signin", label: "Sign In" },
    { key: "signup", label: "Sign Up" },
  ];

  const modal = open ? (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Authentication dialog"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-surface-raised p-5 shadow-2xl shadow-black/40">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <p className="section-kicker">Authentication</p>
            <h2 className="mt-1 font-mono text-xl uppercase tracking-wider text-foreground">
              {mode === "signin" ? "Sign In" : "Sign Up"}
            </h2>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={closeModal} aria-label="Close modal">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="grid grid-cols-2 gap-2">
            {modeButtons.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => switchMode(item.key)}
                className={buttonClasses({
                  variant: mode === item.key ? "primary" : "secondary",
                  size: "sm",
                })}
              >
                {item.label}
              </button>
            ))}
          </div>

          {mode === "signup" ? (
            <>
              <LabeledInput
                id="signup-login"
                label="Login"
                value={signupLogin}
                onChange={setSignupLogin}
                placeholder="your-login"
                autoComplete="username"
              />
              <LabeledInput
                id="signup-email"
                label="Email"
                value={signupEmail}
                onChange={setSignupEmail}
                type="email"
                placeholder="name@example.com"
                autoComplete="email"
              />
              <LabeledInput
                id="signup-password"
                label="Password"
                value={signupPassword}
                onChange={setSignupPassword}
                type="password"
                autoComplete="new-password"
              />
              <LabeledInput
                id="signup-password-repeat"
                label="Repeat Password"
                value={signupRepeatPassword}
                onChange={setSignupRepeatPassword}
                type="password"
                autoComplete="new-password"
              />
            </>
          ) : signInStep === "credentials" ? (
            <>
              <LabeledInput
                id="auth-identifier"
                label="Email / Login"
                value={identifier}
                onChange={setIdentifier}
                placeholder="name@example.com or login"
                autoComplete="username"
              />
              <LabeledInput
                id="auth-password"
                label="Password"
                value={password}
                onChange={setPassword}
                type="password"
                autoComplete="current-password"
              />
            </>
          ) : (
            <>
              <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
                Signing in as: <span className="font-mono text-foreground">{identifier}</span>
              </div>
              <label className="grid gap-1.5 text-sm text-muted-foreground" htmlFor="auth-totp">
                TOTP (2FA)
                <div className="relative">
                  <ShieldCheck className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="auth-totp"
                    value={totp}
                    onChange={(event) => setTotp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="h-10 w-full rounded-md border border-border bg-surface pl-8 pr-3 font-mono text-sm text-foreground outline-none transition-colors focus:border-brand/40"
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  Enter 6-digit code from your authenticator app (if 2FA is enabled).
                </span>
              </label>
            </>
          )}

          {error ? (
            <p className="rounded-md border border-loss/40 bg-loss-muted px-2.5 py-2 text-xs text-loss">{error}</p>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-1">
            {mode === "signup" ? (
              <>
                <Button type="button" variant="secondary" onClick={closeModal} disabled={busy}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? "Creating..." : "Create Account"}
                </Button>
              </>
            ) : signInStep === "credentials" ? (
              <>
                <Button type="button" variant="secondary" onClick={closeModal} disabled={busy}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  Continue
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setSignInStep("credentials");
                    setError(null);
                  }}
                  disabled={busy}
                >
                  Back
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? "Signing In..." : "Sign In"}
                </Button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={buttonClasses({
          variant: "primary",
          size: "sm",
          className: "gap-1.5",
        })}
      >
        <UserRound className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Open Market</span>
      </button>
      {mounted ? createPortal(modal, document.body) : null}
    </>
  );
}
