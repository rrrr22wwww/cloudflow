# TRADING MARKETPLACE — FULL STACK CODEX PROMPT

## ЗАДАЧА
Создай полноценную торговую площадку (marketplace для цифровых активов / товаров) с нуля.
Дизайн вдохновлён сайтом zed.dev — тёмная тема, dot-grid фон, карточки с тонкой обводкой,
типографика monospace + sans, синий акцент (#4f8ef7).

---

## СТЕК

| Слой | Технология |
|------|-----------|
| Пакетный менеджер | **bun** |
| Фреймворк | **Next.js 15** (App Router, RSC) |
| Язык | **TypeScript** (strict) |
| UI примитивы | **Base UI** (`@base-ui-components/react`) |
| Компоненты | **shadcn/ui** + **Fluid Functionalism** (`https://www.fluidfunctionalism.com`) |
| Стили | **Tailwind CSS v3** (CSS переменные для темы) |
| Анимации | **Motion** (`motion/react`) |
| Состояние | **Zustand** |
| Графики | **Recharts** |
| Иконки | **Lucide React** |
| Темы | **next-themes** (dark по умолчанию) |

Установка зависимостей: `bun add ...`
Добавление shadcn компонентов: `bunx shadcn@latest add ...`
Добавление Fluid компонентов: `bunx shadcn@latest add @fluid/button` и т.д.

---

## СТРУКТУРА ПРОЕКТА

```
trade-market/
├── app/
│   ├── globals.css              # CSS переменные темы + утилиты
│   ├── layout.tsx               # Root layout, ThemeProvider, Navbar, TickerBanner
│   ├── page.tsx                 # Главная: hero + featured listings + stats
│   ├── marketplace/
│   │   └── page.tsx             # Каталог с фильтрами и сеткой
│   ├── listing/[id]/
│   │   └── page.tsx             # Детальная страница лота
│   ├── portfolio/
│   │   └── page.tsx             # Личный портфель пользователя
│   └── api/
│       ├── listings/route.ts    # GET /api/listings (поиск, фильтры, пагинация) описание в файле /Users/root1/Desktop/cloudflow/apps/API_SHORT.md
│       ├── listing/[id]/route.ts
│       └── stats/route.ts       # Тикер данные
├── components/
│   ├── layout/
│   │   ├── navbar.tsx           # Навигация (стиль zed.dev)
│   │   └── ticker-banner.tsx    # Бегущая строка с ценами вверху
│   ├── marketplace/
│   │   ├── listing-card.tsx     # Карточка лота
│   │   ├── listings-grid.tsx    # Сетка карточек со stagger анимацией
│   │   ├── filters-sidebar.tsx  # Sidebar фильтров
│   │   ├── search-bar.tsx       # cmdk поиск
│   │   └── sort-controls.tsx    # Сортировка
│   ├── listing/
│   │   ├── price-chart.tsx      # Recharts график цены
│   │   ├── order-book.tsx       # Стакан ордеров
│   │   ├── buy-form.tsx         # Форма покупки
│   │   └── activity-feed.tsx    # Лента сделок
│   ├── portfolio/
│   │   ├── holdings-table.tsx   # Таблица активов
│   │   └── pnl-chart.tsx        # P&L график
│   ├── ui/                      # shadcn/ui + fluid компоненты
│   └── providers/
│       └── theme-provider.tsx
├── lib/
│   ├── utils.ts                 # cn(), formatPrice(), formatPercent()
│   ├── mock-data.ts             # Моковые данные для разработки
│   └── store.ts                 # Zustand store (cart, filters, user)
├── hooks/
│   ├── use-listings.ts          # Хук для загрузки листингов
│   └── use-ticker.ts            # Хук для live цен (polling / SSE)
├── tailwind.config.ts
├── components.json
└── package.json
```

---

## ДИЗАЙН-СИСТЕМА (CSS переменные в globals.css)

### Цветовые токены (dark mode — основной)
```css
.dark {
  --background:      220 13%  9%;   /* #131619 — основной фон */
  --surface:         222 14% 12%;   /* #181c22 — поверхность */
  --surface-raised:  222 13% 15%;   /* #1d2229 — карточки */
  --surface-overlay: 222 12% 18%;   /* #222a33 — попапы/дропдауны */
  --foreground:      220  9% 88%;   /* #dde1e8 — основной текст */
  --muted-foreground:220  9% 50%;   /* приглушённый текст */
  --border:          220 11% 20%;   /* обводки */
  --brand:           217 91% 60%;   /* #4f8ef7 — Zed синий */
  --brand-muted:     217 30% 22%;   /* фон синего */
  --gain:            142 69% 52%;   /* #3dd68c — зелёный (рост) */
  --gain-muted:      142 30% 18%;
  --loss:              0 72% 56%;   /* #f04747 — красный (падение) */
  --loss-muted:        0 30% 18%;
}
```

### Фон страниц
- Основной фон: `--background` + dot-grid паттерн поверх:
  ```css
  background-image: radial-gradient(circle, hsl(var(--border)/0.5) 1px, transparent 1px);
  background-size: 24px 24px;
  ```
- Тонкие горизонтальные разделители через `border-b border-border/50`

### Типографика
- Основной шрифт: **IBM Plex Sans** (weights: 300, 400, 500, 600)
- Моно / лейблы: **IBM Plex Mono** (цены, тикеры, коды)
- Заголовки секций: моно, tracking-wider, uppercase, muted цвет — стиль как у zed.dev ("From The Blog")

### Анимации (Fluid Functionalism паттерны)
- Все hover transitions через spring: `cubic-bezier(0.34, 1.56, 0.64, 1)` 200ms
- Font-weight shift на hover: wght 400 → 600 через `font-variation-settings`
- Карточки при появлении: stagger fade-in с задержкой 60ms между элементами
- Числа при обновлении цен: flash анимация (зелёный/красный + translateY)

---

## КОМПОНЕНТЫ — ДЕТАЛИ

### `<Navbar />`
- Полная ширина, высота 48px, `bg-background/80 glass border-b border-border`
- Слева: логотип (монограмма + название)
- Центр: навигационные ссылки (Marketplace, Portfolio, Analytics, Docs) с fw-hover эффектом
- Справа: поиск (иконка), уведомления, кнопка Connect Wallet (Fluid Button primary)
- На скролл: `backdrop-blur` усиливается, добавляется тень

### `<TickerBanner />`
- Над navbar, высота 32px, `bg-surface border-b border-border`
- Бесконечная прокрутка влево: `animation: ticker-left 30s linear infinite`
- Формат: `BTC/USD  $67,420.00  ▲ +2.34%` — цвет gain/loss по знаку
- Шрифт IBM Plex Mono, размер 11px

### `<ListingCard />`
```
┌─────────────────────────────────┐
│  [превью изображение/иконка]    │  ← aspect-video, bg-surface, object-cover
├─────────────────────────────────┤
│  Название лота           [Badge]│  ← badge: "New" | "Hot" | "Verified"
│  Краткое описание               │  ← 2 строки, text-muted-foreground text-sm
│                                 │
│  ──────────────────────────     │
│  $1,240.00          ▲ +5.2%    │  ← цена моно, процент colored
│  [Buy Now]        Vol: 2.4K     │  ← Fluid Button sm
└─────────────────────────────────┘
```
- `bg-surface-raised border border-border rounded-lg`
- `hover:border-brand/40 hover:shadow-card-hover` через spring transition
- `hover:-translate-y-0.5` эффект подъёма

### `<FiltersSidebar />`
- Fluid `<Accordion />` для групп фильтров
- Fluid `<Slider />` для диапазона цен
- Fluid `<CheckboxGroup />` для категорий
- Fluid `<RadioGroup />` для сортировки
- Кнопка "Reset Filters" ghost

### `<PriceChart />`
- Recharts `AreaChart`
- Цвет области: brand gradient с opacity 0.2 → 0
- Линия: `--brand` stroke
- Тёмная сетка: `--border/30`
- Tooltip: кастомный, `bg-surface-overlay border border-border rounded-md`

### `<OrderBook />`
```
BIDS              │  ASKS
──────────────────┼──────────────────
$1,238.00  │ 12.4 │ 4.2 │ $1,242.00
$1,236.50  │  8.1 │ 6.7 │ $1,244.00
$1,235.00  │ 21.0 │ 9.3 │ $1,246.00
```
- Зелёная заливка слева (bids), красная справа (asks), ширина пропорциональна объёму
- Обновления через flash анимацию

### `<BuyForm />`
- Base UI `<NumberField />` для количества
- Fluid `<Tabs />`: "Market" / "Limit" / "Stop"
- Fluid `<Slider />` для быстрого выбора % от баланса
- Итог в рамке `bg-brand-muted border border-brand/30 rounded-md`
- CTA: Fluid Button primary full-width

---

## API ROUTES

### `GET /api/listings`
Query params: `category`, `minPrice`, `maxPrice`, `sort`, `page`, `limit`
Response:
```json
{
  "items": [...],
  "total": 247,
  "page": 1,
  "hasMore": true
}
```

### `GET /api/listing/[id]`
Response: полный объект лота + история цен `priceHistory: [{t, price, volume}]`

### `GET /api/stats`
Response: массив тикеров для баннера

---

## ZUSTAND STORE (lib/store.ts)

```typescript
interface MarketStore {
  // Filters
  filters: { category: string[]; priceRange: [number, number]; sort: string }
  setFilters: (f: Partial<Filters>) => void
  resetFilters: () => void

  // Cart / Watchlist
  watchlist: string[]
  toggleWatchlist: (id: string) => void

  // UI state
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void
}
```

---

## СТРАНИЦЫ

### `app/page.tsx` — Главная
1. **Hero секция**: большой заголовок центром, подзаголовок, две кнопки (Enter Marketplace, View Docs), dot-grid фон
2. **Stats strip**: 4 метрики в ряд (Total Volume, Active Listings, Users, 24h Trades) с анимацией счётчика
3. **Featured Listings**: заголовок стиль "From The Blog" у Zed, 3 карточки в ряд, stagger анимация
4. **Categories grid**: 6 категорий с иконками, hover эффект
5. **Recent activity**: таблица последних сделок

### `app/marketplace/page.tsx` — Каталог
- Layout: `sidebar (280px) | main grid`
- Main: `<SearchBar /> + <SortControls />` сверху, затем `<ListingsGrid />`
- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- Пагинация: Load More кнопка (не страницы)
- Мобайл: sidebar в `<Sheet />` (Fluid Dialog)

### `app/listing/[id]/page.tsx` — Детальная
- Layout 2 колонки: `main (60%) | aside (40%)`
- Main: медиа + описание + activity feed
- Aside: цена + `<BuyForm />` + `<OrderBook />`
- Вверху: `<PriceChart />` на всю ширину

### `app/portfolio/page.tsx` — Портфель
- Сводка: Total Value, P&L, кол-во активов
- `<PnlChart />` за 30/90/180 дней
- `<HoldingsTable />`: Fluid Table с сортировкой

---

## МОКОВЫЕ ДАННЫЕ (lib/mock-data.ts)
Создай 24 листинга в 6 категориях: Art, Music, Gaming, DeFi, Collectibles, Utilities.
Каждый листинг:
```typescript
{
  id: string
  name: string
  description: string
  category: Category
  price: number
  priceChange24h: number   // процент
  volume24h: number
  imageUrl: string         // placeholder через picsum.photos
  verified: boolean
  tags: string[]
  priceHistory: { t: number; price: number; volume: number }[]
}
```

---

## КОД-СТАЙЛ И ТРЕБОВАНИЯ

- Все компоненты: `"use client"` только где нужны хуки/события; остальное RSC
- Строгий TypeScript: все пропсы типизированы, нет `any`
- `cn()` утилита из `clsx + tailwind-merge` для условных классов
- `formatPrice(n)` → `$1,240.00`, `formatPercent(n)` → `+5.24%` с знаком
- Нет лишних зависимостей — если есть нативное CSS решение, использовать его
- Семантический HTML: `nav`, `main`, `section`, `article`, `aside`
- ARIA атрибуты на интерактивных элементах
- `loading.tsx` скелетоны для каждого роута
- `error.tsx` с кнопкой retry

---

## КОМАНДЫ ЗАПУСКА

```bash
# Установка
bun install

# Добавить shadcn
bunx shadcn@latest init

# Добавить базовые shadcn компоненты
bunx shadcn@latest add button badge dialog tabs tooltip select slider switch checkbox accordion table separator

# Добавить Fluid Functionalism поверх (переопределят shadcn)
bunx shadcn@latest add @fluid/button @fluid/tabs @fluid/tabs-subtle @fluid/slider @fluid/switch @fluid/accordion @fluid/badge @fluid/select @fluid/tooltip @fluid/dialog @fluid/radio-group @fluid/checkbox-group @fluid/table

# Dev сервер
bun dev
```

---

## ФИНАЛЬНАЯ ПРОВЕРКА ПЕРЕД ЗАВЕРШЕНИЕМ
- [ ] Все страницы рендерятся без ошибок
- [ ] Темная тема активна по умолчанию
- [ ] Карточки появляются с stagger анимацией
- [ ] Hover на карточках — spring подъём + синяя обводка
- [ ] Фильтры работают и обновляют сетку
- [ ] График цены отображается корректно
- [ ] Тикер-баннер прокручивается бесконечно
- [ ] Адаптив: мобайл/планшет/десктоп
- [ ] `bun build` проходит без ошибок TypeScript
