"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, formatPrice } from "@/lib/utils";

type TabValue = "market" | "seller" | "account";

type CloudflowUser = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
};

type CloudflowProduct = {
  id: string;
  seller_id: string;
  category_id?: number | null;
  name: string;
  description: string;
  price: number;
  rating?: number | null;
  status?: string | null;
  tags?: string[] | null;
  created_at: string;
  updated_at: string;
};

type CloudflowAuthPayload = {
  token: string;
  user: CloudflowUser;
};

type Notice = {
  title: string;
  body: string;
};

const TOKEN_KEY = "trade_market_cloudflow_token";
const USER_KEY = "trade_market_cloudflow_user";

function safeGetToken() {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(TOKEN_KEY) ?? "";
}

function safeGetUser() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CloudflowUser;
  } catch {
    window.localStorage.removeItem(USER_KEY);
    return null;
  }
}

function parseSpecs(tags?: string[] | null) {
  if (!tags?.length) {
    return [] as string[];
  }

  return tags.map((tag) => {
    const [key, ...rest] = tag.split(":");
    if (!rest.length) {
      return tag;
    }
    return `${key.toUpperCase()}: ${rest.join(":")}`;
  });
}

function parseErrorBody(value: unknown): string {
  if (!value) {
    return "Request failed";
  }

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

async function postJson<T>(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as T | { message?: string } | null;

  if (!response.ok) {
    throw new Error(parseErrorBody(payload));
  }

  return payload as T;
}

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState<TabValue>("market");
  const [token, setToken] = useState<string>(() => safeGetToken());
  const [user, setUser] = useState<CloudflowUser | null>(() => safeGetUser());
  const [products, setProducts] = useState<CloudflowProduct[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>({
    title: "Cloudflow Servers",
    body: "Функционал ограничен реальным API: login/register/logout/getProducts/setProduct/ping.",
  });
  const [pingText, setPingText] = useState("API status: unknown");
  const [pingOnline, setPingOnline] = useState(false);

  const [loginForm, setLoginForm] = useState({
    email: "testuser01@example.com",
    password: "12345678",
  });
  const [registerForm, setRegisterForm] = useState({
    name: "testuser01",
    email: "testuser01@example.com",
    img: "https://example.com/a.png",
    password: "12345678",
  });
  const [catalogFilters, setCatalogFilters] = useState({ id: "", name: "", sellerID: "" });
  const [productForm, setProductForm] = useState({
    sellerID: "",
    categoryID: "1",
    name: "Dedicated Xeon E5 · 64GB RAM · NVMe",
    description:
      "Выделенный сервер в Tier-III DC. root-доступ, 1Gbps uplink, SLA 99.9%. Подходит для продакшн-нагрузки.",
    price: "6900",
    rating: "4.8",
    tags: "cpu:Xeon E5-2680v4, ram:64GB, disk:2x1TB NVMe, location:RU-MSK, bandwidth:1Gbps",
  });

  const isAuthed = token.trim().length > 0;

  const tokenPreview = useMemo(() => {
    if (!token) {
      return "JWT не сохранен";
    }
    return `${token.slice(0, 14)}...${token.slice(-8)}`;
  }, [token]);

  useEffect(() => {
    if (user && !productForm.sellerID) {
      setProductForm((prev) => ({ ...prev, sellerID: user.id }));
    }
  }, [productForm.sellerID, user]);

  useEffect(() => {
    void checkPing(true);
    const timer = window.setInterval(() => {
      void checkPing(true);
    }, 20_000);

    return () => window.clearInterval(timer);
  }, []);

  function saveSession(nextToken: string, nextUser: CloudflowUser | null) {
    setToken(nextToken);
    setUser(nextUser);

    if (typeof window === "undefined") {
      return;
    }

    if (nextToken) {
      window.localStorage.setItem(TOKEN_KEY, nextToken);
    } else {
      window.localStorage.removeItem(TOKEN_KEY);
    }

    if (nextUser) {
      window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    } else {
      window.localStorage.removeItem(USER_KEY);
    }
  }

  async function run(title: string, action: () => Promise<void>) {
    setBusy(title);
    try {
      await action();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setNotice({ title: `${title}: ошибка`, body: message });
    } finally {
      setBusy(null);
    }
  }

  async function checkPing(silent = false) {
    try {
      const response = await fetch("/api/ping", { cache: "no-store" });
      const payload = (await response.json()) as { ok?: boolean; message?: string };
      const online = Boolean(payload.ok);
      setPingOnline(online);
      setPingText(`API ${online ? "online" : "offline"} · ${new Date().toLocaleTimeString("ru-RU")}`);
      if (!silent) {
        setNotice({
          title: "Ping backend",
          body: online ? "Backend доступен через /public/ping" : payload.message ?? "Backend недоступен",
        });
      }
    } catch {
      setPingOnline(false);
      setPingText(`API offline · ${new Date().toLocaleTimeString("ru-RU")}`);
      if (!silent) {
        setNotice({ title: "Ping backend", body: "Ошибка сети при запросе /api/ping" });
      }
    }
  }

  async function loadProducts() {
    await run("Загрузка серверов", async () => {
      if (!isAuthed) {
        throw new Error("Требуется авторизация");
      }

      const rows = await postJson<CloudflowProduct[]>("/api/servers/query", {
        token,
        id: catalogFilters.id,
        name: catalogFilters.name,
        sellerID: catalogFilters.sellerID,
      });

      setProducts(rows);
      setNotice({ title: "Загрузка серверов", body: `Загружено ${rows.length} серверов` });
    });
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    await run("Вход", async () => {
      const payload = await postJson<CloudflowAuthPayload>("/api/auth/login", loginForm);
      saveSession(payload.token, payload.user);
      setProductForm((prev) => ({ ...prev, sellerID: payload.user.id }));
      setNotice({ title: "Вход", body: `Сессия активирована для ${payload.user.email}` });
    });
  }

  async function register(event: FormEvent) {
    event.preventDefault();
    await run("Регистрация", async () => {
      const payload = await postJson<CloudflowAuthPayload>("/api/auth/register", registerForm);
      saveSession(payload.token, payload.user);
      setProductForm((prev) => ({ ...prev, sellerID: payload.user.id }));
      setNotice({ title: "Регистрация", body: `Создан аккаунт ${payload.user.email}` });
    });
  }

  async function logout() {
    await run("Выход", async () => {
      if (!isAuthed) {
        return;
      }
      await postJson<{ ok: boolean }>("/api/auth/logout", { token });
      saveSession("", null);
      setProducts([]);
      setNotice({ title: "Выход", body: "JWT очищен, сессия завершена" });
    });
  }

  async function publishServer(event: FormEvent) {
    event.preventDefault();
    await run("Публикация сервера", async () => {
      if (!isAuthed) {
        throw new Error("Требуется авторизация");
      }

      const tags = productForm.tags
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      await postJson<CloudflowProduct>("/api/servers/create", {
        token,
        sellerID: productForm.sellerID,
        categoryID: Number(productForm.categoryID),
        name: productForm.name,
        description: productForm.description,
        price: Number(productForm.price),
        rating: Number(productForm.rating),
        tags,
      });

      await loadProducts();
      setNotice({ title: "Публикация сервера", body: "Сервер добавлен в каталог" });
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <section className="space-y-4">
        <Card className="p-5 md:p-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="section-kicker">Cloudflow Integration</p>
              <h1 className="mt-2 font-mono text-2xl uppercase tracking-wide md:text-3xl">Servers Marketplace</h1>
            </div>
            <Badge variant={pingOnline ? "success" : "danger"}>{pingOnline ? "API Online" : "API Offline"}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            В этом разделе доступны только backend-операции из `API_SHORT.md`: авторизация, каталог серверов,
            публикация сервера, logout и ping.
          </p>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-border p-2">
            <div className="flex flex-wrap gap-2">
              {[
                ["market", "Catalog"],
                ["seller", "Seller"],
                ["account", "Account"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActiveTab(value as TabValue)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors",
                    activeTab === value
                      ? "border-brand/40 bg-brand-muted text-brand"
                      : "border-border bg-surface text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 md:p-5">
            {activeTab === "market" ? (
              <section id="market" className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                  <InputField
                    name="product-id"
                    label="ID сервера"
                    value={catalogFilters.id}
                    onChange={(value) => setCatalogFilters((prev) => ({ ...prev, id: value }))}
                  />
                  <InputField
                    name="product-name"
                    label="Название"
                    value={catalogFilters.name}
                    onChange={(value) => setCatalogFilters((prev) => ({ ...prev, name: value }))}
                  />
                  <InputField
                    name="product-seller"
                    label="Seller ID"
                    value={catalogFilters.sellerID}
                    onChange={(value) => setCatalogFilters((prev) => ({ ...prev, sellerID: value }))}
                  />
                  <div className="flex items-end">
                    <Button onClick={loadProducts} disabled={!isAuthed || busy !== null} className="w-full md:w-auto">
                      {busy === "Загрузка серверов" ? "Loading..." : "Load"}
                    </Button>
                  </div>
                </div>

                {products.length === 0 ? (
                  <Card className="border-dashed bg-surface/60 p-6 text-sm text-muted-foreground">
                    Серверы не загружены. Выполните вход и нажмите `Load`.
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {products.map((product) => (
                      <ServerCard key={product.id} product={product} />
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {activeTab === "seller" ? (
              <section id="seller" className="space-y-3">
                <p className="section-kicker">setProduct</p>
                <form className="space-y-3" onSubmit={publishServer}>
                  <InputField
                    name="seller-id"
                    label="Seller ID"
                    value={productForm.sellerID}
                    onChange={(value) => setProductForm((prev) => ({ ...prev, sellerID: value }))}
                  />

                  <div className="grid gap-3 md:grid-cols-2">
                    <InputField
                      name="category-id"
                      label="Category ID"
                      type="number"
                      value={productForm.categoryID}
                      onChange={(value) => setProductForm((prev) => ({ ...prev, categoryID: value }))}
                    />
                    <InputField
                      name="server-price"
                      label="Цена (число)"
                      type="number"
                      value={productForm.price}
                      onChange={(value) => setProductForm((prev) => ({ ...prev, price: value }))}
                    />
                  </div>

                  <InputField
                    name="server-name"
                    label="Название"
                    value={productForm.name}
                    onChange={(value) => setProductForm((prev) => ({ ...prev, name: value }))}
                  />

                  <label className="grid gap-1.5 text-sm text-muted-foreground">
                    Описание
                    <textarea
                      className="min-h-28 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-brand/40"
                      value={productForm.description}
                      onChange={(event) =>
                        setProductForm((prev) => ({
                          ...prev,
                          description: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <div className="grid gap-3 md:grid-cols-2">
                    <InputField
                      name="server-rating"
                      label="Rating"
                      type="number"
                      step="0.1"
                      value={productForm.rating}
                      onChange={(value) => setProductForm((prev) => ({ ...prev, rating: value }))}
                    />
                    <InputField
                      name="server-tags"
                      label="Tags (comma separated)"
                      value={productForm.tags}
                      onChange={(value) => setProductForm((prev) => ({ ...prev, tags: value }))}
                    />
                  </div>

                  <p className="rounded border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
                    Покупка/заказы не показываются, так как `getOrders` пока не реализован в backend.
                  </p>

                  <Button type="submit" disabled={!isAuthed || busy !== null}>
                    {busy === "Публикация сервера" ? "Publishing..." : "Publish Server"}
                  </Button>
                </form>
              </section>
            ) : null}

            {activeTab === "account" ? (
              <section id="account" className="space-y-4">
                <div className="grid gap-3 lg:grid-cols-2">
                  <form className="space-y-3 rounded-lg border border-border bg-surface/40 p-4" onSubmit={login}>
                    <p className="section-kicker">login</p>
                    <InputField
                      name="login-email"
                      label="Email"
                      type="email"
                      value={loginForm.email}
                      onChange={(value) => setLoginForm((prev) => ({ ...prev, email: value }))}
                    />
                    <InputField
                      name="login-password"
                      label="Password"
                      type="password"
                      value={loginForm.password}
                      onChange={(value) => setLoginForm((prev) => ({ ...prev, password: value }))}
                    />
                    <Button type="submit" disabled={busy !== null}>
                      Sign In
                    </Button>
                  </form>

                  <form className="space-y-3 rounded-lg border border-border bg-surface/40 p-4" onSubmit={register}>
                    <p className="section-kicker">register</p>
                    <InputField
                      name="register-name"
                      label="Name"
                      value={registerForm.name}
                      onChange={(value) => setRegisterForm((prev) => ({ ...prev, name: value }))}
                    />
                    <InputField
                      name="register-email"
                      label="Email"
                      type="email"
                      value={registerForm.email}
                      onChange={(value) => setRegisterForm((prev) => ({ ...prev, email: value }))}
                    />
                    <InputField
                      name="register-img"
                      label="Avatar URL"
                      value={registerForm.img}
                      onChange={(value) => setRegisterForm((prev) => ({ ...prev, img: value }))}
                    />
                    <InputField
                      name="register-password"
                      label="Password"
                      type="password"
                      value={registerForm.password}
                      onChange={(value) => setRegisterForm((prev) => ({ ...prev, password: value }))}
                    />
                    <Button type="submit" disabled={busy !== null}>
                      Create Account
                    </Button>
                  </form>
                </div>

                <div className="rounded-lg border border-border bg-surface/40 p-4">
                  <p className="section-kicker mb-2">Session</p>
                  <textarea
                    className="min-h-28 w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-foreground outline-none"
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => saveSession(token, user)}>
                      Save Token
                    </Button>
                    <Button variant="secondary" onClick={logout} disabled={!isAuthed || busy !== null}>
                      Logout
                    </Button>
                    <Button variant="ghost" onClick={() => saveSession("", null)}>
                      Clear
                    </Button>
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        </Card>
      </section>

      <aside className="space-y-4">
        <Card className="p-4">
          <p className="section-kicker mb-2">Session State</p>
          <div className="space-y-2 text-sm">
            <p className="font-mono text-foreground">{isAuthed ? "Authenticated" : "Guest"}</p>
            <p className="text-muted-foreground">{user ? `${user.name} · ${user.email}` : "No active user"}</p>
            <p className="font-mono text-xs text-muted-foreground">{tokenPreview}</p>
            <p className={cn("text-xs font-medium", pingOnline ? "text-gain" : "text-loss")}>{pingText}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => void checkPing()} disabled={busy !== null}>
              Ping
            </Button>
            <Button variant="secondary" size="sm" onClick={loadProducts} disabled={!isAuthed || busy !== null}>
              Refresh
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <p className="section-kicker mb-2">Last Action</p>
          <p className="mb-2 text-sm text-foreground">{busy ?? notice.title}</p>
          <pre className="max-h-80 overflow-auto rounded border border-border bg-surface p-2 font-mono text-xs text-muted-foreground">
            {notice.body}
          </pre>
        </Card>
      </aside>
    </div>
  );
}

function InputField({
  name,
  label,
  value,
  onChange,
  type = "text",
  step,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  step?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm text-muted-foreground" htmlFor={name}>
      {label}
      <input
        id={name}
        name={name}
        type={type}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors focus:border-brand/40"
      />
    </label>
  );
}

function ServerCard({ product }: { product: CloudflowProduct }) {
  const specs = parseSpecs(product.tags).slice(0, 6);

  return (
    <article className="rounded-lg border border-border bg-surface-raised p-4 transition-all duration-200 ease-spring hover:-translate-y-0.5 hover:border-brand/30">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-medium text-foreground">{product.name}</h3>
        <Badge variant={product.status === "active" ? "success" : "default"}>{product.status ?? "active"}</Badge>
      </div>

      <p className="mb-3 text-sm text-muted-foreground">{product.description}</p>

      {specs.length ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {specs.map((spec) => (
            <span key={spec} className="rounded border border-border bg-surface px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
              {spec}
            </span>
          ))}
        </div>
      ) : null}

      <div className="grid gap-1 text-xs text-muted-foreground">
        <p className="font-mono text-base text-foreground">{formatPrice(product.price)} / mo</p>
        <p>seller: {product.seller_id}</p>
        <p>category: {product.category_id ?? "-"}</p>
        <p>rating: {product.rating ?? "-"}</p>
      </div>
    </article>
  );
}
