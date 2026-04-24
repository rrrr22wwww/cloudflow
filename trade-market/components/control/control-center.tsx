"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BadgePlus, Cpu, ImagePlus, MapPin, MemoryStick, PencilLine, Server } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  AUTH_EVENT,
  getStoredSession,
  TOKEN_KEY,
  type StoredSession,
} from "@/lib/auth-session";
import {
  type CloudflowCategory,
  type CloudflowProduct,
  type CloudflowServerAccess,
  type CloudflowUser,
} from "@/lib/cloudflow-api";
import { postFormData, postJson } from "@/lib/http";
import {
  buildServerTags,
  parseServerSpecs,
  type ServerSpecs,
} from "@/lib/server-specs";
import { formatPrice } from "@/lib/utils";

type ProductDraft = {
  categoryID: string;
  name: string;
  description: string;
  price: string;
  cpu: string;
  ram: string;
  disk: string;
  region: string;
  traffic: string;
  os: string;
  previewImage: string;
  ipAddress: string;
  sshUsername: string;
  sshPassword: string;
  sshPrivateKey: string;
  port: string;
  connectionNotes: string;
};

type Notice = {
  tone: "default" | "destructive";
  text: string;
};

const selectClasses =
  "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors focus:border-brand/40";

function emptyProductDraft(defaultCategoryID?: number): ProductDraft {
  return {
    categoryID: defaultCategoryID ? String(defaultCategoryID) : "",
    name: "",
    description: "",
    price: "24",
    cpu: "8 vCPU",
    ram: "8 GB",
    disk: "160 GB NVMe",
    region: "Frankfurt",
    traffic: "10 TB",
    os: "Ubuntu 24.04",
    previewImage: "",
    ipAddress: "",
    sshUsername: "root",
    sshPassword: "",
    sshPrivateKey: "",
    port: "22",
    connectionNotes: "",
  };
}

function draftToSpecs(draft: ProductDraft): ServerSpecs {
  return {
    cpu: draft.cpu,
    ram: draft.ram,
    disk: draft.disk,
    region: draft.region,
    traffic: draft.traffic,
    os: draft.os,
  };
}

export function ControlCenter() {
  const [session, setSession] = useState<StoredSession>({ token: "", user: null });
  const [sessionReady, setSessionReady] = useState(false);
  const [me, setMe] = useState<CloudflowUser | null>(null);
  const [categories, setCategories] = useState<CloudflowCategory[]>([]);
  const [products, setProducts] = useState<CloudflowProduct[]>([]);
  const [draft, setDraft] = useState<ProductDraft>(emptyProductDraft());
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const token = session.token;

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
    if (!sessionReady || !token) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setNotice(null);

      try {
        const user = await postJson<CloudflowUser | null>("/api/control/me", { token });
        if (!user || cancelled) {
          return;
        }

        const [categoryPayload, productPayload] = await Promise.all([
          postJson<CloudflowCategory[]>("/api/control/categories", {
            token,
            action: "query",
          }),
          postJson<CloudflowProduct[]>("/api/control/products", {
            token,
            action: "query",
            sellerID: user.id,
          }),
        ]);

        if (cancelled) {
          return;
        }

        setMe(user);
        setCategories(categoryPayload);
        setProducts(productPayload);
        setDraft(emptyProductDraft(categoryPayload[0]?.id));
      } catch (error) {
        if (!cancelled) {
          setNotice({
            tone: "destructive",
            text: error instanceof Error ? error.message : "Failed to load publish center",
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
  }, [sessionReady, token]);

  if (!sessionReady) {
    return <Card className="p-6 text-sm text-muted-foreground">Loading session…</Card>;
  }

  if (!token) {
    return (
      <Card className="p-6">
        <p className="section-kicker">Publish</p>
        <h1 className="mt-2 font-mono text-xl uppercase tracking-wider text-foreground">
          Sign in required
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Publishing a server listing is available only for authenticated users.
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
            <p className="section-kicker">Publish</p>
            <h1 className="mt-2 font-mono text-xl uppercase tracking-wider text-foreground">
              Publish Your Server
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Create a server card with infrastructure specs and monthly pricing.
            </p>
          </div>
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-3">
          <Card className="p-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Seller
            </p>
            <p className="mt-2 text-sm text-foreground">{me?.name ?? session.user?.name ?? "Account"}</p>
          </Card>
          <Card className="p-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Listings
            </p>
            <p className="mt-2 text-sm text-foreground">{products.length} active cards</p>
          </Card>
          <Card className="p-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Wallet
            </p>
            <p className="mt-2 text-sm text-foreground">{formatPrice(me?.balance ?? 0)}</p>
          </Card>
        </div>
      </Card>

      {notice ? (
        <Alert variant={notice.tone === "destructive" ? "destructive" : "default"}>
          <AlertDescription>{notice.text}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="p-5">
        <div className="mb-4">
          <h2 className="font-mono text-sm uppercase tracking-wider text-foreground">
            New Server Card
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Publish a dedicated server, VPS, or hosting node with clear hardware specs.
          </p>
        </div>

        <FieldGroup>
          <div className="grid gap-3 lg:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="publish-name">Server Name</FieldLabel>
              <Input
                id="publish-name"
                value={draft.name}
                onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="publish-category">Category</FieldLabel>
              <select
                id="publish-category"
                className={selectClasses}
                value={draft.categoryID}
                onChange={(event) => setDraft((prev) => ({ ...prev, categoryID: event.target.value }))}
              >
                <option value="">Uncategorized</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {categories.length === 0
                  ? "No categories found. The server will be published without a category."
                  : "Category is optional. Leave it empty to publish as uncategorized."}
              </p>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="publish-description">Description</FieldLabel>
            <Textarea
              id="publish-description"
              value={draft.description}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </Field>

          <div className="grid gap-3 lg:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="publish-price">Monthly Price</FieldLabel>
              <Input
                id="publish-price"
                type="number"
                step="0.01"
                value={draft.price}
                onChange={(event) => setDraft((prev) => ({ ...prev, price: event.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="publish-cpu">CPU</FieldLabel>
              <Input
                id="publish-cpu"
                value={draft.cpu}
                onChange={(event) => setDraft((prev) => ({ ...prev, cpu: event.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="publish-ram">RAM</FieldLabel>
              <Input
                id="publish-ram"
                value={draft.ram}
                onChange={(event) => setDraft((prev) => ({ ...prev, ram: event.target.value }))}
              />
            </Field>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="publish-disk">Disk</FieldLabel>
              <Input
                id="publish-disk"
                value={draft.disk}
                onChange={(event) => setDraft((prev) => ({ ...prev, disk: event.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="publish-region">Region</FieldLabel>
              <Input
                id="publish-region"
                value={draft.region}
                onChange={(event) => setDraft((prev) => ({ ...prev, region: event.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="publish-traffic">Traffic</FieldLabel>
              <Input
                id="publish-traffic"
                value={draft.traffic}
                onChange={(event) => setDraft((prev) => ({ ...prev, traffic: event.target.value }))}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="publish-os">Operating System</FieldLabel>
            <Input
              id="publish-os"
              value={draft.os}
              onChange={(event) => setDraft((prev) => ({ ...prev, os: event.target.value }))}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="publish-preview">Preview Image</FieldLabel>
            <div className="flex flex-col gap-3">
              {draft.previewImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draft.previewImage}
                  alt=""
                  className="aspect-[16/7] w-full rounded-lg border border-border object-cover"
                />
              ) : null}
              <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-2 text-xs text-foreground transition-all duration-200 ease-spring hover:border-brand/40">
                <ImagePlus className="h-3.5 w-3.5" />
                {uploadingImage ? "Uploading..." : "Upload Preview"}
                <input
                  id="publish-preview"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingImage}
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }

                    setUploadingImage(true);
                    try {
                      const formData = new FormData();
                      formData.append("file", file);
                      const payload = await postFormData<{ url: string }>(
                        "/api/upload/product-image",
                        formData,
                      );
                      setDraft((prev) => ({ ...prev, previewImage: payload.url }));
                    } catch (error) {
                      setNotice({
                        tone: "destructive",
                        text:
                          error instanceof Error
                            ? error.message
                            : "Failed to upload product image",
                      });
                    } finally {
                      setUploadingImage(false);
                      event.target.value = "";
                    }
                  }}
                />
              </label>
            </div>
          </Field>

          <Separator className="my-2" />

          <div>
            <h3 className="font-mono text-xs uppercase tracking-wider text-foreground">
              Private Access Data
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              This block is hidden from the marketplace and revealed only to you and the buyer after purchase.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="publish-ip">Public IP</FieldLabel>
              <Input
                id="publish-ip"
                placeholder="203.0.113.10"
                value={draft.ipAddress}
                onChange={(event) => setDraft((prev) => ({ ...prev, ipAddress: event.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="publish-ssh-user">SSH Username</FieldLabel>
              <Input
                id="publish-ssh-user"
                value={draft.sshUsername}
                onChange={(event) => setDraft((prev) => ({ ...prev, sshUsername: event.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="publish-port">SSH Port</FieldLabel>
              <Input
                id="publish-port"
                type="number"
                min="1"
                max="65535"
                value={draft.port}
                onChange={(event) => setDraft((prev) => ({ ...prev, port: event.target.value }))}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="publish-ssh-password">SSH Password</FieldLabel>
            <Input
              id="publish-ssh-password"
              type="password"
              value={draft.sshPassword}
              onChange={(event) => setDraft((prev) => ({ ...prev, sshPassword: event.target.value }))}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="publish-ssh-key">SSH Private Key</FieldLabel>
            <Textarea
              id="publish-ssh-key"
              value={draft.sshPrivateKey}
              onChange={(event) => setDraft((prev) => ({ ...prev, sshPrivateKey: event.target.value }))}
              placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="publish-connection-notes">Connection Notes</FieldLabel>
            <Textarea
              id="publish-connection-notes"
              value={draft.connectionNotes}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, connectionNotes: event.target.value }))
              }
              placeholder="Provisioning notes, sudo policy, firewall exceptions, or handover instructions."
            />
          </Field>
        </FieldGroup>

        <div className="mt-4 flex gap-2">
          <Button
            disabled={publishing || !me}
            onClick={async () => {
              if (!me) {
                return;
              }

              if (!draft.ipAddress.trim() || !draft.sshUsername.trim()) {
                setNotice({
                  tone: "destructive",
                  text: "Public IP and SSH username are required for secure handover.",
                });
                return;
              }

              setPublishing(true);
              try {
                const payload = {
                  token,
                  action: editingProductId ? ("update" as const) : ("create" as const),
                  id: editingProductId ?? undefined,
                  sellerID: me.id,
                  categoryID: draft.categoryID ? Number(draft.categoryID) : undefined,
                  name: draft.name,
                  description: draft.description,
                  price: Number(draft.price),
                  tags: buildServerTags(draftToSpecs(draft)),
                  previewImage: draft.previewImage || undefined,
                  access: {
                    ipAddress: draft.ipAddress,
                    sshUsername: draft.sshUsername,
                    sshPassword: draft.sshPassword || undefined,
                    sshPrivateKey: draft.sshPrivateKey || undefined,
                    port: draft.port ? Number(draft.port) : undefined,
                    connectionNotes: draft.connectionNotes || undefined,
                  },
                };

                const saved = await postJson<CloudflowProduct>("/api/control/products", payload);
                setProducts((prev) =>
                  editingProductId
                    ? prev.map((item) => (item.id === saved.id ? saved : item))
                    : [saved, ...prev],
                );
                setDraft(emptyProductDraft(categories[0]?.id));
                setEditingProductId(null);
                setNotice({
                  tone: "default",
                  text: editingProductId ? "Server card updated." : "Server card published.",
                });
              } catch (error) {
                setNotice({
                  tone: "destructive",
                  text:
                    error instanceof Error
                      ? error.message
                      : editingProductId
                        ? "Failed to update server"
                        : "Failed to publish server",
                });
              } finally {
                setPublishing(false);
              }
            }}
          >
            <BadgePlus data-icon="inline-start" className="h-3.5 w-3.5" />
            {publishing
              ? editingProductId
                ? "Updating..."
                : "Publishing..."
              : editingProductId
                ? "Update Server"
                : "Publish Server"}
          </Button>
          {editingProductId ? (
            <Button
              variant="ghost"
              onClick={() => {
                setEditingProductId(null);
                setDraft(emptyProductDraft(categories[0]?.id));
              }}
            >
              Cancel Edit
            </Button>
          ) : null}
        </div>
      </Card>

      <Separator />

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-mono text-sm uppercase tracking-wider text-foreground">
              My Published Servers
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Quick overview of server cards already tied to your seller account.
            </p>
          </div>
          <Badge>{loading ? "Loading" : `${products.length} items`}</Badge>
        </div>

        <div className="space-y-3">
          {products.length === 0 ? (
            <Alert>
              <AlertDescription>No server cards yet. Publish the first one above.</AlertDescription>
            </Alert>
          ) : (
            products.map((product) => {
              const specs = parseServerSpecs(product.tags);

              return (
                <Card key={product.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4 text-brand" />
                        <h3 className="text-sm text-foreground">{product.name}</h3>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {product.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{product.status ?? "active"}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          const specs = parseServerSpecs(product.tags);
                          setEditingProductId(product.id);
                          setDraft({
                            categoryID:
                              typeof product.category_id === "number"
                                ? String(product.category_id)
                                : "",
                            name: product.name,
                            description: product.description,
                            price: String(product.price),
                            cpu: specs.cpu,
                            ram: specs.ram,
                            disk: specs.disk,
                            region: specs.region,
                            traffic: specs.traffic,
                            os: specs.os,
                            previewImage: product.preview_image ?? "",
                            ipAddress: "",
                            sshUsername: "root",
                            sshPassword: "",
                            sshPrivateKey: "",
                            port: "22",
                            connectionNotes: "",
                          });
                          try {
                            const access = await postJson<CloudflowServerAccess | null>(
                              "/api/control/product-access",
                              {
                                token,
                                action: "query",
                                productID: product.id,
                              },
                            );
                            if (access) {
                              setDraft((prev) => ({
                                ...prev,
                                ipAddress: access.ip_address,
                                sshUsername: access.ssh_username,
                                sshPassword: access.ssh_password ?? "",
                                sshPrivateKey: access.ssh_private_key ?? "",
                                port: String(access.port ?? 22),
                                connectionNotes: access.connection_notes ?? "",
                              }));
                            }
                          } catch {
                            // Keep editor usable even if access payload is not yet set.
                          }
                        }}
                      >
                        <PencilLine className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </div>
                  </div>
                  {product.preview_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.preview_image}
                      alt=""
                      className="mt-4 aspect-[16/7] w-full rounded-lg border border-border object-cover"
                    />
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Cpu className="h-3.5 w-3.5" />
                      {specs.cpu || "CPU n/a"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MemoryStick className="h-3.5 w-3.5" />
                      {specs.ram || "RAM n/a"}
                    </span>
                    <span>{specs.disk || "Disk n/a"}</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {specs.region || "Region n/a"}
                    </span>
                    <span>{formatPrice(product.price)} / month</span>
                    <span>ID: {product.id.slice(0, 8)}</span>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </Card>
    </section>
  );
}
