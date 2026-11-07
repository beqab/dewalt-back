# FINA ინტეგრაცია — მიმდინარე მდგომარეობა და ცვლილებების გეგმა

> წყარო: `FINA_WEB_API_8_0_3.txt` (FINA WEB API 8.0, 2025-11-07) და `dewalt-back` კოდი (commit `47bc3da`).
> ეს ფაილი გამოიყენება როგორც სპეციფიკაცია FINA-სთან დაკავშირებული კოდის ცვლილებებისთვის.

---

## 1. FINA API — ზოგადი წესები (დოკუმენტაციიდან)

| საკითხი | მნიშვნელობა |
|---|---|
| ოპერაციული endpoint-ები | `http://[IP:PORT]/api/operation/...` |
| რეპორტინგი | `http://[IP:PORT]/api/reporting/...` |
| ავტორიზაცია | `POST /api/authentication/authenticate` body `{ "login", "password" }` → `{ "token", "ex" }` |
| Header-ები | `Content-Type: application/json`, `Accept: application/json`, `Authorization: Bearer <token>` |
| თოქენის ვადა | **36 საათი** (ვერსია 3.1.20200921-დან) |
| სტატუს კოდები | `200`, `400`, `401`, `500` |
| შეცდომის ფორმატი | **ყველა პასუხს აქვს `ex` (string \| null)**. შეცდომა შეიძლება მოვიდეს HTTP 200-ით და `ex`-ში ტექსტით. |
| თარიღის ფორმატი | `yyyy-MM-ddTHH:mm:ss` (ლოკალური დრო, **timezone/`Z`-ისა და მილიწამების გარეშე**) |

ავტორიზაციის ერთადერთი დოკუმენტირებული მეთოდი Bearer token-ია. `basic` / `query` / `none` რეჟიმები დოკუმენტაციაში არ არსებობს.
`/api/info/GetApiInfo` endpoint-იც დოკუმენტაციაში არ არის.

---

## 2. როგორ არის FINA გამოყენებული ახლა

### 2.1 ფაილები

| ფაილი | რას აკეთებს |
|---|---|
| `src/fina/fina.service.ts` | HTTP კლიენტი (axios), token cache, ყველა FINA გამოძახება |
| `src/fina/fina.controller.ts` | `/fina/*` proxy route-ები (ადმინის product picker იყენებს) |
| `src/fina/fina-operation.controller.ts` | `/api/operation/*` proxy route-ები (FINA-ს path-ების სარკე) |
| `src/fina/dto/*` | DTO-ები: rest, users, price types, saveDocProductOut |
| `src/products/products.service.ts` → `syncQuantitiesFromFina()` | ნაშთის სინქრონიზაცია FINA → `Product.quantity` |
| `src/products/products.controller.ts` → `POST products/admin/sync-fina-quantities` | სინქრონიზაციის ხელით გაშვება |
| `src/orders/orders.service.ts` → `syncFinaDocProductOut()` | გადახდილი შეკვეთის რეალიზაციის დოკუმენტი FINA-ში |
| `src/tbcInstalment/tbc-instalment.service.ts` → `fireOrderPaidSideEffects()` | TBC განვადების დადასტურებისას იძახებს `syncFinaDocProductOut` |
| `src/products/entities/product.entity.ts` | `finaId` (number), `finaCode` (string) |
| `src/orders/entities/order.entity.ts` | `finaDocProductOutId`, `finaDocProductOutError`, `finaDocProductOutSyncedAt`; item-ზე `finaCode` |

ადმინ პანელი (`dewalt-admin/features/fina/services/finaService.ts`) იყენებს:
- `GET /fina/products/list` — FINA პროდუქტის ასარჩევად პროდუქტის ფორმაში
- `POST /fina/products/rest-array` — ნაშთის საჩვენებლად

### 2.2 Env ცვლადები

| ცვლადი | გამოყენება | შენიშვნა |
|---|---|---|
| `FINA_BASE_URL` | base URL (მაგ. `http://app.fina.ge:7021/`) | სავალდებულო |
| `FINA_API_USER` / `FINA_PASSWORD` | authenticate | სავალდებულო |
| `FINA_TOKEN_TTL_HOURS` | token cache-ის ვადა (default 35, `.env`-ში 30) | უნდა იყოს < 36 |
| `FINA_AUTH_MODE` | `token` (default) / basic / query / none | მხოლოდ `token` არის რეალური |
| `FINA_AUTH_PATH` | default `/api/authentication/authenticate` | ზედმეტია |
| `FINA_TIMEOUT_MS` | default 20000 | |
| `FINA_PRODUCTS_ALL_URL` / `FINA_PRODUCTS_ALL_PATH` | getProducts override | ზედმეტია |

### 2.3 გამოყენებული FINA მეთოდები

| FINA მეთოდი | HTTP | ჩვენთან სად | დოკ. გვერდი (txt ხაზი) |
|---|---|---|---|
| `authenticate` | POST | `getToken()` | ~334 |
| `getProducts` | GET | `getAllProducts()`, `getAllProductsList()` | ~1474 |
| `getProductsRest` | GET | `getProductsRest()` (მხოლოდ proxy) | ~2721 |
| `getProductsRestArray` | POST `{prods:int[]}` | `getProductsRestArray()` → ნაშთის sync, ადმინი | ~2797 |
| `getPriceTypes` | GET | proxy | ~3288 |
| `getUsers` | GET | proxy | ~3637 |
| `getCustomers` | GET | proxy | ~14 (სარჩევი) |
| `saveDocProductOut` | POST | `saveDocProductOut()` ← `syncFinaDocProductOut()` | ~7139 |

### 2.4 მონაცემთა ნაკადები

**ნაშთი (FINA → საიტი):** ადმინი ხელით იძახებს `POST products/admin/sync-fina-quantities` →
ყველა პროდუქტი `finaId`-ით → `getProductsRestArray` 50-იან chunk-ებად →
`rest` ჯამდება **ყველა საწყობზე** → `Product.quantity` იწერება თუ განსხვავდება → front cache revalidate.
ავტომატური (cron) sync არ არსებობს.

**გაყიდვა (საიტი → FINA):** შეკვეთა გადადის `Paid`-ზე (Flitt callback / ადმინის სტატუსის ცვლილება / TBC განვადება) →
`syncFinaDocProductOut(orderId)` fire-and-forget → `saveDocProductOut` →
პასუხის `id` ინახება `order.finaDocProductOutId`-ში.

---

## 3. საქონლის რეალიზაცია — `saveDocProductOut` (სრული სპეციფიკაცია)

`POST api/operation/saveDocProductOut` → `{ "id": int, "ex": string|null }`

| ველი | ტიპი | აღწერა | ჩვენ ვაგზავნით |
|---|---|---|---|
| `id` | int | 0 = ახალი, >0 = რედაქტირება | `0` |
| `date` | DateTime | ოპერაციის თარიღი | `new Date().toISOString()` ⚠️ UTC + `Z` + ms |
| `num_pfx` | string[20] | ნომრის პრეფიქსი | — |
| `num` | long | დოკ. ნომერი | — |
| `purpose` | string[750] | შინაარსი | `Online order <uuid>` / TBC ტექსტი |
| `amount` | decimal | ჯამური ღირებულება | `order.subtotal` ⚠️ |
| `currency` | string | | `GEL` |
| `rate` | decimal | | `1` |
| `store` | int | საწყობის Id | `1` (hardcoded) ⚠️ |
| `user` | int | შემქმნელი მომხმარებლის Id | `3` (hardcoded) ⚠️ |
| `staff` | int | თანამშრომელი (0 = მომხმარებელზე მიბმული) | — |
| `project` | int | პროექტის Id | — |
| `customer` | int | მყიდველის Id | `0` |
| `is_vat` | bool | შეიცავს დღგ-ს | `true` |
| `make_entry` | bool | ბუღალტრული გატარება | `true` |
| `pay_type` | byte | 0 ნაღდი, 1 უნაღდო, 2 კონსიგნაცია, 3 განვადება, 4 ნაღდი/უნაღდო, 5 უსასყიდლო, 6 სხვა | TBC → `3`, სხვა → `1` |
| `price_type` | int | ფასის ტიპი (3 = საცალო) | `3` |
| `w_type` | byte | ზედნადები: 2 ტრანსპ.-ით, 3 ტრანსპ.-ის გარეშე | `3` |
| `t_type` | byte | 1 საავტომ., 2 სარკინიგზო, 3 საავიაციო, 4 სხვა, 6 უცხო საავტომ., 7 გადამზიდავი | `7` |
| `t_payer` | byte | 1 მყიდველი, 2 გამყიდველი | `1` |
| `w_cost` | decimal | ტრანსპორტირების ხარჯი | — |
| `foreign`, `drv_name`, `tr_start`, `tr_end`, `driver_id`, `car_num`, `tr_text` | | ზედნადების/ტრანსპორტის ველები | — |
| `sender`, `reciever`, `comment` | string | გამგზავნი / მიმღები / კომენტარი | — |
| `overlap_type`, `overlap_amount` | | ავანსი/დღგ-ს გადახურვა | — |
| `add_fields` | `[{field, value}]` | დამატებითი ველები (`usr_column_NNN`) | — |
| `products` | `[{id, sub_id, quantity, price}]` | საქონელი | ✅ |
| `services` | `[{id, quantity, price}]` | გაწეული მომსახურება | — |
| ~~`vat`~~ | — | **დოკუმენტაციაში არ არსებობს** | `1` ⚠️ |

დოკუმენტის წასაკითხად: `GET api/operation/getDocProductOut/{id}` → `{ product_out: {..., waybill_num, check_status, products, services}, ex }`.

---

## 4. აღმოჩენილი პრობლემები (პრიორიტეტით)

### 🔴 P0 — უსაფრთხოება

**4.1 FINA proxy endpoint-ები დაუცველია.** არცერთ FINA route-ს არ აქვს `AdminAuthGuard`, გლობალური guard (`APP_GUARD`) არ არის.
ნებისმიერს ინტერნეტიდან შეუძლია:
- `POST /api/operation/saveDocProductOut` — **ყალბი რეალიზაციის დოკუმენტის შექმნა FINA-ში** (ბუღალტრული გატარებით!)
- `GET /api/operation/getCustomers` — მყიდველების პერსონალური მონაცემების წაკითხვა
- `GET /api/operation/getUsers`, `getPriceTypes`, `GET /fina/products`, `/fina/products/rest`
- `POST /products/admin/sync-fina-quantities` — guard დაკომენტარებულია (`// @UseGuards(AdminAuthGuard)`)

ფაილები: `src/fina/fina-operation.controller.ts`, `src/fina/fina.controller.ts`, `src/products/products.controller.ts:42`.

**4.2 პაროლი და token იწერება ლოგებში.** `src/fina/fina.service.ts:118,130,147,148` — `console.log(this.apiUser, this.password, ...)` და მთლიანი axios response (token-ით). Vercel-ის ლოგებში ჩანს.

### 🟠 P1 — მონაცემების სისწორე

**4.3 `ex` ველი არ მოწმდება.** `requestJson()` მხოლოდ HTTP სტატუსს ამოწმებს. FINA ბიზნეს-შეცდომას აბრუნებს `200 + { id: 0, ex: "..." }`.
შედეგი `syncFinaDocProductOut`-ში: `finaDocProductOutId = 0/undefined`, `finaDocProductOutError = undefined`, `SyncedAt` = ახლა → **შეცდომა ჩუმად იკარგება**, შეკვეთა გამოიყურება როგორც სინქრონიზებული.

**4.4 `finaDocProductOutError` არასდროს ივსება.** `orders.service.ts` catch ბლოკი მხოლოდ `console.log` აკეთებს. ვერ ვიგებთ რომელი შეკვეთა არ გავიდა FINA-ში და ხელახლა გაგზავნის (retry) მექანიზმი არ არსებობს.

**4.5 `amount` არ ემთხვევა `products`-ს.** `finaId`-ის გარეშე item-ები გამოტოვებულია, მაგრამ `amount = order.subtotal` (ყველა item-ის ჯამი). თუ ყველა item გამოტოვდა, იგზავნება ცარიელი `products: []`. მიწოდების ფასი (`deliveryPrice`) საერთოდ არ იგზავნება.

**4.6 თარიღი UTC-შია.** `date: new Date().toISOString()` → `2026-10-21T08:46:00.123Z`. FINA ელოდება `yyyy-MM-ddTHH:mm:ss` ლოკალურ დროს — დოკუმენტი შეიძლება ჩაიწეროს 4 საათით ადრე (ღამის შეკვეთები წინა დღეზე). საჭიროა `Asia/Tbilisi` ფორმატი ms-ისა და `Z`-ის გარეშე.

**4.7 Race condition / დუბლიკატები.** `syncFinaDocProductOut` ამოწმებს `finaDocProductOutId > 0` და შემდეგ აგზავნის — ატომური lock არ არის. Flitt callback + ადმინის სტატუსის ცვლილება ერთდროულად → FINA-ში 2 დოკუმენტი. საჭიროა ატომური "claim" (`findOneAndUpdate` `finaSyncStatus: 'pending' → 'in_progress'`).

**4.8 ნაშთის sync ჯამავს ყველა საწყობს.** `syncQuantitiesFromFina` აჯამებს `rest`-ს ყველა `store`-ზე. თუ FINA-ში არის საწყობები, რომლებიდანაც ონლაინ არ იყიდება (დეფექტური, სხვა ფილიალი), საიტზე გამოჩნდება არარსებული ნაშთი. `saveDocProductOut` კი ჩამოწერს მხოლოდ `store: 1`-დან.

> ✅ **დადასტურდა (2026-10-21, live FINA):** საწყობები — `1` მაღაზიის საწყობი, `2` საწყობი სერვისის იარაღებისთვის, `3` საწყობი გარანტიისთვის, `4` იმპორტი.
> 32 პროდუქტს მარაგი აქვს **მხოლოდ** 2/3 საწყობში (მაღაზიაში 0), საიტზე კი "მარაგშია" (მაგ. `DCD701N`, `DT9540`). კიდევ 30 პროდუქტს საიტზე რაოდენობა გაბერილი აქვს.
> კლიენტის საჩივარი ("საწყობში გადატანილი პროდუქცია საიტზე მარაგში ჩანს") ზუსტად ეს შემთხვევაა.
> ✅ **გამოსწორებულია** (`FinaService.getSellableProductsRestArray`, env `FINA_STOCK_STORE_ID`, default 1) — backend sync და `/fina/products/rest-array` (ადმინიც მას იყენებს) ახლა მხოლოდ ამ საწყობს ითვლის. თავდაპირველი გეგმა: ნაშთი ავიღოთ მხოლოდ `store 1`-დან (`getProductsRestByStore/1` ან `getProductsRestSummary { stores: [1] }`) — როგორც backend sync-ში, ისე ადმინის `product-form.tsx`-ში (FINA პროდუქტის არჩევისას რაოდენობის შევსება იგივე ჯამს აკეთებს).

**4.9 ✅ გამოსწორებულია — ნაშთის sync უგულებელყოფდა ლოკალურ რეზერვაციას.** ახლა `quantity = max(0, finaRest − Pending რეზერვი)`. ასევე დაემატა: in-process cron `FinaStockSyncCron` (`@nestjs/schedule`, ყოველ 2 საათში, ირთვება `FINA_STOCK_SYNC_CRON=true`-ით — backend Railway-ზეა), `ReservationReleaseCron` (ვადაგასული რეზერვაციების გათავისუფლება, ყოველ 5 წთ, ირთვება `RESERVATION_RELEASE_CRON=true`-ით) და გადახდამდე live შემოწმება `OrdersService.assertFinaStockAvailable` (Flitt + TBC). ძველი აღწერა: საიტი `Pending` შეკვეთებზე ამცირებს `Product.quantity`-ს (`stockReserved`). sync ამ მნიშვნელობას FINA-ს ნაშთით გადააწერს → რეზერვი ქრება და ჩნდება overselling-ის რისკი.

### 🟡 P2 — კოდის ხარისხი

**4.10 Hardcoded `store: 1`, `user: 3`.** უნდა გადავიდეს env-ში (`FINA_STORE_ID`, `FINA_USER_ID`) და გადამოწმდეს `getStores` / `getUsers`-ით.

**4.11 `vat` ველი იგზავნება**, დოკუმენტაციაში არ არსებობს — წასაშლელია DTO-დან და body-დან.

**4.12 ზედმეტი auth რეჟიმები.** `basic` / `query` / `none` + `FINA_AUTH_PATH` + `FINA_PRODUCTS_ALL_*` — დოკუმენტირებული არ არის. გამარტივება: მხოლოდ token.

**4.13 `getApiInfoNoAuth()` stub-ია** — აბრუნებს `'done'`-ს, ნამდვილ შემოწმებას არ აკეთებს. `GetApiInfo` დოკუმენტაციაში არ არის. ჩანაცვლება: health-check როგორც `authenticate` + `getStores`.

**4.14 Error wrapping.** ყოველი ფენა `catch → throw new BadRequestException(error)` — შეცდომები ორმაგად/სამმაგად ეხვევა, FINA-ს 401/500 ხდება 400, ორიგინალი მესიჯი იკარგება.

**4.15 ბევრი debug `console.log`** (`'+++'`, `'<insert>'`) — ჩანაცვლება Nest `Logger`-ით.

**4.16 401-ზე retry** ხდება მხოლოდ ერთხელ და token cache არის instance-level (serverless-ზე ყოველ cold start-ზე ახალი authenticate) — მისაღებია, მაგრამ ჩავიწეროთ.

---

## 5. ცვლილებების გეგმა

### ნაბიჯი 1 — უსაფრთხოება (P0)
- [ ] `@UseGuards(AdminAuthGuard)` + `@ApiBearerAuth('JWT-auth')` კლასის დონეზე `FinaController`-ზე და `FinaOperationController`-ზე.
- [ ] `FinaOperationController`-იდან **წაიშალოს `POST saveDocProductOut`** (გარედან გამოძახება არ სჭირდება — მხოლოდ `OrdersService` იყენებს სერვისს პირდაპირ). ან, თუ debug-ისთვის საჭიროა, დარჩეს მხოლოდ guard-ით.
- [ ] `products.controller.ts:42` — guard-ის დაბრუნება `sync-fina-quantities`-ზე (ან `CronAuthGuard`, თუ cron გამოიძახებს).
- [ ] ადმინში (`dewalt-admin`) შემოწმდეს, რომ `/fina/*` გამოძახებები Bearer token-ს აგზავნის (axios interceptor უკვე აგზავნის).
- [ ] წაიშალოს ყველა `console.log`, რომელიც ბეჭდავს password/token/response-ს.

### ნაბიჯი 2 — `FinaService` refactor
- [ ] მხოლოდ token auth; წაიშალოს `FinaAuthMode`, `buildAuthHeaders`, `buildAuthQuery`, `toSafeUrlString`-ის query ლოგიკა, `FINA_AUTH_PATH`, `FINA_PRODUCTS_ALL_*`.
- [ ] `requestJson()`: HTTP 2xx-ის შემდეგ შემოწმდეს `ex` → თუ არაცარიელია, ისროლოს `FinaApiError` (custom error class `{ method, status, ex }`).
- [ ] ერთი error ტიპი, wrapping-ის გარეშე; controller-ში map-ი `BadGatewayException`-ზე.
- [ ] `Logger` (`new Logger(FinaService.name)`) `console.log`-ის ნაცვლად.
- [ ] Helper `toFinaDate(date: Date): string` → `yyyy-MM-ddTHH:mm:ss` `Asia/Tbilisi`-ში (მაგ. `Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tbilisi', ... })` → ჩაანაცვლე `' '` → `'T'`).
- [ ] ახალი მეთოდები: `getStores()`, `getDocProductOut(id)`, (არჩევითი) `getProductsRestSummary()`, `getProductsRestAfter(date)`.
- [ ] Health-check: `GET /fina/info` → `authenticate` + `getStores`, აბრუნებს `{ ok, storesCount }`.

### ნაბიჯი 3 — `saveDocProductOut` / შეკვეთის სინქრონიზაცია
- [ ] DTO-დან და body-დან წაიშალოს `vat`.
- [ ] Env: `FINA_STORE_ID` (default 1), `FINA_USER_ID` (default 3), `FINA_PRICE_TYPE_ID` (default 3); ზედმეტი default-ები სერვისიდან წაიშალოს.
- [ ] `date: toFinaDate(new Date())`.
- [ ] `amount` = `products`-ის ჯამი (`Σ price × quantity`, 2 ციფრამდე დამრგვალებული), არა `order.subtotal`.
- [ ] თუ `products` ცარიელია → არ გაიგზავნოს, `finaDocProductOutError = 'No products with finaId'`.
- [ ] თუ რომელიმე item-ს არ აქვს `finaId` → `finaDocProductOutError`-ში ჩაიწეროს გამოტოვებული პროდუქტები (შეკვეთა მაინც გაიგზავნოს დანარჩენით — ან სრულად შეჩერდეს; **გადასაწყვეტი**, იხ. §6).
- [ ] `add_fields` / `comment`-ში შეკვეთის `uuid`, მყიდველის სახელი/ტელეფონი (FINA-ში შეკვეთის მოსაძებნად).
- [ ] მიწოდების ფასი: გაიგზავნოს `services`-ით (`FINA_DELIVERY_SERVICE_ID` env), თუ `deliveryPrice > 0`. **გადასაწყვეტი**, იხ. §6.
- [ ] `catch`-ში: `order.finaDocProductOutError = message`, `SyncedAt` არ შეიცვალოს, `save()`.
- [ ] წარმატებისას `id > 0` სავალდებულოა, სხვა შემთხვევაში შეცდომაა.

### ნაბიჯი 4 — Idempotency და retry
- [ ] Order entity: `finaSyncStatus: 'pending' | 'in_progress' | 'synced' | 'failed'` (+ index).
- [ ] სინქრონიზაციის დასაწყისში ატომური claim:
  ```ts
  const claimed = await this.orderModel.findOneAndUpdate(
    { _id, status: OrderStatus.Paid, finaSyncStatus: { $in: [null, 'pending', 'failed'] } },
    { $set: { finaSyncStatus: 'in_progress' } },
    { new: true },
  );
  if (!claimed) return;
  ```
- [ ] ადმინ endpoint: `POST /orders/admin/:id/fina-sync` (guard-ით) — ხელით ხელახლა გაგზავნა.
- [ ] ადმინ endpoint / cron: `POST /orders/admin/fina-sync-failed` — ყველა `failed` შეკვეთის ხელახლა ცდა (`CronAuthGuard`).
- [ ] ადმინ პანელში შეკვეთის გვერდზე: FINA სტატუსი, დოკ. id, შეცდომა, "ხელახლა გაგზავნა" ღილაკი.

### ნაბიჯი 5 — ნაშთის სინქრონიზაცია
- [ ] Env `FINA_STOCK_STORE_IDS` (მაგ. `1,2`) — მხოლოდ ამ საწყობების `rest` დაჯამდეს (ან გამოვიყენოთ `getProductsRestSummary` `{ prods, stores, date }` — ერთი POST, ჯამს თვითონ ითვლის).
- [ ] ლოკალური რეზერვაციის გათვალისწინება: `quantity = max(0, finaRest − reservedInPendingOrders)`, სადაც `reservedInPendingOrders` = `Pending` + `stockReserved` შეკვეთების item-ების ჯამი პროდუქტზე.
  - შენიშვნა: FINA-ს `rest` უკვე ითვალისწინებს FINA-ს **საკუთარ** რეზერვს (`reserve` ველი), არა საიტისას.
- [ ] Cron (Vercel Cron → `CronAuthGuard`-ით დაცული endpoint), მაგ. ყოველ 15 წთ-ში.
- [ ] (არჩევითი) ინკრემენტული sync: `getProductsRestAfter/{lastSyncAt}` — მხოლოდ შეცვლილი პროდუქტები; `lastSyncAt` შეინახოს settings-ში.

### ნაბიჯი 6 — DTO/ტიპები
- [ ] `GetProductsResponseDto` (`products: FinaProductDto[]`, `ex`) — ველები §7-დან.
- [ ] `GetStoresResponseDto`, `GetDocProductOutResponseDto`.
- [ ] ყველა response DTO-ს `ex?: string | null`.

---

## 6. ღია კითხვები (გადასაწყვეტია ბიზნესთან / ბუღალტერთან)

1. **რომელი საწყობი(ები)** უნდა გამოიყენოს საიტმა ნაშთისთვის და ჩამოწერისთვის? (`getStores`-ით ვნახოთ სია)
2. **რომელი FINA მომხმარებელი (`user`)** უნდა იყოს დოკუმენტის შემქმნელი? (`getUsers`)
3. **მიწოდების ფასი** უნდა აისახოს FINA-ში? თუ კი — რომელი მომსახურების Id (`getProvidedServices`)?
4. **მყიდველი (`customer`)**: ყველა ონლაინ გაყიდვა ერთ "ონლაინ მყიდველზე" (`customer: <id>`) თუ თითოეულისთვის `getCustomersByCode(personalId)` → თუ არ არსებობს `saveCustomer`? (შეკვეთას აქვს `personalId`, `name`, `surname`, `phone`, `email`, `address`). იურიდიული პირისთვის ინვოისი საჭიროა?
5. **`finaId`-ის გარეშე პროდუქტი** შეკვეთაში: დოკუმენტი გაიგზავნოს ნაწილობრივ თუ საერთოდ არა?
6. **`make_entry: true`** — ბუღალტერი ადასტურებს, რომ გატარება ავტომატურად უნდა მოხდეს?
7. **`w_type` / `t_type`**: ზედნადები (RS) ონლაინ გაყიდვაზე საჭიროა? ახლა `w_type: 3` (ტრანსპორტირების გარეშე) — მაშინ `t_type`/`t_payer` შეიძლება საერთოდ არ გაიგზავნოს.
8. **შეკვეთის გაუქმება/დაბრუნება** `Paid`-ის შემდეგ — FINA-ში უნდა გაუქმდეს? (დოკ.: `saveDocCustomerReturn` / რედაქტირება `id`-ით). ახლა არაფერი ხდება.
9. **`pay_type`**: Flitt ბარათით = `1` (უნაღდო), TBC განვადება = `3` — სწორია?

---

## 7. სასარგებლო FINA მეთოდები (რეფერენსი)

| მეთოდი | HTTP / path | პასუხი | რისთვის |
|---|---|---|---|
| `getProducts` | GET `getProducts` | `products[]: id, group_id, web_group_id, unit_id, code, name, name_eng, name_rus, comment, partnumber, weight, volume, vat (1/2/3), order_id, min_quantity, plu, add_fields` | კატალოგი / picker |
| `getProductsArray` | POST `getProductsArray` body `[1,2]` (**plain array**, ≤2000) | იგივე | შერჩეული პროდუქტები |
| `getProductsAfter` | GET `getProductsAfter/{yyyy-MM-ddTHH:mm:ss}` | იგივე | ინკრემენტული კატალოგი |
| `getProductsRest` | GET | `rest[]: id, store, rest, reserve` (`rest` უკვე რეზერვის გამოკლებით) | ყველა ნაშთი |
| `getProductsRestArray` | POST `{prods:int[]}` | იგივე | შერჩეულის ნაშთი (**ახლა ვიყენებთ**) |
| `getProductsRestAfter` | GET `getProductsRestAfter/{date}` | იგივე | 🆕 8.0 — მხოლოდ შეცვლილი |
| `getProductsRestByStore` | GET `getProductsRestByStore/{store}` | `store_rest[]: id, rest` | ერთი საწყობი |
| `getProductsRestByStoreAfter` | GET `.../{store}/{date}` | იგივე | 🆕 8.0 |
| `getProductsRestSummary` | POST `{prods:[], stores:[], date}` | `store_rest[]: id, rest` (ჯამი) | 🆕 8.0 — **საუკეთესო ჩვენი sync-ისთვის** |
| `getProductPrices` / `getProductPricesAfter` | GET | ფასები ტიპების მიხედვით, `discount_price`, `discount_start/end` | ფასის sync (თუ საჭირო გახდება) |
| `getStores` | GET | `stores[]: id, group_id, name, address, project_id` | კონფიგურაცია |
| `getUsers` | GET | `users[]: id, name, type (1 ადმინ, 2 ოპერატორი, 3 მოლარე)` | კონფიგურაცია |
| `getPriceTypes` | GET | `types[]: id, name` | კონფიგურაცია |
| `getCustomersByCode` | GET `getCustomersByCode/{code}` | `contragents[]` | მყიდველის ძებნა პ/ნ-ით |
| `saveCustomer` | POST | `{id, ex}` | მყიდველის შექმნა (`group_id` default 5) |
| `saveDocProductOut` | POST | `{id, ex}` | რეალიზაცია (**ვიყენებთ**) |
| `getDocProductOut` | GET `getDocProductOut/{id}` | `product_out{...}` | შემოწმება / reconcile |
| `saveDocCustomerOrder` | POST | `{id, ex}` | შეკვეთა რეზერვით (`reserved`, `reserved_until`) — ალტერნატივა Pending შეკვეთის FINA-ში დასარეზერვებლად |

ყველა path-ის პრეფიქსია `api/operation/`.

---

## 8. ტესტირების checklist ცვლილებების შემდეგ

- [ ] ავტორიზაციის გარეშე `GET /fina/products`, `POST /api/operation/saveDocProductOut`, `POST /products/admin/sync-fina-quantities` → `401`.
- [ ] ადმინ პანელში FINA product picker კვლავ მუშაობს.
- [ ] `GET /fina/info` → `ok: true`.
- [ ] ტესტური შეკვეთა → `Paid` → FINA-ში დოკუმენტი სწორი თარიღით (თბილისის დრო), სწორი `amount`-ით, `getDocProductOut(id)`-ით შემოწმება.
- [ ] არასწორი `finaId` → `finaDocProductOutError` ივსება, `finaSyncStatus = 'failed'`.
- [ ] ერთდროული ორი `syncFinaDocProductOut` ერთ შეკვეთაზე → FINA-ში მხოლოდ 1 დოკუმენტი.
- [ ] ნაშთის sync: Pending შეკვეთის რეზერვი არ იკარგება.
- [ ] ლოგებში არ ჩანს password/token.
