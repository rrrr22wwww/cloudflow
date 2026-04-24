"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Cpu, HardDrive, MapPin, MemoryStick, Server, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AUTH_EVENT,
  getStoredSession,
  saveStoredSession,
  TOKEN_KEY,
  type StoredSession,
} from "@/lib/auth-session";
import {
  type CloudflowCategory,
  type CloudflowProduct,
  type CloudflowPurchasePayload,
  type CloudflowServerAccess,
  type CloudflowUser,
} from "@/lib/cloudflow-api";
import { postJson } from "@/lib/http";
import { formatServerSpecs, parseServerSpecs } from "@/lib/server-specs";
import { formatPrice } from "@/lib/utils";

type Notice = {
  tone: "default" | "destructive";
  text: string;
};

function syncStoredUser(token: string, user: CloudflowUser) {
  saveStoredSession({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      img_user: user.img_user,
      role: user.role,
    },
  });
}

export function ServerDetailView({ id }: { id: string }) {
  const [session, setSession] = useState<StoredSession>({ token: "", user: null });
  const [sessionReady, setSessionReady] = useState(false);
  const [me, setMe] = useState<CloudflowUser | null>(null);
  const [product, setProduct] = useState<CloudflowProduct | null>(null);
  const [categoryName, setCategoryName] = useState("Uncategorized");
  const [access, setAccess] = useState<CloudflowServerAccess | null>(null);
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [loadingAccess, setLoadingAccess] = useState(false);

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

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setNotice(null);

      try {
        const [user, products, categories] = await Promise.all([
          postJson<CloudflowUser | null>("/api/control/me", { token: session.token }),
          postJson<CloudflowProduct[]>("/api/control/products", {
            token: session.token,
            action: "query",
            id,
          }),
          postJson<CloudflowCategory[]>("/api/control/categories", {
            token: session.token,
            action: "query",
          }),
        ]);

        if (cancelled) {
          return;
        }

        const foundProduct = products[0] ?? null;
        setMe(user);
        setProduct(foundProduct);
        setCategoryName(
          categories.find((category) => category.id === foundProduct?.category_id)?.name ??
            "Uncategorized",
        );
      } catch (error) {
        if (!cancelled) {
          setNotice({
            tone: "destructive",
            text: error instanceof Error ? error.message : "Failed to load server",
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [id, sessionReady, session.token]);

  const specs = useMemo(() => parseServerSpecs(product?.tags), [product?.tags]);
  const specSummary = useMemo(() => formatServerSpecs(specs), [specs]);
  const balance = me?.balance ?? 0;
  const canPurchase = Boolean(
    product &&
      me &&
      product.seller_id !== me.id &&
      balance >= product.price &&
      (product.status ?? "active") === "active",
  );

  if (!sessionReady) {
    return <Card className="p-6 text-sm text-muted-foreground">Loading session…</Card>;
  }

  if (!session.token) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="section-kicker">Server Detail</p>
        <Card className="p-6">
          <h1 className="mb-2 font-mono text-2xl uppercase tracking-wide">Authentication Required</h1>
          <p className="mb-4 text-sm text-muted-foreground">
            Sign in first to inspect the server card and purchase infrastructure.
          </p>
          <Link href="/marketplace" className={buttonClasses({ variant: "primary" })}>
            Back To Marketplace
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <p className="section-kicker">Server Detail</p>
        <h1 className="mt-2 font-mono text-2xl uppercase tracking-wide text-foreground">
          {product?.name ?? `Server #${id}`}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Review server specs, price, and purchase flow before adding it to your profile library.
        </p>
      </div>

      {notice ? (
        <Alert variant={notice.tone === "destructive" ? "destructive" : "default"}>
          <AlertDescription>{notice.text}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <Card className="overflow-hidden p-0">
            <div className="relative border-b border-border/70 bg-[linear-gradient(135deg,hsl(var(--surface-overlay)/0.95),hsl(var(--surface-raised))_58%,hsl(var(--brand-muted)/0.55))] px-5 py-5">
              <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(circle,hsl(var(--border))_1px,transparent_1px)] [background-size:18px_18px]" />
              <div className="relative">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{categoryName}</Badge>
                  <Badge>{product?.status ?? "active"}</Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {loading
                    ? "Loading server card..."
                    : product?.description ?? "Server card not found for this identifier."}
                </p>
              </div>
            </div>

            {product?.preview_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.preview_image}
                alt=""
                className="aspect-[16/7] w-full border-b border-border object-cover"
              />
            ) : null}

            <div className="grid gap-3 p-4 md:grid-cols-2">
              <Card className="p-4">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Cpu className="h-4 w-4 text-brand" />
                  {specs.cpu || "CPU n/a"}
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <MemoryStick className="h-4 w-4 text-brand" />
                  {specs.ram || "RAM n/a"}
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <HardDrive className="h-4 w-4 text-brand" />
                  {specs.disk || "Disk n/a"}
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <MapPin className="h-4 w-4 text-brand" />
                  {specs.region || "Region n/a"}
                </div>
              </Card>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-mono text-sm uppercase tracking-wider text-foreground">
              Server Summary
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {specSummary.map((item) => (
                <Badge key={item}>{item}</Badge>
              ))}
              {specs.traffic ? <Badge>Traffic {specs.traffic}</Badge> : null}
              {specs.os ? <Badge>OS {specs.os}</Badge> : null}
            </div>
          </Card>
        </div>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-brand" />
            <h2 className="font-mono text-sm uppercase tracking-wider text-foreground">
              Purchase
            </h2>
          </div>

          <div className="mt-4 rounded-lg border border-brand/30 bg-brand-muted p-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Server Price</span>
              <span className="font-mono text-foreground">
                {product ? `${formatPrice(product.price)} / month` : "--"}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
              <span>Your Balance</span>
              <span className="font-mono text-foreground">{formatPrice(balance)}</span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <Field>
              <FieldLabel htmlFor="purchase-rating">Your Rating After Purchase</FieldLabel>
              <Input
                id="purchase-rating"
                type="number"
                min="1"
                max="5"
                value={rating}
                onChange={(event) => setRating(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="purchase-comment">Comment (optional)</FieldLabel>
              <Textarea
                id="purchase-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Leave a short review for other buyers."
              />
            </Field>
          </div>

          <div className="mt-4 space-y-2 text-xs text-muted-foreground">
            {product && me && product.seller_id === me.id ? (
              <p>You cannot buy your own server listing.</p>
            ) : null}
            {product && balance < product.price ? (
              <p>
                Insufficient balance. Top up your wallet from{" "}
                <Link href="/profile" className="text-brand hover:underline">
                  Edit Profile
                </Link>
                .
              </p>
            ) : null}
            <p className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-brand" />
              Purchased servers are added to your profile instantly after checkout.
            </p>
          </div>

          <div className="mt-5 flex gap-2">
            <Button
              disabled={purchasing || !product || !canPurchase}
              className="flex-1"
              onClick={async () => {
                if (!product) {
                  return;
                }

                setPurchasing(true);
                try {
                  const payload = await postJson<CloudflowPurchasePayload>(
                    "/api/control/purchases",
                    {
                      token: session.token,
                      action: "create",
                      productID: product.id,
                      rating: Number(rating),
                      comment,
                    },
                  );
                  setProduct(payload.product);
                  setMe(payload.buyer);
                  syncStoredUser(session.token, payload.buyer);
                  setAccess(null);
                  setNotice({
                    tone: "default",
                    text: "Purchase completed. The server is now available in your profile.",
                  });
                } catch (error) {
                  setNotice({
                    tone: "destructive",
                    text: error instanceof Error ? error.message : "Purchase failed",
                  });
                } finally {
                  setPurchasing(false);
                }
              }}
            >
              {purchasing ? "Processing..." : "Buy Server"}
            </Button>
            <Link href="/profile" className={buttonClasses({ variant: "secondary" })}>
              Open Profile
            </Link>
          </div>

          {product ? (
            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                disabled={loadingAccess}
                onClick={async () => {
                  if (access) {
                    setAccess(null);
                    return;
                  }

                  setLoadingAccess(true);
                  try {
                    const payload = await postJson<CloudflowServerAccess | null>(
                      "/api/control/product-access",
                      {
                        token: session.token,
                        action: "query",
                        productID: product.id,
                      },
                    );
                    setAccess(payload);
                  } catch (error) {
                    setNotice({
                      tone: "destructive",
                      text:
                        error instanceof Error
                          ? error.message
                          : "Failed to load server access",
                    });
                  } finally {
                    setLoadingAccess(false);
                  }
                }}
              >
                {loadingAccess ? "Loading Access..." : access ? "Hide Access" : "Reveal Access"}
              </Button>
            </div>
          ) : null}

          {access ? (
            <div className="mt-4 rounded-lg border border-brand/30 bg-brand-muted p-4 text-xs text-foreground">
              <p className="font-mono uppercase tracking-wider text-brand">Private Access</p>
              <div className="mt-3 grid gap-2">
                <p>
                  <span className="text-muted-foreground">IP:</span>{" "}
                  <span className="font-mono">{access.ip_address}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">SSH user:</span>{" "}
                  <span className="font-mono">{access.ssh_username}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Port:</span>{" "}
                  <span className="font-mono">{access.port ?? 22}</span>
                </p>
                {access.ssh_password ? (
                  <p>
                    <span className="text-muted-foreground">Password:</span>{" "}
                    <span className="font-mono">{access.ssh_password}</span>
                  </p>
                ) : null}
                {access.connection_notes ? (
                  <p className="whitespace-pre-wrap">
                    <span className="text-muted-foreground">Notes:</span>{" "}
                    {access.connection_notes}
                  </p>
                ) : null}
                {access.ssh_private_key ? (
                  <pre className="overflow-x-auto rounded-md border border-border/60 bg-surface p-3 font-mono text-[11px] text-foreground">
                    {access.ssh_private_key}
                  </pre>
                ) : null}
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
