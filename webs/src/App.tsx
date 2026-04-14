import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Tabs } from '@base-ui/react/tabs';
import { Input } from '@base-ui/react/input';
import { ApiError, graphqlRequest, publicPing } from './api';
import type { AuthPayload, Category, Product, User } from './types';
import logoUrl from '../icon_log.png';

type Notice = {
  title: string;
  body: unknown;
};

type TabValue = 'market' | 'seller' | 'account' | 'users';

const TOKEN_KEY = 'cloudflow_market_token';
const USER_KEY = 'cloudflow_market_user';
const tabs = new Set<TabValue>(['market', 'seller', 'account', 'users']);

const api = {
  login: `
    mutation Login($email: String!, $password: String!) {
      login(email: $email, password: $password) {
        token
        user { id name email img_user role rating balance created_at updated_at }
      }
    }
  `,
  register: `
    mutation Register($name: String!, $email: String!, $img: String!, $password: String!) {
      register(name: $name, email: $email, img_user: $img, password: $password) {
        token
        user { id name email img_user role rating balance created_at updated_at }
      }
    }
  `,
  logout: `mutation Logout { logout }`,
  users: `
    query GetUsers($name: String, $email: String, $id: ID) {
      getUsers(name: $name, email: $email, id: $id) {
        id name email img_user role rating balance created_at updated_at
      }
    }
  `,
  products: `
    query GetProducts($name: String, $id: ID, $sellerID: ID) {
      getProducts(name: $name, id: $id, seller_id: $sellerID) {
        id seller_id category_id name description price rating status tags created_at updated_at
      }
    }
  `,
  setCategory: `
    mutation SetCategory($name: String!, $parentID: Int) {
      setCategory(name: $name, parentID: $parentID) { id name parent_id }
    }
  `,
  setProduct: `
    mutation SetProduct(
      $sellerID: ID!
      $categoryID: Int!
      $name: String!
      $description: String!
      $price: Int!
      $rating: Float!
      $tags: [String]!
    ) {
      setProduct(
        sellerID: $sellerID
        categoryID: $categoryID
        name: $name
        description: $description
        price: $price
        rating: $rating
        tags: $tags
      ) {
        id seller_id category_id name description price rating status tags created_at updated_at
      }
    }
  `,
};

function loadStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as User;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

function optional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function money(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

function print(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value, null, 2);
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabValue>(() => {
    const value = new URLSearchParams(window.location.search).get('tab') as TabValue | null;
    return value && tabs.has(value) ? value : 'market';
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [user, setUser] = useState<User | null>(() => loadStoredUser());
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>({
    title: 'Cloudflow Market',
    body: 'Войдите, чтобы открыть каталог и управление товарами.',
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [loginForm, setLoginForm] = useState({
    email: 'testuser01@example.com',
    password: '12345678',
  });
  const [registerForm, setRegisterForm] = useState({
    name: 'testuser01',
    email: 'testuser01@example.com',
    img: 'https://example.com/a.png',
    password: '12345678',
  });
  const [catalogFilters, setCatalogFilters] = useState({ id: '', name: '', sellerID: '' });
  const [userFilters, setUserFilters] = useState({ id: '', name: '', email: '' });
  const [categoryForm, setCategoryForm] = useState({ name: 'Новая категория', parentID: '' });
  const [productForm, setProductForm] = useState({
    sellerID: '',
    categoryID: '1',
    name: 'Новый товар',
    description: 'Краткое описание товара',
    price: '1000',
    rating: '5',
    tags: 'new, market',
  });

  const isAuthed = token.trim().length > 0;
  const tokenPreview = useMemo(() => {
    if (!token) {
      return 'JWT не сохранен';
    }
    return `${token.slice(0, 16)}...${token.slice(-8)}`;
  }, [token]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', activeTab);
    window.history.replaceState(null, '', url);
  }, [activeTab]);

  function saveSession(nextToken: string, nextUser?: User | null) {
    setToken(nextToken);
    if (nextToken) {
      localStorage.setItem(TOKEN_KEY, nextToken);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }

    if (nextUser) {
      setUser(nextUser);
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    } else if (!nextToken) {
      setUser(null);
      localStorage.removeItem(USER_KEY);
    }
  }

  async function run<T>(title: string, action: () => Promise<T>) {
    setBusy(title);
    try {
      const result = await action();
      setNotice({ title, body: result });
      return result;
    } catch (error) {
      setNotice({
        title: `${title}: ошибка`,
        body: {
          message: error instanceof Error ? error.message : 'Неизвестная ошибка',
          payload: error instanceof ApiError ? error.payload : error,
        },
      });
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    await run('Вход', async () => {
      const response = await graphqlRequest<{ login: AuthPayload }>(api.login, loginForm);
      const payload = response.payload.data?.login;
      if (payload) {
        saveSession(payload.token, payload.user);
        setProductForm((form) => ({ ...form, sellerID: payload.user.id }));
      }
      return response;
    });
  }

  async function register(event: FormEvent) {
    event.preventDefault();
    await run('Регистрация', async () => {
      const response = await graphqlRequest<{ register: AuthPayload }>(api.register, registerForm);
      const payload = response.payload.data?.register;
      if (payload) {
        saveSession(payload.token, payload.user);
        setProductForm((form) => ({ ...form, sellerID: payload.user.id }));
      }
      return response;
    });
  }

  async function logout() {
    await run('Выход', async () => {
      const response = await graphqlRequest<{ logout: boolean }>(api.logout, {}, token);
      saveSession('');
      return response;
    });
  }

  async function ping() {
    await run('Проверка backend', publicPing);
  }

  async function loadProducts() {
    await run('Загрузка каталога', async () => {
      const response = await graphqlRequest<{ getProducts: Product[] }>(
        api.products,
        {
          id: optional(catalogFilters.id),
          name: optional(catalogFilters.name),
          sellerID: optional(catalogFilters.sellerID),
        },
        token,
      );
      setProducts(response.payload.data?.getProducts || []);
      return response;
    });
  }

  async function loadUsers() {
    await run('Загрузка пользователей', async () => {
      const response = await graphqlRequest<{ getUsers: User[] }>(
        api.users,
        {
          id: optional(userFilters.id),
          name: optional(userFilters.name),
          email: optional(userFilters.email),
        },
        token,
      );
      setUsers(response.payload.data?.getUsers || []);
      return response;
    });
  }

  async function createCategory(event: FormEvent) {
    event.preventDefault();
    await run('Создание категории', async () => {
      const parentID = optional(categoryForm.parentID);
      return graphqlRequest<{ setCategory: Category }>(
        api.setCategory,
        {
          name: categoryForm.name,
          parentID: parentID ? Number(parentID) : null,
        },
        token,
      );
    });
  }

  async function createProduct(event: FormEvent) {
    event.preventDefault();
    await run('Публикация товара', async () => {
      const tags = productForm.tags
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      return graphqlRequest<{ setProduct: Product }>(
        api.setProduct,
        {
          sellerID: productForm.sellerID,
          categoryID: Number(productForm.categoryID),
          name: productForm.name,
          description: productForm.description,
          price: Number(productForm.price),
          rating: Number(productForm.rating),
          tags,
        },
        token,
      );
    });
  }

  return (
    <>
    <a className="skip-link" href="#main-content">Перейти к содержимому</a>
    <main className="app-shell">
      <div className="app-grid">
        <aside className="rail" aria-label="Состояние площадки">
          <div className="rail-brand">
            <img src={logoUrl} alt="Cloudflow" width="44" height="44" decoding="async" fetchPriority="high" />
            <div>
              <strong>Cloudflow</strong>
              <span>market runtime</span>
            </div>
          </div>

          <section className="session" aria-label="Текущая сессия">
            <div className="session-row">
              <span className={isAuthed ? 'dot ok' : 'dot'} aria-hidden="true" />
              <strong>{isAuthed ? 'Сессия активна' : 'Нужен вход'}</strong>
            </div>
            <code>{tokenPreview}</code>
            <span>{user ? `${user.name} - ${user.email}` : 'Пользователь не выбран'}</span>
          </section>

          <div className="rail-actions">
            <button className="secondary" type="button" disabled={busy !== null} onClick={ping}>Ping backend</button>
            <button className="secondary" type="button" disabled={!isAuthed || busy !== null} onClick={loadProducts}>Обновить витрину</button>
          </div>

          <aside className="notice" role="status" aria-live="polite" aria-atomic="true">
            <div>
              <span>{busy ? 'Выполняется' : 'Последнее действие'}</span>
              <h2>{busy || notice.title}</h2>
            </div>
            <pre tabIndex={0}>{print(notice.body)}</pre>
          </aside>
        </aside>

        <section className="workspace" id="main-content">
          <div className="workspace-chrome" aria-hidden="true">
            <span className="chrome-dot" />
            <span className="chrome-dot" />
            <span className="chrome-dot" />
            <code>cloudflow://marketplace</code>
          </div>

          <section className="intro">
            <div>
              <p>GraphQL marketplace</p>
              <h1>Торговая площадка для Cloudflow backend</h1>
            </div>
            <div className="intro-actions">
              <button className="primary" type="button" disabled={!isAuthed || busy !== null} onClick={loadProducts}>Открыть каталог</button>
              <button className="secondary" type="button" onClick={() => setActiveTab('seller')}>Кабинет продавца</button>
            </div>
          </section>

          <Tabs.Root
            className="tabs"
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as TabValue)}
          >
            <Tabs.List className="tabs-list" activateOnFocus>
              <Tabs.Tab className="tab" value="market">Витрина</Tabs.Tab>
              <Tabs.Tab className="tab" value="seller">Продавец</Tabs.Tab>
              <Tabs.Tab className="tab" value="account">Аккаунт</Tabs.Tab>
              <Tabs.Tab className="tab" value="users">Пользователи</Tabs.Tab>
              <Tabs.Indicator className="tab-indicator" />
            </Tabs.List>

        <Tabs.Panel className="panel" value="market">
          <section className="toolbar">
            <Field name="product-id-filter" label="ID товара" value={catalogFilters.id} onChange={(id) => setCatalogFilters((form) => ({ ...form, id }))} />
            <Field name="product-name-filter" label="Название" value={catalogFilters.name} onChange={(name) => setCatalogFilters((form) => ({ ...form, name }))} />
            <Field name="seller-id-filter" label="Seller ID" value={catalogFilters.sellerID} onChange={(sellerID) => setCatalogFilters((form) => ({ ...form, sellerID }))} />
            <button className="primary" type="button" disabled={!isAuthed || busy !== null} onClick={loadProducts}>
              Загрузить каталог
            </button>
          </section>

          <section className="market-grid">
            {products.length ? (
              products.map((product) => <ProductTile key={product.id} product={product} />)
            ) : (
              <div className="empty-state">
                <h2>Каталог пуст</h2>
                <p>Загрузите товары из backend или опубликуйте первый товар в кабинете продавца.</p>
              </div>
            )}
          </section>
        </Tabs.Panel>

        <Tabs.Panel className="panel" value="seller">
          <section className="grid two">
            <form className="surface form" onSubmit={createProduct}>
              <SectionTitle eyebrow="setProduct" title="Опубликовать товар" />
              <Field name="seller-id" label="Seller ID" value={productForm.sellerID} onChange={(sellerID) => setProductForm((form) => ({ ...form, sellerID }))} />
              <div className="split">
                <Field name="category-id" label="Category ID" type="number" value={productForm.categoryID} onChange={(categoryID) => setProductForm((form) => ({ ...form, categoryID }))} />
                <Field name="price" label="Цена" type="number" value={productForm.price} onChange={(price) => setProductForm((form) => ({ ...form, price }))} />
              </div>
              <Field name="product-name" label="Название" value={productForm.name} onChange={(name) => setProductForm((form) => ({ ...form, name }))} />
              <label>
                Описание
                <textarea name="description" className="textarea" value={productForm.description} onChange={(event) => setProductForm((form) => ({ ...form, description: event.target.value }))} />
              </label>
              <div className="split">
                <Field name="rating" label="Рейтинг" type="number" step="0.1" value={productForm.rating} onChange={(rating) => setProductForm((form) => ({ ...form, rating }))} />
                <Field name="tags" label="Теги" value={productForm.tags} onChange={(tags) => setProductForm((form) => ({ ...form, tags }))} />
              </div>
              <button className="primary" disabled={!isAuthed || busy !== null}>Опубликовать</button>
            </form>

            <form className="surface form" onSubmit={createCategory}>
              <SectionTitle eyebrow="setCategory" title="Создать категорию" />
              <Field name="category-name" label="Название" value={categoryForm.name} onChange={(name) => setCategoryForm((form) => ({ ...form, name }))} />
              <Field name="parent-id" label="Parent ID" type="number" value={categoryForm.parentID} onChange={(parentID) => setCategoryForm((form) => ({ ...form, parentID }))} />
              <button className="primary" disabled={!isAuthed || busy !== null}>Создать категорию</button>
              <div className="note">
                `getCategories` в backend пока не реализован, поэтому список категорий здесь не запрашивается.
              </div>
            </form>
          </section>
        </Tabs.Panel>

        <Tabs.Panel className="panel" value="account">
          <section className="grid two">
            <form className="surface form" onSubmit={login}>
              <SectionTitle eyebrow="login" title="Вход" />
              <Field name="login-email" label="Email" type="email" autoComplete="email" value={loginForm.email} onChange={(email) => setLoginForm((form) => ({ ...form, email }))} />
              <Field name="login-password" label="Пароль" type="password" autoComplete="current-password" value={loginForm.password} onChange={(password) => setLoginForm((form) => ({ ...form, password }))} />
              <button className="primary" disabled={busy !== null}>Войти</button>
            </form>

            <form className="surface form" onSubmit={register}>
              <SectionTitle eyebrow="register" title="Регистрация" />
              <Field name="register-name" label="Имя" autoComplete="name" value={registerForm.name} onChange={(name) => setRegisterForm((form) => ({ ...form, name }))} />
              <Field name="register-email" label="Email" type="email" autoComplete="email" value={registerForm.email} onChange={(email) => setRegisterForm((form) => ({ ...form, email }))} />
              <Field name="register-avatar" label="Аватар" autoComplete="url" value={registerForm.img} onChange={(img) => setRegisterForm((form) => ({ ...form, img }))} />
              <Field name="register-password" label="Пароль" type="password" autoComplete="new-password" value={registerForm.password} onChange={(password) => setRegisterForm((form) => ({ ...form, password }))} />
              <button className="primary" disabled={busy !== null}>Создать аккаунт</button>
            </form>
          </section>

          <section className="surface token-panel">
            <SectionTitle eyebrow="JWT" title="Текущая сессия" />
            <textarea name="jwt-token" className="textarea code" value={token} onChange={(event) => setToken(event.target.value)} spellCheck={false} aria-label="JWT токен" />
            <div className="actions">
              <button className="secondary" type="button" onClick={() => saveSession(token.trim(), user)}>Сохранить токен</button>
              <button className="secondary danger" type="button" onClick={() => saveSession('')}>Очистить</button>
              <button className="secondary" type="button" disabled={!isAuthed || busy !== null} onClick={logout}>Logout</button>
              <button className="secondary" type="button" disabled={busy !== null} onClick={ping}>Проверить backend</button>
            </div>
          </section>
        </Tabs.Panel>

        <Tabs.Panel className="panel" value="users">
          <section className="surface">
            <SectionTitle eyebrow="getUsers" title="Пользователи площадки" />
            <div className="toolbar inner">
              <Field name="user-id-filter" label="ID" value={userFilters.id} onChange={(id) => setUserFilters((form) => ({ ...form, id }))} />
              <Field name="user-name-filter" label="Name" value={userFilters.name} onChange={(name) => setUserFilters((form) => ({ ...form, name }))} />
              <Field name="user-email-filter" label="Email" type="email" value={userFilters.email} onChange={(email) => setUserFilters((form) => ({ ...form, email }))} />
              <button className="primary" type="button" disabled={!isAuthed || busy !== null} onClick={loadUsers}>Загрузить</button>
            </div>
            <UsersTable rows={users} />
          </section>
        </Tabs.Panel>
          </Tabs.Root>
        </section>
      </div>
    </main>
    </>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="section-title">
      <p>{eyebrow}</p>
      <h2>{title}</h2>
    </div>
  );
}

function Field({
  name,
  label,
  value,
  onChange,
  type = 'text',
  step,
  autoComplete,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  step?: string;
  autoComplete?: string;
}) {
  const inputMode = type === 'number' ? (step ? 'decimal' : 'numeric') : undefined;
  const resolvedAutoComplete = autoComplete ?? 'off';
  const resolvedSpellCheck = type === 'email' || name.includes('id') ? false : undefined;

  return (
    <label>
      {label}
      <Input
        className="control"
        name={name}
        type={type}
        step={step}
        inputMode={inputMode}
        autoComplete={resolvedAutoComplete}
        spellCheck={resolvedSpellCheck}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ProductTile({ product }: { product: Product }) {
  return (
    <article className="product-tile">
      <div>
        <span className="pill">{product.status || 'active'}</span>
        <h2>{product.name}</h2>
        <p>{product.description}</p>
      </div>
      <div className="product-meta">
        <strong>{money(product.price)}</strong>
        <span>seller: {product.seller_id}</span>
        <span>category: {product.category_id ?? '-'}</span>
      </div>
      {product.tags?.length ? (
        <div className="tags">
          {product.tags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      ) : null}
    </article>
  );
}

function UsersTable({ rows }: { rows: User[] }) {
  if (!rows.length) {
    return <p className="empty">Пользователи еще не загружены.</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Имя</th>
            <th>Email</th>
            <th>Роль</th>
            <th>Баланс</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.id}</td>
              <td>{row.name}</td>
              <td>{row.email}</td>
              <td>{row.role || '-'}</td>
              <td>{row.balance ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
