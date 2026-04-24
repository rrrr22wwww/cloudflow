"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderPlus, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  AUTH_EVENT,
  getStoredSession,
  TOKEN_KEY,
  type StoredSession,
} from "@/lib/auth-session";
import { type CloudflowCategory } from "@/lib/cloudflow-api";
import { postJson } from "@/lib/http";

type Notice = {
  tone: "default" | "destructive";
  text: string;
};

export function AdminPanel() {
  const [session, setSession] = useState<StoredSession>({ token: "", user: null });
  const [sessionReady, setSessionReady] = useState(false);
  const [categories, setCategories] = useState<CloudflowCategory[]>([]);
  const [name, setName] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const syncSession = () => {
      setSession(getStoredSession());
      setSessionReady(true);
    };

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === TOKEN_KEY) {
        syncSession();
      }
    };

    syncSession();
    window.addEventListener("storage", onStorage);
    window.addEventListener(AUTH_EVENT, syncSession);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(AUTH_EVENT, syncSession);
    };
  }, []);

  useEffect(() => {
    if (!sessionReady || !session.token) {
      return;
    }

    void postJson<CloudflowCategory[]>("/api/control/categories", {
      token: session.token,
      action: "query",
    })
      .then(setCategories)
      .catch((error) =>
        setNotice({
          tone: "destructive",
          text: error instanceof Error ? error.message : "Failed to load categories",
        }),
      );
  }, [sessionReady, session.token]);

  const role = session.user?.role ?? "User";
  const canManage = role === "Creator" || role === "Moderator";

  if (!sessionReady) {
    return <Card className="p-6 text-sm text-muted-foreground">Loading session…</Card>;
  }

  if (!session.token || !canManage) {
    return (
      <Card className="p-6">
        <p className="section-kicker">Admin</p>
        <h1 className="mt-2 font-mono text-xl uppercase tracking-wider text-foreground">
          Access restricted
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This panel is available only for moderator and creator accounts.
        </p>
        <Link href="/marketplace" className="mt-4 inline-flex text-sm text-brand">
          Return to marketplace
        </Link>
      </Card>
    );
  }

  return (
    <section className="mx-auto max-w-4xl space-y-4">
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-brand" />
          <h1 className="font-mono text-xl uppercase tracking-wider text-foreground">
            Admin Panel
          </h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage marketplace sections and category structure.
        </p>
      </Card>

      {notice ? (
        <Alert variant={notice.tone === "destructive" ? "destructive" : "default"}>
          <AlertDescription>{notice.text}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="p-5">
        <div className="mb-4">
          <h2 className="font-mono text-sm uppercase tracking-wider text-foreground">
            Add Section
          </h2>
        </div>
        <div className="flex gap-2">
          <Field className="flex-1">
            <FieldLabel htmlFor="category-name">Category Name</FieldLabel>
            <Input
              id="category-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <div className="self-end">
            <Button
              disabled={busy}
              onClick={async () => {
                if (!name.trim()) {
                  setNotice({ tone: "destructive", text: "Enter category name." });
                  return;
                }

                setBusy(true);
                try {
                  const created = await postJson<CloudflowCategory>(
                    "/api/control/categories",
                    {
                      token: session.token,
                      action: "create",
                      name: name.trim(),
                    },
                  );
                  setCategories((prev) => [...prev, created]);
                  setName("");
                  setNotice({ tone: "default", text: "Category created." });
                } catch (error) {
                  setNotice({
                    tone: "destructive",
                    text: error instanceof Error ? error.message : "Failed to create category",
                  });
                } finally {
                  setBusy(false);
                }
              }}
            >
              <FolderPlus data-icon="inline-start" className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-mono text-sm uppercase tracking-wider text-foreground">
          Current Sections
        </h2>
        <div className="mt-4 space-y-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 text-sm"
            >
              <div>
                <p className="text-foreground">{category.name}</p>
                <p className="text-xs text-muted-foreground">ID: {category.id}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    await postJson<{ ok: boolean }>("/api/control/categories", {
                      token: session.token,
                      action: "delete",
                      id: category.id,
                    });
                    setCategories((prev) => prev.filter((item) => item.id !== category.id));
                    setNotice({ tone: "default", text: "Category deleted." });
                  } catch (error) {
                    setNotice({
                      tone: "destructive",
                      text: error instanceof Error ? error.message : "Failed to delete category",
                    });
                  }
                }}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
