# Cloudflow API (кратко)

## Публичные API (без токена)
- `POST /query` с GraphQL мутациями: `login`, `register`
- `GET /public/ping`
- `GET /` (GraphQL Playground)
- `GET /auth-test` (тестовая HTML-страница)

## Защищенные API (нужен JWT Bearer token)
- `POST /query` для всех остальных GraphQL операций:
  - `logout`
  - `getUsers`
  - `getProducts`
  - `setCategory`
  - `setProduct`
  - `getOrders` *(в коде пока not implemented)*
  - `getCategories` *(в коде пока not implemented)*

## Роли и доступ
- В JWT хранится роль пользователя (`role`).
- На текущий момент role-based ограничений **нет**: любая авторизованная роль имеет одинаковый доступ к защищенным операциям.
- Неавторизованный пользователь не может вызывать защищенные операции.
