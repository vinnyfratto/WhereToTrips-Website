# Multi-vertical "one-API" travel platforms for cars and experiences (vs. Nuitée/LiteAPI), as of October 2026

Research context: WhereTo Trips is a US-based iOS/Android consumer app. It already books flights and hotels through Nuitée/LiteAPI, with Nuitée as merchant of record (MoR). The goal is to add car rental and experiences/events with as few integrations as possible.

Method notes (read these first):
- Direct page fetches were blocked in this environment for every domain tried: nuitee.com, docs.liteapi.travel, developers.booking.com, developers.expediagroup.com, ir.expediagroup.com, duffel.com, hts.hopper.com, businesscloud.co.uk and travelprnews.com. Every finding below therefore comes from search-engine result summaries of the cited pages, not from full-page reads. Treat exact numbers as "as reported by the search snippet of that page."
- The shared web-search budget ran out before every provider could be checked. The planned follow-up searches are listed under Gaps, so the report writer knows what is unverified.
- "Documented" means an official vendor page or press release said it. "Third-party" means an integrator, reseller, or SEO blog said it (lower reliability). "Inference" means my reasoning.

---

## 1. What does Nuitée/LiteAPI itself offer or announce for cars, transfers, activities/experiences and events (2025–Oct 2026)?

### Takeaway
As of October 2026 I found no evidence that Nuitée/LiteAPI offers or has announced car rental, transfers, activities/experiences or events. Its documented products are hotels plus a flights API that has to be requested. Its 2025–2026 roadmap items are about AI: chatbot, AI search, price intelligence, vibe-coding and agentic tooling. They do not add new verticals. WhereTo Trips will need a second supplier for cars and experiences.

### Cited Findings
- **Hotels and flights are the documented scope.** The LiteAPI docs cover a Flights API (search, price, book, seat and baggage selection). Flights access is "not on by default" and is enabled on request through the dashboard's "Request Assistance" feature. No extra credentials are needed once it is enabled. Search is `POST /flights/rates` with a legs array and supports SSE streaming of incremental provider results. Searches for car or transfer endpoints on docs.liteapi.travel returned nothing — [LiteAPI: Getting Access to Flights](https://docs.liteapi.travel/docs/getting-access-to-flights); [LiteAPI: Flight Booking Architecture](https://docs.liteapi.travel/docs/flight-booking-architecture); [LiteAPI: Search for flights](https://docs.liteapi.travel/reference/post_flights-rates)
- Production flights access "must be explicitly approved." It is not enabled by default, even in sandbox — [LiteAPI: Flights API](https://docs.liteapi.travel/docs/flights-api)
- **Flights MoR and support model (documented).** "Wherever a traveller's card is charged, Nuitée acts as Merchant of Record and absorbs the payment risk." Partners can embed Nuitée's Stripe SDK so the card is charged under Nuitée's entity. There are two servicing models. In "First Line," travellers contact Nuitée directly. In "B2B-Relayed," the partner fronts support and relays cases to Nuitée. Fare differences, change fees and service fees settle against the partner's credit line — [LiteAPI: Flights — Support & Billing Model](https://docs.liteapi.travel/docs/flights-support-billing-model)
- The Nuitée Connect homepage positions the product as "The Travel API for the Agentic Era." A third-party comparison quotes it as advertising 3M+ properties, "zero contracts," a production-mirroring sandbox and flights from 600+ airlines — [liteapi.travel](https://liteapi.travel/); [AnchorTerminal comparison](https://www.anchorterminal.com/compare/booking-demand-api-vs-liteapi)
- Property counts conflict across sources. A third-party API Evangelist profile says "2M+ hotels." Another description cites "2.6M+ properties." The homepage, via AnchorTerminal, cites 3M+ — [api-evangelist/nuitee (GitHub)](https://github.com/api-evangelist/nuitee); [Nuitée Connect](https://nuitee.com/connect)
- Nuitée describes its platform as liteAPI (APIs and SDKs), enterprise-grade connectivity, an AI booking-agent suite, a white-label booking engine, and payment and fraud solutions. No car or experience product is listed — [liteapi.travel/about](https://liteapi.travel/about)
- **2025 product roundup.** It covers AI-driven search, dynamic markup pricing and vibe-coding support, framed as "an early step toward agentic development workflows that will continue to evolve in 2026." It does not mention cars or activities — [Nuitée: liteAPI 2025 Product Updates](https://nuitee.com/insights/lite-api-product-updates-2025)
- **Q1 2026 product update (published May 4, 2026).** Items include an embeddable, configurable chatbot (brand-safe language, hard limits), price intelligence, smarter reporting, an in-dashboard "Request Assistance" assistant, and an AI Insights dashboard add-on at $4.99/month. No new verticals appeared in the search summaries — [Nuitée: What's New in liteAPI (Q1 2026)](https://nuitee.com/insights/liteapi-product-updates-q1-2026); [LiteAPI: API Pricing & Usage Costs](https://docs.liteapi.travel/reference/api-pricing-usage-costs)
- A February 2026 post frames LiteAPI as "the infrastructure layer enabling developers, creators, and businesses to build, launch, and monetise travel experiences." Here "travel experiences" is generic marketing language, not an activities product — [Nuitée: Building in Travel in the Age of AI](https://nuitee.com/insights/building-travel-ai-liteapi)
- **2026 partnerships are accommodation-only.** They include:
  - Grab: "Exclusive Partnership to Provide Accommodation Booking in Grab App" (GrabStays reported for May 2026).
  - Stippl: accommodation booking inside Stippl's trip planner, dated Aug 18, 2026.
  - Globe Thrivers (April 2026) and Attijariwafa Bank (May 2026), per a third-party profile.

  Sources: [Nuitée homepage](https://nuitee.com/); [Nuitée Insights](https://nuitee.com/insights?sortby=LiteAPI)
- A search for any Nuitée partnership with Holibob, Viator, GetYourGuide or a car-rental supplier found none — [Nuitée Connect](https://nuitee.com/connect); [Nuitée LinkedIn](https://ie.linkedin.com/company/nuitee)
- Nuitée job postings reference a "Flights business," including a Flight Analyst role, so flights is an active investment area — [Nuitée Greenhouse job board](https://job-boards.eu.greenhouse.io/nuitee/jobs/4788557101)

### Inferences
- Nuitée's 2026 investment is going into AI and agent tooling plus flights, not ground transport or experiences. A cars or experiences launch from Nuitée in the near term would be speculative. Plan for a second supplier.
- Nuitée's flights MoR and "First Line" support model is the template WhereTo Trips is used to. Prefer cars and experiences suppliers that can also act as MoR and provide first-line traveller support, so the app does not have to become a licensed seller of travel or run its own support desk.
- The "zero contracts" positioning for self-serve LiteAPI suggests no exclusivity obligation that would block adding another supplier for other verticals. This is not verified against the LiteAPI terms of service. Nuitée does sign exclusive deals with large partners (Grab), so check WhereTo's own agreement.

### Gaps
- Could not read docs.liteapi.travel/llms.txt (full endpoint index) or the full Q1 2026 post, because both were blocked. That would definitively confirm there are no car, transfer or activity endpoints.
- No Nuitée roadmap statement, for or against, on cars or experiences was found. Ask the Nuitée account manager directly.
- LiteAPI terms of service (exclusivity, non-compete, rate-parity clauses) were not reviewed.

---

## 2. Which verticals does each platform cover (hotels, flights, cars, transfers, activities/tours, attraction tickets, events)?

### Takeaway
Only a few platforms are real multi-vertical APIs that add cars and/or experiences to hotels and flights with native booking:
- **Expedia (Rapid):** cars now; activities in beta, GA early 2027; CarTrawler pending.
- **Duffel:** flights, stays and cars; no experiences.
- **Booking.com Demand API:** cars and attractions, in beta and mostly redirect.
- **Hotelbeds:** activities, transfers, and car via CARNECT. It is a B2B wholesaler.
- **HTS:** cars and stays, enterprise-only.

No single API in this set covers all of cars, activities and events with native booking for a startup today. Holibob is the closest "experiences plus events" API, and it does not do cars.

### Cited Findings

**Expedia Group (Rapid API / White Label Template)**
- Expedia reports a car API with 110+ brands, 190 countries and 45,000 pickup locations — [Explore 2026 recap](https://partner.expediagroup.com/en-gb/resources/blog/explore-2026-partner-conference-recap); [Explore 2026: new ways for B2B partners](https://partner.expediagroup.com/en-us/resources/blog/explore-2026-new-ways-for-b2b-partners-to-grow)
- **Rapid Activities API.** The developer docs describe it as "an early access preview initiative for selected partners only. Beta programs will launch in Q3 2026, with general availability in 2027" — [Rapid Activities API overview](https://developers.expediagroup.com/rapid/activities)
- The Oct 1, 2026 Expedia B2B release says Rapid Activities is in beta for selected partners. It supports discovery, shopping, booking and management, draws on Tiqets inventory, and broader availability is planned for "early 2027." Global Hotel Card is in the beta. A limited set of UK agencies, including Flights Guru, get Tiqets activities in TAAP — [Expedia Group B2B Product Milestones (IR)](https://ir.expediagroup.com/news-and-events/news/news-details/2026/Expedia-Group-B2B-Announces-Product-Milestones-to-Expand-Its-Full-Trip-Platform--/default.aspx); [Travel PR News, Oct 1, 2026](https://travelprnews.com/expedia-group-b2b-expands-full-trip-platform-with-rapid-activities-api-and-tiqets-beta-in-taap/travel-press-release/2026/10/01/); [Travolution](https://www.travolution.com/news/travel-sectors/travel-agents/expedia-taap-launches-beta-rapid-activities-api-for-agencies/); [Travel Weekly UK](https://travelweekly.co.uk/news/expedia-taap-adds-tiqets-activities-for-selected-uk-agents)
- An older Expedia release, from about May 2025, cited "more than 170,000 bookable experiences" for an Activities API. Treat this as dated — [Expedia newsroom: B2B platform expansion](https://www.expedia.com/newsroom/expedia-group-expands-b2b-platform-and-launches-genai-partnerships/)
- **Tiqets** (attractions and tickets) acquisition: announced late 2025, finalized early 2026 — [Travel PR News](https://travelprnews.com/travel-press-releases-tagged-with/full-trip-platform/)
- **CarTrawler.** Expedia agreed in May 2026 to buy CarTrawler, which connects 550+ car rental suppliers and 500+ mobility providers to 300+ travel brands, including 70+ airlines. Close is expected in H2 2026, and no closing report was found as of this research. Expedia frames the deal as extending its B2B API into cars, ground transport and insurtech — [BusinessWire, May 19, 2026](https://secure.businesswire.com/news/home/20260519556732/en/Expedia-Group-announces-agreement-to-acquire-CarTrawler-advancing-strategy-to-build-the-most-complete-B2B-travel-platform); [WiT](https://www.webintravel.com/expedia-group-enters-agreement-to-acquire-cartrawler-launches-intelligent-experience-platform/); [PhocusWire](https://www.phocuswire.com/news/online/expedia-b2b-car-trawler-acquisition-ai-features)
- **White Label Template** covers flights, cars, hotels, activities, airport transfers and packages, and partners choose which supply to expose — [Expedia White Label Template](https://partner.expediagroup.com/en-us/solutions/build-your-travel-experience/white-label-template); [Expedia Developer Hub: WLT](https://developers.expediagroup.com/docs/products/white-label-template)
- No events or concert ticketing was found for Expedia.

**Booking.com Demand API**
- **Cars.** The car rental collection supports search, display and book. "Search, look & redirect" is the stable flow. "Search, look & book" is Beta and requires special permission (v3.2 beta, enabled by Booking.com). Cars are not in the sandbox, so testing happens in production — [Booking.com: About Car Rentals](https://developers.booking.com/demand/docs/cars/overview); [Demand API sandbox](https://developers.booking.com/demand/docs/getting-started/sandbox)
- **Attractions.** Content-only and "search, look & redirect," both Beta in v3.2, with access via the account manager. No search-look-book flow for attractions was found. Search has a 180-day booking window — [Attractions quick guide (Beta)](https://developers.booking.com/demand/docs/attractions/attractions-quick-guide); [Attractions search v3.2-beta](https://developers.booking.com/demand/docs/open-api/3.2-beta/demand-api/attractions/search); [About the Demand API](https://developers.booking.com/demand/docs/getting-started/overview)
- **Flights.** Official docs describe flights only as future work ("future versions ... vertical-specific APIs, such as flights"). A third-party listing that claims flights is not confirmed by Booking.com docs — [About the Demand API](https://developers.booking.com/demand/docs/getting-started/overview); [thirdpartyprovider.com](https://thirdpartyprovider.com/providers/bookingcom-demand-api)
- The changelog shows an August 2026 beta update covering car rentals and orders. Its date metadata is inconsistent — [Demand API Changelog](https://developers.booking.com/demand/docs/whats-new/changelog)

**Duffel**
- Flights cover 500+ airlines. Stays cover 1.6M properties and grew 10,000% in 12 months. Duffel Cars offers 40 global providers (Avis, Sixt, Enterprise, Hertz, Europcar) across 40,000+ locations in 200 countries, "through the same API" — [Duffel: Introducing Duffel Cars](https://duffel.com/blog/introducing-duffel-cars); [Duffel Cars page](https://duffel.com/cars); [BusinessCloud](https://businesscloud.co.uk/news/duffel-hits-900m-run-rate-and-launches-cars-vertical/); [Travel Daily News](https://www.traveldailynews.com/people/new-appointments/duffel-launches-duffel-cars-expanding-its-travel-api-suite/)
- **Cars launch date conflict.** One search summary placed the launch around April 2026. Another found Duffel's blog listing "Introducing Duffel Cars" under "Steve Domin · September 2026," with April 2026 being a separate Rippling Travel post. It went live in 2026 either way, and was in production use by Oct 8, 2026 (Robinhood) — [Duffel blog](https://duffel.com/blog); [FF News](https://ffnews.com/news/embargoed-robinhood-taps-duffel-to-power-its-travel-platform-104667f3)
- No activities, transfers or events product was found for Duffel.

**Hotelbeds (HBX Group)**
- The official developer portal presents an API suite for hotels, activities, transfers and car rental. Activities have a Booking API and a Content API. Transfers have a Booking API and a Cache API — [Hotelbeds Developer](https://developer.hotelbeds.com/)
- **Car rental comes via Hotelbeds' B2B car brand CARNECT.** CARNECT offers 500 car suppliers through an OTA-compliant API, white label, apps and widgets. It was live for Servantrip from April 2021 and for loveholidays in 2018. These are dated sources — [HBX Group: Servantrip](https://hbxgroup.com/news-room/press-release/hotelbeds-strengthens-distribution-reach-ancillary-partners-servantrip); [HBX Group: loveholidays](https://hbxgroup.com/news-room/press-release/hotelbeds-group-announces-car-rental-partnership-loveholidays)
- Inventory counts conflict, ranging from about 24,000 transfer routes and 18,000 activities to 9,000+ transfer routes and 23,000 experiences. Third-party sources cite 150 vs. 500+ car suppliers — [Hotelbeds Developer](https://developer.hotelbeds.com/); [Juniper blog](https://blog.ejuniper.com/en/?p=29468)

**WebBeds**
- In 2022, WebBeds supplied airport-hotel-airport transfers to Travel Compositor via API: 15,667 transfer products in 1,190 destinations. It said most of its transfers were sold via API. Older internal material lists "hotels, vacation rentals, transfer & activities." No car hire was found — [WebBeds news (2022)](https://www.webbeds.com/news/webbeds-increases-distribution-of-transfer-portfolio-through-integration-with-travel-compositor/); [PHPTRAVELS: WebBeds API (Aug 2026)](https://phptravels.com/blog/how-webbeds-api-integration-works)

**TBO (TBO Holidays / TBO Tek)**
- TBO's site says it sells air, hotels, rail, packages, car rentals, transfers, sightseeing, cruise and cargo. Third-party integrators confirm hotels and flights via API. They mark transfers, sightseeing and packages "ask TBO," with availability depending on contract. No car rental API was documented — [TBO About Us](https://www.tbo.com/about-us); [PHPTRAVELS: TBO](https://phptravels.com/de/integrations/tbo-api-integration); [Vervotech: TBO](https://www.vervotech.com/hub/integrations/tbo-hotel-api/)

**RateHawk / Emerging Travel Group (ETG)**
- A 2025 advertorial says the platform offers flights, transfers, rail tickets and car rentals alongside hotels. Transfers cover 150+ countries. Round-trip transfers launched in Q2 2025. RateHawk API V3 added a prebook step. The API is primarily described as accommodation — [ITB advertorial, Feb 2025](https://news.itb.com/?p=48415); [RateHawk Q2 2025 digest](https://blog.ratehawk.com/ratehawks-update-digest-second-quarter-2025/)

**HTS (Hopper Technology Solutions)**
- HTS products include HTS Stays (800k+ properties; launched June 2025 with Virgin Australia), HTS Cars (150+ brands), and fintech ancillaries such as Cancel/Disruption for Any Reason. No activities product was found — [HTS Stays product page](https://cactus.hts.hopper.com/products/hts-stays); [HTS Cars product page](https://cactus.hts.hopper.com/products/hts-cars); [HTS news: HTS Stays with Virgin Australia (June 12, 2025)](https://hts.hopper.com/news/hts-announces-new-hts-stays-offering-with-virgin-australia-as-first-partner)
- The Summer 2026 Platform Update (Aug 11, 2026) covers HTS Fintech Ancillaries, HTS Commerce, Travel Supply APIs and HTS Assist — [HTS Summer 2026 Platform Update](https://hts.hopper.com/news/summer-2026-platform-update); [TravelPress](https://www.travelpress.com/hts-unveils-summer-2026-platform-update-details/)
- On Sumitomo Mitsui Card's "V Trip," HTS powers hotels, flights, rental cars and dynamic packages — [Travel Voice](https://www.travelvoice.jp/english/hopper-technology-solutions-sees-a-great-business-opportunity-in-partnership-with-sumitomo-mitsui-card-v-trip)

**Priceline Partner Solutions (formerly Priceline Partner Network)**
- Third-party sources describe partner-gated REST/JSON APIs for hotels, flights, cars and packages, with 800K to 980K+ properties (figures conflict). No official 2025–2026 Priceline announcement was found — [Supergood API report card: Priceline](https://supergood.ai/api-report-card/priceline); [AltexSoft: Priceline API](https://www.altexsoft.com/techtalks/how-to-integrate-priceline-api/)

**GDSs (Travelport+, Sabre) and Amadeus**
- Travelport's Cars API gives access to about 42 car brands. Sabre covers 37+ car brands in about 40,000 locations. These figures come from undated third-party guides. No activities APIs were found for either — [AltexSoft: Car rental APIs](https://www.altexsoft.com/blog/engineering/car-rental-apis-integrations-with-gdss-otas-and-tech-providers/); [Guru TechnoLabs: Travelport](https://www.gurutechnolabs.com/how-to-integrate-travelport-api/)
- **Amadeus Self-Service is decommissioned.** The self-service portal was "decommissioned on July 17th," registration was paused from March 2026, and API keys are disabled. A migration-vendor blog confirms the Tours and Activities API was part of it. Only Enterprise APIs remain — [Amadeus for Developers](https://developers.amadeus.com/); [PhocusWire](https://www.phocuswire.com/amadeus-shut-down-self-service-apis-portal-developers); [OneClick: Amadeus shutdown](https://oneclicktraveltech.com/blogs/amadeus-self-service-api-shutdown)

**Spotnana**
- APIs for air, hotel, car and rail (Trainline rail integration, Aug 2026). It is an open platform that can be white-labeled or embedded. No activities were found — [Spotnana developer portal](https://developer.spotnana.com/); [Business Travel Mag, Aug 25, 2026](https://thebusinesstravelmag.com/spontana-integrates-with-trainline-partner-solutions/)

**Affiliate aggregators: Travelpayouts, Trip.com, Kiwi.com**
- **Travelpayouts.** Its "API for trips planning" docs include the DiscoverCars car rental API and the GetTransfer transfer API. Tools vary by program: links, widgets, White Label, API, data feeds. Since Apr 27, 2026, new projects are auto-connected to all relevant programs. Third-party sources describe coverage across flights, hotels, cars and tours with 100+ brands (an older figure) — [Travelpayouts: API for trips planning](https://support.travelpayouts.com/hc/en-us/sections/360004484552-API-for-trips-planning); [Travelpayouts: About programs](https://support.travelpayouts.com/hc/en-us/articles/203955763-About-programs-on-the-Travelpayouts-platform)
- **Trip.com affiliate (via Awin).** Commission categories include Car Rental, Airport Transfers, Tickets and Other activities. Its data feed and API are hotel-focused — [Awin: Trip.com merchant profile](https://ui.awin.com/merchant-profile/22405)
- **Kiwi.com Tequila.** It covers flights plus multimodal content. New partnerships have been "on an invitation only basis" since about May 2024 — [Kiwi.com partners: Tequila](https://partners.kiwi.com/our-solutions/tequila/); [PHPTRAVELS: Kiwi Tequila 2026](https://phptravels.com/blog/comprehensive-guide-to-flights-api-integration)

**Agoda**
- The partner API is accommodation-focused (2.5M properties as of 2019), and flights were offered to partners in 2019. A June 2026 Resorts World Genting deal adds selected attractions via direct integration. No cars or activities partner API was found — [TTG Asia (2019)](https://www.ttgasia.com/2019/11/14/agoda-launches-enhanced-api-service-for-b2b2c-partners/); [RWG x Agoda release (June 18, 2026)](https://www.rwgenting.com/content/dam/approved/rw-genting/web/images/press-releases/2026/20260618-RWGXAGODA-ENG.pdf)

**Newer API-first experiences player: Holibob**
- The Holibob SDK launched in sandbox Sept 22, 2026. It connects to 500,000+ bookable products, including tours, attractions, **live events**, and restaurants and dining, aggregated from 45+ API partners plus direct contracts. It is "the same API" as the Holibob Partner API, delivered pre-built as web components plus a server proxy — [Breaking Travel News](https://www.breakingtravelnews.com/news/article/holibob-launches-sdk-that-cuts-experience-booking-integration-from-six-mont/); [Travolution](https://www.travolution.com/en/article/holibob-launches-software-development-kit-to-cut-integration-times-to-days); [ShortTermRentalz](https://shorttermrentalz.com/news/holibob-launches-toolkit-experience-bookings/)
- Holibob launched a conversational booking platform on June 30, 2026, and distributes inventory via Google Things to Do — [PhocusWire](https://www.phocuswire.com/news/technology/holibob-conversational-booking-travel-experiences)

**Loyalty and fintech white-label: Ascenda**
- Loyalty-as-a-service for banks: white-label rewards marketplaces covering hotels, flights and car rentals (OCBC; JAL, 2019). Sources are from 2019–2025. No 2026 news or activities API was found — [AAP/Cision: OCBC (2023)](https://www.aap.com.au/aapreleases/cision20230710ae51794); [eGlobal Travel Media: JAL](https://www.eglobaltravelmedia.com.au/japan-airlines-partners-with-ascenda-and-loylogic-to-launch-jal-mileage-bank-world-marketplace/)

**Mondee**
- Filed Chapter 11 in Jan 2025. Its assets went to "Tabhi" (owners TCW, Morgan Stanley IM and co-founder Prasad Gundumogula) — [Law360](https://law360.com/articles/2284492/ai-travel-app-co-mondee-files-ch-11-with-sale-plans); [PhocusWire](https://www.phocuswire.com/mondee-acquired-chapter-11-restructuring-tabhi); [Skift, Apr 4, 2025](https://skift.com/2025/04/04/mondee-founder-acquires-majority-stake-after-chapter-11-bankruptcy/)

**Verticals at a glance** (synthesized from the findings above; "beta" means not generally available; "?" means not confirmed)

| Provider | Hotels | Flights | Cars | Transfers | Activities/Tours | Attraction tickets | Events |
|---|---|---|---|---|---|---|---|
| Nuitée/LiteAPI | Yes | Yes (on request) | No | No | No | No | No |
| Expedia Rapid/WLT | Yes | Yes | Yes (Rapid Car API); CarTrawler pending | WLT yes; API ? | Beta (GA early 2027) | Via Tiqets (beta) | No |
| Booking.com Demand API | Yes | No (future) | Beta book / stable redirect | ? | Redirect beta | Redirect beta | No |
| Duffel | Yes (Stays) | Yes | Yes (2026) | No | No | No | No |
| HTS | Yes (Stays) | Yes | Yes (HTS Cars) | ? | No found | No | No |
| Hotelbeds | Yes | No | Via CARNECT (dated) | Yes | Yes | Yes | ? |
| WebBeds | Yes | No | No found | Yes | Older material only | ? | No |
| TBO | Yes | Yes | Not via API (found) | Contract-dependent | "Sightseeing," contract-dependent | ? | No |
| RateHawk/ETG | Yes | Platform | Platform | Yes | No found | No | No |
| Priceline PS | Yes | Yes | Yes | ? | No found | No | No |
| Travelport/Sabre | Yes | Yes | Yes | No | No | No | No |
| Spotnana | Yes | Yes | Yes | No | No | No | No |
| Travelpayouts (affiliate) | Yes | Yes | Yes (DiscoverCars etc.) | Yes (GetTransfer) | Yes (via programs) | Yes | ? |
| Holibob | No | No | No | No | Yes | Yes | Yes (live events) |

### Inferences
- **Fewest-integration path for cars plus experiences with native booking:** Expedia is the only company assembling all of hotels, flights, cars, activities, attractions and (via CarTrawler) ground transport under one B2B API. However, activities are still partner-selected beta until early 2027.
- **Best native cars API usable by a startup today:** Duffel Cars, on documented self-serve history and 2026 consumer-fintech production use (Robinhood).
- **Best native experiences plus events API:** Holibob, which uniquely lists live events. Hotelbeds is the classic B2B wholesale alternative for activities and transfers.
- Booking.com's attractions are redirect-only, so they are unsuitable for "in-app native booking." Car booking is native only with special Beta permission.

### Gaps
- Not confirmed: whether Expedia's Rapid Car API is available to new small partners or only to existing Rapid partners. The Explore 2026 recap names Despegar and Global Hotel Card as live with "newer APIs across cars, activities, flights, and trip protection."
- Not confirmed: whether Hotelbeds still owns or distributes CARNECT in 2026. CARNECT sources date from 2018–2021; the search for a 2026 car-rental API page returned none.
- Events and ticketing APIs (Ticketmaster, SeatGeek, StubHub/viagogo, Tiqets direct, Viator, GetYourGuide, Klook, Musement) were outside this all-in-one scope and not researched here.
- Not checked due to search budget: HTS activities, Priceline transfers, Spotnana's car supplier, and Trip.com Open Platform API.

---

## 3. Business model: affiliate vs. booking API with provider as MoR vs. white label vs. net-rate reseller. Who handles payments and customer support?

### Takeaway
The models split three ways:
- **Provider is MoR / agency model:** Booking.com, Expedia Rapid (typically), Nuitée flights, and Duffel optionally via Duffel Payments.
- **Net-rate wholesale, partner is the merchant:** Hotelbeds, WebBeds, TBO, RateHawk.
- **Pure affiliate redirect:** Travelpayouts, Trip.com affiliate, and Booking.com's redirect flows.

For a startup that wants to stay out of seller-of-travel and payment-risk exposure, provider-as-MoR or affiliate models are lowest-risk. Net-rate wholesale makes WhereTo Trips the seller.

### Cited Findings
- **Nuitée (flights).** Nuitée is MoR when the traveller's card is charged, via Nuitée's Stripe SDK. Support is either "First Line" (Nuitée answers travellers) or "B2B-Relayed" — [LiteAPI: Flights Support & Billing Model](https://docs.liteapi.travel/docs/flights-support-billing-model)
- **Duffel.** Duffel Payments was built "exclusively for the travel industry in partnership with Stripe," letting travel businesses take customer payments through Duffel's API. A third-party blog describes Duffel acting as MoR in the flights context. It is not confirmed for Cars — [Travel Daily News (Duffel Payments)](https://www.traveldailynews.com/?p=155824); [TravelBookingPanel](https://travelbookingpanel.com/duffel-api-integration-how-travel-businesses-sell-flights-the-modern-way)
- **Duffel pricing.** Stays commission is paid by the accommodation provider on completed bookings, and Duffel shares it with the partner. The Cars page says partners "earn revenue on every booking with built-in pricing and commission support." Duffel's blog says Meta Muse bookings come with "24/7 expert support" — [Duffel Pricing](https://duffel.com/pricing); [Duffel Cars](https://duffel.com/cars); [Travel Daily News: Meta Muse](https://www.traveldailynews.com/technology/metas-muse-adds-duffel-for-ai-powered-travel-bookings)
- **Booking.com.** Stable cars and attractions flows are "search, look & redirect," so the booking completes on Booking.com. Native "search, look & book" needs extra approval. A secondary source says direct booking via Orders endpoints needs "Search, Look & Book approval, a sound business case, and appropriate contractual permissions" — [Booking.com: About Car Rentals](https://developers.booking.com/demand/docs/cars/overview); [Vorp Labs: Booking Demand API](https://vorplabs.com/agent-tools/booking-demand-api)
- **Expedia WLT.** Expedia hosts and powers a partner-branded site, and partners can award their own loyalty points. TAAP (the agent program) requires IATA, ARC, CLIA or TRUE credentials, so it does not suit a consumer app — [Expedia White Label Template](https://partner.expediagroup.com/en-us/solutions/build-your-travel-experience/white-label-template); [AltexSoft: Expedia TAAP](https://www.altexsoft.com/blog/travel/expedia-taap-rapid-api-partner-solutions/)
- **Holibob.** Going live requires a signed commercial agreement. In sandbox, "no supplier ever contacted and no payment ever charged" — [ShortTermRentalz](https://shorttermrentalz.com/news/holibob-launches-toolkit-experience-bookings/)
- **Travelpayouts.** Affiliate network: program links, widgets, white labels, APIs and data feeds, plus a statistics API for booking data — [Travelpayouts: About programs](https://support.travelpayouts.com/hc/en-us/articles/203955763-About-programs-on-the-Travelpayouts-platform); [Travelpayouts statistics API](https://support.travelpayouts.com/hc/en-us/articles/360019864079-API-of-affiliate-programs-booking-statistics)
- **Trip.com affiliate.** The commission model is voided if the customer cancels, with a 30-day web cookie and 7-day app cookie — [Awin: Trip.com](https://ui.awin.com/merchant-profile/22405)
- **Hotelbeds, WebBeds, TBO, RateHawk** are B2B wholesalers selling to OTAs, tour operators and agencies via API — [Hotelbeds Developer](https://developer.hotelbeds.com/); [ITB advertorial: RateHawk](https://news.itb.com/?p=48415); [PHPTRAVELS: WebBeds](https://phptravels.com/blog/how-webbeds-api-integration-works)

### Inferences
- **Wholesalers (Hotelbeds, WebBeds, TBO, RateHawk) almost certainly sell at net rates, with the partner collecting payment and fronting support.** This is the standard B2B wholesale model, but it was not confirmed per provider in this session. WhereTo Trips would then become MoR and need payments, fraud and chargeback handling, a seller-of-travel registration (CA/FL/WA/HI, inferred), and a support desk. That is a big departure from the current Nuitée setup.
- **Affiliate redirects** (Travelpayouts, Trip.com, Booking.com redirect) are the lowest-effort and lowest-risk, but break the in-app native experience and pay less.
- **Duffel** sits in between. It offers a native API and Stripe-based payments, and it offers support for some partners (Meta Muse, Robinhood). Who is MoR for Cars specifically needs confirmation.

### Gaps
- MoR and customer-support terms for Expedia Rapid Car API, Rapid Activities, Duffel Cars, HTS Cars and Priceline cars were not documented in the sources found.
- No Hotelbeds payment-model documentation (net rate vs. commissionable) was retrieved.

---

## 4. API quality, in-app native booking capability and SDKs

### Takeaway
For a native iOS/Android booking flow:
- **Duffel** has the strongest developer reputation and native car booking.
- **Holibob** now ships a drop-in SDK for experiences. It is web components, not native mobile.
- **Expedia Rapid** is mature for hotels, but its activities API is beta.
- **Booking.com** cars and attractions are mostly redirect, and cars cannot be sandboxed.
- **GDS APIs** are heavy.
- **Amadeus Self-Service** is gone.

### Cited Findings
- **Duffel** is described as "popular with startups because of its pay-as-you-go pricing with no upfront commercial commitment." Sabre is noted for "a longer onboarding and certification timeline." Duffel has a public changelog with 2026 updates: split-ticket itineraries, negotiated hotel-chain rates, and a taxes/fees breakdown (Sept 28, 2026). Duffel Cars has a "Getting Started with Cars" guide — [Teenvaai: Best Flight APIs 2026](https://teenvaai.com/blogs/best-flight-apis-for-travel-startups-2026); [Duffel Changelog](https://changelog.duffel.com/); [Duffel: Getting Started with Cars](https://duffel.com/docs/guides/getting-started-with-cars)
- **Robinhood Travel** keeps "the entire search, comparison, and payment process inside the Robinhood app" using Duffel. This is evidence of native in-app booking for flights, hotels and cars — [FF News](https://ffnews.com/news/embargoed-robinhood-taps-duffel-to-power-its-travel-platform-104667f3); [Nomad Lawyer](https://www.nomadlawyer.org/robinhood-integrates-duffel-travel-bookings-platinum-gold-cardholders-2026)
- **Booking.com.** Only accommodation flows book in the sandbox; cars and attractions do not. The car API "is not in the sandbox," so testing must happen in production — [AnchorTerminal](https://www.anchorterminal.com/compare/booking-demand-api-vs-liteapi); [Booking.com: About Car Rentals](https://developers.booking.com/demand/docs/cars/overview)
- **Holibob SDK.** Web components plus a lightweight server proxy, configured with two credentials and run locally with three commands. It produces search, results, product pages and checkout. Holibob claims build time drops from about 6 months to as little as 3 days; this is a company claim — [Breaking Travel News](https://www.breakingtravelnews.com/news/article/holibob-launches-sdk-that-cuts-experience-booking-integration-from-six-mont/); [Travolution](https://www.travolution.com/en/article/holibob-launches-software-development-kit-to-cut-integration-times-to-days)
- **Expedia Rapid Activities** covers discovery, shopping, booking and management, so it is built for fully custom native flows. It is early-access only — [Rapid Activities API overview](https://developers.expediagroup.com/rapid/activities); [Travel PR News](https://travelprnews.com/expedia-group-b2b-expands-full-trip-platform-with-rapid-activities-api-and-tiqets-beta-in-taap/travel-press-release/2026/10/01/)
- **Expedia Rapid access.** You apply as a partner, receive an API key and shared secret after approval, then build in sandbox before a launch review (third-party guide) — [PHPTravels: Expedia API](https://phptravels.com/expedia-api-integration)
- **Hotelbeds** offers a free API key and evaluation plan, then certification — [Tripgic: Hotel API providers 2026](https://www.tripgic.com/playbook/hotel-api-providers/)
- **LiteAPI** has SDKs (Python, Java) and an AI-agent docs index (llms.txt) — [LiteAPI Python reference](https://docs.liteapi.travel/reference/python); [liteapi-travel/java-sdk](https://github.com/liteapi-travel/java-sdk)
- **Spotnana** builds its own UI on the same public APIs, enabling white-label or embedded use — [Spotnana developer portal](https://developer.spotnana.com/)
- **Travelport/Sabre** car APIs are XML/GDS-based. Travelport offers 30-day test access (undated third-party source) — [AltexSoft: Car rental APIs](https://www.altexsoft.com/blog/engineering/car-rental-apis-integrations-with-gdss-otas-and-tech-providers/)

### Inferences
- **For a React Native or Swift/Kotlin app**, Duffel's REST/JSON API and Holibob's Partner API (rather than its web-component SDK) are the most plausible native builds.
- **Holibob's web components** would need a WebView or a rebuild in native UI.
- **Expedia Rapid** is a strong REST API, but Rapid Activities will not be available to WhereTo Trips until at least early 2027, unless it is selected for the beta.

### Gaps
- No direct evidence on mobile-native SDKs (iOS/Android) from any of these providers. All the SDKs found are web or server-side.
- API latency, uptime or developer-experience benchmarks were not found.

---

## 5. Commission/revenue terms and onboarding requirements (approval, volume minimums, enterprise-only)

### Takeaway
Published terms are scarce:
- Most multi-vertical B2B APIs (Expedia, Booking.com, Priceline, HTS, GDSs) are partner-gated with negotiated terms.
- Duffel and Hotelbeds have the most startup-accessible onboarding.
- Kiwi Tequila and Amadeus Self-Service are closed to new developers.
- Affiliate rates for cars and activities are roughly 2–5% of booking value at Trip.com.

### Cited Findings
- **Booking.com Demand API** requires "Managed Affiliate Partner status, a signed contract, and Account Manager-enabled Partner Centre access before credentials are issued. There is no self-serve tier, no anonymous sandbox" (secondary source, July 2026). A scraping vendor claims the partner portal is not accepting new registrations (unverified) — [Vorp Labs](https://vorplabs.com/agent-tools/booking-demand-api); [Crawlora](https://crawlora.net/platforms/booking)
- **Booking.com affiliate commission** was historically 25–40% of Booking.com's commission, tiered by monthly stayed bookings. This comes from an older AltexSoft guide and is unverified for 2026 — [AltexSoft: Booking.com partnerships](https://www.altexsoft.com/blog/booking-com-partnerships-apis-extranet-pulse-app/)
- **Priceline Partner Solutions** is partner-gated. Docs and sandbox come only after a signed agreement, onboarding expects about 5 bookings/day, there are volume tiers and 2–3 months of development, and pricing is negotiated per client (third-party sources) — [Supergood: Priceline](https://supergood.ai/api-report-card/priceline); [AltexSoft: Priceline API](https://www.altexsoft.com/techtalks/how-to-integrate-priceline-api/)
- **Expedia WLT** assigns a Launch Manager plus a commercial contact. No commission rates are published. Rapid approval is said to take 4–12 weeks (low-quality third-party source) — [Expedia WLT](https://partner.expediagroup.com/en-us/solutions/build-your-travel-experience/white-label-template); [Adivaha](https://www.adivaha.com/expedia-api.html)
- **Expedia Rapid Activities** is "selected partners only" until GA in early 2027 — [Rapid Activities API overview](https://developers.expediagroup.com/rapid/activities)
- **Duffel** has a bespoke, enterprise-style published pricing model. Stays commission is shared with the partner. No Cars-specific commission rate is published — [Duffel Pricing](https://duffel.com/pricing); [Duffel Cars](https://duffel.com/cars)
- **Holibob** has free sandbox credentials. Going live needs a commercial agreement — [ShortTermRentalz](https://shorttermrentalz.com/news/holibob-launches-toolkit-experience-bookings/)
- **Hotelbeds** offers a free API key and evaluation plan, then certification. One blog claims immediate sandbox access on registration without a commercial agreement (third-party, unconfirmed) — [Tripgic](https://www.tripgic.com/playbook/hotel-api-providers/)
- **Trip.com affiliate (Awin) default rates:** Car Rental 5%, Airport Transfers 5%, Tickets 2.5%, Other activities 4%. An Ecomobi campaign lists Car Rental 4%, Airport Transfer 4%, Tickets & Attractions 1.2%. These conflict by network and date — [Awin: Trip.com](https://ui.awin.com/merchant-profile/22405); [Ecomobi](https://ecomobi.com/guide-to-join-travel-affiliate-program-with-trip-com)
- **Travelpayouts.** From Apr 27, 2026, projects are auto-connected to all relevant programs, with no per-program applications. A third-party source says Travelpayouts' flight API access requires 50,000+ MAU — [Travelpayouts: About programs](https://support.travelpayouts.com/hc/en-us/articles/203955763-About-programs-on-the-Travelpayouts-platform); [PHPTRAVELS: Kiwi Tequila 2026](https://phptravels.com/blog/comprehensive-guide-to-flights-api-integration)
- **Kiwi.com Tequila** has been invitation-only since about May 30, 2024 — [Kiwi.com partners: Tequila](https://partners.kiwi.com/our-solutions/tequila/)
- **Amadeus Self-Service** is closed. New registrations were paused in March 2026 and the portal was decommissioned July 17, 2026 — [PhocusWire](https://www.phocuswire.com/amadeus-shut-down-self-service-apis-portal-developers); [Amadeus for Developers](https://developers.amadeus.com/)
- **TBO** releases APIs per account contract — [PHPTRAVELS: TBO](https://phptravels.com/de/integrations/tbo-api-integration)
- **LiteAPI** pricing includes dashboard add-ons such as AI Insights at $4.99/month — [LiteAPI: API Pricing & Usage Costs](https://docs.liteapi.travel/reference/api-pricing-usage-costs)

### Inferences
- **Startup-accessible native options (no volume minimum found):** Duffel (cars) and Holibob (experiences/events), plus possibly Hotelbeds (activities/transfers) via evaluation and certification.
- **Partner-gated, likely needing traction or a business case:** Expedia (Rapid cars, WLT), Booking.com, Priceline and HTS.
- **Effectively unavailable to new US startups in 2026:** Kiwi Tequila (invite-only) and Amadeus Self-Service (shut down).

### Gaps
- No published commission percentages for Duffel Cars, Expedia Rapid Car/Activities, Booking.com cars/attractions, HTS Cars, Priceline cars, Hotelbeds activities or Holibob.
- No Travelpayouts per-program car and activity commission rates were retrieved (e.g., DiscoverCars, GetYourGuide, Viator, Klook, Tiqets).

---

## 6. Known clients (fintechs, banks, super-apps, airlines) and recent news 2024–2026

### Takeaway
2026 has seen "full-trip" consolidation:
- **Expedia** bought Tiqets (activities) and agreed to buy CarTrawler (cars).
- **Duffel** added cars and won Robinhood and Meta.
- **Capital One** took its Hopper-built travel stack in-house.
- **Holibob** shipped an SDK.
- **Amadeus** closed self-service.
- **Mondee** went through bankruptcy.

The fintech-embedded travel trend (Robinhood, Capital One, Grab, banks) is directly relevant to WhereTo Trips' positioning.

### Cited Findings
- **Duffel clients and metrics.**
  - Robinhood Travel (announced ~Oct 8, 2026) for Platinum/Gold cardholders: flights, 1.6M hotels, and cars across 40,000 locations via Duffel Cars.
  - Meta's Muse AI agent: US flight booking on 500+ airlines (Sept 2026).
  - Rippling Travel (April 2026 blog).
  - TTV run-rate of about $900M, with 85% of volume from the US.

  Sources: [FF News](https://ffnews.com/news/embargoed-robinhood-taps-duffel-to-power-its-travel-platform-104667f3); [Deep Arrival: Meta Muse](https://deeparrival.com/news/meta-muse-agent-books-travel-september-2026/); [Travel Daily News: Meta Muse](https://www.traveldailynews.com/technology/metas-muse-adds-duffel-for-ai-powered-travel-bookings); [BusinessCloud](https://businesscloud.co.uk/news/duffel-hits-900m-run-rate-and-launches-cars-vertical/); [Duffel blog](https://duffel.com/blog)
- **Expedia B2B.** Despegar and Global Hotel Card are live with newer APIs across cars, activities, flights and trip protection. US Uber users get 700,000 properties, starting with hotels. Global Hotel Card and Flights Guru are in the activities betas — [Explore 2026 recap](https://partner.expediagroup.com/en-gb/resources/blog/explore-2026-partner-conference-recap); [Travel PR News](https://travelprnews.com/expedia-group-b2b-expands-full-trip-platform-with-rapid-activities-api-and-tiqets-beta-in-taap/travel-press-release/2026/10/01/)
- **Expedia and CarTrawler.** CarTrawler partners with Airbnb. No statement has been made on that partnership's future post-acquisition — [Global Traveler](https://www.globaltravelerusa.com/airbnb-partners-with-car-rental-platform-launches-in-5-countries/)
- **HTS and Capital One.**
  - Capital One paid Hopper a "payout" to acquire the technology, supplier relationships and about 150 employees behind Capital One Travel (Skift, Mar 17, 2026; first reported Nov 2025).
  - Hopper says Capital One remains its largest B2B client, now for fintech products.
  - Capital One plans direct supplier connections.

  Sources: [Skift, Mar 17, 2026](https://skift.com/2026/03/17/capital-one-to-make-payout-to-acquire-the-hopper-tech-and-employees-that-built-its-travel-portal/); [Skift, Nov 24, 2025](https://skift.com/2025/11/24/capital-one-set-to-acquire-hopper-travel-software-and-hire-key-hotel-and-engineering-staff-scoop/); [BetaKit](https://betakit.com/hoppers-biggest-customer-is-bringing-its-travel-platform-in-house/); [Nasdaq](https://www.nasdaq.com/articles/cof-take-full-control-travel-platform-hopper-tech-deal)
- **HTS partners.** Air Canada, Virgin Australia, Tripadvisor and Frontier. Since April 2026 it has added Wizz Air, Porter, Avelo and WestJet. Other partners are Sumitomo Mitsui Card V Trip (Japan) and Gother (APAC, Mar 2026) — [Travel Voice](https://www.travelvoice.jp/english/hopper-technology-solutions-sees-a-great-business-opportunity-in-partnership-with-sumitomo-mitsui-card-v-trip); [HTS LinkedIn](https://www.linkedin.com/company/hts-hopper-technology-solutions); [HTS Summer 2026 update](https://hts.hopper.com/news/summer-2026-platform-update)
- **Nuitée clients.** Grab (exclusive accommodation partnership), Stippl (Aug 2026), Attijariwafa Bank and Globe Thrivers (2026) — [Nuitée homepage](https://nuitee.com/); [Nuitée Insights](https://nuitee.com/insights?sortby=LiteAPI)
- **Booking.com Demand API client:** Stay22 — [Booking.com: How Stay22 uses the Demand API](https://partnerships.booking.com/resources/article/how-stay22-leverages-the-demand-api)
- **Spotnana clients.** Brex, Marriott (Business Access by Marriott Bonvoy), Lufthansa, SAS, Cadence; Trainline rail added Aug 2026 — [Spotnana Marriott](https://spotnana.com/?p=3205); [Business Travel Mag](https://thebusinesstravelmag.com/spontana-integrates-with-trainline-partner-solutions/)
- **Ascenda clients.** OCBC, JAL, Ramp (2024 transfers), Galileo Financial Technologies (early 2025) — [AAP/Cision](https://www.aap.com.au/aapreleases/cision20230710ae51794); [eGlobal Travel Media](https://www.eglobaltravelmedia.com.au/japan-airlines-partners-with-ascenda-and-loylogic-to-launch-jal-mileage-bank-world-marketplace/)
- **Holibob.** SDK (Sept 2026), conversational booking (June 2026), Google Things to Do distribution, and acquisition of TourismSolved — [Travolution](https://www.travolution.com/en/article/holibob-launches-software-development-kit-to-cut-integration-times-to-days); [PhocusWire](https://www.phocuswire.com/news/technology/holibob-conversational-booking-travel-experiences); [Travel Daily News](https://www.traveldailynews.com/post/holibob-acquires-content-and-marketing-platform-tourismsolved)
- **Agoda and Resorts World Genting** direct integration including attractions (June 18, 2026) — [RWG press release](https://www.rwgenting.com/content/dam/approved/rw-genting/web/images/press-releases/2026/20260618-RWGXAGODA-ENG.pdf)
- **Mondee to Tabhi** restructuring (2025) — [PhocusWire](https://www.phocuswire.com/mondee-acquired-chapter-11-restructuring-tabhi)

### Inferences
- **The Capital One–Hopper split** shows large clients eventually in-sourcing. It also signals that HTS is pivoting harder to fintech ancillaries and airline/enterprise partners. That makes HTS a poor fit for a small consumer startup that needs cars or experiences inventory.
- **Duffel's wins** with Robinhood (fintech) and Meta (AI agent) closely match WhereTo Trips' profile: an AI "Vibe Engine" with embedded booking.

### Gaps
- No named 2026 startup or consumer-app clients were found for Hotelbeds activities, Priceline Partner Solutions or Booking.com cars/attractions.
- Could not confirm whether CarTrawler's acquisition closed by October 2026.

---

## 7. Pros and cons for a startup consumer app, and conflict risk with keeping Nuitée for hotels/flights

### Takeaway
The lowest-friction architecture appears to be: keep Nuitée for hotels and flights, add Duffel Cars (or an affiliate car program) for cars, and add Holibob (or Hotelbeds activities) for experiences and events. Re-evaluate Expedia Rapid when Activities reaches GA in early 2027 and CarTrawler is integrated, because Expedia could then replace several integrations at once.

Booking.com carries an extra risk for an AI-driven app. Its partner terms reportedly restrict the use of AI systems without written approval.

### Cited Findings
- **Booking.com AI restriction.** General Partner Terms v5 reportedly prohibit "using an AI system, or technology based on or integrated with one, in performing the agreement without Booking.com's prior written approval" (secondary source; the primary text was not verified). Customer Terms bar "automated assistants (including ... AI-powered assistants) to make bookings" — [Vorp Labs](https://vorplabs.com/agent-tools/booking-demand-api); [ConductAtlas: AI assistants provision](https://conductatlas.com/platform/bookingcom/bookingcom-terms-and-conditions/provision/CA-P-076606/ai-powered-assistants-prohibited-from-making-bookings-without-permission/)
- **Booking.com flows.** Cars and attractions default to redirect, cars cannot be sandboxed, and native car booking needs special Beta permission — [Booking.com: About Car Rentals](https://developers.booking.com/demand/docs/cars/overview)
- **Expedia timing.** Rapid Activities GA is "early 2027" (press) or "2027" (dev hub). CarTrawler closing is expected H2 2026 — [Travel PR News](https://travelprnews.com/expedia-group-b2b-expands-full-trip-platform-with-rapid-activities-api-and-tiqets-beta-in-taap/travel-press-release/2026/10/01/); [BusinessWire](https://secure.businesswire.com/news/home/20260519556732/en/Expedia-Group-announces-agreement-to-acquire-CarTrawler-advancing-strategy-to-build-the-most-complete-B2B-travel-platform)
- **Duffel** offers cars, flights and stays in one API with 85% US volume. It is used by Robinhood natively in-app — [BusinessCloud](https://businesscloud.co.uk/news/duffel-hits-900m-run-rate-and-launches-cars-vertical/); [FF News](https://ffnews.com/news/embargoed-robinhood-taps-duffel-to-power-its-travel-platform-104667f3)
- **Holibob** has 500k+ products including live events, a free sandbox, and a commercial agreement to go live — [Breaking Travel News](https://www.breakingtravelnews.com/news/article/holibob-launches-sdk-that-cuts-experience-booking-integration-from-six-mont/)
- **LiteAPI** advertises "zero contracts" — [AnchorTerminal](https://www.anchorterminal.com/compare/booking-demand-api-vs-liteapi)
- **Kiwi Tequila** is invite-only, and **Amadeus Self-Service** is shut down — [Kiwi.com partners](https://partners.kiwi.com/our-solutions/tequila/); [Amadeus for Developers](https://developers.amadeus.com/)
- **Mondee** went through Chapter 11 and was restructured as Tabhi, which carries counterparty risk — [Law360](https://law360.com/articles/2284492/ai-travel-app-co-mondee-files-ch-11-with-sale-plans)

### Inferences

Per-provider pros and cons for WhereTo Trips:

- **Duffel**
  - Pros: native cars API with major US brands (Hertz, Avis, Enterprise, Sixt); a startup-friendly reputation; US-heavy volume; a proven fintech in-app use case; Stripe-based payments.
  - Cons: no experiences or events; cars commission and MoR terms are unpublished.
  - Nuitée conflict: Duffel also sells flights and stays, so WhereTo could later consolidate onto Duffel or use it as a flights fallback. Low conflict risk, because LiteAPI advertises no contracts (to be verified).
- **Expedia Rapid / WLT**
  - Pros: the broadest single-vendor roadmap (hotels, flights, cars, activities via Tiqets, ground transport via CarTrawler) and a strong brand.
  - Cons: activities are not available to non-selected partners until 2027; onboarding is partner-gated and likely needs traction; WLT is a hosted web template that may not fit a native app; commission is unpublished.
  - Nuitée conflict: using Expedia only for cars and activities while Nuitée keeps hotels is plausible. Expedia may prefer partners take lodging too, which needs commercial confirmation.
- **Booking.com Demand API**
  - Pros: a huge brand and car inventory.
  - Cons: Managed Affiliate status required; cars and attractions redirect by default; cars cannot be sandboxed; the AI-system clause is a material risk for an AI "Vibe Engine"; no flights.
  - Nuitée conflict: medium. The partnership likely expects accommodation focus, which needs confirmation.
- **Hotelbeds**
  - Pros: native activities and transfers APIs with an evaluation key; global coverage.
  - Cons: B2B wholesale, so WhereTo Trips likely becomes MoR and support provider (inferred); car rental via CARNECT is dated or unclear; US consumer-app fit is less proven.
  - Nuitée conflict: none apparent, but Hotelbeds hotel inventory would overlap if used.
- **Holibob**
  - Pros: the only one found covering tours, attractions, live events and dining in one API; SDK; free sandbox; a modern AI/conversational focus.
  - Cons: UK-origin, so US events depth is unverified; web-component SDK rather than native mobile; commercial terms unknown.
  - Nuitée conflict: none (no overlap).
- **HTS:** enterprise and airline-oriented, now fintech-led after Capital One. Unlikely to onboard an early-stage app; cars yes, no activities.
- **Priceline Partner Solutions:** hotels, flights and cars, but gated, with ~5 bookings/day expectations and negotiated terms. No experiences.
- **TBO / WebBeds / RateHawk:** B2B agency-oriented with hotel-centric APIs. Ground and activities products are contract-dependent or dated, so they are weak fits for a US consumer app.
- **Travelport / Sabre:** heavy GDS onboarding with cars but no experiences. Overkill for this use case.
- **Spotnana:** corporate travel platform, not consumer leisure.
- **Travelpayouts / Trip.com affiliate:** quickest way to add cars, transfers and tours (minutes to days), but redirect/affiliate only, with lower revenue (Trip.com: 1.2–5%) and no in-app checkout. A good interim "phase 0" while native APIs are negotiated.
- **Kiwi Tequila, Amadeus Self-Service, Mondee:** effectively not options for a new startup in 2026.

Rate parity and exclusivity: no evidence was found of exclusivity or rate-parity obligations in LiteAPI's self-serve model that would block adding other suppliers for cars or experiences. Rate-parity issues mainly arise if a second supplier also sells hotels and the app displays both. Using non-overlapping verticals (cars and experiences only) avoids that (inference).

### Gaps
- Primary-source text of Booking.com General Partner Terms v5 (the AI clause) was not verified.
- LiteAPI and Nuitée commercial terms (exclusivity, MFN, non-compete) were not reviewed. Check WhereTo Trips' signed agreement.
- Duffel Cars commission levels, MoR status and support coverage need direct confirmation from Duffel sales.
- Not checked due to the exhausted search budget: Expedia Rapid Car API eligibility for small partners, HTS Cars onboarding, Hotelbeds 2026 car offering, and Holibob US events coverage and commission.
