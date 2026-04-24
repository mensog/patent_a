# EcaMarket demo

Demo-версия B2B-платформы закупок на `React + Vite + Supabase`.

Проект не пытается быть production-ready. Цель репозитория: живое demo с реальными данными из Supabase и рабочими buyer/supplier сценариями.

## Что уже покрыто

- аутентификация через Supabase: `login / signup / logout / persistent session`
- role-aware маршруты и отдельный setup шаг для новых аккаунтов без профиля/компании
- buyer экраны: dashboard, catalog, material detail, RFQ list/detail, orders list/detail
- supplier экраны: dashboard, offers CRUD, price import, RFQ list/detail + quote submit, shipments list/detail, route planning demo
- topbar search
- notifications panel с mark-as-read
- profile/company settings

## Локальный запуск

1. Установить зависимости:

```bash
npm install
```

2. Создать `.env` из `.env.example` и заполнить:

```bash
VITE_SUPABASE_PROJECT_ID=...
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Дополнительно поддерживается старое имя переменной `VITE_SUPABASE_ANON_KEY`.

3. Запустить фронтенд:

```bash
npm run dev
```

4. Для проверки качества:

```bash
npm run lint
npm run test
npm run build
```

## Supabase

В репозитории есть `supabase/config.toml` с `project_id` и миграции в `supabase/migrations`.

Критично для demo:

- применить миграции с helper functions и RLS policy
- убедиться, что у новых пользователей можно создавать `profiles` и `companies`
- проверить, что buyer/supplier видят только свои сущности или приглашения

Новая migration:

- `supabase/migrations/20260413190000_demo_rls_and_helper_policies.sql`

Она добавляет:

- `get_my_company_id`
- `can_access_rfq`
- `can_access_quote`
- `can_access_order`
- demo-oriented RLS policy для чтения и базовых write-flow

## Demo flow

### Buyer

1. Зарегистрироваться или войти
2. Если у аккаунта нет профиля/компании, пройти `/setup`
3. Открыть каталог материалов
4. Создать RFQ из списка запросов
5. Перейти в RFQ detail и проверить полученные КП
6. Открыть список заказов и detail заказа

### Supplier

1. Войти в supplier аккаунт
2. Проверить offers dashboard и список предложений
3. Добавить/изменить позицию в offers
4. Импортировать прайс из файла
5. Открыть приглашённый RFQ и сохранить/отправить КП
6. Открыть shipments и подтвердить отгрузку

## Ограничения

- route planning остаётся demo-экраном без реальной картографии
- document download / print сейчас ограничены UI-сценарием
- production-hardening, audit и глубокая оптимизация chunk splitting пока не делались
