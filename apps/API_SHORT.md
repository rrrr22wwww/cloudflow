# Cloudflow API (кратко)

## Публичные API (без токена)
- `POST /query` с GraphQL мутациями: `login`, `register`
- `POST /query` с GraphQL 2FA email flow:
  - `requestEmailLoginCode(email, password)` — проверяет пароль, генерирует 6-значный код на сервере и отправляет его на email пользователя
  - `verifyEmailLoginCode(challenge_id, code)` — проверяет код и возвращает JWT `AuthPayload`
- `GET /public/ping`
- `GET /` (GraphQL Playground)
- `GET /auth-test` (тестовая HTML-страница)

## Email 2FA SMTP env
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_FROM`

## Защищенные API (нужен JWT Bearer token)
- `POST /query` для всех остальных GraphQL операций:
  - `logout`
  - `me`
  - `getUsers`
  - `setUser`
  - `deleteUser`
  - `getProducts`
  - `setProduct`
  - `updateProduct`
  - `deleteProduct`
  - `topUpBalance`
  - `purchaseProduct`
  - `getCategories`
  - `getPurchasedProducts`
  - `setCategory`
  - `updateCategory`
  - `deleteCategory`
  - `getOrders`

## Роли и доступ
- В JWT хранится роль пользователя (`role`).
- `User` может обновлять и удалять только свой аккаунт.
- `User` может пополнять свой баланс, покупать товары и смотреть только свои покупки/заказы.
- `Seller` может создавать и менять свои карточки товаров.
- `Moderator` и `Creator` могут управлять пользователями, категориями и любыми карточками товаров.
- Неавторизованный пользователь не может вызывать защищенные операции.
