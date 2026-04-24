"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CreditCard, HardDriveUpload, ImagePlus, Server, UserRound } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  AUTH_EVENT,
  clearStoredSession,
  getStoredSession,
  saveStoredSession,
  TOKEN_KEY,
  type StoredSession,
} from "@/lib/auth-session";
import {
  type CloudflowProduct,
  type CloudflowSellerReview,
  type CloudflowServerAccess,
  type CloudflowUser,
} from "@/lib/cloudflow-api";
import { postFormData, postJson } from "@/lib/http";
import { formatServerSpecs, parseServerSpecs } from "@/lib/server-specs";
import { formatPrice } from "@/lib/utils";

type Notice = {
  tone: "default" | "destructive";
  text: string;
};

type ProfileDraft = {
  name: string;
  email: string;
  img: string;
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

export function ProfileEditor() {
  const [session, setSession] = useState<StoredSession>({ token: "", user: null });
  const [sessionReady, setSessionReady] = useState(false);
  const [me, setMe] = useState<CloudflowUser | null>(null);
  const [purchases, setPurchases] = useState<CloudflowProduct[]>([]);
  const [sellerReviews, setSellerReviews] = useState<CloudflowSellerReview[]>([]);
  const [productAccess, setProductAccess] = useState<Record<string, CloudflowServerAccess | null>>(
    {},
  );
  const [draft, setDraft] = useState<ProfileDraft>({
    name: "",
    email: "",
    img: "",
  });
  const [walletAmount, setWalletAmount] = useState("50");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [toppingUp, setToppingUp] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loadingAccessId, setLoadingAccessId] = useState<string | null>(null);

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
        const [user, purchasedServers] = await Promise.all([
          postJson<CloudflowUser | null>("/api/control/me", { token: session.token }),
          postJson<CloudflowProduct[]>("/api/control/purchases", {
            token: session.token,
            action: "query",
          }),
        ]);

        if (cancelled || !user) {
          return;
        }

        setMe(user);
        setPurchases(purchasedServers);
        void postJson<CloudflowSellerReview[]>("/api/control/seller-reviews", {
          token: session.token,
        }).then(setSellerReviews).catch(() => null);
        setDraft({
          name: user.name,
          email: user.email,
          img: user.img_user ?? "",
        });
      } catch (error) {
        if (!cancelled) {
          setNotice({
            tone: "destructive",
            text: error instanceof Error ? error.message : "Failed to load profile",
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
  }, [sessionReady, session.token]);

  const balanceText = useMemo(() => formatPrice(me?.balance ?? 0), [me?.balance]);

  if (!sessionReady) {
    return <Card className="p-6 text-sm text-muted-foreground">Loading session…</Card>;
  }

  if (!session.token) {
    return (
      <Card className="p-6">
        <p className="section-kicker">Profile</p>
        <h1 className="mt-2 font-mono text-xl uppercase tracking-wider text-foreground">
          Sign in required
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Profile editing is available only for authenticated users.
        </p>
        <Link href="/marketplace" className="mt-4 inline-flex text-sm text-brand">
          Return to marketplace
        </Link>
      </Card>
    );
  }

  return (
    <section className="mx-auto max-w-5xl space-y-4">
      <Card className="overflow-hidden p-0">
        <div className="relative border-b border-border/70 bg-[linear-gradient(135deg,hsl(var(--surface-overlay)/0.95),hsl(var(--surface-raised))_58%,hsl(var(--brand-muted)/0.5))] px-5 py-5">
          <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(circle,hsl(var(--border))_1px,transparent_1px)] [background-size:18px_18px]" />
          <div className="relative">
            <p className="section-kicker">Account</p>
            <h1 className="mt-2 font-mono text-xl uppercase tracking-wider text-foreground">
              Edit Profile
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage your identity, wallet balance, and purchased infrastructure.
            </p>
          </div>
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-3">
          <Card className="p-4 md:col-span-2">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Account Balance
            </p>
            <p className="mt-2 font-mono text-2xl text-foreground">{balanceText}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Use the wallet to buy published servers from other sellers.
            </p>
          </Card>
          <Card className="p-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Purchased Servers
            </p>
            <p className="mt-2 font-mono text-2xl text-foreground">{purchases.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Active servers available in your profile library.
            </p>
          </Card>
          <Card className="p-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Seller Rating
            </p>
            <p className="mt-2 font-mono text-2xl text-foreground">{me?.rating ?? 0}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Reputation aggregated from buyer reviews.
            </p>
          </Card>
        </div>
      </Card>

      {notice ? (
        <Alert variant={notice.tone === "destructive" ? "destructive" : "default"}>
          <AlertDescription>{notice.text}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="p-5">
          <div className="mb-5 flex items-center gap-4">
            <div className="grid size-20 place-items-center overflow-hidden rounded-full border border-brand/30 bg-brand-muted text-brand">
              {draft.img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.img} alt="" className="size-full object-cover" />
              ) : (
                <UserRound className="size-8" />
              )}
            </div>
            <div className="space-y-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-2 text-xs text-foreground transition-all duration-200 ease-spring hover:border-brand/40">
                <ImagePlus className="h-3.5 w-3.5" />
                {uploadingAvatar ? "Uploading..." : "Upload Avatar"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingAvatar}
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }

                    setUploadingAvatar(true);
                    try {
                      const formData = new FormData();
                      formData.append("file", file);
                      const payload = await postFormData<{ url: string }>(
                        "/api/upload/avatar",
                        formData,
                      );
                      setDraft((prev) => ({ ...prev, img: payload.url }));
                      setNotice({ tone: "default", text: "Avatar uploaded. Save profile to apply it." });
                    } catch (error) {
                      setNotice({
                        tone: "destructive",
                        text: error instanceof Error ? error.message : "Failed to upload avatar",
                      });
                    } finally {
                      setUploadingAvatar(false);
                      event.target.value = "";
                    }
                  }}
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Avatar is uploaded as a file and saved as a short profile image path.
              </p>
            </div>
          </div>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="profile-name">Nickname</FieldLabel>
              <Input
                id="profile-name"
                value={draft.name}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="profile-email">Email</FieldLabel>
              <Input
                id="profile-email"
                type="email"
                value={draft.email}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, email: event.target.value }))
                }
              />
            </Field>
          </FieldGroup>

          <div className="mt-4 flex gap-2">
            <Button
              disabled={savingProfile || loading || !me}
              onClick={async () => {
                if (!me) {
                  return;
                }

                setSavingProfile(true);
                try {
                  const updated = await postJson<CloudflowUser>("/api/control/users", {
                    token: session.token,
                    action: "update",
                    id: me.id,
                    name: draft.name,
                    email: draft.email,
                    img: draft.img || undefined,
                  });
                  setMe(updated);
                  syncStoredUser(session.token, updated);
                  setNotice({ tone: "default", text: "Profile updated." });
                } catch (error) {
                  setNotice({
                    tone: "destructive",
                    text: error instanceof Error ? error.message : "Failed to update profile",
                  });
                } finally {
                  setSavingProfile(false);
                }
              }}
            >
              {savingProfile ? "Saving..." : "Save Profile"}
            </Button>
            <Button
              variant="ghost"
              disabled={savingProfile || !me}
              onClick={async () => {
                if (!me) {
                  return;
                }

                setSavingProfile(true);
                try {
                  await postJson<{ ok: boolean }>("/api/control/users", {
                    token: session.token,
                    action: "delete",
                    id: me.id,
                  });
                  clearStoredSession();
                  window.location.href = "/marketplace";
                } catch (error) {
                  setNotice({
                    tone: "destructive",
                    text: error instanceof Error ? error.message : "Failed to delete account",
                  });
                  setSavingProfile(false);
                }
              }}
            >
              Delete Account
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-brand" />
            <h2 className="font-mono text-sm uppercase tracking-wider text-foreground">
              Wallet Top Up
            </h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Add test balance to purchase server cards in the marketplace.
          </p>
          <Field className="mt-4">
            <FieldLabel htmlFor="wallet-amount">Amount</FieldLabel>
            <Input
              id="wallet-amount"
              type="number"
              min="1"
              step="1"
              value={walletAmount}
              onChange={(event) => setWalletAmount(event.target.value)}
            />
          </Field>
          <Button
            className="mt-4 w-full"
            disabled={toppingUp || loading}
            onClick={async () => {
              const amount = Number(walletAmount);
              if (!Number.isFinite(amount) || amount <= 0) {
                setNotice({ tone: "destructive", text: "Enter a valid top up amount." });
                return;
              }

              setToppingUp(true);
              try {
                const updated = await postJson<CloudflowUser>("/api/control/balance", {
                  token: session.token,
                  amount,
                });
                setMe(updated);
                setNotice({
                  tone: "default",
                  text: `Balance increased by ${formatPrice(amount)}.`,
                });
              } catch (error) {
                setNotice({
                  tone: "destructive",
                  text: error instanceof Error ? error.message : "Failed to top up balance",
                });
              } finally {
                setToppingUp(false);
              }
            }}
          >
            <HardDriveUpload data-icon="inline-start" className="h-3.5 w-3.5" />
            {toppingUp ? "Applying..." : "Add Balance"}
          </Button>
        </Card>
      </div>

      <Separator />

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-mono text-sm uppercase tracking-wider text-foreground">
              Purchased Servers
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Every purchased server appears here automatically after checkout.
            </p>
          </div>
          <Badge>{loading ? "Loading" : `${purchases.length} items`}</Badge>
        </div>

        <div className="space-y-3">
          {purchases.length === 0 ? (
            <Alert>
              <AlertDescription>
                No purchased servers yet. Browse the marketplace and buy the first one.
              </AlertDescription>
            </Alert>
          ) : (
            purchases.map((product) => {
              const specs = parseServerSpecs(product.tags);
              const summary = formatServerSpecs(specs);

              return (
                <Card key={product.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4 text-brand" />
                        <h3 className="text-sm text-foreground">{product.name}</h3>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{product.description}</p>
                    </div>
                    <Badge>{product.status ?? "active"}</Badge>
                  </div>

                  {product.preview_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.preview_image}
                      alt=""
                      className="mt-4 aspect-[16/7] w-full rounded-lg border border-border object-cover"
                    />
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{formatPrice(product.price)} / month</span>
                    {summary.map((item) => (
                      <span key={`${product.id}-${item}`}>{item}</span>
                    ))}
                    {specs.os ? <span>OS {specs.os}</span> : null}
                  </div>

                  <div className="mt-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={loadingAccessId === product.id}
                      onClick={async () => {
                        if (productAccess[product.id]) {
                          setProductAccess((prev) => ({ ...prev, [product.id]: null }));
                          return;
                        }

                        setLoadingAccessId(product.id);
                        try {
                          const access = await postJson<CloudflowServerAccess | null>(
                            "/api/control/product-access",
                            {
                              token: session.token,
                              action: "query",
                              productID: product.id,
                            },
                          );
                          setProductAccess((prev) => ({ ...prev, [product.id]: access }));
                        } catch (error) {
                          setNotice({
                            tone: "destructive",
                            text:
                              error instanceof Error
                                ? error.message
                                : "Failed to load server access",
                          });
                        } finally {
                          setLoadingAccessId(null);
                        }
                      }}
                    >
                      {loadingAccessId === product.id
                        ? "Loading Access..."
                        : productAccess[product.id]
                          ? "Hide Access"
                          : "Show Access"}
                    </Button>
                  </div>

                  {productAccess[product.id] ? (
                    <div className="mt-4 rounded-lg border border-brand/30 bg-brand-muted p-4 text-xs text-foreground">
                      <p className="font-mono uppercase tracking-wider text-brand">Private Access</p>
                      <div className="mt-3 grid gap-2">
                        <p>
                          <span className="text-muted-foreground">IP:</span>{" "}
                          <span className="font-mono">{productAccess[product.id]?.ip_address}</span>
                        </p>
                        <p>
                          <span className="text-muted-foreground">SSH user:</span>{" "}
                          <span className="font-mono">{productAccess[product.id]?.ssh_username}</span>
                        </p>
                        <p>
                          <span className="text-muted-foreground">Port:</span>{" "}
                          <span className="font-mono">
                            {productAccess[product.id]?.port ?? 22}
                          </span>
                        </p>
                        {productAccess[product.id]?.ssh_password ? (
                          <p>
                            <span className="text-muted-foreground">Password:</span>{" "}
                            <span className="font-mono">{productAccess[product.id]?.ssh_password}</span>
                          </p>
                        ) : null}
                        {productAccess[product.id]?.connection_notes ? (
                          <p className="whitespace-pre-wrap">
                            <span className="text-muted-foreground">Notes:</span>{" "}
                            {productAccess[product.id]?.connection_notes}
                          </p>
                        ) : null}
                        {productAccess[product.id]?.ssh_private_key ? (
                          <pre className="overflow-x-auto rounded-md border border-border/60 bg-surface p-3 font-mono text-[11px] text-foreground">
                            {productAccess[product.id]?.ssh_private_key}
                          </pre>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </Card>
              );
            })
          )}
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-mono text-sm uppercase tracking-wider text-foreground">
              Seller Reviews
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ratings from buyers are attached to your seller profile.
            </p>
          </div>
          <Badge>{`${sellerReviews.length} reviews`}</Badge>
        </div>

        <div className="space-y-3">
          {sellerReviews.length === 0 ? (
            <Alert>
              <AlertDescription>No seller reviews yet.</AlertDescription>
            </Alert>
          ) : (
            sellerReviews.map((review) => (
              <Card key={review.id} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-sm text-foreground">Product #{review.product_id.slice(0, 8)}</p>
                  <Badge>{review.rating}/5</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {review.comment?.trim() || "Buyer left a rating without additional comment."}
                </p>
              </Card>
            ))
          )}
        </div>
      </Card>
    </section>
  );
}
