# EcaMarket Demo: подробный системный обзор

Этот документ собран по реальному состоянию кода в репозитории. Ниже описано, как система устроена сейчас, какие части действительно работают, какие данные откуда читаются, какие действия записывают данные в Supabase, а какие пока только демонстрационные.

Документ опирается на:

- `src/App.tsx`
- `src/contexts/AuthContext.tsx`
- `src/components/*`
- `src/pages/**/*`
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `supabase/migrations/*.sql`
- `README.md`

Если в этом документе используется формулировка `в коде подтверждено`, это значит, что поведение явно найдено в текущем коде. Если используется формулировка `в коде не найдено`, это значит, что соответствующего поведения или отдельного потока в репозитории нет.

---

## 1. Что это за система

`EcaMarket` — demo B2B-платформа закупок на `React + Vite + Supabase`.

Цель текущего состояния проекта:

- не production-приложение;
- а рабочее demo с живыми экранами buyer/supplier;
- с реальными данными из Supabase;
- с базовыми CRUD-потоками там, где это критично для показа демо.

Система моделирует процесс закупки материалов:

1. buyer работает со справочником материалов;
2. buyer создает RFQ;
3. RFQ рассылается поставщикам;
4. supplier отвечает коммерческим предложением;
5. buyer видит quotes по своему RFQ;
6. далее система показывает заказы и отгрузки, но их создание из UI сейчас не реализовано;
7. supplier может поддерживать свои offers, импортировать прайс, смотреть shipments и менять статус отгрузки.

---

## 2. Технологический стек

Подтверждено по `package.json`:

- фронтенд: `React 18`
- сборка: `Vite 5`
- язык: `TypeScript`
- маршрутизация: `react-router-dom`
- серверное состояние / кэш запросов: `@tanstack/react-query`
- backend: `Supabase`
- UI primitives: `Radix UI`
- дизайн-система/стили: `Tailwind CSS` + shadcn/ui
- уведомления UI: `sonner` + shadcn `toaster`
- таблицы/Excel импорт: `xlsx`
- тесты: `vitest` + `@testing-library/jest-dom`

Дополнительно:

- `lovable-tagger` подключен только в dev-режиме через `vite.config.ts`
- алиас `@` указывает на `src`

---

## 3. Точка входа и сборка приложения

### 3.1. Точка входа

`src/main.tsx`

Что делает:

- импортирует `App`
- импортирует глобальные стили `src/index.css`
- монтирует React-приложение в DOM-элемент `#root`

### 3.2. Корневой composition

`src/App.tsx`

Порядок глобальных провайдеров:

1. `QueryClientProvider` — react-query
2. `TooltipProvider`
3. `Toaster`
4. `Sonner`
5. `BrowserRouter`
6. `AuthProvider`
7. `Routes`

Что это означает на практике:

- все страницы приложения работают внутри одного react-query клиента;
- auth-состояние доступно через контекст;
- роуты завязаны на auth/profile;
- toast/sonner доступны глобально.

---

## 4. Как система подключается к Supabase

### 4.1. Клиент Supabase

`src/integrations/supabase/client.ts`

Подтверждено по коду:

- URL берется из `VITE_SUPABASE_URL`
- ключ берется из `VITE_SUPABASE_PUBLISHABLE_KEY`
- есть fallback на старое имя `VITE_SUPABASE_ANON_KEY`
- если env не заданы, приложение падает с явной ошибкой

Supabase client создается с:

- `storage: localStorage`
- `persistSession: true`
- `autoRefreshToken: true`

Итог:

- сессия сохраняется между перезагрузками;
- access token обновляется автоматически;
- фронт работает напрямую с Supabase без отдельного custom backend.

### 4.2. ENV

`README.md` и `.env.example`

Ожидаемые переменные:

- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- опционально `VITE_SUPABASE_ANON_KEY`

---

## 5. Аутентификация и профиль пользователя

### 5.1. Центральный auth state

`src/contexts/AuthContext.tsx`

Контекст хранит:

- `session`
- `user`
- `profile`
- `profileError`
- `loading`

И методы:

- `signIn(email, password)`
- `signUp(email, password, fullName, role, companyName)`
- `signOut()`
- `refreshProfile()`

### 5.2. Как загружается профиль

Подтверждено по коду:

- после любого `auth` state change вызывается `syncAuthState`
- `syncAuthState` запрашивает `profiles` по `user.id`
- если профиль не найден, `profile` становится `null`
- если при загрузке профиля есть ошибка, она уходит в `profileError`

### 5.3. Что кладется в auth metadata при signup

`AuthContext.signUp()`

В metadata записываются:

- `full_name`
- `role`
- `company_name`

Важно:

- signup не создает `profiles` и не создает `companies` автоматически в БД;
- после signup пользователь должен пройти отдельный setup шаг.

### 5.4. Logout

`signOut()`

Делает:

- `supabase.auth.signOut()`
- очищает `profile`
- очищает `profileError`

---

## 6. Route protection и role model

### 6.1. Компонент защиты

`src/components/ProtectedRoute.tsx`

Логика:

1. если `loading` — показывается fullscreen spinner;
2. если нет `session` — redirect на `/login`;
3. если есть `profileError` — показывается recovery screen;
4. если нет `profile` — redirect на `/setup`;
5. если `requireCompany=true` и у профиля нет `company_id` — redirect на `/setup`;
6. если роль не входит в `allowedRoles` — redirect на default route этой роли;
7. иначе рендерятся children.

### 6.2. Как определяется default route

`src/lib/app-utils.ts`

`getDefaultRouteForRole(role)`:

- `supplier` -> `/supplier`
- всё остальное -> `/buyer`

Это значит:

- `buyer` по умолчанию идет в buyer-зону;
- `manager` и `admin` тоже по умолчанию попадают в buyer-зону;
- supplier идет в supplier-зону.

### 6.3. Практический вывод по ролям

Подтверждено по маршрутам в `src/App.tsx`:

- buyer pages разрешены для `buyer`, `manager`, `admin`
- supplier pages разрешены для `supplier`, `manager`, `admin`
- settings доступны любому авторизованному пользователю

Итог:

- `manager/admin` технически могут заходить и в buyer-, и в supplier-зоны;
- но отдельной специальной manager/admin-логики в UI не реализовано.

---

## 7. Роутинг приложения

### 7.1. Public routes

- `/` — landing
- `/login`
- `/signup`

### 7.2. Setup route

- `/setup` — доступен авторизованному пользователю даже без company, `requireCompany={false}`

### 7.3. Buyer routes

- `/buyer` — dashboard
- `/buyer/catalog`
- `/buyer/material/:id`
- `/buyer/rfq`
- `/buyer/rfq/:id`
- `/buyer/orders`
- `/buyer/orders/:id`

### 7.4. Supplier routes

- `/supplier` — dashboard
- `/supplier/offers`
- `/supplier/import`
- `/supplier/rfq`
- `/supplier/rfq/:id`
- `/supplier/orders/:id`
- `/supplier/shipments`
- `/supplier/shipments/:id`
- `/supplier/routes`

### 7.5. Settings

- `/settings/profile`
- `/settings/company`

### 7.6. Fallback

- `*` -> `src/pages/NotFound.tsx`

---

## 8. Общий layout и навигация

### 8.1. Layout

`src/components/DashboardLayout.tsx`

Что делает:

- строит левый sidebar
- выбирает buyer или supplier navigation
- рендерит `Topbar`
- рендерит page content

Sidebar:

- умеет collapse/expand
- buyer и supplier имеют разные наборы ссылок

Buyer nav:

- обзор
- каталог
- RFQ
- заказы

Supplier nav:

- обзор
- предложения
- импорт прайса
- RFQ
- отгрузки
- маршруты

### 8.2. Topbar

`src/components/Topbar.tsx`

Содержит:

- `TopbarSearch`
- `NotificationsPanel`
- dropdown профиля

Пункты dropdown:

- настройки профиля
- настройки компании
- выйти

---

## 9. Глобальный поиск

`src/components/TopbarSearch.tsx`

### 9.1. Общая логика

- есть local state `search`
- используется `useDeferredValue`
- поиск активен только когда popover открыт
- реальный запрос выполняется только если длина строки >= 2

### 9.2. Поиск для supplier

Подтверждено по коду:

1. ищет приглашения в RFQ:
   - сначала читает `rfq_suppliers` по `supplier_company_id`
   - потом выбирает `rfqs` по найденным `rfq_id`
   - фильтрует по `title`
2. ищет shipments:
   - по `shipment_number`
3. ищет own offers:
   - читает `supplier_offers` текущей компании
   - сопоставляет по имени материала

### 9.3. Поиск для buyer

Ищет:

1. `materials` по `name` или `sku`
2. `rfqs` своей buyer company по `title`
3. `orders` своей buyer company по `order_number`

### 9.4. Ограничения поиска

Подтверждено по коду:

- результаты обрезаются до 12
- supplier search по offers не использует серверный `ilike`, а фильтрует после выборки
- search не является отдельной глобальной поисковой системой по всем сущностям; это набор точечных запросов

---

## 10. Уведомления

`src/components/NotificationsPanel.tsx`

### 10.1. Что делает

- читает `notifications` текущего `user.id`
- показывает последние 20
- считает `unreadCount`
- умеет:
  - mark single as read
  - mark all as read

### 10.2. Навигация по уведомлению

Маршрут определяется через `getNotificationHref()` из `src/lib/app-utils.ts`.

Mapping:

- `rfq` -> buyer `/buyer/rfq/:id` или supplier `/supplier/rfq/:id`
- `quote` -> тот же RFQ detail в зависимости от роли
- `order` -> buyer `/buyer/orders/:id` или supplier `/supplier/orders/:id`
- `shipment` -> `/supplier/shipments/:id`
- `profile` -> `/settings/profile`
- `company` -> `/settings/company`
- `system` -> default route роли

### 10.3. Ограничения уведомлений

В коде подтверждено:

- UI читает и обновляет read-state
- UI создания notifications во фронте нет
- insert/delete flow для notifications во фронте не найден

---

## 11. Доменные сущности и схема данных

### 11.1. Основные enum

`src/integrations/supabase/types.ts`

- `app_role`: `buyer | supplier | manager | admin`
- `company_type`: `buyer | supplier | both`
- `notification_type`: `rfq | quote | order | shipment | system`
- `order_status`: `draft | confirmed | in_progress | shipped | received | closed | cancelled`
- `payment_status`: `pending | invoiced | partially_paid | paid | overdue`
- `quote_status`: `draft | sent | accepted | rejected | expired`
- `rfq_status`: `draft | published | quoted | closed | cancelled`
- `shipment_status`: `planned | ready | in_transit | delivered | failed`

### 11.2. Таблицы

#### `companies`

Назначение:

- юридические и контактные данные компании
- связующая сущность для buyer/supplier компаний

Ключевые поля:

- `id`
- `name`
- `legal_name`
- `inn`, `kpp`, `ogrn`
- адреса, phone, email, website
- `type`

#### `profiles`

Назначение:

- профиль пользователя приложения
- связка auth user -> business role -> company

Ключевые поля:

- `id` = auth user id
- `full_name`
- `phone`
- `role`
- `company_id`
- `is_active`

#### `material_categories`

Назначение:

- категории master-справочника материалов

#### `materials`

Назначение:

- центральный master-справочник материалов
- на него завязаны:
  - buyer catalog
  - buyer RFQ creation
  - supplier offers
  - supplier price import

Ключевые поля:

- `id`
- `name`
- `sku`
- `unit`
- `description`
- `category_id`

Важно:

- это master data;
- supplier import может автоматически создавать отсутствующие `materials`, если включен соответствующий режим в UI;
- в текущем UI нет create/edit flow для материалов.

#### `supplier_offers`

Назначение:

- прайс и параметры предложения supplier по конкретному material

Ключевые поля:

- `supplier_company_id`
- `material_id`
- `price`
- `stock`
- `min_volume`
- `lead_time_days`
- `delivery_cost`
- `vat_rate`
- `is_active`
- `article`

#### `rfqs`

Назначение:

- запрос покупателя на получение коммерческих предложений

Ключевые поля:

- `buyer_company_id`
- `created_by`
- `title`
- `description`
- `delivery_address`
- `needed_by`
- `status`

#### `rfq_items`

Назначение:

- строки/позиции внутри RFQ

Ключевые поля:

- `rfq_id`
- `material_id`
- `material_name`
- `quantity`
- `unit`
- `comment`

#### `rfq_suppliers`

Назначение:

- список приглашенных supplier company для конкретного RFQ

#### `quotes`

Назначение:

- шапка коммерческого предложения поставщика по RFQ

Ключевые поля:

- `rfq_id`
- `supplier_company_id`
- `created_by`
- `status`
- `delivery_cost`
- `valid_until`
- `note`
- `total_without_vat`
- `vat_amount`
- `total_amount`

#### `quote_items`

Назначение:

- строки коммерческого предложения

Ключевые поля:

- `quote_id`
- `rfq_item_id`
- `material_id`
- `material_name`
- `quantity`
- `unit`
- `price`
- `lead_time_days`
- `comment`
- `vat_rate`
- `line_total`

#### `orders`

Назначение:

- заказ между buyer company и supplier company

Ключевые поля:

- `buyer_company_id`
- `supplier_company_id`
- `quote_id`
- `rfq_id`
- `order_number`
- `status`
- `payment_status`
- суммы и доставка

#### `order_items`

Назначение:

- строки заказа

#### `shipments`

Назначение:

- отгрузка по заказу

Ключевые поля:

- `order_id`
- `supplier_company_id`
- `shipment_number`
- `status`
- `planned_date`
- `shipped_at`
- `delivered_at`
- driver/vehicle/tracking fields
- `route_note`

#### `shipment_items`

Назначение:

- строки отгрузки, связанные с `order_items`

#### `notifications`

Назначение:

- пользовательские уведомления

Ключевые поля:

- `user_id`
- `type`
- `title`
- `body`
- `related_entity_id`
- `related_entity_type`
- `is_read`

---

## 12. RLS и доступ к данным

### 12.1. Миграции

В репозитории есть две миграции:

1. `supabase/migrations/20260413121450_436621b2-da72-4919-8be1-0454e5579ed5.sql`
2. `supabase/migrations/20260413190000_demo_rls_and_helper_policies.sql`

Первая — старая, минимальная.

Вторая — текущая demo-oriented миграция, которая:

- добавляет helper functions;
- включает RLS на основные таблицы;
- добавляет базовые write policy для demo-flow.

### 12.2. Helper functions

В `20260413190000_demo_rls_and_helper_policies.sql` подтверждено:

- `get_my_company_id()`
- `can_access_rfq(uuid)`
- `can_access_quote(uuid)`
- `can_access_order(uuid)`

Назначение:

- упростить policy и централизовать проверку доступа по company.

### 12.3. Подтвержденные policy

#### `profiles`

- user видит свой профиль
- user обновляет свой профиль
- user вставляет свой профиль

#### `companies`

- authenticated может создать company
- authenticated может читать companies
- user обновляет свою company

#### `material_categories` / `materials`

- authenticated может читать
- insert/update/delete policy для этих master-справочников в этой миграции нет

Это критично:

- материалы должны быть предзаполнены отдельно;
- отдельного standalone UI для ручного CRUD по `materials` нет, но `PriceImport` умеет автосоздавать отсутствующие материалы из Excel.

#### `supplier_offers`

- все authenticated читают активные offers
- supplier видит и свои неактивные
- supplier может insert/update/delete только свои offers

#### `rfqs`

- buyer читает свои RFQ
- supplier читает только RFQ, где его компания приглашена
- buyer может insert/update свои RFQ

#### `rfq_items`

- читаются только если доступен RFQ
- buyer может insert/update/delete items только у своих RFQ

#### `rfq_suppliers`

- buyer видит invite-лист своих RFQ
- supplier видит invite-лист, где его компания приглашена
- buyer может insert для своих RFQ

#### `quotes`

- supplier видит свои quotes
- buyer видит quotes по своим RFQ
- supplier может insert/update свои quotes, если есть доступ к RFQ

#### `quote_items`

- читаются по доступному quote
- supplier может insert/update/delete для своего quote

#### `orders`

- select только если order относится к buyer/supplier company пользователя
- write policy в миграции нет

#### `order_items`

- select только по доступному order
- write policy нет

#### `shipments`

- buyer/supplier видят свои shipments
- supplier может update свои shipments

#### `shipment_items`

- select по доступной shipment
- write policy нет

#### `notifications`

- user читает только свои notifications
- user может update только свои notifications

### 12.4. Практический вывод по write-flow

В коде и policy вместе подтверждено:

Рабочие write-потоки:

- setup company/profile
- update profile
- update company
- create RFQ
- create RFQ items
- create RFQ invites
- CRUD supplier offers
- create/update quotes
- create/update quote items
- update shipments status
- update notifications read state
- import price list -> create/update supplier offers

Не найдено полноценных write-flow:

- create/edit materials
- create/edit material categories
- create orders
- create order items
- create shipments
- create shipment items
- create notifications
- buyer approve/reject quote

---

## 13. Onboarding flow: signup -> login -> setup

### 13.1. Signup

`src/pages/auth/Signup.tsx`

Поля:

- ФИО
- email
- companyName
- password
- role (`buyer | supplier`)

Что делает:

- вызывает `signUp()`
- показывает toast
- переводит на `/login`

### 13.2. Login

`src/pages/auth/Login.tsx`

Что делает:

- вызывает `signIn()`
- после появления session:
  - если нет `profile` или `profile.company_id` -> `/setup`
  - иначе -> default dashboard по роли

### 13.3. Setup workspace

`src/pages/auth/SetupWorkspace.tsx`

Это критический шаг для нового аккаунта.

Логика:

1. подтягивает `full_name`, `role`, `company_name` из auth metadata;
2. создает новую запись в `companies`;
3. создает или обновляет `profiles`;
4. вызывает `refreshProfile()`;
5. редиректит на dashboard по роли.

Важно:

- setup всегда создает новую компанию;
- attach existing company из UI не реализован;
- если на удаленном Supabase не применена новая RLS migration, setup падает на insert в `companies`.

---

## 14. Buyer-зона: как работает по страницам

### 14.1. `BuyerDashboard`

`src/pages/buyer/BuyerDashboard.tsx`

Читает:

- последние RFQ buyer company
- последние активные orders buyer company
- свою company

Показывает:

- KPI по числу активных RFQ
- KPI по заказам в работе
- таблицу активных RFQ
- список orders in progress

Записей не создает.

### 14.2. `Catalog`

`src/pages/buyer/Catalog.tsx`

Читает:

- `material_categories`
- `materials`

Функции:

- фильтр по категории
- поиск по имени материала
- table/grid view

Важно:

- поиск в каталоге сейчас только по `name`, не по `sku`, несмотря на placeholder `Наименование, артикул...`

### 14.3. `MaterialDetail`

`src/pages/buyer/MaterialDetail.tsx`

Читает:

- `materials` по `:id`
- активные `supplier_offers` для этого material

Показывает:

- описание
- category / sku / unit
- лучшую цену
- число предложений
- минимальный срок поставки
- список поставщиков по цене

Запись отсутствует.

### 14.4. `RfqList`

`src/pages/buyer/RfqList.tsx`

Читает:

- список RFQ своей buyer company
- `materials` для выбора позиций
- supplier candidates из `supplier_offers` с `is_active = true`

Важно:

- supplier candidates строятся как уникальные supplier company из всех активных supplier offers;
- кандидаты не фильтруются по выбранным материалам RFQ;
- это demo-упрощение.

Create flow:

1. buyer открывает dialog
2. задает title / description / neededBy / deliveryAddress
3. добавляет items
4. выбирает invited suppliers
5. создается `rfqs`
6. создаются `rfq_items`
7. создаются `rfq_suppliers`

Статус нового RFQ:

- `published`

### 14.5. `RfqDetail`

`src/pages/buyer/RfqDetail.tsx`

Читает:

- RFQ
- RFQ items
- quotes + quote_items

Показывает:

- summary по позициям и числу КП
- таблицу позиций
- таблицу quotes

Что важно:

- buyer видит quotes, но в текущем UI не может принять/отклонить quote;
- кнопка `Экспорт` пока визуальная, без реализованного download flow.

### 14.6. `BuyerOrders`

`src/pages/buyer/BuyerOrders.tsx`

Читает:

- все orders buyer company

Показывает:

- order number
- supplier name
- order status
- payment status
- amount
- created_at

Read-only.

### 14.7. `OrderDetail`

`src/pages/buyer/OrderDetail.tsx`

Используется и у buyer, и у supplier.

Читает:

- order
- order_items
- shipments по order

Показывает:

- timeline статуса
- строки заказа
- финансовый блок
- список shipments
- delivery address

Read-only с точки зрения order, но supplier может дальше перейти в shipment detail и менять статус shipment.

---

## 15. Supplier-зона: как работает по страницам

### 15.1. `SupplierDashboard`

`src/pages/supplier/SupplierDashboard.tsx`

Читает:

- RFQ invitations supplier company
- shipments supplier company
- последние supplier offers
- свою company

Показывает:

- KPI по приглашениям, shipments, offers
- таблицу shipments
- summary по offers

Запись не делает.

### 15.2. `Offers`

`src/pages/supplier/Offers.tsx`

Читает:

- supplier_offers текущей supplier company
- master `materials`

Функции:

- список предложений
- фильтр `all / active / inactive`
- поиск по имени материала
- create offer
- update offer
- delete offer

Create/update payload:

- `article`
- `material_id`
- `price`
- `stock`
- `min_volume`
- `lead_time_days`
- `vat_rate`
- `delivery_cost`
- `is_active`
- `currency = RUB`

### 15.3. `PriceImport`

`src/pages/supplier/PriceImport.tsx`

Это массовый импорт в `supplier_offers`, который при необходимости может автосоздавать отсутствующие `materials`.

Читает:

- `materials`
- существующие `supplier_offers` supplier company

Шаги:

1. upload `.xlsx/.xls/.csv`
2. parse первой вкладки
3. сопоставление строк со справочником materials
4. при включенном режиме auto-create — создание отсутствующих materials и служебной категории импорта
5. валидация
6. create/update supplier_offers

Сопоставление material сейчас делает:

- точное совпадение по `article -> materials.sku`
- точное совпадение по имени
- нормализованное совпадение по имени
- includes в обе стороны после нормализации

Важные ограничения:

- если `materials` пуст и auto-create выключен, импорт невозможен;
- если `materials` пуст и auto-create включен, импорт может сам создать справочник из Excel;
- новые материалы создаются в категории `Импорт прайс-листов`;
- дубли внутри одного файла не должны приводить к созданию нескольких материалов/офферов: используется последняя строка для совпавшего `sku` или пары `наименование + единица`;
- existing offer определяется по `material_id`, не по `article`.

Добавлено в UI:

- показ count доступных materials
- явное предупреждение, если справочник пуст
- кнопка `Скачать из справочника`, которая генерирует шаблон на основе реально доступных materials
- переключатель auto-create для отсутствующих материалов

### 15.4. `SupplierRfqList`

`src/pages/supplier/SupplierRfqList.tsx`

Читает:

- `rfq_suppliers` по supplier company
- затем `rfqs` по найденным `rfq_id`

Показывает:

- title
- buyer company
- status
- needed_by
- created_at

### 15.5. `SupplierRfqResponse`

`src/pages/supplier/SupplierRfqResponse.tsx`

Читает:

- RFQ
- RFQ items
- existing quote supplier company по этому RFQ

Логика:

- если quote уже есть, форма заполняется данными quote_items
- supplier вводит цену и срок по каждой позиции
- можно указать delivery cost, valid until, note
- можно:
  - сохранить `draft`
  - отправить `sent`

Как сохраняется:

1. создается или обновляется `quotes`
2. затем удаляются все старые `quote_items` этого quote
3. затем вставляются новые `quote_items`

Важно:

- это replace-all модель, а не patch по строкам;
- НДС сейчас считается фиксированно как 20% от суммы строк;
- accept/reject со стороны buyer в UI не реализован.

### 15.6. `SupplierShipments`

`src/pages/supplier/SupplierShipments.tsx`

Читает:

- все shipments supplier company
- join с order и buyer company

Показывает:

- shipment number
- buyer
- address
- status
- planned date

### 15.7. `ShipmentDetail`

`src/pages/supplier/ShipmentDetail.tsx`

Читает:

- shipment
- shipment_items + order_items

Write flow:

- supplier может продвинуть shipment по статусу:
  - `planned/ready -> in_transit`
  - `in_transit -> delivered`

При update проставляются:

- `shipped_at`
- `delivered_at`

Что еще есть:

- timeline
- driver / vehicle info
- print button для ТТН, но фактическая печать не реализована

### 15.8. `RoutePlanning`

`src/pages/supplier/RoutePlanning.tsx`

Читает:

- shipments supplier company со статусами `planned`, `ready`, `in_transit`

Что делает:

- при нажатии `Оптимизировать маршрут` не строит геомаршрут;
- просто сортирует локальное отображение shipments по приоритету статуса и дате доставки

Карта:

- только visual placeholder
- реальной картографической интеграции в коде нет

---

## 16. Settings

### 16.1. `ProfileSettings`

`src/pages/settings/ProfileSettings.tsx`

Читает профиль из auth context.

Позволяет обновить:

- `full_name`
- `phone`

Email:

- только read-only

### 16.2. `CompanySettings`

`src/pages/settings/CompanySettings.tsx`

Читает `companies` по `profile.company_id`.

Позволяет обновить:

- `name`
- `legal_name`
- `inn`
- `kpp`
- `ogrn`
- `legal_address`
- `actual_address`
- `phone`
- `email`
- `website`

Особенность:

- если company не загружается, UI показывает `Компания не привязана к вашему профилю`;
- отдельного явного error state тут нет, поэтому ошибка запроса и отсутствие company визуально выглядят одинаково.

---

## 17. Что в системе уже реально пишет данные

Подтверждено по коду фронта:

### Запись в `companies`

- `SetupWorkspace`

### Запись в `profiles`

- `SetupWorkspace`
- `ProfileSettings` (update)

### Запись в `supplier_offers`

- `Offers` (create/update/delete)
- `PriceImport` (insert/update)

### Запись в `rfqs`

- `RfqList` (insert)

### Запись в `rfq_items`

- `RfqList` (insert)

### Запись в `rfq_suppliers`

- `RfqList` (insert)

### Запись в `quotes`

- `SupplierRfqResponse` (insert/update)

### Запись в `quote_items`

- `SupplierRfqResponse` (delete + insert)

### Запись в `shipments`

- `ShipmentDetail` (update status + timestamps)

### Запись в `notifications`

- `NotificationsPanel` (update `is_read`)

---

## 18. Что пока только читается или имитируется

Подтверждено по коду:

- `materials` — отдельного ручного CRUD UI нет, но запись возможна через auto-create в `PriceImport`
- `material_categories` — только чтение
- `orders` — только чтение
- `order_items` — только чтение
- `shipment_items` — только чтение
- `notifications` — только чтение и mark-as-read, без create UI

Demo-only/placeholder логика:

- route planning без настоящего VRP/карт
- RFQ export button без download
- print ТТН button без печати
- landing page обещает больше, чем реально реализовано в UI backend flow

---

## 19. Критические зависимости между сущностями

Это важная часть понимания системы.

### 19.1. `materials` — центральный справочник

Без него не работают или работают неполноценно:

- buyer catalog
- buyer material detail
- buyer RFQ creation
- supplier offers
- supplier price import

Если `materials` пуст:

- catalog пустой
- в RFQ нечего выбрать
- в offers невозможно осмысленно выбрать material
- price import не сможет сматчить ни одной строки в режиме без auto-create
- price import сможет bootstrap-нуть справочник, если включено auto-create и применены INSERT policy для `material_categories/materials`

### 19.2. `supplier_offers`

Нужны для:

- buyer material detail
- supplier dashboard
- supplier offers list
- supplier price import
- формирования списка supplier candidates при создании RFQ

### 19.3. `rfq_suppliers`

Это ключ к supplier-видимости RFQ.

Если invite не создан:

- supplier не увидит RFQ в списке
- supplier не сможет законно ответить на RFQ через RLS

### 19.4. `quotes`

Они показываются buyer в `RfqDetail`, но не переводятся в `orders` автоматически на фронте.

### 19.5. `orders` и `shipments`

Сейчас это больше демонстрация downstream-данных, чем результат полного пользовательского сценария из UI.

Во фронте не найдено:

- создания orders из quotes;
- создания shipments из orders.

Следовательно:

- для демо их нужно seed'ить/держать в базе заранее или создавать вне текущего UI.

---

## 20. Где еще остались ограничения и риски

### 20.1. Материалы не заполняются из UI

Это не баг конкретной страницы, а архитектурное ограничение текущего demo.

### 20.2. Buyer не может завершить цикл RFQ -> quote -> order из UI

Потому что в коде не найдено:

- approve/reject quote
- create order
- create shipment

### 20.3. Setup создает новую company на каждого нового пользователя

Если нужно несколько пользователей в одной company, текущий UI этого не поддерживает.

### 20.4. Менеджер/Admin логика не специализирована

Они допущены в обе зоны по route guards, но отдельного UX для этих ролей нет.

### 20.5. Search и filters не универсальны

- topbar search — набор отдельных запросов, а не единый index
- catalog search — по имени, не полнотекстовый
- offers search — по имени материала

### 20.6. Технический контур тестов минимальный

Подтверждено по `src/test/example.test.ts`:

- есть только один заглушечный тест

### 20.7. Build-бандл крупный

Проверено локальной сборкой:

- основной JS chunk около `1.2 MB`

Это не блокер для demo, но это уже заметный технический риск для будущего роста.

---

## 21. Текущее техническое состояние проекта

Проверено локально:

- `test` — проходит
- `build` — проходит
- `tsc --noEmit` — проходит
- `lint` — без ошибок, но есть 8 warning по `react-refresh/only-export-components` в shadcn/ui и `AuthContext`

Предупреждения lint не блокируют сборку.

---

## 22. Что осталось от mock-эпохи

`src/data/mock.ts`

Сейчас там остались:

- status labels
- типы для KPI и Activity

Entity data оттуда уже не используются как источник бизнес-данных.

Это значит:

- core pages действительно читают данные из Supabase;
- mock.ts больше не выступает как хранилище заказов/RFQ/materials.

---

## 23. Как правильно понимать проект целиком

Самая точная текущая модель системы такая:

### Это уже не лендинг с моками

Потому что:

- маршруты реальные;
- auth реальный;
- detail pages работают по `:id`;
- основные buyer/supplier списки и детали читают Supabase напрямую.

### Но это еще не полный end-to-end procurement product

Потому что:

- полного ручного управления master data (`materials`) из UI нет; bootstrap возможен через auto-create в `PriceImport`;
- RFQ -> order -> shipment полный workflow из фронта не доведен;
- часть downstream-сущностей живет как seed/demo data;
- часть кнопок остается визуальной или полуреализованной.

### Это рабочее demo ядро

Где уже есть:

- auth + session + guard
- buyer dashboard/catalog/RFQ/order views
- supplier dashboard/offers/import/RFQ response/shipments
- search
- notifications
- settings
- базовые Supabase write-flow для demo

---

## 24. Рекомендуемая ментальная модель для дальнейшей разработки

Если продолжать проект дальше, его удобнее мыслить так:

### Слой 1. Identity / Workspace

- auth user
- profile
- company

### Слой 2. Master data

- material_categories
- materials

### Слой 3. Market layer

- supplier_offers

### Слой 4. Procurement intent

- rfqs
- rfq_items
- rfq_suppliers

### Слой 5. Commercial response

- quotes
- quote_items

### Слой 6. Fulfillment

- orders
- order_items
- shipments
- shipment_items

### Слой 7. User attention layer

- notifications
- search
- dashboards

Такая декомпозиция соответствует реальному коду и реальной схеме данных.

---

## 25. Самые важные факты, которые нельзя потерять при передаче контекста

1. Проект — demo на `React/Vite + Supabase`, не production.
2. Auth уже реальный: login/signup/logout/session работают.
3. После signup пользователь должен пройти `/setup`, потому что signup не создает `profiles/companies`.
4. `materials` — центральный master-справочник, без него ломается половина системы.
5. Supplier price import в обычном режиме обновляет `supplier_offers`, а при включенном auto-create может дополнительно создавать отсутствующие `materials`.
6. RFQ create у buyer работает.
7. Quote create/update у supplier работает.
8. Orders и shipments в UI в основном read-only; полного создания из фронта нет.
9. Shipment status update у supplier работает.
10. Notifications panel и topbar search уже живые.
11. Для корректной demo-ветки критична миграция `supabase/migrations/20260413190000_demo_rls_and_helper_policies.sql`.
12. В репозитории по-прежнему нет полноценного seed для `materials`, но `PriceImport` теперь может bootstrap-нуть часть справочника из Excel; для этого на Supabase должны быть применены INSERT policy для `material_categories/materials`.

---

## 26. Краткий вывод

Текущее состояние EcaMarket — это рабочее demo procurement-shell приложение с живым Supabase backend, где:

- identity и доступы уже реальные;
- buyer/supplier UI в основном живые;
- критичные read-flow уже переведены с mock на Supabase;
- часть write-flow уже работает;
- но master data и downstream fulfillment-потоки еще не замкнуты полностью внутри UI.

Самая важная операционная зависимость проекта сейчас:

- сначала должен существовать корректный `profiles/company` для пользователя;
- затем должен быть заполнен `materials` — либо заранее seed'ом, либо через auto-create в `PriceImport`;
- после этого уже осмысленно работают offers, RFQ, quotes и price import.
