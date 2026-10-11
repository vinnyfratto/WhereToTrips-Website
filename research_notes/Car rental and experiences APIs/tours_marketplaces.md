# Tours / Activities / Experiences Marketplaces with Partner APIs (for WhereTo Trips in-app search + booking)

Research date: 2026-10-11. Method note for the report writer: direct page fetches to every vendor domain (viator.com, getyourguide.support, klook.com, tiqets.com, headout.com, musement.com, gitbook) were blocked by the environment proxy (DNS/403). Most findings below come from search-engine summaries of those official pages, which are less reliable than reading the pages directly. The one exception is GetYourGuide: its public GitHub repo `getyourguide/partner-api-spec` (OpenAPI spec + wiki + commit history, last commit 2026-10-09) was cloned and read directly, so the GYG API findings are primary-source and high confidence. The web-search budget ran out partway through, so several items below are listed as Gaps (Headout API details, Tiqets booking-API payment flow, Klook inventory/IPO, GYG inventory/financials, Booking.com/Expedia attractions APIs).

## 1. Business model options and access tiers per provider (affiliate redirect vs. booking API with marketplace as merchant of record vs. merchant/net-rate)

### Takeaway
Only Viator publicly documents all three models in tiers: Basic/Full affiliate (redirect), Full + Booking affiliate (native checkout, Viator stays merchant of record), and Merchant (partner is merchant of record, net rate or commission). GetYourGuide's API is now read-plus-redirect for almost everyone, because it removed in-API card and PayPal payment in April 2025 and native booking needs special "MasterBill" access. Musement documents both an affiliate model (Musement is merchant of record, using a Stripe payment flow) and a merchant model. Tiqets gates its Booking API at about 200 orders a month. Klook, Headout, Fever and Civitatis publicly offer affiliate links, widgets and feeds, and API access is "on request" for larger partners. TourRadar offers affiliate and wholesale models through one Distribution API.

### Summary matrix (documented = D, third-party/unverified = U, inferred = I)
| Provider | Affiliate redirect | Booking API, marketplace = MoR | Merchant / net-rate, partner = MoR | Native in-app checkout possible? |
|---|---|---|---|---|
| Viator | Basic & Full-access affiliate (D) | Full + Booking affiliate, Viator payment iframe (D) | Merchant partner, commission or markup model, deposit required (D) | Yes. Booking-affiliate (iframe/WebView) or Merchant (D) |
| GetYourGuide | Yes, `url` with `partner_id` from API (D) | Card/PayPal checkout via API removed Apr 2025 (D) | "MasterBill" payment, needs MasterBill API access (D). That the partner collects payment is inferred (I) | Only with MasterBill access (D/I) |
| Klook | Links, widgets, search boxes, banners (D) | "API, data feeds, white label" for larger partners; terms unpublished (D/U) | No public net-rate B2B tier found; a competitor claims none exists (U) | Unknown |
| Tiqets | Affiliate program (D) | Booking API after ~200 orders/month (D). Payment flow not confirmed | Margin-share contract, monthly invoices (D). Who is MoR not confirmed | Probably (I) |
| Headout | Affiliate program (D) | "Distribution" partner offering exists (D); details not retrieved | Unknown | Unknown |
| TUI Musement | Referral links/affiliate (D) | Affiliate API, Musement = MoR via Stripe payment flow (D) | Merchant API integration type (D) | Yes (D) |
| Civitatis | Affiliate 8–10% (D) | API "on request", no public docs (D) | Agency portal: 10% discount on public price (D) | Unknown |
| TourRadar | Affiliate, 90-day window (D) | — | "Wholesale" model in Distribution API, largest commission share (D) | Partially. Wholesale sends traveler to a "Partner Portal page" to book (D) |
| Fever | Links, feeds, widgets (D) | "Custom API integrations" for selected high-volume partners; Fever handles checkout (D) | Not offered publicly | Unclear; Fever handles checkout (D) |
| Holibob (B2B aggregator) | Storefront/widget (D) | GraphQL API + new SDK (D) | Payment model not retrieved | Yes, by design (D) |

### Cited Findings
**Viator (Tripadvisor)**
- Viator's Partner API has four access tiers. Merchant partners get all endpoints. Full-access affiliates get every non-transactional endpoint, with no booking, hold or cancel calls. Full-access + Booking affiliates also get cart booking, cart hold and cancellation endpoints. Basic-access affiliates get only a limited subset of non-transactional endpoints — [Viator: Levels of access](https://partnerresources.viator.com/travel-commerce/levels-of-access/); [docs.viator.com Partner API](https://docs.viator.com/partner-api/technical/)
- Standard affiliates do not handle booking. Users click through to viator.com to purchase. Merchants process bookings on their own site — [Viator: Levels of access](https://partnerresources.viator.com/travel-commerce/levels-of-access/)
- A merchant partner "operates as the merchant of record" and takes "full responsibility for all financial records and transactions" — [Viator Merchant API docs](https://docs.viator.com/partner-api/merchant/technical/); [Viator Partner Glossary](https://partnerresources.viator.com/travel-commerce/glossary/)
- Merchant pricing has two models. In the **commission model** the partner sells at `recommendedRetailPrice` and receives a percentage commission. In the **markup model** (merchant partners only) the partner sets its own markup and is invoiced `partnerTotalPrice` (= `partnerNetPrice` + `bookingFee`), with no commission applied. The net rate (`merchantNetPrice`) is the amount Viator invoices the merchant, excluding fees — [Viator: Calculating Product Pricing](https://partnerresources.viator.com/travel-commerce/merchant/pricing/) (page roughly 633 days old as of search, i.e. about early 2025); [Viator Partner Glossary](https://partnerresources.viator.com/travel-commerce/glossary/)
- Viator's merchant page also describes a commission-only API arrangement where customers transact on viator.com and Viator stays merchant of record — [Viator Merchant API Solution](https://partnerresources.viator.com/travel-commerce/merchant/)
- Basic access is available immediately. Higher tiers require approval and certification — [Viator: Levels of access](https://partnerresources.viator.com/travel-commerce/levels-of-access/)

**GetYourGuide (primary source: GitHub spec/wiki)**
- The Partner API has three access tiers: BASIC/LIMITED_READ (catalogue only: `/tours`, `/tours/{id}`, categories), READ (adds options, suppliers, `/availability`, `/price-breakdown`), and BOOKING (adds `/bookings`, `/carts`, `/configuration/payment`; described as "full end-to-end booking + payments"). The privileges enum also includes BOOKING_CANCEL — [GYG wiki: Access levels](https://github.com/getyourguide/partner-api-spec/wiki/Access-levels); [GYG wiki: Home](https://github.com/getyourguide/partner-api-spec/wiki); [spec repo](https://github.com/getyourguide/partner-api-spec)
- The wiki describes two integration options. Option 1 redirects the customer to the `url` field (pre-filled with `partner_id`, `psrc=partner_api`) so the booking is attributed for commission. Option 2 books and checks out via the API (POST `/bookings` creates a temporary hold with `reservation_expires_at`, then POST `/carts` confirms) — [GYG wiki: Making a booking](https://github.com/getyourguide/partner-api-spec/wiki/Making-a-booking)
- **On 2024-11-27 GYG deprecated the PayPal and EncryptedCreditCard (Adyen client-side encryption) payment methods** with the note: "Please redirect the user to the GetYourGuide website to complete a purchase instead." **On 2025-04-02 both were removed from the spec**, leaving `MasterBill` as the only cart payment method ("MasterBill payment method, requires MasterBill API access") — [commit 1e54d0d (2024-11-27)](https://github.com/getyourguide/partner-api-spec/commit/1e54d0d1d59feb37a6eadf5d743f653fef888aaa); [commit 7b5c372 (2025-04-02)](https://github.com/getyourguide/partner-api-spec/commit/7b5c372a75a49027ce9add92847029876937b020); [payment.yaml](https://github.com/getyourguide/partner-api-spec/blob/main/spec/components/schema/payment.yaml)
- The new availability-change feed (`/availabilities/status/changes`, documented Sept 2026) "is limited to master-bill partners. A token without the master-bill privilege gets 403" — [availabilities.yaml](https://github.com/getyourguide/partner-api-spec/blob/main/spec/paths/availabilities.yaml)
- A GYG support article (about 830 days old, so roughly mid-2024) describes Basic (Teaser) and Reading access. It says Reading requires at least 300 monthly bookings for partners who already have Basic access — [GYG: API integration and requirements](https://partner.getyourguide.support/hc/en-us/articles/13981133907613-API-integration-and-requirements)
- GYG Partner Terms say payment transactions are carried out through GYG's payment providers, that API partners are responsible for customer-service requests arising *before* the booking request is transferred, and that API use falls under separate T&Cs — [GYG Partner Terms](https://www.getyourguide.com/c/partner-terms-and-conditions) (page about 800 days old as of search)

**Klook**
- Klook's affiliate site lists widgets, search boxes, banners and dashboards for content sites. It says larger partners can get "data feeds, API, and white label integration" — [Klook Affiliate](https://affiliate.klook.com/home)
- Klook's partner page offers "a free-to-use SaaS solution or API connectivity". This appears to be supply-side — [Klook Partner](https://www.klook.com/partner/)
- Klook's public OpenAPI spec (klook.gitbook.io) is for suppliers and channel managers pushing inventory into Klook (OCTO core endpoints that Klook consumes as reseller), not for resellers buying Klook inventory — [Klook API Specification](https://klook.gitbook.io/openapi); [APIs.io Klook listing](https://apis.io/providers/klook/)
- A competitor's comparison page claims Klook has no true B2B portal with wholesale net rates, and that its affiliate API gives retail prices only, with 3–8% commission (competitor marketing, low reliability) — [DMC Quote](https://dmcquote.com/compare/klook-alternative). Another third-party SEO page says partner approval is gated by partner type, volume and business-model fit, with 5–12% commission (low reliability) — [adivaha](https://www.adivaha.com/klook-partner-api.html)

**Tiqets**
- Access starts with the affiliate program plus the Content and Availability APIs. Booking API eligibility depends on performance: "We consider around 200 orders a month the minimum amount required" — [Tiqets API Programme](https://www.tiqets.com/en/partner-program/api-program/); [Tiqets partner FAQ search](https://partners.tiqets.com/en_us/search?q=How+can+I+get+access+to+your+Content+API%3F)
- The Distributor API Portal is "exclusively available to Tiqets partners who have access to the Booking API" — [Tiqets: portal access](https://partners.tiqets.com/en_us/how-do-i-get-access-to-the-portal-ByAb4phMs); [Tiqets Distributor API Portal](https://distributor-portal.tiqets.com/distributorapi)

**Headout**
- Headout runs an affiliate program and a separate "Headout for partners – Best way to reserve tours for guests" distribution offering. Its contents could not be retrieved — [Headout Affiliates](https://partner.headout.com/); [Headout distribution](https://partner.headout.com/distribution/)

**TUI Musement**
- "Musement partners can choose between two types of API integrations: merchant or affiliate." Affiliates "do not manage payments: they use the so-called payment flow to connect with the Musement payment gateway Stripe", and Musement is merchant of record for them — [Musement Partner API: Intro](https://partner-api.musement.com/api/getting-started); [Musement: Make a payment](https://partner-api.musement.com/api/booking-flow/payment)
- Musement also supports referral links. The legacy api-docs.musement.com has moved to partner-api.musement.com — [Musement referral links](https://partner-api.musement.com/referral-links/); [legacy docs](https://api-docs.musement.com/v3.5.0)
- TUI Musement connected to Travel Counsellors through a **merchant API** inside the Phenix platform — [TUI Group newsroom](https://www.tuigroup.com/en/newsroom/news/tui-musement-becomes-global-tours-and-activities-partner-for-travel-counsellors)

**Civitatis**
- Civitatis has an affiliate program, and its FAQ says "we have an API, and if you're interested please don't hesitate to write to us". No public API docs were found — [Civitatis affiliate FAQ](https://www.civitatis.com/en/affiliates/landing-frequently-asked-questions/)
- A separate travel-agency portal gives agencies 10% off the public Civitatis.com price as a booking discount (free tours excluded) — [Civitatis agency FAQ](https://www.civitatis.com/en/agencies/landing-frequently-asked-questions/). An older help article contradicts this, saying Civitatis does not work with travel agencies, only affiliates — [Civitatis Zendesk (older)](https://civitatis.zendesk.com/hc/en-us/articles/212558169-Can-I-offer-Civitatis-products-in-my-travel-agency)

**TourRadar (multi-day tours)**
- TourRadar markets a unified Distribution API with "three models, one platform". In the **affiliate** model, discovery happens on the partner site and the traveler books on the TourRadar marketplace. In the **wholesale** model, discovery and sale happen on the partner site, then the traveler moves to the partner's "Partner Portal page" to book; this model pays the largest share of commission. The third model was not captured in search results — [TourRadar Distribution API](https://www.tourradar.com/distribution-api); [TourRadar Partner Solutions](https://www.tourradar.com/partner-solutions)
- Under the affiliate program, booking happens on TourRadar.com with TourRadar as merchant of record — [TourRadar Partner Solutions](https://www.tourradar.com/partner-solutions)

**Fever**
- Affiliates earn through tracking links, feeds, widgets or approved integrations, and Fever handles checkout and customer support. "For selected partners with larger traffic volumes or more advanced use cases, Fever may support feeds, or custom API integrations" — [Fever Affiliate Program](https://business.feverup.com/en/partner-programs/affiliate-program/)

**Holibob (B2B aggregator)**
- Holibob's GraphQL API lets authorized partners query products and availability and create and confirm bookings. It requires applying for an API key and secret — [Holibob API intro](https://partner.documentation.holibob.tech/general-api/Working-version/the-holibob-api-introduction)
- Holibob distributes through storefront, widget, API or agent desktop, and targets agents, OTAs, airlines and cruise lines — [Holibob](https://holibob.tech/); [Travolution (older)](https://www.travolution.com/news/travel-sectors/tours-and-activities/start-up-holibob-sets-sights-on-being-booking-com-of-experiences/)

### Inferences
- For a US startup that wants native checkout without becoming merchant of record for tours, **Viator Full + Booking affiliate** is the only major option publicly documented as currently available. GYG's equivalent (card checkout via API) was retired in April 2025.
- GYG's "MasterBill" name and the fact that it replaced card/PayPal suggest a consolidated-invoice model: the partner collects from the customer and GYG bills the partner, which makes the partner effectively merchant of record. The spec does not define MasterBill. Treat this as inference and confirm with GYG.
- How WhereTo's current LiteAPI setup works matters. If Nuitée is merchant of record for hotels today, WhereTo has no existing MoR or payment-ops stack, which favors the Viator booking-affiliate or Musement affiliate models. If WhereTo already takes payment itself, a Viator Merchant or Musement merchant integration could reuse that stack.

### Gaps
- Exact contents of Headout's distribution/API program (page not retrievable; search budget exhausted).
- Whether Tiqets Booking API partners take payment (partner as MoR with monthly invoicing) or pass it to Tiqets. The "monthly invoice" evidence suggests partner collection, but this is not confirmed.
- Definition of GYG MasterBill and its eligibility criteria.
- Whether Klook offers any reseller booking API with native checkout to non-Asian partners. No official documentation was found.
- The third TourRadar API model.

## 2. Native in-app checkout, payment collection, customer support, cancellations and refunds

### Takeaway
Viator Full + Booking affiliates can keep users in their own flow. The partner calls cart-hold, renders Viator's payment iframe (JS library) initialized with a payment session token, then calls cart-book. Viator remains merchant of record and handles post-booking communication, cancellations and refunds. In a native iOS/Android app the iframe would likely need a WebView. GYG native checkout requires MasterBill access; otherwise the app must redirect to GYG web. Musement affiliates get a Stripe-based payment flow with Musement as merchant of record. Fever, Klook, Civitatis and TourRadar affiliates handle checkout on the marketplace's site.

### Cited Findings
- **Viator booking affiliates:** the cart-hold response returns a payment session token used to initialize Viator's payment iframe. The iframe produces a payment token that confirms the booking, and the Viator JavaScript library must be loaded on the payment page — [Viator Technical Guide](https://partnerresources.viator.com/travel-commerce/technical-guide/)
- Viator's certification guide says booking-access affiliates share customer payment details with Viator in a PCI-compliant way. They must use cart hold followed by cart book, not the legacy hold/book endpoints — [Viator API Certification](https://partnerresources.viator.com/travel-commerce/certification/)
- The hold "ensures that customers have sufficient time to complete required booking details, such as passenger info and payment". Holds should start only once the user shows strong intention to book — [Viator Technical Guide](https://partnerresources.viator.com/travel-commerce/technical-guide/)
- For affiliates, Viator is merchant of record and handles communication about bookings, cancellations and refunds. Customers cancel by contacting Viator support — [Viator Technical Guide](https://partnerresources.viator.com/travel-commerce/technical-guide/); [Viator API Certification](https://partnerresources.viator.com/travel-commerce/certification/)
- Viator merchants are merchant of record and take on transactions, post-booking work and support. Cancellation through the API is required for them — [Viator API Certification](https://partnerresources.viator.com/travel-commerce/certification/)
- Viator's Supplier API FAQ says Viator is the card merchant of record for all transactions, and card data is not sent via that (supplier) API — [Viator Supplier API FAQ](https://docs.viator.com/supplier-api/technical/faq/)
- **GYG:** booking via API is per tour *option*. POST `/bookings` returns `status: temp` with `reservation_expires_at`, and inventory is released automatically if the booking is not finalized in time. Multiple bookings can share a `shopping_cart_id`, and an `external_reference_id` can carry the partner's own booking reference — [GYG wiki: Making a booking](https://github.com/getyourguide/partner-api-spec/wiki/Making-a-booking)
- GYG's cart confirm request requires `billing`, `traveler` and `payment`, and `payment` is now only `MasterBill` — [GYG carts schema](https://github.com/getyourguide/partner-api-spec/blob/main/spec/components/schema/carts.yaml); [payment.yaml](https://github.com/getyourguide/partner-api-spec/blob/main/spec/components/schema/payment.yaml)
- GYG supports cancellation via API (`DELETE /bookings/{booking_hash}`, "Delete (Cancel) a booking"). Bookings return a ticket object with a `ticket_url` ("Download link for ticket PDF", a getyourguide.com/voucher URL) — [GYG bookings paths](https://github.com/getyourguide/partner-api-spec/blob/main/spec/paths/bookings.yaml); [GYG bookings schema](https://github.com/getyourguide/partner-api-spec/blob/main/spec/components/schema/bookings.yaml)
- GYG's wiki says GYG handles "fulfilment and customer support" for Partner API sales — [GYG wiki: Home](https://github.com/getyourguide/partner-api-spec/wiki). GYG Partner Terms make API partners responsible for customer service *before* the booking request is transferred — [GYG Partner Terms](https://www.getyourguide.com/c/partner-terms-and-conditions)
- **Musement affiliates** use Musement's Stripe payment flow, with Musement as merchant of record — [Musement: Intro](https://partner-api.musement.com/api/getting-started); [Musement: Make a payment](https://partner-api.musement.com/api/booking-flow/payment)
- **Fever** handles checkout and customer support for affiliates — [Fever Affiliate Program](https://business.feverup.com/en/partner-programs/affiliate-program/)
- **TourRadar** affiliate bookings complete on TourRadar.com, with TourRadar as merchant of record — [TourRadar Partner Solutions](https://www.tourradar.com/partner-solutions)

### Inferences
- Viator's payment step is a web iframe with a JS library. A native app would need an embedded WebView for card entry, or a separate native SDK if Viator offers one (none found). That is still "in-app", but not fully native UI. Apple Pay/Google Pay support inside the iframe was not confirmed.
- Under both Viator booking-affiliate and Musement affiliate, WhereTo would avoid chargebacks, refunds and supplier-failure liability but would not own the payment relationship. Card statements would show the marketplace, not WhereTo.
- App-store policy: physical-world services such as tours are generally exempt from Apple/Google in-app-purchase requirements, so third-party payment iframes should be permissible. This is general knowledge and was not verified in this session.

### Gaps
- Whether Viator's iframe supports Apple Pay/Google Pay and whether Viator has a native mobile payment SDK.
- Klook, Headout and Tiqets payment and post-booking support responsibilities for API partners. Not retrieved.

## 3. Commission rates, cookie windows and payout timing

### Takeaway
Headline affiliate rates cluster around 5–10%. Viator is about 8% with a 30-day cookie (third-party listings, consistent). GYG is "up to 8%" with a 30-day window per its own creator page (31 days on Travelpayouts). Klook varies by category (about 6.5% on activities in an Apr–Jun 2026 network table) with a 30-day cookie. Tiqets is about 6% on networks and uses a gross-margin share for API partners, with a 30-day cookie. Civitatis pays 8–10% by volume (official). TourRadar has a 90-day window and averages $180 per booking. Fever is about 6–8%. Headout figures conflict (1–10%). Merchant/net-rate partners earn the spread instead. Supplier-side commissions of 20–30% bound the theoretical margin pool, but partners receive only a share of it.

### Cited Findings
**Viator**
- Aggregators consistently list 8% commission on completed bookings with a 30-day cookie — [Lasso: Viator](https://getlasso.co/affiliate/viator/); [CommissionDex](https://commissiondex.com/program/viator/). One directory lists 3.2% for a US-only listing, and another lists a flat $4 per sale (low reliability) — [Lasso: Viator US](https://getlasso.co/affiliate/viator-us/)
- Viator's own Affiliate API page refers only to "a standard commission rate on any experience booked within 30 days" — [Viator Affiliate API](https://partnerresources.viator.com/travel-commerce/affiliate/)
- Payout reports conflict: weekly PayPal with no minimum versus monthly bank transfer with a $50 minimum; another source says bank payments cover experiences *completed* in the previous calendar month. Cancelled bookings reverse commission — [Lasso: Viator](https://getlasso.co/affiliate/viator/); [Travelpayouts Viator review](https://www.travelpayouts.com/blog/viator-affiliate-program/)
- Merchant partners earn either a commission off `recommendedRetailPrice` or a self-set markup over net rate plus booking fee. No public merchant commission percentage was found — [Viator pricing](https://partnerresources.viator.com/travel-commerce/merchant/pricing/)
- Temporary promotion: a 10% "reward upsize" for partners from 2025-11-17 to 2026-01-31 — [Travelpayouts Viator review](https://www.travelpayouts.com/blog/viator-affiliate-program/)
- Suppliers pay Viator commonly about 20–30% (about 25% typical) (third-party) — [OTA Playbook](https://otaplaybook.com/viator-commission-rate-what-operators-actually-pay/); [Samba HQ OTA commission rates 2026](https://www.sambahq.com/ota-supplier-guide/ota-commission-rates)

**GetYourGuide**
- GYG's creator help page: "up to 8% commission every time your audience books through your links", and purchases "within 30 days of clicking your link" are attributed — [GYG creator support](https://partner.getyourguide.support/hc/en-us/articles/23082933149981)
- Network-specific figures (aggregator): Awin 7% base and 30-day cookie, Travelpayouts 8% and 31-day cookie, TradeDoubler from 5% and 30-day cookie. The exact page behind each figure is uncertain — [Affpaying](https://www.affpaying.com/getyourguideaffiliateprogram); [Lasso](https://getlasso.co/affiliate/get-your-guide/)
- GYG Partner Terms: commission "as set out in the Partner Portal" per completed booking. Refunds can cause GYG to deduct the commission from a later payment — [GYG Partner Terms](https://www.getyourguide.com/c/partner-terms-and-conditions)
- A comparison site claims 20–30%, likely a confusion with supplier take rate (unsourced, disregard for partner earnings) — [ToolRelief](https://toolrelief.com/compare/getyourguide-vs-viator-partner-api/). Supplier commission is set after review and is negotiable — [Bókun](https://www.bokun.io/getyourguide-supplier)

**Klook**
- Involve Asia's Apr–Jun 2026 table: 2%–20% depending on category, with tours, activities and hotels at 6.5%. Cookie is 30 days (7 days for hotels and car rentals) — [Involve Asia](https://involve.asia/blog/klook-affiliate-program/)
- Other listings: Lasso 2–5%; Affiliateroll flat 5%; Ecomobi up to 8% including volume bonus, base 5% (updated Apr 2026); Cuelinks 4.28% — [Lasso](https://getlasso.co/affiliate/klook/); [Affiliateroll](https://www.affiliateroll.com/programs/klook); [Ecomobi](https://ecomobi.com/klook-affiliate-program-review/); [Cuelinks](https://www.cuelinks.com/campaigns/klook-affiliate-program)

**Tiqets**
- API/distributor partners are paid on a "Gross Transaction Margin Share model where we share a given percentage of the gross margin from ticket sales with our partners, after the payment and handling costs are deducted". Higher performers can get custom rates, and the contract prevails over portal estimates — [Tiqets commission model](https://partners.tiqets.com/en_us/commission-model-BkgPnGdu3)
- Commission appears on a monthly invoice in the Distributor API Portal covering the previous month's orders by visit date — [Tiqets: how can I see commission](https://partners.tiqets.com/en_us/how-can-i-see-the-commission-i-earn-H1iXE63Mi)
- Affiliate: 6% per sale (Lasso; an Awin-based guide says "up to 6%"); FlexOffers US 2.4–4.8%, France 5%; older listings 8% (Travelpayouts) and 8–12% (Affpaying). Cookie is 30 days — [Lasso](https://getlasso.co/affiliate/tiqets-international-b-v/); [FlexOffers US](https://www.flexoffers.com/top-advertisers/tiqets-us-affiliate-program/); [FlexOffers FR](https://www.flexoffers.com/affiliate-programs/tiqets-fr-affiliate-program/); [Travelpayouts](https://www.travelpayouts.com/blog/tiqets-affiliate-program/); [Affpaying](https://www.affpaying.com/tiqetsaffiliate); [Indoleads](https://indoleads.com/blog/new-offer-launched-tiqets-affiliate-program-2/)

**Headout**
- The official page describes a performance-based, per-booking structure with higher rates at volume, no percentage published, and payout details in the dashboard — [Headout Affiliates](https://partner.headout.com/)
- Third-party figures conflict: 1% (Lasso, about 2019 data; TapRefer), 5–10% (Shopper.com, Tars), 5–7% (AvidAffiliate: 5% on Impact, 7% on Mavely) — [Lasso](https://getlasso.co/affiliate/headout/); [TapRefer](https://taprefer.com/headout-affiliate-program/headout/); [Shopper.com](https://www.shopper.com/partnerships/headout-com-affiliate-program); [Tars](https://hellotars.com/tools/headout); [AvidAffiliate](https://avidaffiliate.com/programs/headout-com/)
- Supplier commissions are generally 15–30% (2026, third-party) — [TourBiz](https://tourbiz.fr/en/blog/how-to-sell-on-headout/)

**TUI Musement**
- A Travelpayouts webinar Q&A says Musement "shares 50% from the own income", meaning 50% of Musement's margin, not of ticket price. Secondhand, date unknown — [Travelpayouts Musement Q&A](https://www.travelpayouts.com/blog/qa-from-the-musement-webinar/)
- The affiliate terms PDF describes monthly commission reporting; the rate was not captured — [Musement Affiliate T&Cs PDF](https://affiliate.musement.com/assets/docs/Musement_Affiliate_Program_Terms_and_Conditions.pdf)

**Civitatis (official)**
- 8%–10% commission per sale depending on monthly sales volume, plus a fixed €1 per free-tour participant. Paid on the previous month's activities once they have taken place. No affiliate networks are used — [Civitatis affiliates](https://www.civitatis.com/en/affiliates/); [Civitatis affiliate FAQ](https://www.civitatis.com/en/affiliates/landing-frequently-asked-questions/)

**TourRadar**
- A booking within 90 days of a click is credited. Average commission is $180 per booking. Payment goes to the TourRadar Wallet one business day after the trip ends — [TourRadar for Affiliates](https://www.tourradar.com/mlp/affiliates); [TourRadar Rise: how it works](https://www.tourradar.com/rise/how-it-works)
- Percentages: 7% for Ambassador/Creator (UpPromote) versus 5% (Travelpayouts, about 793 days old) — [UpPromote](https://uppromote.com/affiliate-directory/tourradar/); [Travelpayouts](https://www.travelpayouts.com/blog/tourradar-affiliate-program/)
- The wholesale model pays "the largest share of commission" (not quantified) — [TourRadar Distribution API](https://www.tourradar.com/distribution-api)

**Fever**
- Official: commission varies by partnership setup and can scale with volume — [Fever Affiliate Program](https://business.feverup.com/en/partner-programs/affiliate-program/)
- Third-party: FlexOffers 6.4% (8% Candlelight, 4.8% limited plans; page about 593 days old); LinkClicky 6–10% (about 944 days old); Lasso 6–8% — [FlexOffers](https://www.flexoffers.com/affiliate-programs/fever-up-affiliate-program/); [LinkClicky](https://linkclicky.com/affiliate-program/fever/); [Lasso](https://getlasso.co/affiliate/fever-up/)

### Inferences
- In an app, "cookie windows" matter only for redirect flows. With API booking (Viator booking-affiliate, Musement affiliate API, Tiqets Booking API), attribution is deterministic per API key, so the 30-day cookie is irrelevant and every booking is credited.
- Merchant/net-rate models (Viator Merchant markup, TourRadar wholesale, Tiqets margin share) can beat 8% but add deposit, MoR and refund liability.
- Commission is typically earned on completed or attended experiences (Viator, Civitatis, Tiqets by visit date, TourRadar after trip end). Cash flow lags booking by weeks to months for advance bookings.

### Gaps
- No official, current published commission percentage for Viator, GYG, Klook, Headout or Musement. All are portal or contract based.
- Viator merchant net-rate margins and deposit amounts are set during qualification, not published.

## 4. Inventory size and geographic strengths

### Takeaway
Viator is the largest single marketplace (300,000–400,000+ experiences by its own figures). GYG's API exposes more than 75,000 activities (per its wiki, date unclear). Holibob claims 500,000+ products as an aggregator of 45+ API partners. Tiqets is attraction and museum tickets (3,000+ partners). TourRadar is multi-day tours. Fever is events and experiences. Klook's strength is Asia (inferred). Civitatis is Spanish-language and Latin America (inferred). Hard counts for Klook, Headout, Musement and Civitatis were not found.

### Cited Findings
- Viator: "more than 400,000 travel experiences"; the supplier page says "over 400,000 tours, activities, and attractions" — [Viator About](https://www.viator.com/support/about); [Viator supplier sign-up](https://supplier.viator.com/sign-up-info). The Google Play listing (updated 2026-10-01) says 300,000+ — [Viator on Google Play](https://play.google.com/store/apps/details?id=com.viator.mobile.android&hl=en)
- Viator aggregator stats: 425,000+ experiences in 2,500+ destinations and 55,000+ operators; Viator Q2 2025 revenue $270M (+11% YoY) (aggregator, verify against Tripadvisor filings) — [Hotelagio Viator statistics](https://hotelagio.com/viator-statistics/)
- Viator's EU DSA disclosure: average monthly active recipients in the EU were below 45 million for Aug 2025–Jan 2026 — [Viator About](https://www.viator.com/support/about)
- GYG Partner API: "search, price and book more than 75,000 activities" — [GYG wiki: Home](https://github.com/getyourguide/partner-api-spec/wiki). An example query for Paris returned `totalCount: 498` (2021 example) — [GYG wiki: Making a booking](https://github.com/getyourguide/partner-api-spec/wiki/Making-a-booking)
- Tiqets: "more than 3,000 partners worldwide" (venues), with older third-party figures of 2,500 venues in 60+ countries and 4,000+ venue partners — [Tiqets home](https://www.tiqets.com/en/)
- TUI Musement added 750+ multi-day tours across 30+ countries to TravelExchange (Sept 2025). Supplier products reach TUI channels and partners such as Booking.com and Priceline — [TUI Group newsroom](https://www.tuigroup.com/en/newsroom/news/tui-musement-strengthens-its-tours-activities-distribution-with-the-integration-of-750-multi-day-tours-across-30-countries-into-the-travelexchange-platform); [Travelotopos (Apr 2024)](https://travelotopos.com/2024/04/12/travelotopos-and-tui-musement-are-now-integrated/)
- Holibob: 500,000+ live bookable products (tours, attractions, live events, dining) aggregated from 45+ API partners plus direct contracts — [Breaking Travel News](https://www.breakingtravelnews.com/news/article/holibob-launches-sdk-that-cuts-experience-booking-integration-from-six-mont/)
- Civitatis: 30,000+ travel-agency partners by end of 2024 (a distribution metric, not inventory) — [Wikipedia: Civitatis](https://en.wikipedia.org/wiki/Civitatis)

### Inferences
- For global coverage behind one integration, Viator alone likely covers most US-traveler demand. A second source (GYG redirect, Tiqets for attraction tickets, or Klook for Asia) would fill depth gaps.
- Aggregators such as Holibob likely resell some of the same Viator/GYG/Tiqets-type inventory. "500,000 products" probably includes overlap and non-tour items such as dining and events.

### Gaps
- Current experience counts for GYG (company-wide), Klook, Headout, Musement and Civitatis. Not found before the search budget ran out.

## 5. Onboarding requirements (approval, traffic minimums, certification, timeline, contract, fees)

### Takeaway
Viator: Basic access is instant; higher tiers need approval and certification; Merchant needs qualification and a deposit, with no setup fee. GYG: a partner manager issues API keys; a 2024 article cited 300 bookings a month for READ access; booking requires MasterBill. Tiqets: about 200 orders a month for the Booking API. Fever, Klook and Civitatis: API access by request or for larger partners only. Civitatis requires a travel website/blog and no networks. Holibob: apply for credentials, with an SDK claiming 3-day integration.

### Cited Findings
- Viator: Basic access is available immediately, and higher tiers require approval and certification — [Viator: Levels of access](https://partnerresources.viator.com/travel-commerce/levels-of-access/). Booking affiliates must implement cart hold/book, and merchants must implement API cancellation — [Viator API Certification](https://partnerresources.viator.com/travel-commerce/certification/)
- Viator Merchant: "all applicants will be evaluated and qualified by Viator", and those that don't qualify are offered other API solutions. Merchants follow a separate qualification, development and certification process. No setup fee, but a deposit is required before live bookings, "based on your likely sales and confirmed during the qualification process" — [Viator Merchant API Solution](https://partnerresources.viator.com/travel-commerce/merchant/); corroborated by [PHPTRAVELS (third-party)](https://phptravels.com/blog/what-is-viator-api-how-it-works)
- No travel-agency license requirement for Viator API partners surfaced in search (absence of evidence, not confirmed) — [Viator Merchant API Solution](https://partnerresources.viator.com/travel-commerce/merchant/)
- GYG: "Request an API key from your Partner Manager". There is a sandbox (`api.gygtest.net`). The default rate limit is 130 calls/min, with a 5-minute block when exceeded. GYG "monitors API traffic and warns about excessive usage in relation to bookings" and asks partners not to scrape or cache — [GYG wiki: Home](https://github.com/getyourguide/partner-api-spec/wiki); [GYG wiki: Getting started](https://github.com/getyourguide/partner-api-spec/wiki/Getting-started); [api.yaml](https://github.com/getyourguide/partner-api-spec/blob/main/spec/api.yaml)
- GYG READ access needed at least 300 monthly bookings (article about 830 days old) — [GYG support](https://partner.getyourguide.support/hc/en-us/articles/13981133907613-API-integration-and-requirements). Third-party sources say access requires a commercial partnership agreement and certification, and that GYG cannot guarantee full technical onboarding support — [ToolRelief](https://toolrelief.com/compare/getyourguide-vs-viator-partner-api/); [Supergood](https://supergood.ai/api-report-card/getyourguide)
- Tiqets: start with affiliate plus Content/Availability APIs; Booking API needs "sufficiently healthy basket numbers… around 200 orders a month" — [Tiqets API Programme](https://www.tiqets.com/en/partner-program/api-program/)
- Fever: free to join via links; feeds and custom API only for selected larger partners; needs "a fully operational website, related to the events and experiences sector"; contact affiliates@feverup.com — [Fever Affiliate Program](https://business.feverup.com/en/partner-programs/affiliate-program/)
- Civitatis: applicants must have a travel-related website or blog; there are no affiliation networks; contact by email for the API; agencies apply via the agency portal (agencies@civitatis.com) — [Civitatis affiliate FAQ](https://www.civitatis.com/en/affiliates/landing-frequently-asked-questions/); [Civitatis agency FAQ](https://www.civitatis.com/en/agencies/landing-frequently-asked-questions/)
- Musement affiliate signup goes through a Travelpayouts account and then subscribing to Musement under Offers (secondhand, older) — [Travelpayouts Musement Q&A](https://www.travelpayouts.com/blog/qa-from-the-musement-webinar/)
- Klook: one third-party guide says API keys are issued after partner approval and OAuth is used for advanced partnerships (unverified) — [adivaha](https://www.adivaha.com/klook-partner-api.html)
- Holibob: apply for an API key and secret — [Holibob API intro](https://partner.documentation.holibob.tech/general-api/Working-version/the-holibob-api-introduction). The free SDK (web components plus a lightweight server proxy) claims integration "in as little as three days" versus about six months previously — [Breaking Travel News](https://www.breakingtravelnews.com/news/article/holibob-launches-sdk-that-cuts-experience-booking-integration-from-six-mont/); [Travolution](https://www.travolution.com/en/article/holibob-launches-software-development-kit-to-cut-integration-times-to-days)

### Inferences
- A pre-revenue startup can get Viator Basic immediately and GYG/Klook/Fever/Civitatis affiliate links quickly. Native booking tiers (Viator Full + Booking, GYG MasterBill, Tiqets Booking API) depend on demonstrated volume or approval, so the realistic path is to launch with Viator (apply for Full + Booking early) plus redirect partners, then upgrade.
- Tiqets' 200 orders/month and GYG's historic 300 bookings/month suggest that a deep-integration API tier at most marketplaces assumes an existing booking run-rate.

### Gaps
- Typical certification timelines (weeks) for Viator Full + Booking and Merchant tiers.
- Whether Viator requires a minimum traffic level for Full + Booking approval.
- Contract and legal-entity requirements (e.g., US LLC acceptance, W-9 / tax forms) for each.

## 6. Content quality: photos, reviews, real-time availability, instant confirmation, mobile tickets

### Takeaway
GYG's API (primary source) exposes rich content: pictures, ratings and review counts, a reviews endpoint, categories, itineraries (added June 2026), cancellation policy, `mobile_voucher` flag, `likely_to_sell_out` (Sept 2026), up to 16 months of availability, and PDF voucher URLs. Viator's API includes availability holds and pricing fields; the content details were not retrieved. TUI Musement advertises live availability and instant confirmation. Tiqets brands itself on "instant tickets".

### Cited Findings
- GYG tour objects include `pictures` (CDN URLs with format IDs), `overall_rating`, `number_of_ratings`, `bestseller`, `certified`, `has_pick_up`, `coordinates`, `durations`, `categories` and `locations` — [GYG wiki: Making a booking](https://github.com/getyourguide/partner-api-spec/wiki/Making-a-booking)
- GYG tour schema includes `guide_type` (adds `self_guided` Jun 2026 and `audio_guide` Sep 2026), `mobile_voucher` ("If the tour accepts mobile voucher"), `opening_hours`, `cancellation_policy` and `cancellation_policy_text`, `itineraries` (structured stops/days, added Jun 2026), `likely_to_sell_out` (GYG demand prediction, added Sep 2026), `activity_type` and `partner_business_category` (Aug 2026) — [tour.yaml](https://github.com/getyourguide/partner-api-spec/blob/main/spec/components/schema/tour.yaml); [commit history](https://github.com/getyourguide/partner-api-spec/commits/main)
- GYG has a reviews endpoint (`/reviews/tour/{tour_id}`, limit max 50, Jul 2026). Availability is provided "over the next 16 months". Price-breakdown exposes min/max participants per timeslot (Jul 2026). Content comes in about 31 languages (Bulgarian added Oct 2026), display in about 40 currencies, and checkout in 10 currencies including USD — [GYG wiki: Getting started](https://github.com/getyourguide/partner-api-spec/wiki/Getting-started); [GYG wiki: Making a booking](https://github.com/getyourguide/partner-api-spec/wiki/Making-a-booking); [commit history](https://github.com/getyourguide/partner-api-spec/commits/main)
- GYG bookings return a `ticket_url` ("Download link for ticket PDF") — [GYG bookings schema](https://github.com/getyourguide/partner-api-spec/blob/main/spec/components/schema/bookings.yaml)
- Viator's cart hold locks availability and price while the customer completes passenger info and payment — [Viator Technical Guide](https://partnerresources.viator.com/travel-commerce/technical-guide/)
- TUI Musement's TravelExchange feed offers "live availability, up-to-date rates, and immediate booking confirmation" — [TUI Group newsroom](https://www.tuigroup.com/en/newsroom/news/tui-musement-strengthens-its-tours-activities-distribution-with-the-integration-of-750-multi-day-tours-across-30-countries-into-the-travelexchange-platform); [Travel Weekly UK](https://travelweekly.co.uk/news/tui-musement-expands-distribution-with-travelexchange-integration)
- Tiqets markets itself as "Instant tickets for remarkable experiences" — [Tiqets home](https://www.tiqets.com/en/)
- Third-party API quality grade: GetYourGuide API rated C+ (verified Sept 2026) — [Supergood API report card](https://supergood.ai/api-report-card/getyourguide)

### Inferences
- Viator and GYG both carry large review corpora (Viator via Tripadvisor; GYG `number_of_ratings` reached 7,000 on a single Paris product in an example), which matters for in-app conversion.
- Not all products are instant-confirm or mobile-ticket. GYG exposes a `mobile_voucher` flag, and the app should filter or label on it.

### Gaps
- Viator API content fields (photos, review endpoints, instant-confirmation flags, ticket formats) were not retrieved; docs.viator.com was blocked.
- Klook, Headout and Tiqets API content schemas.

## 7. Recent news 2024–2026 (API changes, commission changes, new programs)

### Takeaway
The biggest change for in-app booking: GetYourGuide removed card and PayPal checkout from its Partner API (deprecated Nov 2024, removed Apr 2025), so only MasterBill partners can check out natively. GYG continues to evolve the read API in 2026. Holibob launched an embeddable SDK in Sept 2026. TUI Musement expanded B2B API distribution (2024–2025). Viator ran a holiday commission boost and lengthened its travel-agent attribution window. No official Viator affiliate rate change was found.

### Cited Findings
- 2024-11-27: GYG deprecated PayPal and encrypted-credit-card payment in the Partner API, telling partners to redirect to GYG web. 2025-04-02: removed them; MasterBill is the only remaining method — [commit 1e54d0d](https://github.com/getyourguide/partner-api-spec/commit/1e54d0d1d59feb37a6eadf5d743f653fef888aaa); [commit 7b5c372](https://github.com/getyourguide/partner-api-spec/commit/7b5c372a75a49027ce9add92847029876937b020)
- GYG 2026 spec changes: popularity sorting (May 2026); tour option validity (May 2026); `self_guided` guide type and itineraries (Jun 2026); reviews limit 50 and min/max participants (Jul 2026); `booking_customer_accommodation` removed, then restored as deprecated (Aug–Oct 2026); `activity_type` and `partner_business_category` (Aug 2026); cursor-based availability-change feed for MasterBill partners and `likely_to_sell_out` (Sep 2026); `audio_guide` (Sep 30, 2026); Bulgarian (Oct 7, 2026); documented 400 for unsupported flags (Oct 9, 2026) — [GYG commit history](https://github.com/getyourguide/partner-api-spec/commits/main)
- 2026-01-13: GYG named its 2026 Premium (Bókun, Ventrata, Rezdy) and Advanced connectivity partners, chosen from 150+ integrations (supply side) — [GYG press](https://www.getyourguide.press/blog/getyourguide-announces-2026-premium-and-advanced-connectivity-partners)
- Viator: a 10% "reward upsize" for partners ran 2025-11-17 to 2026-01-31 — [Travelpayouts](https://www.travelpayouts.com/blog/viator-affiliate-program/). From 2025-11-03, Viator's travel-agent "Share with Client" links went from 30-day to 90-day attribution (third-party; travel-agent program, not standard affiliate) — [MainStreet Travel Agency](https://mainstreetagencytravel.com/news/how-to-become-a-viator-travel-agent-in-2026-and-earn-commission). No official 2025–2026 affiliate commission change was found
- Sept 2025: TUI Musement put 750+ multi-day tours on TravelExchange (30+ countries, API). TUI Musement became global T&A partner for Travel Counsellors via a merchant API in Phenix (2,100+ owners). Apr 2024: Travelotopos channel-manager integration — [TUI Group (TravelExchange)](https://www.tuigroup.com/en/newsroom/news/tui-musement-strengthens-its-tours-activities-distribution-with-the-integration-of-750-multi-day-tours-across-30-countries-into-the-travelexchange-platform); [TUI Group (Travel Counsellors)](https://www.tuigroup.com/en/newsroom/news/tui-musement-becomes-global-tours-and-activities-partner-for-travel-counsellors); [Travelotopos](https://travelotopos.com/2024/04/12/travelotopos-and-tui-musement-are-now-integrated/)
- About 2026-09-23: Holibob launched a free SDK (web components plus server proxy) to embed its 500,000+ product catalog in partner sites and apps — [Breaking Travel News](https://www.breakingtravelnews.com/news/article/holibob-launches-sdk-that-cuts-experience-booking-integration-from-six-mont/); [Travolution](https://www.travolution.com/en/article/holibob-launches-software-development-kit-to-cut-integration-times-to-days). Holibob previously raised a $12M Series A (date not captured) and acquired TourismSolved — [Holibob blog](https://www.holibob.tech/blog/holibob-secures-12m-series-a-investment-to-transform-curation-distribution-and-commerce-in-tours-and-activities?1b4b4d01_page=2); [Holibob blog](https://www.holibob.tech/blog/holibob-acquires-digital-marketing-platform-tourismsolved)
- TourRadar launched "TourRadar Rise", a $1M partner fund for affiliates/creators (date not captured) — [TourRadar Rise](https://www.tourradar.com/llp/rise)
- Klook affiliate network rate tables were updated for Apr–Jun 2026 — [Involve Asia](https://involve.asia/blog/klook-affiliate-program/)

### Inferences
- GYG's shift suggests marketplaces are pulling payment back to their own checkout for most partners and reserving native checkout for invoiced, high-trust partners. Plan for Viator's booking-affiliate tier possibly tightening similarly. This is speculation; no evidence found.

### Gaps
- Klook corporate news (e.g., IPO status) and Klook API program changes 2025–2026. Not researched due to search budget.
- Tripadvisor/Viator 2026 strategic changes affecting partners, and official Viator partner news posts. The partnerresources.viator.com/news page was not retrievable.
- Headout, Tiqets and Fever 2025–2026 partner program changes.
- Booking.com Attractions and Expedia Things-to-Do partner APIs as alternative "major marketplaces". Not researched.

## 8. Pros and cons for a startup consumer app (WhereTo Trips)

### Takeaway
Best fit for native in-app booking without taking on merchant-of-record risk: **Viator Full + Booking affiliate** (documented, about 8%, Viator handles payment, support and refunds via iframe). Add **GYG** for content and redirect (native checkout only with MasterBill). **Tiqets** can be added later for attraction tickets once volume exceeds about 200 orders a month. Consider **Musement** (documented affiliate API with Stripe payment flow) as a second native-booking source, and **Holibob** as a single-integration aggregator. TourRadar (multi-day), Fever (events), Klook (Asia) and Civitatis (Spanish-speaking markets) are mainly affiliate/redirect add-ons.

### Cited Findings
- **Viator.** Pros: documented native-booking tier with Viator as merchant of record handling cancellations and refunds; largest inventory (300k–400k+); instant Basic access; Merchant option later for higher margin — [Viator Levels of access](https://partnerresources.viator.com/travel-commerce/levels-of-access/); [Viator Technical Guide](https://partnerresources.viator.com/travel-commerce/technical-guide/); [Viator About](https://www.viator.com/support/about). Cons: Full + Booking needs approval and certification; payment is a web iframe/JS library, not a native SDK; Merchant needs a deposit and full MoR responsibilities — [Viator API Certification](https://partnerresources.viator.com/travel-commerce/certification/); [Viator Merchant](https://partnerresources.viator.com/travel-commerce/merchant/)
- **GetYourGuide.** Pros: well-documented open OpenAPI spec, sandbox, rich content (itineraries, reviews, mobile-voucher flag), active 2026 development, up to 8% commission — [GYG spec repo](https://github.com/getyourguide/partner-api-spec); [GYG creator support](https://partner.getyourguide.support/hc/en-us/articles/23082933149981). Cons: native checkout effectively closed since Apr 2025 unless MasterBill; READ tier historically required 300 bookings/month; rate limit 130/min with no-caching policy; third-party C+ grade — [commit 7b5c372](https://github.com/getyourguide/partner-api-spec/commit/7b5c372a75a49027ce9add92847029876937b020); [GYG support](https://partner.getyourguide.support/hc/en-us/articles/13981133907613-API-integration-and-requirements); [GYG wiki: Getting started](https://github.com/getyourguide/partner-api-spec/wiki/Getting-started); [Supergood](https://supergood.ai/api-report-card/getyourguide)
- **Klook.** Pros: category-varying commission (about 6.5% on activities in 2026 tables), widgets and feeds, API/white label for larger partners — [Involve Asia](https://involve.asia/blog/klook-affiliate-program/); [Klook Affiliate](https://affiliate.klook.com/home). Cons: no public reseller booking API docs (the public OpenAPI is supply-side); commission figures conflict (2–8%) — [APIs.io](https://apis.io/providers/klook/); [Lasso](https://getlasso.co/affiliate/klook/)
- **Tiqets.** Pros: attraction and museum ticket specialist with instant tickets, Content and Availability APIs available early, margin share for API partners — [Tiqets API Programme](https://www.tiqets.com/en/partner-program/api-program/); [Tiqets commission model](https://partners.tiqets.com/en_us/commission-model-BkgPnGdu3). Cons: Booking API needs about 200 orders a month; affiliate rates of about 6% (US network listing 2.4–4.8%) — [FlexOffers US](https://www.flexoffers.com/top-advertisers/tiqets-us-affiliate-program/)
- **Headout.** Pros: affiliate plus a distribution offering for partners — [Headout distribution](https://partner.headout.com/distribution/). Cons: no published rate, conflicting third-party rates (1–10%), API details unverified — [Headout Affiliates](https://partner.headout.com/); [AvidAffiliate](https://avidaffiliate.com/programs/headout-com/)
- **TUI Musement.** Pros: documented affiliate API with Musement as merchant of record via Stripe, plus a merchant option; public developer docs — [Musement Partner API](https://partner-api.musement.com/api/getting-started). Cons: commission opaque ("50% of Musement's income", secondhand); Europe/TUI-centric — [Travelpayouts Q&A](https://www.travelpayouts.com/blog/qa-from-the-musement-webinar/)
- **Civitatis.** Pros: transparent official 8–10% by volume; API available on request — [Civitatis affiliates](https://www.civitatis.com/en/affiliates/). Cons: no public API docs; requires a travel website or blog, so app-only eligibility is uncertain — [Civitatis affiliate FAQ](https://www.civitatis.com/en/affiliates/landing-frequently-asked-questions/)
- **TourRadar.** Pros: high ticket size (about $180 average commission per booking), 90-day attribution, wholesale model for a larger share — [TourRadar for Affiliates](https://www.tourradar.com/mlp/affiliates); [TourRadar Distribution API](https://www.tourradar.com/distribution-api). Cons: multi-day niche; commission paid only after the trip ends; even wholesale hands the traveler to a Partner Portal page to book — [TourRadar Rise: how it works](https://www.tourradar.com/rise/how-it-works)
- **Fever.** Pros: strong events and experiences content (e.g., Candlelight); Fever handles checkout and support — [Fever Affiliate Program](https://business.feverup.com/en/partner-programs/affiliate-program/). Cons: API only for selected high-volume partners; website requirement — [Fever Affiliate Program](https://business.feverup.com/en/partner-programs/affiliate-program/)
- **Holibob.** Pros: one GraphQL API and a new SDK for 500,000+ products from 45+ sources, built for embedding — [Breaking Travel News](https://www.breakingtravelnews.com/news/article/holibob-launches-sdk-that-cuts-experience-booking-integration-from-six-mont/). Cons: B2B intermediary layer (margin stacking likely); a 2026 review flags authentication, payments and production access as things to vet — [BM Magazine](https://bmmagazine.co.uk/business/best-b2b-travel-api-providers-for-tours-activities-experiences-in-2026/)

### Inferences
- Recommended phased path. Phase 1: Viator Basic/Full (search and content) plus redirect deep links, while applying for Full + Booking certification. Phase 2: native booking via Viator Full + Booking (WebView payment iframe); optionally add Musement's affiliate API for a second native source in Europe. Phase 3: once volume justifies it, evaluate Viator Merchant (markup over net) or GYG MasterBill / Tiqets Booking API, which require WhereTo to run payments, refunds and support and fund a deposit.
- Commission alone (about 8% of an average tour priced, say, $50–$150) yields roughly $4–$12 per booking. That figure is arithmetic, not sourced. It suggests tours are a retention and attach feature for flight and hotel bookers rather than a primary revenue line, unless WhereTo moves to the merchant/markup model.
- Because WhereTo already handles hotel and flight trips, attaching tours to an existing itinerary (destination plus dates known) should convert better than standalone discovery. This is inference from general travel-commerce practice, not sourced here.

### Gaps
- Real-world partner experiences (forums/Reddit) on Viator Full + Booking approval difficulty and timeline. Not researched due to search budget.
- Whether app-only partners without a website qualify for Civitatis, Fever and Klook affiliate programs.
- Side-by-side net-margin comparison of Viator Merchant versus affiliate. Not public.
