# Car Rental Booking APIs, White-Label Solutions, and Airport Transfers / Ground Transport for WhereTo Trips

Research date: 2026-10-11. Method note: direct page fetches to most primary domains (developers.booking.com, partner.expediagroup.com, ir.expediagroup.com, discovercars.com, mozio.com) were blocked by the environment proxy (HTTP 403 / DNS failure), and the shared web-search budget ran out near the end. Findings below rely on web-search result content (which quotes primary pages in many cases), not on full page reads. Where a figure comes from a third-party affiliate directory rather than the provider, that is flagged. "Zuzu" in the brief is interpreted as Zuzuche (租租车), the Chinese parent company of QEEQ.

## Q1. Business model per provider (affiliate redirect vs. full booking API with provider as merchant of record vs. white-label vs. net-rate/GDS)

### Takeaway
Only a handful of car providers offer a true "book natively in your app, provider is merchant of record (MoR)" API: Booking.com Demand API (cars booking still in beta), Expedia Rapid Car API (beta; MoR flagged per offer as "expedia" or "vendor"), Discover Cars B4B API (booking and pay endpoints rolling out since late 2025), Priceline Partner Network Cars API (volume-gated), and CarTrawler (enterprise-only, now owned by Expedia). Everything else open to a startup is affiliate redirect or widget (Discover Cars, Rentalcars/Booking.com via CJ/Awin, EconomyBookings, QEEQ, Kayak, Expedia affiliate, Turo, brand programs). GDS (Sabre/Amadeus/Travelport) is a net-rate/agency model that needs accreditation and makes the app the servicing agent.

### Cited Findings

**CarTrawler (now Expedia Group)**
- CarTrawler is a B2B car rental, ground transport and insurtech platform. Expedia announced an agreement to acquire it on May 20, 2026, and the deal was expected to close in H2 2026 — [Expedia Group IR](https://ir.expediagroup.com/news-and-events/news/news-details/2026/Expedia-Group-announces-agreement-to-acquire-CarTrawler-advancing-strategy-to-build-the-most-complete-B2B-travel-platform/default.aspx); [Yahoo Finance copy of release](https://finance.yahoo.com/markets/stocks/articles/expedia-group-announces-agreement-acquire-130000400.html)
- Expedia's partner blog reports the acquisition completed (dated September 1, 2026 in search-result content). Expedia's stated aim is to extend Rapid API beyond lodging to cars, flights, activities and trip protection — [Expedia Partner blog](https://partner.expediagroup.com/en-us/resources/blog/expedia-group-completes-cartrawler-acquisition); [PhocusWire](https://www.phocuswire.com/news/online/expedia-b2b-car-trawler-acquisition-ai-features)
- Model: white-label/"Connect Platform" embedded in partner sites and apps (for example Ryanair's website and app booking flow), plus an XML API for car hire and airport transfers — [Future Travel Experience, Dec 2025](https://www.futuretravelexperience.com/2025/12/ryanair-and-cartrawler-announce-new-car-rental-partnership-enhancing-the-airlines-ancillary-offering/); [software.travel](https://www.software.travel/suppliers/cartrawler/)
- Integration is through partner and supplier programs, not public self-service sign-up — [apis.io CarTrawler profile](https://apis.io/providers/cartrawler/)
- CarTrawler acts as the selling and servicing entity. Its booking-engine terms (Ryanair transport, flydubai) say that for UK customers paying with UK-issued cards, its subsidiary ETrawler UK Limited handles payment processing, voucher issuing and customer service, including cancellations, refunds and complaints. The terms describe four payment models that depend on location and supplier: some take a deposit to CarTrawler with the balance paid at the desk, others prepay most or all of the cost — [CarTrawler T&Cs (flydubai)](https://mobility.cartrawler.com/flydubai/en-GB/terms-and-conditions?clientId=526782); [Ryanair private transfers T&Cs](https://privatetransfers.ryanair.com/en-US/terms-and-conditions)
- CarTrawler white-labels customer service (multilingual, 24/7) for partners — [Genesys case study](https://www.genesys.com/customer-stories/cartrawler). It runs a follow-the-sun model with contact centres in Dublin and Cairo — [DigitalWell case study](https://digitalwell.com/blogs/client-success/cartrawler)

**Booking.com Demand API (cars) / Rentalcars.com / Booking.com affiliate**
- The stable car flow (v3.1) is "search, look and redirect": partners search and display rentals with static depot, supplier and score data, then send travellers to cars.booking.com to complete the reservation — [Booking.com Demand API, Car Rentals overview](https://developers.booking.com/demand/docs/cars/overview)
- v3.2 adds `/cars/availability` (beta) for real-time final pricing, insurance options and extras. Booking inside the partner's own app ("Search, look & book") requires the `/orders` collection, which is also beta. The search token expires after 90 minutes — [Demand API v3.2 changes](https://developers.booking.com/demand/docs/migration-guide/v3.2/changes); [Car rental tutorial v3.2](https://developers.booking.com/demand/docs/cars/3.2/cars-tutorial)
- Booking.com collects payment from the traveller, and car bookings fall under the v3.2-beta payment model — [Payments in the Demand API](https://developers.booking.com/demand/docs/payments/overview)
- Rentalcars Connect was Rentalcars.com's B2B white-label car platform for airlines. It launched in 2015 as a "fully serviced" B2B car rental booking platform — [Digital Commerce 360, 2015](https://www.digitalcommerce360.com/2015/06/01/rentalcars-connect-launches-b2b-car-rental-booking-platform/). From 2018 Rentalcars joined Booking.com as "BookingGo", with Rentalcars Connect merged into Booking.com's B2B operation — [ChinaTravelNews](https://www.chinatravelnews.com/article/119180/). A recent Booking.com job posting calls Rentalcars Connect the "B2B ground transportation arm of Booking.com" — [startup.jobs posting](https://startup.jobs/partnerships-manager-rentalcars-connect-bookingcom-236580)
- The consumer affiliate (redirect) program for Booking.com/Rentalcars cars runs through networks such as CJ and Awin — [Awin Booking.com page](https://www.awin.com/us/advertisers/partner/booking.com); [makeinfluence guide](https://www.makeinfluence.com/en/academy/booking-coms-affiliate-program-how-travel-creators-earn-commission)

**Priceline Partner Network (PPN) / Priceline Partner Solutions**
- Offers both white-label hosted pages (Priceline-operated, partner-branded) and deeper API integrations covering hotels, flights, cars and packages — [ad-hoc-news (third-party)](https://www.ad-hoc-news.de/boerse/news/ueberblick/the-priceline-partner-network-from-booking-holdings-inc-white-label/69669237); [supergood.ai API review (2026)](https://supergood.ai/api-report-card/priceline)
- PPN's car API reportedly uses Rentalcars content — [AltexSoft](https://www.altexsoft.com/blog/car-rental-apis-integrations-with-gdss-otas-and-tech-providers/)
- Priceline Partner Solutions' status page lists a "PPN Cars" component as operational (early September 2026), which confirms the product is live — [PPS status page](https://status.pricelinepartnersolutions.com/)
- A third-party affiliate program also exists (redirect) — [Travelpayouts blog](https://www.travelpayouts.com/blog/the-priceline-affiliate-program/)

**Expedia Partner Solutions — Rapid Car API**
- A full booking API: `GET /cars/availability` (up to 200 cars per request), plus price details and extras, payment registration, create booking, retrieve booking and cancel — [Expedia Developer Hub, Rapid Car API](https://developers.expediagroup.com/rapid/cars)
- Merchant of record is set per offer: sample rate data uses `merchant_of_record` values "expedia" or "vendor". The booking summary must say whether the rental is paid up front (collected by Expedia) or at the counter (collected by the vendor). Optional add-ons are always paid at the counter — [Rapid Car API standalone launch requirements (Korean-locale page)](https://developers.expediagroup.com/rapid/setup/launch-requirements/car-launch-reqs?locale=ko_KR)
- An Expedia affiliate (redirect) program also covers cars — [Lasso, Expedia affiliate](https://getlasso.co/affiliate/expedia/)

**Discover Cars**
- Primarily an affiliate (redirect/deeplink) program paying a share of profit — [Discover Cars affiliate page](https://www.discovercars.com/affiliate)
- Its "B4B" program for airlines, airports, OTAs and loyalty partners has two tiers: a co-branded widget that refers customers to Discover Cars for booking and payment, and a "full API" for booking and payment processing with full reporting — [Discover Cars B4B page](https://pages.discovercars.com/b4b)
- In December 2025 its B4B head said: "We are currently rolling out our new API, which brings both the booking and pay endpoints into the partner environment". He said partners get control over retail rates and dynamic bundling — [Future Travel Experience, Dec 2025](https://www.futuretravelexperience.com/2025/12/how-discovercars-com-is-revolutionising-car-rental-distribution-with-a-b4b-approach/)
- A separate, older affiliate API covers location, search, currency and payment-type lookups. It is granted on request, and its documentation is at api-partner.discovercars.com/help. The source article is about 6 years old — [Travelpayouts support](https://support.travelpayouts.com/hc/en-us/articles/360012655219-DiscoverCars-affiliate-program-API)

**EconomyBookings**
- An affiliate revenue share. Its official page says partners can cross-sell "with zero development effort using our widgets or API". No public API reference was found — [EconomyBookings affiliate page](https://www.economybookings.com/en//affiliate/)

**QEEQ (Zuzuche group)**
- An affiliate program plus a creator program ("Qreator") — [QEEQ affiliate page](https://www.qeeq.com/affiliate-program); [QEEQ Qreator program](https://www.qeeq.com/qreator-program)
- An older Travelpayouts post says partners can use links, widgets, banners and API — [Travelpayouts QEEQ](https://www.travelpayouts.com/blog/qeeq-affiliate-program/)
- QEEQ was formerly EasyRentCars. Its parent is Zuzuche (founded 2011, described as the largest outbound car rental platform in Greater China), and QEEQ is operated by Hong Kong-based Easy Tour International — [PR Newswire rebrand release](https://www.prnewswire.com/news-releases/car-rental-platform-easyrentcars-evolves-its-brand-to-qeeq-for-more-travel-services-and-daily-savings-301040762.html)

**Kayak / Momondo (Booking Holdings)**
- Meta-search affiliate. Commission is paid on clicks, bookings and ad revenue for flights, hotels, cars and packages, "depending on the relationship with the supply partner" — [KAYAK Affiliate Support](https://help.affiliates.kayak.com/article/800-how-does-the-commission-work)
- Booking Holdings describes KAYAK as meta-search that earns on CPA, CPC and advertising — [Booking Holdings 10-K FY2021](https://www.sec.gov/Archives/edgar/data/1075531/000107553122000008/bkng-20211231.htm)
- No Momondo-specific affiliate details were found.

**Hopper Technology Solutions (HTS)**
- A B2B white-label travel platform (it built the Capital One Travel portal, which includes rental cars) — [Fast Company 2024](https://www.fastcompany.com/91037421/hopper-most-innovative-companies-2024); [HTS news, Mar 2026](https://hts.hopper.com/news/a-new-milestone-in-our-partnership-with-capital-one)
- Hopper's own car inventory came partly from CarTrawler (partnership announced April 2021) — [CarTrawler news](https://corporate.cartrawler.com/en-gb/news-resources/news/new-partners/cartrawler-signs-car-rental-partnership-with-travel-booking-app-hopper/)

**GDS (Sabre / Amadeus / Travelport)**
- Sabre's car APIs aggregate supplier availability and rates through its Car Supplier API and return them to travel agencies — [Sabre Dev Studio, Car Shopping](https://developer.sabre.com/product-collection/cars/v1/help-documentation/car-shopping-get-vehicle-availability-api.html)
- Car-company agency commission programs require agency identifiers. Hertz pays 5% of commissionable revenue to ARC, IATA, Travel Sellers, TRUE, TSI, TIDS or Hertz-booking-number holders — [Hertz Travel Agency Commission Policy](https://www.hertz.com/rentacar/misc/index.jsp?targetPage=TA_commissionpolicy.jsp). National pays 5% to ARC/IATA/TRUE/CLIA agencies on certain leisure rentals — [National travel agent page](https://www.nationalcar.com/en/reserve/travel-agent.html). Budget pays 5% of base rate on non-prepaid rates only — [Budget travel agent program](https://www.budget.com/en/programs/travel-agent)
- Amadeus fully decommissioned its Self-Service API portal on July 17, 2026; it had included the Cars & Transfers (transfer search/booking) APIs. Amadeus Enterprise is unaffected but requires a commercial agreement — [PhocusWire](https://www.phocuswire.com/amadeus-shut-down-self-service-apis-portal-developers); [Ignav migration guide](https://ignav.com/docs/amadeus-self-service-shutdown); [Amadeus Cars & Transfers guide](https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/resources/cars-transfers/)

**Turo (peer-to-peer)**
- Affiliate only (sign-up, listing and trip bounties) through FlexOffers, Impact and other networks — [FlexOffers Turo](https://www.flexoffers.com/affiliate-programs/turo-affiliate-program/)
- CarSync reported that Turo removed external API access as of April 30, 2023. Nothing found indicates it has been restored — [CarSync on Medium (2023)](https://carsyncio.medium.com)

**Getaround**
- Getaround wound down US operations (including HyreCar) starting February 2025, citing a lack of liquidity. The European business continued — [TechCrunch, Feb 2025](https://techcrunch.com/2025/02/12/getaround-abruptly-shuts-down-us-car-sharing-operations/); [Nasdaq press release](https://www.nasdaq.com/press-release/getaround-inc-announces-wind-down-us-operations-2025-02-11)
- Its historical Owner API is offline ("api.getaround.com is offline") — [API Evangelist profile](https://github.com/api-evangelist/getaround)

**Other car aggregators (affiliate)**
- Localrent: 50% of Localrent's revenue per order (via Travelpayouts) — [Travelpayouts Localrent offer](https://www.travelpayouts.com/en/offers/localrent-affiliate-program/)
- GetRentacar: 10% of order price, paid only for completed rentals — [Travelpayouts GetRentacar offer](https://www.travelpayouts.com/en/offers/getrentacar-affiliate-program/)
- AutoEurope (EU/UK): 4.4–8% — [Travelpayouts car rental program list](https://www.travelpayouts.com/blog/car-rental-affiliate-programs/)
- Direct brand affiliate programs (redirect): Hertz (about 3%, CJ) — [Lasso Hertz](https://getlasso.co/affiliate/hertz/). Budget ("up to 4%", via Partnerize/Avis network) — [Budget affiliates page](https://www.budget.com/en/programs/affiliates). Enterprise (about 1–2.5%, directory data) — [UpPromote Enterprise](https://uppromote.com/affiliate-directory/enterprise/)

**Ground transport: Mozio**
- Offers four integration options: API (real-time availability, pricing and booking in the partner's own platform), a fully branded white-label platform, a widget code snippet, and a travel agent booking tool — [Mozio Business Partners](http://www.mozio.com/business-partners)
- Partners can "set their own commissions", with no sign-up fees or monthly costs — [Mozio travel agents page](http://www.mozio.com/travel-agents)

**Ground transport: Hotelbeds Transfers**
- A B2B wholesale API with a dedicated Transfers Booking API (confirm rate keys under one booking reference) — [Hotelbeds Developer, Transfers booking request](https://developer.hotelbeds.com/documentation/transfers/booking-api/booking-post-booking/booking-request/)
- Hotelbeds documents Net (partner adds markup) and Commissionable pricing models for hotels. Whether transfers follow the same models is not confirmed — [Hotelbeds pricing models (hotels)](https://developer.hotelbeds.com/documentation/hotels/knowledge-base/pricing-models/)
- Terms are contract-based and negotiated — [ZentrumHub](https://www.zentrumhub.com/blog/hotelbeds-supplier/)

**Ground transport: Welcome Pickups**
- An affiliate program (hosted booking widget or affiliate link) plus an API "mainly for brands" that takes full control of booking flows. The partner page links to public API documentation — [Welcome Pickups API](https://partner.welcomepickups.com/travel-api/); [aff.travel listing](https://aff.travel/welcomepickups.html)

**Ground transport: Suntransfers**
- A CJ affiliate program (CJ ID 4727627) — [Suntransfers affiliate page](https://www.suntransfers.com/affiliate-program)
- An API for travel partners, OTAs and B2B clients — [CMAC Group](https://www.cmacgroup.com/partnerships/suntransfers). It was reportedly launched to the trade at the end of 2021 — [LeadIQ](https://leadiq.com/c/suntransfers/5a1d9b3a2300005c008a9272)

**Ground transport: others**
- Jayride (CJ affiliate) — [Jayride affiliates](https://www.jayride.com/jayride-affiliates)
- Kiwitaxi (agency program: 6–15% of transfer price) — [Kiwitaxi travel agency program](https://kiwitaxi.com/en/travelagency)
- HolidayTaxis and GetTransfer (affiliate, directory data) — [affreborn directory](https://affreborn.com/airport-transfer-affiliate-programs/)
- Uber offers a ride-request button, deep links, or a full REST API. The REST endpoint requires Uber approval via business development, and no commission program was found — [Uber Ride Requests intro](https://developer.uber.com/docs/riders/ride-requests/introduction); [Uber deep links](https://developer.uber.com/docs/deep-linking)

### Inferences
- For a WhereTo Trips-style "in-app, provider is MoR" experience mirroring LiteAPI for hotels, the realistic candidates are Booking.com Demand API cars (if WhereTo can become a Managed Affiliate Partner and get beta approval), Expedia Rapid Car (beta), and Discover Cars B4B API. CarTrawler and PPN Cars are likely out of reach at launch because of volume and enterprise gating (see Q5).
- Expedia owning CarTrawler suggests CarTrawler's supply and ground-transport tech will eventually surface through Rapid. A Rapid integration may become the long-term single pipe for cars and transfers, but this is inferred from Expedia's stated strategy, not a documented product roadmap.
- GDS is the wrong model for a startup: it requires accreditation (ARC/IATA/TIDS), commission is about 5% on non-prepaid rates, and the app becomes the agent of record responsible for servicing.

### Gaps
- No primary source confirms whether CarTrawler is MoR in every market, or how its commercial terms change under Expedia ownership.
- Booking.com's documentation (as surfaced) does not state whether pay-at-pickup car offers are bookable through the Orders API, or whether it is pay-now only.
- PPN Cars MoR and payment flow (Priceline-collected vs. pay at counter) is not documented in any source I could reach.
- The English version of Expedia's car launch requirements page could not be reached. The MoR detail comes from the Korean-locale page via search snippets.
- Travelport car API details were not found.
- No information was found on whether Nuitée/LiteAPI (WhereTo's existing hotel provider) offers or plans car rentals. This is worth asking LiteAPI directly.

## Q2. Native in-app booking via API: who takes payment (pay-now vs. pay-at-counter), amendments, cancellations, customer service

### Takeaway
Native booking with the provider handling payment and servicing is documented for Booking.com (Booking.com collects payment; default free cancellation until 48 hours before pick-up; beta), Expedia Rapid Car (Expedia collects pay-now, vendor collects pay-at-counter), CarTrawler (CarTrawler/ETrawler processes payment and handles cancellations, refunds and complaints) and Discover Cars B4B (booking and pay endpoints, rolling out). Affiliate redirect programs put payment and service entirely on the provider, but the user leaves the app flow.

### Cited Findings
- **Booking.com cars:** "To process bookings directly in your application (Search, look & book flow) you must use the /orders API collection (currently in Beta)" — [Car rental tutorial v3.2](https://developers.booking.com/demand/docs/cars/3.2/cars-tutorial)
- **Booking.com cars:** Booking.com collects payment from the traveller, and car bookings fall under the v3.2-beta payment model — [Demand API Payments overview](https://developers.booking.com/demand/docs/payments/overview)
- **Booking.com cars:** Default free cancellation until 48 hours before pick-up. Cancelling within 48 hours (including at the counter) is refunded minus the cost of 3 rental days. Policy types are free cancellation and non-refundable. Standalone car insurance has no cancellation policy of its own. Cancellation is done via the Orders API — [Demand API cancellation policies](https://developers.booking.com/demand/docs/orders-api/cancellation-policies); [Cancel reservations and insurance policies](https://developers.booking.com/demand/docs/orders-api/cancel-order)
- **Booking.com cars:** The car rental API collection is not available in the sandbox. Beta booking access requires contacting your Booking.com Account Manager, plus approval and a partner agreement — [Demand API sandbox](https://developers.booking.com/demand/docs/getting-started/sandbox); [Orders FAQs](https://developers.booking.com/demand/docs/orders-api/orders-faqs)
- **Booking.com cars:** Authentication uses a bearer token plus an `X-Affiliate-Id` header. Depot and supplier static data must be refreshed daily — [Demand API car rentals reference](https://developers.booking.com/demand/docs/open-api/demand-api/cars); [Car rentals migration guide](https://developers.booking.com/demand/docs/cars/cars-migration-guide)
- **Expedia Rapid Car:** Endpoints exist for payment registration, booking, retrieval and cancellation. Expedia warns that "schema details and functionality are still in active development and may change" — [Expedia Developer Hub, Rapid Car API](https://developers.expediagroup.com/rapid/cars)
- **Expedia Rapid Car:** Pay up front is collected by Expedia (`merchant_of_record: expedia`); pay at counter is collected by the vendor (`merchant_of_record: vendor`). Add-ons are always paid at the counter. The booking summary must disclose payment timing, rental company, vehicle class, transmission, mileage and fuel policy — [Rapid Car launch requirements (ko_KR)](https://developers.expediagroup.com/rapid/setup/launch-requirements/car-launch-reqs?locale=ko_KR)
- **Expedia Rapid (lodging analogy, not car-specific):** When a partner sends traveller cards to Rapid with Rapid as MoR, SCA/PSD2 rules can apply — [Rapid SCA and PSD2 compliance](https://developers.expediagroup.com/docs/rapid/lodging/booking/psd2-regulation)
- **CarTrawler:** Under its booking-engine terms (UK cards), ETrawler UK Limited performs payment processing, voucher issuing and customer service, including cancellations, refunds and complaints. Four payment models apply by location and supplier (for example deposit to CarTrawler plus balance at the desk, or full prepayment) — [CarTrawler T&Cs (flydubai)](https://mobility.cartrawler.com/flydubai/en-GB/terms-and-conditions?clientId=526782)
- **CarTrawler:** Ryanair's help centre routes car hire pre-rental queries to Ryanaircarhiresupport@cartrawler.com, showing CarTrawler as the servicing party behind the airline brand — [Ryanair Help, Transport](https://help.ryanair.com/hc/en-gb/sections/12502261381009-Transport)
- **CarTrawler:** Trustpilot reviews of Ryanair Car Hire (powered by CarTrawler) describe prepaid money not being refunded after desks refused cars over card or deposit issues (anecdotal) — [Trustpilot, Ryanair Car Hire](https://www.trustpilot.com/review/car-hire.ryanair.com)
- **Discover Cars:** The full B4B API allows "booking and payment processing with full reporting", while the co-branded widget refers customers to Discover Cars for booking and payment — [Discover Cars B4B](https://pages.discovercars.com/b4b)
- **Discover Cars:** The booking and pay endpoints were still "rolling out" as of December 2025 — [Future Travel Experience](https://www.futuretravelexperience.com/2025/12/how-discovercars-com-is-revolutionising-car-rental-distribution-with-a-b4b-approach/)
- **PPN:** Partners can use Priceline-operated hosted pages that look like their brand, or deeper API integrations that keep traffic on the partner domain (third-party description) — [ad-hoc-news](https://www.ad-hoc-news.de/boerse/news/ueberblick/the-priceline-partner-network-from-booking-holdings-inc-white-label/69669237)
- **Affiliate programs (Rentalcars/Booking.com cars):** A returned or cancelled rental is reversed "in almost every case" — [Lasso, Booking.com Car Rentals](https://getlasso.co/affiliate/booking-com-car-rentals/). Rentalcars commission is confirmed after the customer returns the car — [Travelpayouts Rentalcars guide](https://www.travelpayouts.com/blog/earn-on-car-rentals-with-rentalcars/)
- **Mozio:** Its API supports real-time availability, pricing and booking inside the partner's platform, and its white-label is "fully branded" — [Mozio Business Partners](http://www.mozio.com/business-partners)
- **Welcome Pickups:** Its API lets brands take "full control of booking flows and customer experience" — [Welcome Pickups API](https://partner.welcomepickups.com/travel-api/)
- **Hotelbeds Transfers:** Booking confirms rate keys under a Hotelbeds booking reference — [Hotelbeds Transfers booking request](https://developer.hotelbeds.com/documentation/transfers/booking-api/booking-post-booking/booking-request/)

### Inferences
- Booking.com and Expedia both support a pay-now, provider-collects model, which is the closest analog to WhereTo's LiteAPI hotel setup. With Expedia, pay-at-counter offers make the vendor the MoR, so WhereTo would earn commission without touching payment. UX must clearly disclose "pay at counter" items.
- Because add-ons (child seats, extra drivers) are paid at the counter under Rapid, and CarTrawler uses deposit-plus-balance models, in-app price displays need careful "due now vs. due at pickup" breakdowns to avoid the counter disputes seen in CarTrawler/Ryanair reviews.
- The most-documented servicing commitment is CarTrawler's (it handles cancellations, refunds and complaints). For Booking.com and Expedia, servicing responsibility for the car traveller is inferred from MoR status; I did not find explicit car customer-service documentation for either.
- Hotelbeds Transfers on a net-rate model would likely make WhereTo the seller (and payment taker). This is inferred from Hotelbeds' general net model, not confirmed for transfers.

### Gaps
- Amendments (date or vehicle changes) via API: no source found for any provider. Booking.com and Expedia documentation surfaced only cancel endpoints. Assume cancel-and-rebook unless confirmed.
- Who provides 24/7 traveller support for Booking.com Demand API car bookings and Rapid car bookings is not explicitly documented in what I could access.
- Mozio's and Welcome Pickups' MoR and payment handling for API partners was not found.

## Q3. Inventory: suppliers/brands, locations, countries; US coverage (Hertz, Enterprise, Avis, Budget, Sixt etc.)

### Takeaway
CarTrawler (1,700+ providers, 50,000+ locations), Discover Cars (1,000+ suppliers, 50,000+ locations, 164 countries), QEEQ (claims 100,000+ locations in 200 countries) and Expedia Rapid Car (110+ brands, 190 countries, 45,000+ vendor locations) all claim global coverage with the major brands. US major-brand coverage is confirmed by source for Discover Cars (Hertz, Alamo, National, Sixt) and Expedia (brand list not itemized). Enterprise-family and Avis/Budget presence on each aggregator is not documented provider-by-provider in my sources.

### Cited Findings
- **CarTrawler:** Through its Connect Platform customers access car rental from more than 1,700 providers across more than 50,000 locations — [TravelDailyNews, KM Malta Airlines](https://www.traveldailynews.com/aviation/km-malta-airlines-adds-car-rental-booking-through-partnership-with-cartrawler/)
- **CarTrawler:** Expedia's announcement describes "500+ mobility suppliers" serving more than 300 travel brands, including more than 70 airlines. This conflicts with the 1,700+ figure, likely a different counting basis (suppliers vs. providers or franchises) — [Expedia Group IR](https://ir.expediagroup.com/news-and-events/news/news-details/2026/Expedia-Group-announces-agreement-to-acquire-CarTrawler-advancing-strategy-to-build-the-most-complete-B2B-travel-platform/default.aspx)
- **Expedia Rapid Car:** More than 110 car rental brands across 190 countries and territories, and more than 45,000 pick-up vendors across 25,000 airport and non-airport locations — [Expedia Partner, Rapid Car API (US)](https://partner.expediagroup.com/en-us/landing-pages/rapid-car-api-for-scalable-car-rental-bookings)
- **Expedia Rapid Car:** The May 2025 release cited 110+ brands, 190 countries and "exclusives from 43 providers" — [Business Wire, May 2025](https://secure.businesswire.com/news/home/20250514047232/en/EXPEDIA-GROUP-EXPANDS-B2B-PLATFORM-AND-LAUNCHES-GENAI-PARTNERSHIPS-TO-ENHANCE-TRAVEL-DISCOVERY)
- **Expedia Rapid Car:** One developer page cites 47,000 vendors in more than 190 countries — [Expedia Developer Hub, Rapid Car](https://developers.expediagroup.com/rapid/cars)
- **Discover Cars:** 1,000+ supply partners, 50,000+ rental locations, 164 countries (Dec 2025) — [Future Travel Experience](https://www.futuretravelexperience.com/2025/12/how-discovercars-com-is-revolutionising-car-rental-distribution-with-a-b4b-approach/); [Routes Online profile](https://www.routesonline.com/suppliers/21330/discovercars/about/)
- **Discover Cars:** Coverage includes Hertz, Alamo, Europcar, National and SIXT plus local operators; its supplier page shows Hertz with 2,747 locations — [Discover Cars supplier list](https://www.discovercars.com/partners)
- **Booking.com / PPN:** PPN car API content is "complemented by Rentalcars content" and targets more than 180 countries (older third-party source) — [AltexSoft](https://www.altexsoft.com/blog/car-rental-apis-integrations-with-gdss-otas-and-tech-providers/)
- **Booking.com / PPN:** The Booking.com Demand API exposes `/cars/suppliers`, `/cars/depots` and depot review scores — [Demand API v3.2 changes](https://developers.booking.com/demand/docs/migration-guide/v3.2/changes)
- **PPN:** A 2026 third-party review says PPN car inventory comes from "major rental-car suppliers" — [supergood.ai](https://supergood.ai/api-report-card/priceline)
- **QEEQ/Zuzuche:** More than 100,000 locations in 200 countries (self-reported) — [QEEQ global suppliers](https://www.qeeq.com/car-rental-service/global-suppliers)
- **Mozio:** 3,000+ vetted providers; 3,500+ airports in 180+ countries — [Mozio travel agents page](http://www.mozio.com/travel-agents); [ITIJ, GoNexus partnership](https://www.itij.com/latest/news/mozio-and-gonexus-group-announce-strategic-partnership)
- **Mozio:** US coverage is described on its coverage page — [Mozio coverage](https://www.mozio.com/coverage) (page not fetched; contents unverified)
- **Hotelbeds Transfers:** Integrators cite 700+ destinations in 200+ countries — [WBE Hotelbeds integration](https://www.wbe.travel/partner/hotelbeds/)
- **Welcome Pickups:** Its API gives access to drivers in 350+ cities (company page, undated) — [Welcome Pickups API](https://partner.welcomepickups.com/travel-api/)
- **Welcome Pickups:** The Airbnb integration covers 125+ cities across Europe, Asia and Latin America, and the US is not yet included (April 2026) — [Dataconomy, Apr 2026](https://dataconomy.com/2026/04/01/airbnb-expands-airport-pickup-service-to-125-cities/)
- **Welcome Pickups:** AEGEAN says it operates in 43 destinations — [AEGEAN partners page](https://en.about.aegeanair.com/company/partners/non-airlines-partners/welcome-pickups/)
- **Getaround:** No longer available in the US after the 2025 wind-down — [TechCrunch](https://techcrunch.com/2025/02/12/getaround-abruptly-shuts-down-us-car-sharing-operations/)

### Inferences
- For US coverage, which matters most to WhereTo, all four leading aggregators (Booking.com/Rentalcars, Expedia, Discover Cars, CarTrawler) almost certainly carry Hertz/Dollar/Thrifty, Avis/Budget and Sixt. Enterprise/National/Alamo coverage should be verified per provider: Discover Cars explicitly lists Alamo and National. This is inferred from general market knowledge plus partial source evidence and should be confirmed in contracts.
- Welcome Pickups is weak for a US-first app (no US in the Airbnb rollout). Mozio is the stronger US-capable transfer aggregator, given its airport count and its JetBlue/CheapOair clients (see Q6).

### Gaps
- No provider-specific list confirming Enterprise Holdings brands on Booking.com Cars, Expedia Rapid Car or CarTrawler was found.
- Booking.com Cars' own total location and supplier count was not retrieved (the search budget ran out before this query).
- Hotelbeds' official transfer destination count was not found; integrator numbers vary (9,000+ to 20,000+ routes).

## Q4. Commission / revenue share rates and payout timing

### Takeaway
Profit-share programs (Discover Cars 70% of profit plus 30% of Full Coverage, about $20 per booking on average; EconomyBookings 60% revenue share; Localrent 50% of revenue) out-earn percent-of-sale programs (Booking.com/Rentalcars about 6% via CJ/Awin; QEEQ 5–8%; Expedia affiliate about 2%; Hertz about 3%; GDS agency 5%). Most programs pay monthly and only after the rental is completed. API and B2B revenue shares (CarTrawler, Booking.com Demand API, Expedia Rapid Car, PPN) are negotiated and not public.

### Cited Findings
- **Discover Cars:** "You earn a 70% commission from our car rental profit and a 30% commission on Full Coverage... Your commission is a percentage of our profit, not of the price the customer pays." The page cites about $20 per booking on average and a 365-day cookie — [Discover Cars affiliate](https://www.discovercars.com/affiliate)
- **Discover Cars:** The 70% figure is confirmed on its own blog — [Discover Cars blog](https://www.discovercars.com/blog/travel-affiliate-programs-101). An older Travelpayouts list shows 56% revenue share plus 24% per FullCoverage, so rates have risen over time — [Travelpayouts list](https://www.travelpayouts.com/blog/car-rental-affiliate-programs/)
- **Discover Cars:** Directories report monthly payouts (one says processed on the 10th of the following month) and conflicting minimums ($100 vs. $200). Unverified — [Lasso Discover Cars](https://getlasso.co/affiliate/discover-cars/); [UpPromote Discover Cars](https://uppromote.com/affiliate-directory/discover-cars/)
- **Discover Cars:** Available via Admitad, Travelpayouts, ShareASale and CJ (older source) — [Indoleads](https://indoleads.com/blog/discover-car-hire-affiliate-program-pays-up-to-70/)
- **Booking.com / Rentalcars affiliate:** Awin advertises 3.8%–6% on cars — [Awin Booking.com](https://www.awin.com/us/advertisers/partner/booking.com). CJ lists 6% on completed car rentals — [makeinfluence](https://www.makeinfluence.com/en/academy/booking-coms-affiliate-program-how-travel-creators-earn-commission)
- **Booking.com / Rentalcars affiliate:** Rentalcars US is listed at 6% with a 30-day cookie — [Lasso Rentalcars US](https://getlasso.co/affiliate/rentalcars-com-us/). Travelpayouts: 6% of each completed booking excluding extras, confirmed after car return — [Travelpayouts Rentalcars](https://www.travelpayouts.com/blog/earn-on-car-rentals-with-rentalcars/)
- **Booking.com connected trips:** Booking.com's affiliate support centre lists "Car Rental: 40% revenue share" (a share of Booking.com's commission, not of the sale) — [Booking.com Affiliate Support, Commission and Payments](https://affiliates.support.booking.com/kb/s/article/Commission-and-Payments)
- **EconomyBookings:** "60% revenue share on every car rental booking", no caps or minimums, 30-day cookie — [EconomyBookings affiliate](https://www.economybookings.com/en//affiliate/)
- **EconomyBookings:** Conflicting listings: 55% via CJ — [LinkClicky](https://linkclicky.com/affiliate-program/economybookings-com/); 0–25% on Webgains — [Webgains](https://www.webgains.com/public/en/directory/economy-bookings-affiliate-programme/)
- **QEEQ:** Up to 8% of total order amount, 30-day cookie — [QEEQ affiliate](https://www.qeeq.com/affiliate-program). Qreator: 5% base rising to 8%, plus a $30 referral bonus — [QEEQ Qreator](https://www.qeeq.com/qreator-program). Admitad: 4.22% per paid order — [AffNext/Admitad QEEQ WW](https://www.affnext.com/offers/qeeq-ww)
- **Priceline affiliate:** Directory listings show about 3% for retail rental car on CJ and 3–7% ranges overall (dated, third-party) — [LinkMyDeals Priceline](https://linkmydeals.com/affiliate-programs/info/priceline.com/); [AffiliatePrograms.com PPN](https://affiliateprograms.com/p/priceline-partner-network/); [Travelpayouts Priceline](https://www.travelpayouts.com/blog/the-priceline-affiliate-program/)
- **Expedia affiliate:** About 2% on car rentals with a 7-day cookie, paid monthly for completed trips — [Lasso Expedia](https://getlasso.co/affiliate/expedia/). Ecomobi lists a 1.2% car default rate — [Ecomobi](https://ecomobi.com/maximize-revenue-with-expedia-affiliate-with-4-8-commissions/)
- **Kayak:** Commission on clicks, bookings and ad revenue — [KAYAK affiliate help](https://help.affiliates.kayak.com/article/800-how-does-the-commission-work)
- **Kayak:** Third-party figures conflict: "50% commission" of revenue — [ODI Productions](https://odiproductions.com/blog/kayak-affiliate-program); per-click-out figures in Canada — [Lasso Kayak CA](https://getlasso.co/affiliate/kayak-ca/)
- **Localrent:** 50% of Localrent revenue per order; about €21 average per reservation — [Travelpayouts Localrent](https://www.travelpayouts.com/en/offers/localrent-affiliate-program/); [Localrent case study](https://www.travelpayouts.com/brands/blog/localrent-com-case-study/)
- **GetRentacar:** 10% of order price for completed rentals — [Travelpayouts GetRentacar](https://www.travelpayouts.com/en/offers/getrentacar-affiliate-program/)
- **AutoEurope:** 4.4%–8% — [Travelpayouts list](https://www.travelpayouts.com/blog/car-rental-affiliate-programs/)
- **Brand programs:** Hertz about 3% (CJ, 1-day cookie) — [Lasso Hertz](https://getlasso.co/affiliate/hertz/). Budget up to 4% — [Budget affiliates](https://www.budget.com/en/programs/affiliates). Enterprise about 1–2.5% — [UpPromote Enterprise](https://uppromote.com/affiliate-directory/enterprise/)
- **Turo:** $6 per sign-up, $12 per completed listing or trip, $36 per rented-out vehicle, 30-day cookie (FlexOffers, updated March 2026) — [FlexOffers Turo](https://www.flexoffers.com/affiliate-programs/turo-affiliate-program/). Canada: 3.2% of new-customer bookings — [FlexOffers Turo Canada](https://www.flexoffers.com/affiliate-programs/turo-canada-affiliate-program/)
- **GDS / agency:** 5% (Hertz, National, Budget), with Budget paying on non-prepaid rates only — [Hertz TA policy](https://www.hertz.com/rentacar/misc/index.jsp?targetPage=TA_commissionpolicy.jsp); [National](https://www.nationalcar.com/en/reserve/travel-agent.html); [Budget TA](https://www.budget.com/en/programs/travel-agent)
- **CarTrawler:** No public revenue-share figures found. Its platform is positioned as an ancillary revenue engine for airlines — [CarTrawler corporate](https://corporate.cartrawler.com/en-gb/)
- **CarTrawler:** 2024 revenue was €172.3M (+1.3%) with profit after tax of €6.6M — [Irish Times, Aug 2025](https://www.irishtimes.com/business/2025/08/14/cartrawler-pays-9m-dividend-to-parent-as-booking-volumes-continue-to-rise/)
- **Mozio:** Partners set their own commission or markup — [Mozio travel agents](http://www.mozio.com/travel-agents). An older figure gives 5–10% per booking — [AltexSoft transfers article](https://www.altexsoft.com/blog/how-to-integrate-airport-transfer-and-shuttle-functionality-into-hotel-and-flight-booking-systems/)
- **Welcome Pickups:** 8% on operated airport transfers and 9% on sightseeing rides, counted once rides are operated — [aff.travel](https://aff.travel/welcomepickups.html). Up to 9% with a 45-day cookie and monthly payouts — [affiliates-directory](https://www.affiliates-directory.com/websites/welcome-pickups). An older Tapfiliate page shows €5 fixed — [Welcome Tapfiliate](https://welcome.tapfiliate.com/). Welcome's blog mentions fixed-rate commissions (conflicting) — [Welcome blog](https://www.welcomepickups.com/blog/affliates/consideration/generate-extra-income-for-travel-website-with-welcome/)
- **Suntransfers:** 4% default per completed booking, 30-day cookie (Awin) — [Awin Suntransfers](https://ui.awin.com/merchant-profile/111238). 3.2% (FlexOffers) — [FlexOffers Suntransfers](https://www.flexoffers.com/affiliate-programs/suntransfers-com-affiliate-program/). Rates are adjusted by performance — [Suntransfers affiliate](https://www.suntransfers.com/affiliate-program)
- **Kiwitaxi:** Agencies typically earn 6–15% of transfer price, and the program says partners "always receive 50% of the total income" — [Kiwitaxi agencies](https://kiwitaxi.com/en/travelagency)
- **Jayride and HolidayTaxis:** Jayride 8% or 20% depending on source; HolidayTaxis 3.4–6% with a 90-day cookie (directory data, dated) — [affreborn](https://affreborn.com/airport-transfer-affiliate-programs/); [Jayride affiliates](https://www.jayride.com/jayride-affiliates)
- **Hotelbeds:** Contract-based; third-party claims of 5–15% are unofficial — [ZentrumHub](https://www.zentrumhub.com/blog/hotelbeds-supplier/)

### Inferences
- On a typical US week-long rental (roughly $350–$500 gross), 6% of sale equals about $21–$30, comparable to Discover Cars' advertised average of about $20 per booking. "70% of profit" is not obviously better on a per-booking basis; the 365-day cookie and Full Coverage add-on share are its real advantages. (This is arithmetic on cited rates, not a sourced comparison.)
- Nearly every program pays only after the rental is completed, and cancellations or returns are reversed. WhereTo should model a revenue lag of 30–60+ days after drop-off.
- For API/MoR deals (Booking.com Demand, Expedia Rapid Car, Discover Cars B4B), commission is negotiated. Discover Cars' B4B claim of partner "control over retail rates" implies a net-rate-plus-markup option may exist (inferred).

### Gaps
- No public commission data for CarTrawler, Booking.com Demand API cars (vs. affiliate), Expedia Rapid Car, PPN Cars API, Hotelbeds Transfers or Mozio API.
- Payout minimums and timing for EconomyBookings, QEEQ and Mozio were not found.

## Q5. Onboarding: approval criteria, traffic/volume minimums, contracts, fees, timeline; enterprise-only?

### Takeaway
Affiliate programs (Discover Cars, Rentalcars/Booking.com via CJ/Awin, EconomyBookings, QEEQ, Turo, Suntransfers, Welcome Pickups, Kiwitaxi) are open to apps with light approval. Booking.com Demand API requires Managed Affiliate Partner status, a signed contract and separate beta approval for car booking. PPN requires about 5 bookings per day. Expedia Rapid Car is beta with selected partners (full launch dates conflict: early 2026 vs. early 2027). CarTrawler is enterprise and partner-led, with no self-service. Discover Cars' older affiliate API needed about 50,000 monthly visitors. GDS requires accreditation.

### Cited Findings
- **Booking.com Demand API:** Prerequisites are registration as a Booking.com Managed Affiliate Partner, Partner Centre access provided by the Account Manager after the contract is signed, then an API key and X-Affiliate-Id — [Demand API prerequisites](https://developers.booking.com/demand/docs/getting-started/prerequisites)
- **Booking.com Demand API:** A third-party guide says direct booking via Orders needs separate "Search, Look & Book" approval (sound business case and contractual permissions), and that AI and automated assistant use cases need written approval (unverified against Booking.com terms) — [Vorp Labs](https://vorplabs.com/agent-tools/booking-demand-api)
- **Booking.com Demand API:** Car booking beta requires contacting the Account Manager, and cars are not available in the sandbox — [Demand API sandbox](https://developers.booking.com/demand/docs/getting-started/sandbox); [Orders FAQs](https://developers.booking.com/demand/docs/orders-api/orders-faqs)
- **Expedia Rapid Car:** In beta with selected partners. Full launch is stated as "early 2027" on the US page, "early 2026" on the Australian page, and "2026" on a UK page (the conflict is unresolved) — [Expedia US landing](https://partner.expediagroup.com/en-us/landing-pages/rapid-car-api-for-scalable-car-rental-bookings); [Expedia AU landing](https://partner.expediagroup.com/en-au/landing-pages/rapid-car-api-for-scalable-car-rental-bookings); [Expedia UK Rapid page](https://partner.expediagroup.com/en-gb/solutions/build-your-travel-experience/rapid-api)
- **Expedia Rapid Car:** It was rolled out as a pilot in May 2025 — [Business Wire](https://secure.businesswire.com/news/home/20250514047232/en/EXPEDIA-GROUP-EXPANDS-B2B-PLATFORM-AND-LAUNCHES-GENAI-PARTNERSHIPS-TO-ENHANCE-TRAVEL-DISCOVERY)
- **PPN:** Only partners generating at least five bookings per day are considered — [AltexSoft](https://www.altexsoft.com/blog/car-rental-apis-integrations-with-gdss-otas-and-tech-providers/); [Travelpayouts Priceline](https://www.travelpayouts.com/blog/the-priceline-affiliate-program/)
- **PPN:** Documentation and sandbox come only after a signed partnership agreement, with about 5 bookings per day expected (2026 third-party review) — [supergood.ai](https://supergood.ai/api-report-card/priceline)
- **PPN:** Direct access reportedly involves volume tiers and 2–3 months of development. An aggregator (ZentrumHub) offers pre-integrated PPN access on flat SaaS pricing (vendor claim) — [ZentrumHub](https://www.zentrumhub.com/priceline-hotel-api-integration/)
- **CarTrawler:** Not public self-service; access is via partner programs — [apis.io](https://apis.io/providers/cartrawler/). It serves 300+ brands, including 70+ airlines — [Expedia Group IR](https://ir.expediagroup.com/news-and-events/news/news-details/2026/Expedia-Group-announces-agreement-to-acquire-CarTrawler-advancing-strategy-to-build-the-most-complete-B2B-travel-platform/default.aspx)
- **Discover Cars:** The affiliate program is open; the program page targets websites and apps — [Discover Cars affiliate](https://www.discovercars.com/affiliate)
- **Discover Cars:** The older affiliate API was "available upon request", with a site requirement of about 50,000 visitors per month (about 6 years old) — [Travelpayouts support](https://support.travelpayouts.com/hc/en-us/articles/360012655219-DiscoverCars-affiliate-program-API)
- **Discover Cars:** B4B targets airlines, airports, OTAs and loyalty partners — [Discover Cars B4B](https://pages.discovercars.com/b4b)
- **EconomyBookings:** "No caps or minimums" — [EconomyBookings affiliate](https://www.economybookings.com/en//affiliate/)
- **Mozio:** No sign-up fees or monthly costs — [Mozio travel agents](http://www.mozio.com/travel-agents)
- **Suntransfers:** Apply via CJ (ID 4727627); contact affiliates@suntransfers.com — [Suntransfers affiliate](https://www.suntransfers.com/affiliate-program)
- **Uber:** The Ride Request REST API requires approval via an Uber business development contact; deep links need no approval — [Uber Ride Requests](https://developer.uber.com/docs/riders/ride-requests/introduction)
- **GDS:** Agency commission requires ARC/IATA/TIDS/TRUE/CLIA identifiers — [Hertz TA policy](https://www.hertz.com/rentacar/misc/index.jsp?targetPage=TA_commissionpolicy.jsp)
- **GDS:** Amadeus self-service is closed; enterprise access is by commercial agreement only — [PhocusWire](https://www.phocuswire.com/amadeus-shut-down-self-service-apis-portal-developers)

### Inferences
- A pre-traction startup can launch in weeks via affiliate deeplinks or widgets (Discover Cars, Booking.com/Rentalcars, EconomyBookings), and in parallel apply to Booking.com Managed Affiliate Partner and Expedia Rapid Car beta. Both are likely months-long, account-manager-driven processes; no timeline is documented.
- PPN's 5 bookings per day threshold means about 150 per month, likely only reachable after an affiliate phase proves demand.
- CarTrawler direct access is realistic only after meaningful scale. Post-acquisition, the practical route may become Expedia Rapid (inferred).
- WhereTo already holds a merchant/MoR relationship model with LiteAPI and publishes an app, which helps the "business case" requirement for Booking.com Search-Look-Book (inferred).

### Gaps
- No published traffic minimums for Booking.com Managed Affiliate Partner status, Expedia Rapid Car beta, Discover Cars B4B or CarTrawler.
- No onboarding timelines found for any API/MoR program.
- Whether Booking.com allows car Search-Look-Book for partners that are not already lodging Demand API partners is not documented.

## Q6. Known clients (airlines, fintechs, apps) and recent news 2024–2026

### Takeaway
The dominant 2026 news is Expedia's acquisition of CarTrawler (announced May 20, 2026; reported closed around September 1, 2026; reported at about $350M, or €300M, versus speculation above $450M). CarTrawler's airline deals in 2025 included Ryanair, Virgin Australia, KM Malta and LOT. Booking.com's Rentalcars Connect historically powered airlines (Wizz, Qatar, Singapore, Air Transat, SunExpress). HTS powers Capital One Travel (being brought in-house) and RBC. Mozio serves JetBlue, Booking.com, Agoda, CheapOair and others. Getaround exited the US in 2025, and Amadeus closed self-service APIs in July 2026.

### Cited Findings
- **Expedia/CarTrawler deal:** Skift reported a roughly $350M (€300M) deal on May 17, 2026 — [Skift scoop](https://skift.com/2026/05/17/expedia-350-million-cartrawler-acquisition-scoop/). The Irish Times said terms were undisclosed, with industry speculation above $450M (€387M) — [Irish Times, May 20, 2026](https://www.irishtimes.com/business/2026/05/20/cartrawler-acquired-by-us-travel-group-expedia/)
- **CarTrawler airline deals:** In the prior 18 months CarTrawler signed Ryanair, American Airlines, Qantas, Jet2, Jet2holidays, Virgin Australia, Etihad and Finnair — [Yahoo Finance release copy](https://finance.yahoo.com/markets/stocks/articles/expedia-group-announces-agreement-acquire-130000400.html)
- **CarTrawler:** Ryanair signed a multi-year deal via the Connect Platform in December 2025 — [Future Travel Experience](https://www.futuretravelexperience.com/2025/12/ryanair-and-cartrawler-announce-new-car-rental-partnership-enhancing-the-airlines-ancillary-offering/); [TechBuzz Ireland](https://techbuzzireland.com/2025/12/03/ryanair-and-cartrawler-announce-strategic-partnership/)
- **CarTrawler:** Virgin Australia became an exclusive partner with Velocity points earning (May 2025) — [Flying in Ireland](https://flyinginireland.com/2025/05/cartrawler-announces-car-rental-partnership-with-virgin-australia/). KM Malta Airlines launched in December 2025 — [TravelDailyNews](https://www.traveldailynews.com/aviation/km-malta-airlines-adds-car-rental-booking-through-partnership-with-cartrawler/). LOT renewed in October 2025 — [CarTrawler news](https://corporate.cartrawler.com/en-gb/news-resources/news/)
- **CarTrawler:** It acquired Paris insurtech Koala in August 2025 — [Insurance Edge](https://insurance-edge.net/2025/08/15/deals-cartrawler-buys-travel-insurtech-specialist-koala/)
- **CarTrawler:** Other named partners include easyJet, Air France-KLM, Uber, American Express and United Airlines — [Wikipedia, CarTrawler](https://en.wikipedia.org/wiki/CarTrawler). It also partnered with Hopper for in-app car rental (April 2021) — [CarTrawler news](https://corporate.cartrawler.com/en-gb/news-resources/news/new-partners/cartrawler-signs-car-rental-partnership-with-travel-booking-app-hopper/)
- **Rentalcars Connect (older, 2015–2018):** Historical partners include eDreams Odigeo, Wizz Air, Singapore Airlines, Qatar Airways, Asiana, SunExpress and Air Transat. It claimed 50+ airlines at launch, later 90+ — [Auto Rental News, Air Transat](https://www.autorentalnews.com/317622/rentalcars-connect-partners-with-canadas-air-transat); [Auto Rental News, SunExpress](https://www.autorentalnews.com/news/rentalcars-connect-partners-with-sunexpress); [Digital Commerce 360](https://www.digitalcommerce360.com/2015/06/01/rentalcars-connect-launches-b2b-car-rental-booking-platform/)
- **Booking.com x Revolut (Nov 2025):** Revolut Pay launched for Booking.com accommodation, with "flights and car rentals to be added soon". This is a payments tie-up, not a car API — [FinTech Global](https://fintech.global/2025/11/18/revolut-and-booking-com-unveil-new-payment-partnership/)
- **Expedia Rapid Car:** Pilot announced May 2025 — [Business Wire](https://secure.businesswire.com/news/home/20250514047232/en/EXPEDIA-GROUP-EXPANDS-B2B-PLATFORM-AND-LAUNCHES-GENAI-PARTNERSHIPS-TO-ENHANCE-TRAVEL-DISCOVERY)
- **HTS:** Capital One Travel lets cardholders book flights, hotels, rental cars, vacation rentals and activities — [HTS news, Mar 2026](https://hts.hopper.com/news/a-new-milestone-in-our-partnership-with-capital-one)
- **HTS:** Capital One is bringing the technology "in-house" while remaining a Hopper investor — [PhocusWire](https://www.phocuswire.com/news/technology/capital-one-launches-standalone-travel-app)
- **HTS:** RBC Avion (car rentals included) is powered by Hopper — [BetaKit](https://betakit.com/hoppers-tech-will-power-rbcs-travel-reward-program/)
- **HTS:** HTS says it powers "billions of dollars" across more than 20 partner channels — [HTS news](https://hts.hopper.com/news/a-new-milestone-in-our-partnership-with-capital-one)
- **Hopper:** NextCar and Priceless Car Rental joined Hopper as direct suppliers (year unconfirmed) — [Auto Rental News](https://www.autorentalnews.com/10204352/nextcar-and-priceless-car-rental-debut-on-hopper)
- **Discover Cars:** B4B push toward airlines, airports and loyalty programs, with the API rollout (Dec 2025) — [Future Travel Experience](https://www.futuretravelexperience.com/2025/12/how-discovercars-com-is-revolutionising-car-rental-distribution-with-a-b4b-approach/); [Future Travel Experience, Jan 2025](https://www.futuretravelexperience.com/2025/01/how-the-discovercars-com-platform-can-create-new-revenue-streams-through-innovative-car-rental-solutions/)
- **Mozio:** Clients include JetBlue, Booking.com, Hotels.com, Despegar, Air New Zealand and CheapOair — [Wikipedia, Mozio](https://en.wikipedia.org/wiki/Mozio). Agoda uses Mozio — [Mozio Business Partners](http://www.mozio.com/business-partners)
- **Mozio:** GoNexus/NexusCube (Juniper) strategic partnership, June 2025 — [ITIJ](https://www.itij.com/latest/news/mozio-and-gonexus-group-announce-strategic-partnership). A Rome2Rio partnership appears in a Feb 2026 headline listing — [CB Insights, Mozio](https://www.cbinsights.com/company/mozio). SmartRyde API integration — [SmartRyde](https://smartryde.io/news/smartryde-announces-api-integration-with-mozio)
- **Mozio:** Tracxn reports $5.36M total funding and 76 employees (Jan 2026). Aggregator data; may be incomplete — [Tracxn](https://tracxn.com/d/companies/mozio/__Ma1Cyx-arsUJtZnBJGITnKGJabl6GKM_vc_FU9FpC70)
- **Welcome Pickups:** Airbnb in-app airport pickups expanded to 125+ cities (April 2026, US not included) — [Dataconomy](https://dataconomy.com/2026/04/01/airbnb-expands-airport-pickup-service-to-125-cities/). AEGEAN partner — [AEGEAN](https://en.about.aegeanair.com/company/partners/non-airlines-partners/welcome-pickups/)
- **Getaround:** US wind-down February 2025 — [PYMNTS](https://www.pymnts.com/news/ridesharing/2025/carsharing-marketplaces-getaround-and-hyrecar-wind-down-us-operations/). Wikipedia says the board announced plans to dissolve and liquidate in June 2026 (not verified against a primary source) — [Wikipedia, Getaround](https://en.wikipedia.org/wiki/Getaround)
- **Amadeus:** Self-service API portal shut down July 17, 2026 — [PhocusWire](https://www.phocuswire.com/amadeus-shut-down-self-service-apis-portal-developers); [TravelTrade.Today](https://traveltrade.today/gds-systems/amadeus-sa/amadeus-closes-self-service-apis-portal-for-developers/)

### Inferences
- CarTrawler joining Expedia may make Booking Holdings (Booking.com Cars/Rentalcars Connect plus PPN) and Expedia (Rapid Car plus CarTrawler) a two-giant B2B car market. Independent aggregators (Discover Cars, EconomyBookings, QEEQ) are likely to court smaller partners more aggressively (inference).
- No US fintech or consumer startup was found publicly integrating car rentals via Booking.com Demand API Search-Look-Book or Rapid Car. Early adopters may get attention from those teams, but this is unconfirmed.

### Gaps
- No confirmed list of Expedia Rapid Car beta partners.
- No 2024–2026 news on Priceline Partner Solutions car-specific clients.
- I did not identify which car rental platform Airbnb partnered with (a Global Traveler headline mentioned "Airbnb Partners with Car Rental Platform, Launches in 5 Countries", but the details were not retrieved) — [Global Traveler](https://www.globaltravelerusa.com/airbnb-partners-with-car-rental-platform-launches-in-5-countries/)
- Chase Travel and Amex Travel car-rental technology providers were not identified in sources.

## Q7. Pros and cons for a startup consumer app (WhereTo Trips)

### Takeaway
A phased approach fits best. Phase 1: in-app webview or deeplink affiliate (Discover Cars for profit share and its 365-day cookie; Booking.com/Rentalcars via CJ/Awin for brand trust; optionally EconomyBookings) plus Mozio widget or white-label for transfers. Phase 2: apply now to Booking.com Managed Affiliate Partner (cars Search-Look-Book beta) and Expedia Rapid Car beta for native MoR booking, and talk to Discover Cars B4B about its booking and pay API. Skip GDS, Getaround and Turo-as-API. Treat CarTrawler and PPN as scale-stage options.

### Cited Findings

**CarTrawler (Expedia)**
- Pros: full white-label with CarTrawler servicing, including payment, cancellations, refunds and complaints — [CarTrawler T&Cs](https://mobility.cartrawler.com/flydubai/en-GB/terms-and-conditions?clientId=526782); 1,700+ providers and 50,000+ locations — [TravelDailyNews](https://www.traveldailynews.com/aviation/km-malta-airlines-adds-car-rental-booking-through-partnership-with-cartrawler/)
- Cons: enterprise and airline focus, no self-service — [apis.io](https://apis.io/providers/cartrawler/); ownership change in 2026 adds uncertainty — [Expedia Partner blog](https://partner.expediagroup.com/en-us/resources/blog/expedia-group-completes-cartrawler-acquisition); consumer complaint pattern on prepaid deposits and refunds — [Trustpilot](https://www.trustpilot.com/review/car-hire.ryanair.com)

**Booking.com Demand API cars**
- Pros: native booking, Booking.com collects payment, documented cancellation policy — [Payments overview](https://developers.booking.com/demand/docs/payments/overview); [Cancellation policies](https://developers.booking.com/demand/docs/orders-api/cancellation-policies)
- Cons: booking is beta, requires Managed Affiliate Partner contract and approval, no sandbox for cars, breaking schema changes between 3.1 and 3.2 — [Prerequisites](https://developers.booking.com/demand/docs/getting-started/prerequisites); [Sandbox](https://developers.booking.com/demand/docs/getting-started/sandbox); [v3.2 changes](https://developers.booking.com/demand/docs/migration-guide/v3.2/changes)

**Expedia Rapid Car**
- Pros: full booking lifecycle API; Expedia is MoR for pay-now offers; 110+ brands — [Developer Hub](https://developers.expediagroup.com/rapid/cars); [Launch reqs](https://developers.expediagroup.com/rapid/setup/launch-requirements/car-launch-reqs?locale=ko_KR)
- Cons: beta with selected partners and conflicting launch dates; schema may change — [Expedia US landing](https://partner.expediagroup.com/en-us/landing-pages/rapid-car-api-for-scalable-car-rental-bookings); pay-at-counter offers and add-ons put collection on the vendor, which needs careful UX — [Launch reqs](https://developers.expediagroup.com/rapid/setup/launch-requirements/car-launch-reqs?locale=ko_KR)

**Discover Cars**
- Pros: 70% of profit plus 30% of Full Coverage, a 365-day cookie and an easy start — [Discover Cars affiliate](https://www.discovercars.com/affiliate); B4B API with booking and pay endpoints for deeper integration — [Future Travel Experience](https://www.futuretravelexperience.com/2025/12/how-discovercars-com-is-revolutionising-car-rental-distribution-with-a-b4b-approach/)
- Cons: the affiliate model is a redirect; B4B API status and eligibility for a small app are unclear; the older API needed about 50,000 visitors per month — [Travelpayouts support](https://support.travelpayouts.com/hc/en-us/articles/360012655219-DiscoverCars-affiliate-program-API)

**Booking.com / Rentalcars affiliate**
- Pros: trusted brand, about 6% via CJ/Awin — [Awin](https://www.awin.com/us/advertisers/partner/booking.com)
- Cons: session-based tracking and reversals on cancellations — [Lasso](https://getlasso.co/affiliate/booking-com-car-rentals/)

**PPN Cars**
- Pros: white-label or API, Rentalcars-backed content — [AltexSoft](https://www.altexsoft.com/blog/car-rental-apis-integrations-with-gdss-otas-and-tech-providers/)
- Cons: about 5 bookings per day minimum; documentation only after contract — [supergood.ai](https://supergood.ai/api-report-card/priceline)

**EconomyBookings / QEEQ**
- Pros: EconomyBookings 60% revenue share with no minimums — [EconomyBookings](https://www.economybookings.com/en//affiliate/); QEEQ up to 8% — [QEEQ](https://www.qeeq.com/affiliate-program)
- Cons: conflicting network rates; less US brand recognition; no public API documentation — [LinkClicky](https://linkclicky.com/affiliate-program/economybookings-com/); [AffNext/Admitad](https://www.affnext.com/offers/qeeq-ww)

**Kayak**
- Pros: easy meta-search affiliate — [KAYAK affiliate help](https://help.affiliates.kayak.com/article/800-how-does-the-commission-work)
- Cons: meta-search model sends users on to third-party booking sites, paying per click or as a revenue share; inconsistent published rates — [Lasso Kayak CA](https://getlasso.co/affiliate/kayak-ca/)

**HTS (Hopper)**
- Pros: full white-label travel stack including cars — [HTS](https://hts.hopper.com/news/a-new-milestone-in-our-partnership-with-capital-one)
- Cons: built for large banks and airlines (Capital One, RBC), not startups; Capital One moving in-house signals platform-dependency risk — [PhocusWire](https://www.phocuswire.com/news/technology/capital-one-launches-standalone-travel-app)

**GDS**
- Cons: accreditation required, 5% commission, self-service APIs closed at Amadeus — [Hertz TA](https://www.hertz.com/rentacar/misc/index.jsp?targetPage=TA_commissionpolicy.jsp); [PhocusWire](https://www.phocuswire.com/amadeus-shut-down-self-service-apis-portal-developers)

**Turo / Getaround**
- Turo is affiliate bounties only, with no external API since 2023 — [FlexOffers](https://www.flexoffers.com/affiliate-programs/turo-affiliate-program/); [CarSync](https://carsyncio.medium.com)
- Getaround has left the US — [TechCrunch](https://techcrunch.com/2025/02/12/getaround-abruptly-shuts-down-us-car-sharing-operations/)

**Mozio**
- Pros: API, white-label or widget; no fees; set your own markup; 3,500+ airports; airline and OTA clients — [Mozio Business Partners](http://www.mozio.com/business-partners); [Mozio travel agents](http://www.mozio.com/travel-agents); [Wikipedia](https://en.wikipedia.org/wiki/Mozio)
- Cons: MoR and servicing terms are not public; small company by aggregator funding data — [Tracxn](https://tracxn.com/d/companies/mozio/__Ma1Cyx-arsUJtZnBJGITnKGJabl6GKM_vc_FU9FpC70)

**Welcome Pickups**
- Pros: public API, 8–9% affiliate — [Welcome API](https://partner.welcomepickups.com/travel-api/); [aff.travel](https://aff.travel/welcomepickups.html)
- Cons: limited or no US coverage — [Dataconomy](https://dataconomy.com/2026/04/01/airbnb-expands-airport-pickup-service-to-125-cities/)

**Hotelbeds Transfers**
- Pros: wholesale API with a broad international footprint — [WBE](https://www.wbe.travel/partner/hotelbeds/)
- Cons: contract and net-rate oriented, so likely the app is the seller — [ZentrumHub](https://www.zentrumhub.com/blog/hotelbeds-supplier/)

**Suntransfers / Kiwitaxi / Jayride**
- Pros: simple affiliate entry — [Suntransfers](https://www.suntransfers.com/affiliate-program); [Kiwitaxi](https://kiwitaxi.com/en/travelagency); [Jayride](https://www.jayride.com/jayride-affiliates)
- Cons: low headline rates (Suntransfers 4%) — [Awin](https://ui.awin.com/merchant-profile/111238)

**Uber**
- Pros: free deep links for local US rides — [Uber deep links](https://developer.uber.com/docs/deep-linking)
- Cons: no commission found; the full API needs business-development approval — [Uber Ride Requests](https://developer.uber.com/docs/riders/ride-requests/introduction)

### Inferences
- Best fit for "in-app, provider MoR, earns commission, minimal servicing burden" over the next 6–12 months:
  1. Booking.com Demand API cars (Search-Look-Book beta), if WhereTo can secure Managed Affiliate Partner status.
  2. Expedia Rapid Car (beta; possibly gaining CarTrawler supply).
  3. Discover Cars B4B API.
  
  All three need sales conversations. Start with an affiliate implementation that launches immediately and generates the booking history these partners will ask for.
- For transfers, Mozio is the strongest single integration for a US-first app (US airports and airline clients). Welcome Pickups and Suntransfers fit international (EU) destinations as add-ons.
- Because WhereTo already uses LiteAPI as MoR for hotels, a consistent UX would favor native MoR APIs over webviews. However, an in-app webview of a co-branded affiliate or widget flow (Discover Cars B4B widget, Mozio widget) is a pragmatic bridge that keeps users in the app while the provider handles payment and support.
- Risk to monitor: Booking.com's reported requirement for written approval of AI/automated assistant use cases (third-party claim). This matters if WhereTo's app includes AI trip-planning that triggers bookings.

### Gaps
- No direct statements from any provider on startup eligibility (for example "we accept partners with under X bookings") for B2B APIs.
- No public SLA, support-hours or chargeback-liability terms for Booking.com, Expedia, Discover Cars B4B or Mozio API partners. These should be requested during sales calls.
- More searches (Booking.com Cars inventory counts, Demand API cars GA status news, Mozio API MoR terms) could not run because the web-search budget was exhausted. A follow-up session could fill these.
