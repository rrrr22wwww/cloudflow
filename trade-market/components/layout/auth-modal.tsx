"use client";

import { FormEvent, useState, type ComponentProps } from "react";
import { LockKeyhole, Server, UserRound, X } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { saveStoredSession, type SessionUser } from "@/lib/auth-session";

type LoginResponse = {
  token: string;
  user: SessionUser;
};

type AuthMode = "signin" | "signup";
type SignInStep = "credentials" | "email-code";

type OtpChallengeResponse = {
  challengeId: string;
  email: string;
  expiresIn: number;
  delivery: "email" | "dev";
  devCode?: string;
};

type AuthFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: ComponentProps<"input">["type"];
  placeholder?: string;
  autoComplete?: string;
  inputMode?: ComponentProps<"input">["inputMode"];
  maxLength?: number;
  disabled?: boolean;
  hint?: string;
};

function AuthField({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  inputMode,
  maxLength,
  disabled,
  hint,
}: AuthFieldProps) {
  return (
    <Field>
      <FieldLabel className="font-mono text-[11px] uppercase tracking-wider" htmlFor={id}>
        {label}
      </FieldLabel>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        disabled={disabled}
        className="h-9 text-xs"
      />
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </Field>
  );
}

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

function isLoginResponse(value: unknown): value is LoginResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const session = value as Partial<LoginResponse>;
  const user = session.user as Partial<SessionUser> | undefined;

  return (
    typeof session.token === "string" &&
    session.token.length > 0 &&
    typeof user === "object" &&
    user !== null &&
    typeof user.id === "string" &&
    typeof user.name === "string" &&
    typeof user.email === "string"
  );
}

function isOtpChallengeResponse(value: unknown): value is OtpChallengeResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Partial<OtpChallengeResponse>;

  return (
    typeof payload.challengeId === "string" &&
    payload.challengeId.length > 0 &&
    typeof payload.email === "string" &&
    typeof payload.expiresIn === "number" &&
    (payload.delivery === "email" || payload.delivery === "dev")
  );
}

function readSessionPayload(payload: unknown, fallbackMessage: string) {
  if (!isLoginResponse(payload)) {
    throw new Error(parseError(payload) === "Unknown error" ? fallbackMessage : parseError(payload));
  }

  return payload;
}

export function AuthModal() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signin");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [signInStep, setSignInStep] = useState<SignInStep>("credentials");
  const [otpCode, setOtpCode] = useState("");
  const [otpChallengeId, setOtpChallengeId] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpDevCode, setOtpDevCode] = useState<string | null>(null);

  const [signupLogin, setSignupLogin] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupRepeatPassword, setSignupRepeatPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetTransientState() {
    setError(null);
    setPassword("");
    setSignInStep("credentials");
    setOtpCode("");
    setOtpChallengeId("");
    setOtpEmail("");
    setOtpDevCode(null);
  }

  function setDialogOpen(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setMode("signin");
      resetTransientState();
    }
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

      const payload = (await response.json().catch(() => null)) as
        | LoginResponse
        | { message?: string }
        | null;

      if (!response.ok) {
        throw new Error(parseError(payload));
      }

      saveStoredSession(readSessionPayload(payload, "Registration failed: no valid session returned"));
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitSignIn() {
    if (signInStep === "email-code") {
      if (!otpChallengeId || !/^\d{6}$/.test(otpCode.trim())) {
        setError("Enter the 6-digit code from email");
        return;
      }

      setBusy(true);
      setError(null);

      try {
        const response = await fetch("/api/auth/email-otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            challengeId: otpChallengeId,
            code: otpCode.trim(),
          }),
        });

        const payload = (await response.json().catch(() => null)) as
          | LoginResponse
          | { message?: string }
          | null;

        if (!response.ok) {
          throw new Error(parseError(payload));
        }

        saveStoredSession(readSessionPayload(payload, "2FA verification failed"));
        setDialogOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "2FA verification failed");
      } finally {
        setBusy(false);
      }

      return;
    }

    if (!identifier.trim() || !password.trim()) {
      setError("Email/Login and password are required");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/email-otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | OtpChallengeResponse
        | { message?: string }
        | null;

      if (!response.ok) {
        throw new Error(parseError(payload));
      }

      if (!isOtpChallengeResponse(payload)) {
        throw new Error(parseError(payload) === "Unknown error" ? "Failed to send 2FA code" : parseError(payload));
      }

      setOtpChallengeId(payload.challengeId);
      setOtpEmail(payload.email);
      setOtpDevCode(payload.devCode ?? null);
      setOtpCode("");
      setPassword("");
      setSignInStep("email-code");
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

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger
        className={buttonClasses({
          variant: "primary",
          size: "sm",
          className: "gap-1.5",
        })}
        onClick={() => {
          setMode("signin");
          resetTransientState();
        }}
      >
        <UserRound data-icon="inline-start" className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Open Market</span>
      </DialogTrigger>

      <DialogContent className="max-w-[460px] overflow-hidden p-0">
        <div className="relative border-b border-border/70 bg-[linear-gradient(135deg,hsl(var(--surface-overlay)/0.95),hsl(var(--surface-raised))_58%,hsl(var(--brand-muted)/0.55))] px-5 py-4">
          <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(circle,hsl(var(--border))_1px,transparent_1px)] [background-size:18px_18px]" />
          <div className="relative flex items-start justify-between gap-3">
            <DialogHeader className="mb-0">
              <div className="mb-2 flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-md border border-brand/40 bg-brand-muted text-brand">
                  {mode === "signin" ? (
                    <LockKeyhole className="size-3.5" />
                  ) : (
                    <Server className="size-3.5" />
                  )}
                </span>
                <DialogDescription>CloudFlow Account</DialogDescription>
              </div>
              <DialogTitle className="text-sm">
                {mode === "signin" ? "Sign in to marketplace" : "Create trading account"}
              </DialogTitle>
              <p className="max-w-sm text-xs text-muted-foreground">
                {mode === "signin"
                  ? "Use your email or login to rent and publish server listings."
                  : "Registration returns a JWT, so you will be signed in immediately."}
              </p>
            </DialogHeader>
            <DialogClose
              className={buttonClasses({
                variant: "ghost",
                size: "sm",
                className: "h-7 w-7 px-0",
              })}
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </DialogClose>
          </div>
        </div>

        <div className="px-5 py-4">
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <Tabs value={mode} onValueChange={(value) => switchMode(value as AuthMode)}>
              <TabsList className="w-full">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="pt-1">
                {signInStep === "credentials" ? (
                  <FieldGroup>
                    <AuthField
                      id="auth-identifier"
                      label="Email / Login"
                      value={identifier}
                      onChange={setIdentifier}
                      placeholder="name@example.com or login"
                      autoComplete="username"
                    />
                    <AuthField
                      id="auth-password"
                      label="Password"
                      value={password}
                      onChange={setPassword}
                      type="password"
                      autoComplete="current-password"
                      hint="We will email a 6-digit code after the password is verified."
                    />
                  </FieldGroup>
                ) : (
                  <FieldGroup>
                    <Alert>
                      <AlertDescription>
                        We sent a 6-digit sign-in code to {otpEmail}. It expires in 5 minutes.
                      </AlertDescription>
                    </Alert>
                    {otpDevCode ? (
                      <Alert>
                        <AlertDescription>Dev email code: {otpDevCode}</AlertDescription>
                      </Alert>
                    ) : null}
                    <AuthField
                      id="auth-email-code"
                      label="Email 2FA Code"
                      value={otpCode}
                      onChange={(value) => setOtpCode(value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      maxLength={6}
                    />
                  </FieldGroup>
                )}
              </TabsContent>

              <TabsContent value="signup" className="pt-1">
                <FieldGroup>
                  <AuthField
                    id="signup-login"
                    label="Login"
                    value={signupLogin}
                    onChange={setSignupLogin}
                    placeholder="your-login"
                    autoComplete="username"
                  />
                  <AuthField
                    id="signup-email"
                    label="Email"
                    value={signupEmail}
                    onChange={setSignupEmail}
                    type="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <AuthField
                      id="signup-password"
                      label="Password"
                      value={signupPassword}
                      onChange={setSignupPassword}
                      type="password"
                      autoComplete="new-password"
                    />
                    <AuthField
                      id="signup-password-repeat"
                      label="Repeat"
                      value={signupRepeatPassword}
                      onChange={setSignupRepeatPassword}
                      type="password"
                      autoComplete="new-password"
                    />
                  </div>
                </FieldGroup>
              </TabsContent>
            </Tabs>

            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <Separator />

            <DialogFooter className="pt-0">
              {mode === "signin" && signInStep === "email-code" ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSignInStep("credentials");
                    setOtpCode("");
                    setOtpChallengeId("");
                    setOtpEmail("");
                    setOtpDevCode(null);
                    setError(null);
                  }}
                  disabled={busy}
                >
                  Back
                </Button>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDialogOpen(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {mode === "signup"
                  ? busy
                    ? "Creating..."
                    : "Create Account"
                  : signInStep === "email-code"
                    ? busy
                      ? "Verifying..."
                      : "Verify Code"
                    : busy
                      ? "Sending Code..."
                      : "Send Code"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
