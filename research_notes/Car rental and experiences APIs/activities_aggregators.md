# B2B Wholesalers, Aggregators and Connectivity Platforms for Tours, Activities and Excursions (the "Nuitée-like" layer for experiences) — research notes, as of 11 Oct 2026

> **How these notes were collected (read first).** Direct page fetches failed for every domain I tried (holibob.tech, docs.holibob.tech, developer.hotelbeds.com, developers.rezdy.com, docs.ventrata.com, docs.octo.travel, travolution.com, breakingtravelnews.com, airtechzone.iata.org). They all returned DNS or proxy-denied errors. The shared web-search budget then ran out partway through, so I could not run planned searches on Withlocals/ToursByLocals, Klook's API, recent Rezdy ownership news, Bridgify after the acquisition, Viator/GYG commission rates or 2026 OCTO adoption numbers. Every finding below comes from search-engine result summaries and snippets, not full-page reads, and the cited URL is the page the snippet came from. Exact numbers and quotes should be re-checked on the source page before anyone relies on them. Anything from my own background knowledge that I could not re-verify in this session is labeled **"unverified"** and kept in Inferences or Gaps.

## Q1. What is each provider? (aggregator/wholesaler vs. supplier-side booking system with reseller marketplace vs. connectivity standard)

### Takeaway
The true "Nuitée-like" aggregators are the ones that offer one API, normalised multi-source supply and their own merchant/fulfilment stack. On that test only a handful qualify: Holibob, HBX Group/Hotelbeds (which now owns Bridgify), TUI Musement, Travel Curious Group (formerly Redeam) and, in older and partly unconfirmed data, Livn and Hopper/PlacePass. A different group are supplier-side reservation systems that run reseller marketplaces: Bókun, Rezdy, FareHarbor, Ventrata, Peek, Checkfront and Zaui. With these a reseller still needs per-supplier commercial agreements. OCTO is only a connectivity standard. It provides no inventory and no merchant services.

### Cited Findings
**True aggregators / wholesalers (one API, many sources)**
- **Holibob (UK).** Describes itself as "the e-commerce engine for experiences". Coverage of its September 2026 SDK launch says the catalogue spans **500,000+ live bookable products aggregated from 45+ API partners plus direct supplier contracts**. Partners can take it as a storefront, widget, API or agent desktop. — [Travolution](https://www.travolution.com/en/article/holibob-launches-software-development-kit-to-cut-integration-times-to-days); [Breaking Travel News](https://www.breakingtravelnews.com/news/article/holibob-launches-sdk-that-cuts-experience-booking-integration-from-six-mont/); [TOM.travel, 22 Sep 2026](https://www.tom.travel/2026/09/22/holibob-lance-un-kit-de-developpement-pour-proposer-des-experiences-en-ligne)
- Holibob's homepage says it has "aggregated supply from 45+ API partners, normalised into a single clean catalogue". — [holibob.tech](https://holibob.tech/)
- A third-party roundup says Holibob "focuses primarily on distribution connectivity for travel brands rather than full end-to-end supply aggregation" and is designed to plug into a brand's existing suppliers. This **conflicts** with Holibob's own claim of 45+ aggregated API partners and 500k products, and the roundup is a low-authority source. — [Vocal.media roundup](https://vocal.media/01/travel-experiences-distribution-platforms-top-travel-ap-is-and-white-label-solutions); contradicted by [holibob.tech](https://holibob.tech/)
- IATA's AIR Tech Zone startup response document calls Holibob "a leading B2B provider of global tours and experiences". — [IATA AIR Tech Zone PDF](https://airtechzone.iata.org/tech-players-responses/slides/pdf/Startups_Responses_Holibob.pdf)
- **Hotelbeds / HBX Group (Spain).** A B2B bedbank whose ancillaries ("Beyond the Bed") include activities and transfers. It earns a margin between negotiated supplier rates and the price it sells to distributors, and per Wikipedia it works with ~23,000 experience providers. — [Wikipedia: HBX Group](https://en.wikipedia.org/wiki/HBX_Group)
- **Bridgify (Israel, now part of HBX).** HBX Group agreed in May 2026 to acquire 100% of Bridgify. Bridgify was founded in 2019 and offers an AI-powered platform with access to 1M+ experiences from global suppliers. Partners integrate through API connectivity and white-label marketplaces. — [PhocusWire](https://www.phocuswire.com/news/technology/hbx-group-acquires-bridgify); [HBX Group press release](https://www.hbxgroup.com/news-room/press-release/hbx-group-acquires-bridgify-combining-ai-and-experiences); [TTG Asia](https://www.ttgasia.com/?p=117658); [Pulse 2.0](https://pulse2.com/hbx-group-acquires-bridgify-to-expand-experiences-ecosystem/)
- A 2026 vendor comparison calls Bridgify an "aggregator of aggregators". — [IBM Community blog, Apr 2026](https://community.ibm.com/community/user/blogs/jacobo-weizenblut/2026/04/20/best-things-to-do-apis-partner-platforms-2026-for)
- **TUI Musement (TUI Group).** A B2B distributor that offers "API and white label distribution platforms" over its own curated portfolio. — [TUI Group, 6 Oct 2023](https://tuigroup.com/en-en/media/press-releases/2023/2023-10-06-tui-driving-further-growth-in-tours-and-activities)
- **Travel Curious Group (formerly Travel Curious + Redeam).** Travel Curious acquired Redeam, an experiences connectivity/middleware platform, in July 2025. It is retiring the Redeam brand and positions the combined "Unified Experience Platform (UXP)" as end-to-end infrastructure across supply, distribution and monetisation for travel, hospitality and loyalty. — [Travolution](https://www.travolution.com/news/travel-sectors/tours-and-activities/travel-curious-acquires-redeam-relocates-its-global-hq/); [Airguide](https://airguide.info/travel-curious-acquires-redeam-forms-travel-curious-group/)
- **Livn (Sydney).** A B2B-only aggregator serving travel agents and online retailers through one API. — [TTG Asia](https://www.ttgasia.com/?p=26800); [PhocusWire (2018)](https://www.phocuswire.com/Launch-pitch-LIVN). Dealroom marks Livn as "Acquired" without naming the buyer. — [Dealroom](https://app.dealroom.co/companies/livn_1_1)
- **Hopper / PlacePass.** Hopper acquired PlacePass in Oct 2021. PlacePass was described as "one of the world's largest activity aggregators" and was distributed through Hopper Cloud (HTS). — [Hopper newsroom](https://media.hopper.com/news/hopper-acquires-placepass-to-lead-its-travel-experiences-offering); [PhocusWire](https://www.phocuswire.com/Hopper-buys-PlacePass-tours-activities-strategy)
- **Magpie.** A B2B distribution platform for tours, activities and attractions that connects operators with resellers (OTAs, DMOs, agents), built on OCTO. — [Magpie OCTO docs](https://docs.magpie.travel/octo/); [Magpie partners](https://about.magpie.travel/octo)
- **Rayna Tours (Dubai).** A destination management company founded in 2006 that also runs a B2B platform ("RaynaB2B"). — [Craft](https://craft.co/rayna-tours); [RaynaB2B on App Store](https://apps.apple.com/us/app/-/id1644044308)
- **WebBeds.** A WebBeds recruitment listing describes the company as offering "ground services (hotels, transfers, tours, activities) to travel professionals". — [Job listing (lucrezi.ro)](https://www.lucrezi.ro/munca/mapping-executive-ronvbce748e0426e5ad7)
- **TBO Holidays.** Sells "sightseeing" through its B2B portal. A third-party integrator lists API coverage of sightseeing as "TBO to confirm". — [PHPTRAVELS TBO profile](https://phptravels.com/ja/providers/tbo-holidays)

**Supplier-side booking systems (reservation software for operators) with reseller marketplaces/APIs**
- **Bókun (Tripadvisor-owned).** Operator reservation software with a supplier–reseller Marketplace. It also offers a Channel Manager API and an OCTO Core API, and is a Viator "Top Connectivity Partner". — [Bókun APIs](https://bokun.io/grow/apis); [Viator connectivity partners](https://operatorresources.viator.com/viator-connectivity-partners/); [Bókun & Viator](https://www.bokun.io/viator-partners)
- **Rezdy.** Operator software with an Agent API for "Rezdy agents and OTAs" and a NextGen Reseller API v2. RezdyConnect is a separate supply-side API that powers Rezdy's Channel Manager for suppliers on other ticketing systems. — [Rezdy Agent API](https://developers.rezdy.com/rezdyapi/index-agent.html); [Rezdy Reseller API v2](https://developers.rezdy.com/rezdyapi/index-reseller.html); [RezdyConnect](https://developers.rezdy.com/rezdyconnect/index.html)
- **FareHarbor (Booking Holdings, acquired 2018).** Operator software. It runs the FareHarbor Distribution Network (FHDN), an affiliate network, and a partner-gated External API. — [Arival](https://arival.travel/fareharbor-adds-kayak-com-to-distribution-network-putting-spotlight-on-tech-providers-as-distributors/); [Supergood API report card](https://supergood.ai/api-report-card/fareharbor)
- **Ventrata.** Ticketing and reservation software for operators and attractions, with an OCTO API that resellers connect to. — [Ventrata OCTO API docs](https://docs.ventrata.com)
- **Peek (Peek Pro).** Operator software. A third-party source says it has a public REST API (octodocs.peek.com) that implements OCTO for resellers connecting to Peek Pro suppliers. — [Supergood: Peek Pro](https://supergood.ai/api-report-card/peek-pro)
- **Checkfront.** Operator booking software. Third-party listings say it supports reseller/agent accounts with commissions and API connections. — [Findstack](https://findstack.com/products/checkfront/competitors/alternatives); [Checkfront API docs](https://checkfront-api.readthedocs.io/)
- **Zaui and TuriTop** are other operator systems that publish OCTO APIs. — [Zaui OCTO](https://docs.zaui.com/octo); [TuriTop OCTO](https://developers.turitop.com/octo/)

**Connectivity standard**
- **OCTO.** A not-for-profit formed in 2022 by a consortium of technology providers, distributors and others. It governs an open API spec for tours, activities and attractions: a core booking API plus optional capabilities for content, pricing, pickups and more. — [PhocusWire](https://www.phocuswire.com/octo-next-step-simplifying-connectivity-tours-activities-stakeholders)
- OCTO Standard NP Inc. is a 501(c)(3) member corporation registered in Delaware. CauseIQ says "formed in 2024", which **conflicts** with the 2022 formation date reported elsewhere (it may be the date the non-profit was incorporated). — [CauseIQ](https://causeiq.com/organizations/octo-standards-np,882187508)

**Consumer marketplaces that also run B2B APIs (context: these are the alternatives the "aggregator" layer competes with)**
- **Viator** (merchant API and affiliate tiers) — [Viator Partner API docs](https://docs.viator.com/partner-api/). **Tiqets** Distributor API — [Tiqets API program](https://www.tiqets.com/partner-program/api-program). **Headout** Partner API — [Headout partner docs](https://partner.headout.com/docs). **GetYourGuide** Partner API — [Supergood: GYG](https://supergood.ai/api-report-card/getyourguide). **Expedia** (activities via EPS) — [AltexSoft](https://www.altexsoft.com/blog/travel/expedia-taap-rapid-api-partner-solutions/).

**Nuitée/LiteAPI itself**
- I found no LiteAPI activities, tours or experiences endpoint. All LiteAPI documentation found covers hotels (2M+ properties). — [LiteAPI docs](https://docs.liteapi.travel/reference/getting-started-1); [Nuitée blog, Feb 2026](https://nuitee.com/insights/building-travel-ai-liteapi); [liteapi-travel npm](https://npmjs.com/package/liteapi-travel)

### Inferences
- For WhereTo, only the aggregators (Holibob, HBX/Hotelbeds+Bridgify, TUI Musement, Travel Curious) and the marketplace B2B APIs (Viator, Headout, Tiqets, GYG) can deliver broad global inventory through one contract. The supplier-side systems (Bókun, Rezdy, FareHarbor, Ventrata, Peek, Checkfront) are a supply-acquisition channel, not a turnkey inventory source.
- WhereTo cannot get experiences from its existing Nuitée/LiteAPI relationship based on what is documented. It needs a second provider.

### Gaps
- **Withlocals, ToursByLocals and similar private-guide platforms:** I could not search them before the search budget ran out, so I have no findings on their B2B or API programs.
- **WebBeds:** No developer documentation, endpoints or activities product details found. Only the 2022 transfers press release and a job listing.
- **Livn:** I could not confirm whether it is still independent or who acquired it.
- **Hopper/PlacePass:** No post-2021 source on whether it still operates for third parties.

---

## Q2. Business model: net rates vs. commission vs. provider as merchant of record — and who handles payment, refunds and customer support?

### Takeaway
Holibob is the closest documented match to the Nuitée/LiteAPI pattern. Its API documentation says partners integrate a Stripe payment flow "so that Holibob acts as the merchant of record", and it offers net-rate or commission-share commercial models. Viator's "Full + Booking" affiliate tier and Headout's affiliate route also keep the provider as merchant of record and customer-service owner. Viator's merchant tier, Hotelbeds and the supplier-side marketplaces (Bókun, Rezdy, Ventrata) push merchant-of-record duties, settlement and support onto the reseller.

### Cited Findings
**Holibob**
- Commercial models: "net rates or commission sharing". Its demand-partner model lets partners "capture commission that would otherwise have leaked away". — [holibob.tech](https://holibob.tech/)
- The API payment flow requires partners to integrate the Stripe payment flow "so that Holibob acts as the merchant of record". The partner channel is configured with payment type `REQUIRED`. The app fetches a Stripe PaymentIntent with the GraphQL `stripePaymentIntent` query (which returns id, amount, client secret, Stripe public key) and renders the Stripe form on the frontend. — [Holibob API payment flow](https://partner.documentation.holibob.tech/general/Working-version/the-holibob-api-payment-flow); [alt. path](https://partner.documentation.holibob.tech/general-api/Working-version/the-holibob-api-payment-flow)
- The platform guide's table of contents lists Services: **"Merchant Of Record", "Partner Support", "Supply Contracting"**. I could only see the TOC entries, not the page content. — [Holibob platform guide](https://docs.holibob.tech/docs/platform-guide/overview)
- The finance page covers payment methods (including Apple Pay and Google Pay), commission rates, promo codes and multi-currency. — [Holibob finance docs](https://docs.holibob.tech/docs/platform-guide/finance)
- The SDK starts in test mode, without processing payments or contacting activity providers. Going live requires "signing a commercial agreement with Holibob". — [ShortTermRentalz](https://shorttermrentalz.com/news/holibob-launches-toolkit-experience-bookings/)

**Hotelbeds / HBX**
- HBX's model is to negotiate rates with suppliers and earn a margin between those and the prices it sells to distributors (a wholesale/net-rate model). — [Wikipedia: HBX Group](https://en.wikipedia.org/wiki/HBX_Group)
- The 2025 Nemo transfers release credits cost savings to HBX's directly contracted supply. It does not describe partner net-rate mechanics. — [HBX/Nemo press release](https://www.hbxgroup.com/news-room/press-release/hbx-group-partners-nemo-distribute-transfers-portfolio-latam); [cms.hotelbeds.com copy](https://cms.hotelbeds.com/en-na/hotelbedsapi/api/v1/pdf/node/3744)

**Viator (benchmark)**
- **Merchant partners** are merchant of record and responsible for "all monetary transactions, customer support, and refunds". Viator invoices them periodically for product sales. They must show they have the right infrastructure before approval. — [Viator Partner API docs](https://docs.viator.com/partner-api/); [Viator technical guide](https://partnerresources.viator.com/travel-commerce/technical-guide/)
- **Affiliate tiers:** Basic (instant), Full (pre-approval; content and availability, no booking) and **Full + Booking**. Full + Booking customers book on the partner's site using Viator payment solutions, while **Viator remains merchant of record and handles customer service**. It requires authorization by Viator. — [Viator affiliate program](https://partnerresources.viator.com/travel-commerce/affiliate/); [Viator implementation guide](https://partnerresources.viator.com/travel-commerce/implementation/)

**Headout / Tiqets / Expedia (benchmarks)**
- Headout offers two paths: **API Partner**, where you create and manage bookings via API, and **Affiliate**, where Headout handles checkout and fulfilment. — [Headout partner docs](https://partner.headout.com/docs)
- Tiqets' Distributor API grants the Booking API only after a performance review. — [Tiqets API program](https://www.tiqets.com/partner-program/api-program)
- Expedia (per a Bókun marketing post, indicative only): suppliers provide a net rate, Expedia marks it up, and commissions are typically 15–30%. — [AltexSoft](https://www.altexsoft.com/blog/travel/expedia-taap-rapid-api-partner-solutions/); [Bókun post](https://www.bokun.io/it/wp-json/wp/v2/posts/7110)

**Supplier-side marketplaces**
- **Bókun:** the supplier sets contract terms (products, prices, reseller commission) and proposes them to a reseller, who can accept, amend or decline. **Payments happen outside Bókun.** The reseller collects from the customer, the supplier invoices the reseller, and a Marketplace invoice report shows what each reseller owes. — [Bókun: create contracts](https://docs.bokun.io/docs/marketplace-pro/marketplace/how-to-create-contracts-to-add-resellers-or-suppliers-pro); [Bókun: how marketplace works (PRO)](https://docs.bokun.io/docs/marketplace-pro/marketplace/how-does-the-bokun-marketplace-work-for-suppliers-pro); [Bókun helpdesk](https://helpdesk.bokun.io/articles/1851217-how-does-the-bokun-marketplace-work-for-suppliers)
- **Bókun fees:** a 1.5% service fee on marketplace bookings for PRO subscriptions started or upgraded on or after 1 June 2022. The fee is waived on Viator reservations. — [Bókun marketplace page](https://bokun.io/grow/marketplace)
- **Rezdy:** suppliers join the marketplace free and pay a per-booking fee plus the commission they set for resellers. Non-Rezdy customers can access the reseller marketplace free and pay a booking fee per marketplace booking. — [Rezdy blog: choosing a platform](https://rezdy.com/blog/choosing-a-tour-booking-platform-distribution-channels/); [Rezdy resellers](https://rezdy.com/resellers/)
- **Ventrata:** partner connections "generally require a commercial agreement with the partner". The reseller's pricing (retail, wholesale/commission) must be defined. Some connections (Headout, Frekuent, Avoris) require the "Bill to my account" settlement method, i.e., on-account invoicing between operator and reseller. — [Ventrata: Headout connection](https://support.ventrata.com/en/articles/9527494-headout-reseller-connection); [Ventrata: Frekuent](https://support.ventrata.com/en/articles/16293954-frekuent-reseller-connection); [Ventrata: Avoris](https://support.ventrata.com/en/articles/11080380-avoris-reseller-connection)
- Ventrata documentation also says there is no fee for resellers working with Ventrata clients to use its OCTO API and support. — [Ventrata OCTO API docs](https://docs.ventrata.com)
- **FareHarbor:** Bókun's reseller guide says FHDN affiliates can earn **15% commission** per sale (competitor source). Ventrata's support site says FareHarbor charges the distributor/reseller fees for using its connection. — [Bókun blog on FHDN](https://bokun.io/?p=4479); [Ventrata support](https://support.ventrata.com/en/articles/9532120)
- **Peek:** the "Peekosystem" reseller program pays 10/15/20% revenue share on Peek Pro *software* net revenue to agencies that refer operators. It is a software referral scheme, **not** an inventory-resale commission. — [Peek Peekosystem](https://peekpro.com/peekosystem)

**TUI Musement**
- Travel Counsellors integrated TUI Musement "through a merchant API" (Feb 2025). — [TUI Group](https://www.tuigroup.com/newsroom/news/tui-musement-becomes-global-tours-and-activities-partner-for-travel-counsellors)
- In the Volaris partnership, TUI provides customer support and in-destination services alongside the products. — [Musement partner news](https://partner.musement.com/tui-continues-global-growth-in-tours-activities-with-partnership-with-leading-mexican-airline-volaris)

### Inferences
- **Holibob's Stripe-MoR flow is architecturally the closest analogue to how a LiteAPI-style hotel integration offloads payment.** The app renders a provider-issued PaymentIntent, and Holibob is the seller. Whether Holibob also owns refunds and end-customer support is implied by the "Merchant of Record" and "Partner Support" service entries but **not confirmed** (content not read).
- **Hotelbeds activities and transfers are, by default, a net-rate wholesale relationship.** (Inferred from the HBX margin model and Hotelbeds' general B2B practice; I did not confirm the activities-specific payment terms.) WhereTo would set its own retail price, collect payment as merchant of record, and settle with Hotelbeds (typically on credit or deposit; unverified). That means WhereTo would own refunds, chargebacks and first-line support.
- **Viator Full + Booking** is the cleanest "provider is MoR + handles customer service" model among the big marketplaces. It is not a neutral aggregator, though: inventory is Viator-only and Viator brand rules apply. (Viator's affiliate commission is widely reported as ~8%, **unverified** this session.)
- **Supplier-side marketplaces (Bókun, Rezdy, Ventrata, FareHarbor) make the reseller the merchant of record** and require operator-by-operator settlement. That is a poor fit for a startup that wants Nuitée-style simplicity.

### Gaps
- Holibob's actual commission percentages, net-rate mark-up rules, refund liability split and whether it provides 24/7 end-customer support: not found.
- Hotelbeds activities/transfers payment terms (prepay, deposit, credit line), whether it offers a "provider-as-MoR" option, and any customer-service SLA: not found.
- TUI Musement's commission and net terms for API partners: not found.
- FareHarbor's official reseller fee and commission terms: only competitor and third-party figures found (a 6% booking-fee claim from a review site was too weak to include as fact).

---

## Q3. Inventory size, sources and geographic coverage

### Takeaway
By claimed live inventory, Bridgify (1M+, now HBX) and Holibob (500k+ from 45+ API partners plus direct contracts) are the largest single-API aggregators. They are followed by Viator (≈300k as surfaced in Revolut) and Expedia (~200k, third-party figure). TUI Musement (88k experiences plus 125k+ transfer routes, 2023) and Hotelbeds (18k activities and 25k transfer routes, last public figure from 2021) are smaller but directly contracted. Supplier-side marketplaces claim tens of thousands of resellers rather than products. I could not confirm whether Holibob aggregates Viator or GetYourGuide.

### Cited Findings
- **Holibob:** 500,000+ live bookable products from 45+ API partners plus direct supplier contracts (Sep 2026). — [Travolution](https://www.travolution.com/en/article/holibob-launches-software-development-kit-to-cut-integration-times-to-days); [Breaking Travel News](https://www.breakingtravelnews.com/news/article/holibob-launches-sdk-that-cuts-experience-booking-integration-from-six-mont/). The same 500k figure appears in June 2026 coverage of its conversational booking product. — [PhocusWire](https://www.phocuswire.com/news/technology/holibob-conversational-booking-travel-experiences)
- Holibob's supply-side connectivity includes reservation systems such as Zaui, which publishes a "how to connect to Holibob" guide for operators. — [Zaui marketplace](https://marketplace.zaui.com/how-to-connect-to-holibob)
- Holibob testimonial with US operator American Ghost Walks ("Driving Direct Bookings"). — [Holibob testimonial](https://www.holibob.tech/testimonial/driving-direct-bookings-with-american-ghost-walks)
- **Bridgify (HBX):** access to 1M+ experiences from global suppliers. One directory says 180+ countries. — [PhocusWire](https://www.phocuswire.com/news/technology/hbx-group-acquires-bridgify); [startupim](https://startupim.com/company/bridgify)
- **Hotelbeds:** ~18,000 activities, attractions and tickets and 25,000 transfer routes (2021). The Nemo deal cited 690 destinations. Travolution printed "60", likely a typo. — [TravelDailyNews (2021)](https://www.traveldailynews.com/post/hotelbeds-further-expands-experiences-distribution-reach-through-nemo-group-partnership); [Travolution](https://travolution.com/news/travel-sectors/tour-and-activities/hotelbeds-bolsters-south-american-experience-distribution-with-nemo-deal)
- HBX works with ~23,000 experience providers (undated Wikipedia figure). — [Wikipedia](https://en.wikipedia.org/wiki/HBX_Group)
- Hotelbeds added theme-park and attraction supply via Prioticket. — [Prioticket news](https://news.prioticket.com/company-news/changelog/post/hotelbeds-signs-agreement-with-prioticket-to-expand-activities-theme-parks-portfolio)
- **TUI Musement:** 88,000+ experiences, 1,000+ multi-day tour itineraries, 125,000+ transfer routes in 100+ destinations (Oct 2023). — [TUI Group](https://tuigroup.com/en-en/media/press-releases/2023/2023-10-06-tui-driving-further-growth-in-tours-and-activities). It later added 750 multi-day tours across 30 countries via TravelExchange. — [TUI Group](https://www.tuigroup.com/en/newsroom/news/tui-musement-strengthens-its-tours-activities-distribution-with-the-integration-of-750-multi-day-tours-across-30-countries-into-the-travelexchange-platform)
- **Travel Curious Group:** a 2026 bank/loyalty roundup cites a 70,000+ product catalogue with strength in private tours (third-party listicle). — [BM Magazine](https://bmmagazine.co.uk/business/leading-tours-activities-apis-for-banks-loyalty-programs-in-2026/). Redeam brought "hundreds of integrations across both supply and demand". — [Travolution](https://www.travolution.com/news/travel-sectors/tours-and-activities/travel-curious-acquires-redeam-relocates-its-global-hq/)
- **Viator (via Revolut):** ~300,000 tours, activities and attractions. — [Skift](https://skift.com/?p=607854). Capital One Travel shows "150,000+ popular activities powered by Viator". — [Capital One](https://www.capitalone.com/learn-grow/more-than-money/things-to-do-in-san-francisco)
- **Expedia:** roughly 200,000 activities (third-party partner blurb). — [Adivaha](https://www.adivaha.com/expedia-api.html)
- **Hopper/PlacePass (2021):** 300,000+ experiences in 800+ destinations. — [Hopper newsroom](https://media.hopper.com/news/hopper-acquires-placepass-to-lead-its-travel-experiences-offering)
- **Livn:** in 2018, access to 15,000 tour operators and 700,000+ products. A later CEO interview targeted ~40,000 "instantly bookable" products. The two figures measure different things and are dated. — [PhocusWire 2018](https://www.phocuswire.com/Launch-pitch-LIVN); [TTG Asia](https://www.ttgasia.com/?p=26800)
- **WebBeds (2022):** 15,667 transfer products across 1,190 destinations, sold to Travel Compositor via API. — [WebBeds press release (Jul 2022)](https://www.webbeds.com/wp-content/uploads/2022/07/WB_PressRelease_TravelCompositor_060722.pdf)
- **Rayna Tours:** 10,000+ activities and tours across 500 cities (App Store listing; strongest in the UAE and Middle East). — [RaynaB2B App Store](https://apps.apple.com/us/app/-/id1644044308)
- **Supplier-side marketplaces (resellers, not products):**
  - Bókun claims 2,600+ resellers including 70+ OTAs. Another Bókun page says 27,000+ partners (inconsistent). — [Bókun APIs](https://www.bokun.io/it/grow/apis)
  - Rezdy claims 18,000+ or 20,000+ resellers on different pages. A May 2026 third-party figure is 25,000+. — [Rezdy blog](https://rezdy.com/blog/choosing-a-tour-booking-platform-distribution-channels/); [Rezdy blog](https://rezdy.com/blog/rezdy-ramps-online-distribution-tour-activity-operators/); [Supergood](https://supergood.ai/docs/rezdy-api)
  - Arival reported FHDN with ~16,000 products on sale. Bókun cites ~2.5K FHDN affiliates. — [Arival](https://arival.travel/fareharbor-adds-kayak-com-to-distribution-network-putting-spotlight-on-tech-providers-as-distributors/); [Bókun blog](https://bokun.io/?p=4479)
  - Booking.com said 150,000+ additional experiences would be added via FHDN (date not visible). — [TravelDailyNews](https://www.traveldailynews.com/special-interest-travel/booking-com-expands-global-experiences-portfolio-through-fareharbor-integration/)
- Prioticket lists Viator, Tiqets, Headout and others as "featured supply aggregators", which shows how aggregators commonly source from each other. — [Prioticket docs](https://docs.prioticket.com/getting-started/connect-once-reach-the-world/featured-supply-aggregators)

### Inferences
- Large aggregator counts (Holibob 500k, Bridgify 1M+) almost certainly include re-aggregated third-party marketplace or wholesaler supply, so duplicate listings across sources are likely. Expect to need de-duplication and curation. This is inferred from the "45+ API partners" and "aggregator of aggregators" language.
- For a US-facing app, Hotelbeds' and TUI Musement's directly contracted portfolios skew to Europe and resort destinations (inferred from their tour-operator heritage). Holibob and Bridgify, plus Viator or FHDN-type US operator supply, would likely give better US domestic coverage.

### Gaps
- **Whether Holibob's 45+ API partners include Viator, GetYourGuide, Tiqets, Musement or Hotelbeds:** no source found. Ask Holibob for the source list and the share of inventory per source.
- Current (2025–26) Hotelbeds activities and transfers counts: none found; the latest is 2021.
- WebBeds activities (non-transfer) inventory: not found.
- Withlocals and other private-tour inventory: not researched (search budget exhausted).

---

## Q4. API capability (search, availability, real-time booking, cancellation, vouchers; REST/GraphQL; documentation quality)

### Takeaway
Holibob (GraphQL with introspection, sandbox, Stripe payment intents, storefront SDK) and Hotelbeds APItude (JSON REST; separate booking, content and cache APIs; documented cancellation simulation) have the most complete public documentation for an end-to-end in-app flow. OCTO-based APIs (Ventrata, Peek, Bókun, Zaui, Magpie, TuriTop) share one REST/JSON schema but are keyed per reseller–supplier pair. Rezdy has three overlapping APIs, which is confusing. Rayna, TBO and WebBeds have no public documentation I could find.

### Cited Findings
**Holibob**
- GraphQL API "for querying products and their associated availability and making bookings on behalf of consumers". Access needs an API key and secret from Holibob, and new channels start in sandbox. — [Holibob API introduction](https://partner.documentation.holibob.tech/general/Working-version/the-holibob-api-introduction)
- The newer docs site lists queries and mutations for bookings, products, consumer trips, payments and distribution channels. Schema introspection is enabled in all environments. — [Holibob GraphQL overview](https://docs.holibob.tech/docs/graphql/overview); [Getting started](https://docs.holibob.tech/docs/graphql/getting-started)
- Storefront supports checkout and multi-currency pricing and payment. — [Holibob storefront docs](https://docs.holibob.tech/docs/storefront/overview)
- SDK (Sep 2026): a free, pre-built storefront (search results, product pages, checkout) on the same Partner API. Holibob claims it cuts build time from ~6 months to ~3 days. — [Breaking Travel News](https://www.breakingtravelnews.com/news/article/holibob-launches-sdk-that-cuts-experience-booking-integration-from-six-mont/); [ShortTermRentalz](https://shorttermrentalz.com/news/holibob-launches-toolkit-experience-bookings/)
- Conversational, prompt-based discovery and booking (June 2026), integrated into Google Things to Do. Travolution says most experiences offer free cancellation. — [PhocusWire](https://www.phocuswire.com/news/technology/holibob-conversational-booking-travel-experiences); [Travolution](https://www.travolution.com/news/travel-sectors/tours-and-activities/holibob-launches-industry-first-promt-based-experiences-discovery-and-booking-system/)

**Hotelbeds Activities and Transfers (APItude)**
- Activities are split into a Booking API (availability → confirm → booking info), a Content API (factsheets, code mappings) and a Cache API (portfolio and basic pricing). HTTPS with JSON (preferred) or XML. Test host api.test.hotelbeds.com, live api.hotelbeds.com. Postman collection provided. — [Hotelbeds Activities docs](https://developer.hotelbeds.com/documentation/activities/)
- A third-party guide says Content API data must be stored locally and refreshed at least weekly. — [AltexSoft](https://www.altexsoft.com/blog/hotelbeds-api-integration/)
- Transfers: Booking API plus Cache API (routes, code mappings), JSON over HTTPS. There is **no shopping cart**, so the integrator manages cart state. — [Hotelbeds Transfers docs](https://developer.hotelbeds.com/documentation/transfers/)
- Transfers cancellation is a DELETE operation supporting full cancel, `simulation=true` (returns the charges without cancelling) and partial cancel by `service_id`. Charges are computed in the destination's local time. — [Hotelbeds Transfers cancellation](https://developer.hotelbeds.com/documentation/transfers/booking-api/booking-post-booking/booking-cancellation)
- The Feb 2026 product update added driver wait times for terminal pickups, schedules for restricted-hour services, and a UTC-offset field so free-cancellation deadlines apply correctly across time zones. — [HBX quarterly product update, Feb 2026](https://www.hbxgroup.com/resources/quarterly-product-update-february-2026)

**OCTO-family APIs**
- OCTO: RESTful, HTTPS and JSON, Bearer-token auth. Zaui issues an API key for **each reseller–supplier pair**. — [Zaui OCTO docs](https://docs.zaui.com/octo)
- Spec on GitHub (octotravel). — [github.com/octotravel](https://github.com/octotravel)
- Peek: a third-party source says octodocs.peek.com covers products, availability, bookings, pricing and webhooks. — [Supergood: Peek Pro](https://supergood.ai/api-report-card/peek-pro). Peek also publishes an outbound "Peek Core API" with guaranteed delivery (webhooks). — [PyPI peek-core-api](https://www.pypi.org/project/peek-core-api/3.4.0/)
- Ventrata: Viator, GetYourGuide, Expedia, Groupon, Klook, Headout, Go City, TUI Musement and Tiqets have integrated with its OCTO API. — [Ventrata docs](https://docs.ventrata.com)

**Rezdy**
- Agent API (REST): pull shared products, availability and pricing, and push bookings and cancellations. — [Rezdy Agent API](https://developers.rezdy.com/rezdyapi/index-agent.html)
- NextGen Reseller API v2: product content with translations, availability and price variations, catalogs, and bookings for operators who have agreed to be distributed. SSL plus API key. — [Rezdy Reseller API v2](https://developers.rezdy.com/rezdyapi/index-reseller.html)
- RezdyConnect (supply-side): two-step reservation and confirmation, cancellation, availability pull and push. — [RezdyConnect](https://developers.rezdy.com/rezdyconnect/index.html)

**FareHarbor**
- External API documentation at developer.fareharbor.com. It provides live availability and real-time bookings for affiliate and software-partner integrations. Rate limits and SLAs are not public. — [Supergood: FareHarbor](https://supergood.ai/api-report-card/fareharbor)

**Checkfront**
- API v3 is in maintenance mode and will be replaced by v4 (beta). One user review says the API has not been updated in years. — [Checkfront API docs](https://checkfront-api.readthedocs.io/); [Findstack reviews](https://findstack.com/products/checkfront/reviews)

**Marketplace B2B APIs (benchmarks)**
- Headout Partner API: list experiences, real-time availability, create bookings, manage the post-booking lifecycle. — [Headout partner docs](https://partner.headout.com/docs)
- Tiqets: Content and Availability APIs on sign-up; Booking API after review. — [Tiqets API program](https://www.tiqets.com/partner-program/api-program)
- GetYourGuide: Partner API with an OpenAPI spec on GitHub; going live requires a three-phase certification (third-party description). — [Supergood: GYG](https://supergood.ai/api-report-card/getyourguide)
- Viator: an OpenAPI spec is downloadable for merchant partners. — [Viator merchant technical docs](https://docs.viator.com/partner-api/merchant/technical)

**Rayna / TBO**
- Rayna: only a third-party integrator (Technoheaven) describes real-time search, availability, pricing, automated vouchers, booking, modification and cancellation. Format (XML/JSON) unconfirmed. — [LinkedIn/Technoheaven post](https://ae.linkedin.com/in/melida-kacapor)
- TBO: sightseeing API availability "depends on your agreement with TBO". The integrator Adivaha describes XML APIs. — [PHPTRAVELS](https://phptravels.com/ja/providers/tbo-holidays); [Adivaha](https://www.adivaha.com/tbo-integration.html)

### Inferences
- **For a native iOS/Android booking flow**, Holibob's GraphQL plus Stripe PaymentIntent maps cleanly to mobile checkout: Stripe's iOS and Android SDKs can confirm a PaymentIntent client secret. That would avoid building PCI-scoped card handling or a settlement ledger. (This is inferred: Holibob's docs reference a React web integration, and native-SDK support was not confirmed.)
- Hotelbeds requires caching content locally, managing the cart and building voucher display. That is more engineering, but it gives full UX control, and its transfers API covers airport pickups, which pair naturally with WhereTo's flight bookings.
- OCTO is useful later, for direct connections to high-volume suppliers. It does not remove the per-supplier contracting burden.

### Gaps
- Holibob voucher/ticket delivery format (QR, PDF, mobile ticket), webhooks, rate limits and native mobile SDK support: not found.
- Hotelbeds Activities voucher/QR handling and cancellation endpoint specifics (only the transfers cancellation docs surfaced).
- Bridgify API documentation: not found.
- Travel Curious UXP API documentation: not found.

---

## Q5. Onboarding: approval criteria, minimums, fees, timeline, and whether per-supplier contracts are needed

### Takeaway
Holibob, Viator, Headout and (likely) Hotelbeds and TUI Musement need one master agreement. Holibob is the most startup-friendly: free SDK, sandbox first, go-live after a commercial agreement, with integration claimed in days. Bókun, Rezdy, Ventrata, OCTO connections and (to a lesser extent) FareHarbor require operator-by-operator agreements or approvals. Tiqets has an explicit ~200 orders/month bar before granting booking access. Viator's merchant tier requires proof of infrastructure.

### Cited Findings
- **Holibob:** apply for API key and secret, start in sandbox. — [Holibob API intro](https://partner.documentation.holibob.tech/general/Working-version/the-holibob-api-introduction). The SDK is free and runs in test mode until "signing a commercial agreement with Holibob". — [ShortTermRentalz](https://shorttermrentalz.com/news/holibob-launches-toolkit-experience-bookings/). Holibob claims integration goes from six months to three days. — [Breaking Travel News](https://www.breakingtravelnews.com/news/article/holibob-launches-sdk-that-cuts-experience-booking-integration-from-six-mont/)
- **Viator:** Basic affiliate access is immediate on sign-up. Full access needs pre-approval. Full + Booking needs authorization and certification. Merchant partners must demonstrate infrastructure. — [Viator affiliate](https://partnerresources.viator.com/travel-commerce/affiliate/); [Viator Partner API docs](https://docs.viator.com/partner-api/)
- **Tiqets:** Booking API only after a performance review. About 200 orders/month is considered the minimum. — [Tiqets API program](https://www.tiqets.com/partner-program/api-program)
- **GetYourGuide:** registration plus three-phase certification (third-party description). — [Supergood: GYG](https://supergood.ai/api-report-card/getyourguide)
- **Expedia:** enrollment terms not public. Expedia reportedly weighs revenue, traffic and booking volume; sandbox first, production key after certification. — [AltexSoft](https://www.altexsoft.com/blog/travel/expedia-taap-rapid-api-partner-solutions/)
- **Bókun:** a reseller only gets a supplier's products once **both parties accept a contract**, so access is per supplier. The PRO plan ($49/mo per Bókun docs) includes Marketplace access and OTA connections, with a 1.5% fee on online bookings. Third-party reviews list different tiers ($49/$149/$499), which conflicts with the docs. — [Bókun contracts](https://docs.bokun.io/docs/marketplace-pro/marketplace/how-to-create-contracts-to-add-resellers-or-suppliers-pro); [Bókun plans](https://docs.bokun.io/docs/settings/subscription/account-and-billing/what-are-bokuns-subscription-plans); conflicting: [iTechGuides](https://www.itechguides.com/products/b-kun/)
- **Rezdy:** the Reseller API covers only "operators who have agreed to be distributed". Rezdy recommends the API to resellers with their own site and development resources. — [Rezdy Reseller API v2](https://developers.rezdy.com/rezdyapi/index-reseller.html); [Rezdy resellers](https://rezdy.com/resellers/)
- **FareHarbor:** no self-serve External API sign-up. Keys are provisioned manually after approval into the Affiliate or Software Partner program (third-party, verified July 2026). — [Supergood: FareHarbor](https://supergood.ai/api-report-card/fareharbor). Arival notes that in FHDN "the operator only needs to agree to participate" and their content becomes bookable across all FHDN affiliates. This is unlike a standard API connection, which needs a contract per OTA. So FHDN is closer to one-contract access, but it is gated. — [Arival](https://arival.travel/fareharbor-adds-kayak-com-to-distribution-network-putting-spotlight-on-tech-providers-as-distributors/)
- **Ventrata:** the operator must create the reseller in their account and then create a connection. A commercial agreement is generally required. Some partners need the OCTO key shared manually. — [Ventrata Headout connection](https://support.ventrata.com/en/articles/9527494-headout-reseller-connection); [Ventrata support index](https://support.ventrata.com/en/articles/9764192)
- **OCTO:** the spec is open source, and membership is not required to use it. — [eGlobal Travel Media](https://eglobaltravelmedia.com.au/?p=1354216); [Zaui blog](https://www.zaui.com/blog/what-is-octo-and-why-weve-adopted-the-api-specification). Keys are per reseller–supplier pair. — [Zaui OCTO docs](https://docs.zaui.com/octo)
- **Checkfront:** API access is not available to trial users; you contact Sales to buy API access. — [Checkfront API docs](https://checkfront-api.readthedocs.io/)
- **Tiqets via Rezdy:** Tiqets has no self-onboarding portal and completes connection steps itself. — [Rezdy support attachment](https://support.rezdy.com/hc/article_attachments/18633342374553)
- **TBO:** sells only to travel agencies. TBO reviews the company and agrees payment terms before granting API access. — [PHPTRAVELS](https://phptravels.com/ja/providers/tbo-holidays)
- **Amadeus:** the Self-Service API portal (which included a Tours & Activities category) was shut down on **17 July 2026**. Enterprise APIs continue, subject to an access-approval request. — [PhocusWire](https://www.phocuswire.com/amadeus-shut-down-self-service-apis-portal-developers); [Ignav migration guide](https://ignav.com/docs/amadeus-self-service-shutdown); [APIs.io directory](https://providers.apis.io/providers/amadeus/)

### Inferences
- A US startup that already sells flights and hotels has a credible B2B profile for Holibob and Viator Full + Booking. Hotelbeds onboarding usually involves a commercial vetting step and payment terms (credit, deposit or prepay). This is my **unverified** background knowledge of Hotelbeds' general B2B onboarding, not found this session.
- Tiqets' 200 orders/month bar and Viator's merchant infrastructure requirement are likely out of reach at launch. They become options once volume exists.
- The cheap Amadeus self-service route to tours and activities is gone as of July 2026.

### Gaps
- Holibob minimum volumes, set-up fees and typical contract timeline: not found.
- Hotelbeds activities/transfers approval criteria, minimums and deposit requirements: not found.
- HBX/Bridgify onboarding after the acquisition (is Bridgify still contracting new partners independently?): not found.
- TUI Musement API partner criteria: not found.

---

## Q6. Known clients and recent news (2024–2026); which aggregators power fintech, travel apps and airlines

### Takeaway
Big US fintech and travel portals mostly use **Viator** directly: Revolut Experiences and Capital One Travel. **Chase Travel** moved its activities to **Expedia** (previously Viator). **Hopper** built its own via the PlacePass acquisition (2021). European airlines lean on **TUI Musement** (easyJet, Jet2 in Feb 2026, Volaris, Air Dolomiti). The 2024–26 news points to consolidation and AI. HBX bought Bridgify (May 2026). Travel Curious bought Redeam (Jul 2025). Holibob shipped a conversational booking layer integrated into Google Things to Do (Jun 2026) and a free SDK (Sep 2026). Amadeus closed its self-service APIs (Jul 2026).

### Cited Findings
**Fintech and travel-app experiences: who powers them**
- **Revolut:** "we offer Experiences in connection with our partner, Viator, Inc." About 300k activities, rolled out first to UK and EU customers, with 3–10% cashback by plan. — [Revolut legal (NZ)](https://www.revolut.com/en-NZ/legal/experiences/); [Revolut legal (AU)](https://www.revolut.com/en-AU/legal/experiences/); [Skift](https://skift.com/?p=607854); [Retail Banker International](https://www.retailbankerinternational.com/news/revolut-launches-in-app-marketplace/)
- **Capital One Travel:** "150,000+ popular activities powered by Viator". — [Capital One](https://www.capitalone.com/learn-grow/more-than-money/things-to-do-in-san-francisco). Capital One also partnered with PRIOR (Nov 2022) for curated trips via Capital One Entertainment (current status unknown). — [Frequent Miler](https://frequentmiler.com/?p=206232). Capital One Travel is itself built with Hopper (my background knowledge, **unverified** here).
- **Chase Travel:** activities portal now operated by Expedia (previously Viator inventory). Activities in 2,000+ destinations across 130+ countries. — [The Points Guy](https://thepointsguy.com/guide/using-chase-ultimate-rewards-points-for-activities); [Milenomics](https://milenomics.com/?p=9798); [Chase guide](https://www.chase.com/travel/guide/trips/chase-travel-activities-booking-guide)
- **Hopper:** bought PlacePass (Oct 2021) and took over powering Marriott Bonvoy's tours and activities through Hopper Cloud. — [Hopper newsroom](https://media.hopper.com/news/hopper-acquires-placepass-to-lead-its-travel-experiences-offering); [BetaKit](https://betakit.com/hopper-acquires-placepass-scores-marriott-bonvoy-as-customer-for-b2b-business/); [Skift](https://skift.com/?p=448943)
- **Kayak:** joined FareHarbor's Distribution Network as a reseller (both owned by Booking Holdings). — [Arival](https://arival.travel/fareharbor-adds-kayak-com-to-distribution-network-putting-spotlight-on-tech-providers-as-distributors/). Holibob's older Series A announcement also lists Kayak as a partner. — [Holibob Series A blog](https://www.holibob.tech/blog/holibob-secures-12m-series-a-investment-to-transform-curation-distribution-and-commerce-in-tours-and-activities?1b4b4d01_page=2)
- **Bank and loyalty market context:** banks and loyalty programmes attach cashback or points to experiences and prefer a single-supplier API or white-label over managing many suppliers. — [BM Magazine 2026](https://bmmagazine.co.uk/business/leading-tours-activities-apis-for-banks-loyalty-programs-in-2026/); [The Silicon Review, Sep 2026](https://thesiliconreview.com/2026/09/how-banks-fintechs-are-embedding-travel-experiences-in-2026); [TechBullion](https://techbullion.com/best-experiences-apis-for-banks-loyalty-programs-what-to-consider-in-2026/)

**Airlines**
- **Jet2:** partnered with Musement on a Musement-powered "Jet2experiences" site (Feb 2026). — [Jet2 news](https://www.jet2.com/news/2026/02/Jet2_partners_with_Musement_to_offer_customers_thousands_of_in_destination_experiences); [NI Travel News](https://nitravelnews.com/news/jet2-announce-new-partnership-with-musement/)
- **easyJet:** Musement partnership, expanded Jan 2024. — [Skift (staging mirror)](https://skiftstaging.dev/2024/01/15/easyjet-expands-tui-musement-tours-and-activities-partnership); [Travel Gossip](https://travelgossip.co.uk/latestnews/easyjet-announces-partnership-with-tui-owned-musement/)
- **Volaris:** TUI partnership including customer support. — [Musement partner news](https://partner.musement.com/tui-continues-global-growth-in-tours-activities-with-partnership-with-leading-mexican-airline-volaris)
- **Air Dolomiti:** Musement packaging microsite (older). — [Travolution](https://travolution.com/articles/16563/musement-and-air-dolomiti-launch-pioneering-attractions-packaging-microsite)
- **AncillaryBox:** a startup that helps airlines sell tours and activities in 1:1 channels. — [Terrapinn](https://terrapinn-cdn.com/conference/aviation-festival/exhibitor-ancillarybox.stm)
- I found no named airline using Holibob or Klook. Older Travolution coverage says Holibob's partners include "agents, OTAs, airlines and cruise operators". — [Travolution (older)](https://www.travolution.com/news/travel-sectors/tours-and-activities/start-up-holibob-sets-sights-on-being-booking-com-of-experiences/)

**Holibob clients and news**
- Partners named: Amadeus, Kayak, Secret Escapes (Series A announcement, older; the Series A was $12M in 2022 per PhocusWire). NEOM Tourism and Amadeus Discover appear on the website. — [Holibob Series A blog](https://www.holibob.tech/blog/holibob-secures-12m-series-a-investment-to-transform-curation-distribution-and-commerce-in-tours-and-activities?1b4b4d01_page=2); [holibob.tech](https://holibob.tech/); [PhocusWire](https://www.phocuswire.com/news/technology/holibob-conversational-booking-travel-experiences)
- Undisclosed investment from Guinness Ventures (2024); PhocusWire Hot 25 Travel Startup 2023. — [PhocusWire](https://www.phocuswire.com/news/technology/holibob-conversational-booking-travel-experiences)
- ZYTLYN strategic partnership (MENA focus) and Travelwings (Dubai) deal, both dated July 2024 in results. — [Holibob blog: ZYTLYN](https://www.holibob.tech/blog/zytlyn-and-holibob-announce-strategic-partnership)
- Acquired the digital-marketing platform TourismSolved (date not captured). — [Holibob blog](https://www.holibob.tech/blog/holibob-acquires-digital-marketing-platform-tourismsolved)
- June 2026: conversational booking plus Google Things to Do integration. Sep 2026: free SDK. — [PhocusWire](https://www.phocuswire.com/news/technology/holibob-conversational-booking-travel-experiences); [Travolution](https://www.travolution.com/en/article/holibob-launches-software-development-kit-to-cut-integration-times-to-days)
- Phocuswright Europe 2025 sponsor/exhibitor. — [Phocuswright Europe](https://www.phocuswrighteurope.com/Whos-Coming/Sponsors-Exhibitors/2025/Holibob)

**HBX / Hotelbeds news**
- May 2026: agreed to acquire 100% of Bridgify for €3M upfront plus performance-linked payments. Bridgify targets travel retailers, banks, fintechs, loyalty programs and super-apps. — [PhocusWire](https://www.phocuswire.com/news/technology/hbx-group-acquires-bridgify); [HBX press release](https://www.hbxgroup.com/news-room/press-release/hbx-group-acquires-bridgify-combining-ai-and-experiences); [startupim](https://startupim.com/company/bridgify)
- 2025: transfers API distributed via Nemo for Latin America, extending the earlier activities deal. — [HBX press release](https://www.hbxgroup.com/news-room/press-release/hbx-group-partners-nemo-distribute-transfers-portfolio-latam)
- Hotelbeds' network: "over 60,000 travel trade buyers in more than 140 source markets". — [Prioticket news](https://news.prioticket.com/company-news/changelog/post/hotelbeds-signs-agreement-with-prioticket-to-expand-activities-theme-parks-portfolio)

**TUI Musement news**
- Feb 2025: global T&A partner for Travel Counsellors via merchant API (2,100+ independent agents). — [TUI Group](https://www.tuigroup.com/newsroom/news/tui-musement-becomes-global-tours-and-activities-partner-for-travel-counsellors)
- TravelExchange API connection (2,600+ agencies in 92 countries). — [TUI Group](https://www.tuigroup.com/en/newsroom/news/tui-musement-strengthens-its-tours-activities-distribution-with-the-integration-of-750-multi-day-tours-across-30-countries-into-the-travelexchange-platform); [Musement partner](https://partner.musement.com/?p=104853)
- About 50% of the business's revenue comes through distribution partnerships (Oct 2023). — [TUI Group](https://tuigroup.com/en-en/media/press-releases/2023/2023-10-06-tui-driving-further-growth-in-tours-and-activities)

**Travel Curious / Redeam**
- July 2025 acquisition. The combined company is valued at $40M+ and expects $700M+ in transactions in year one. HQ moved to the US. Redeam CEO Melanie Meador became president. — [Travolution](https://www.travolution.com/news/travel-sectors/tours-and-activities/travel-curious-acquires-redeam-relocates-its-global-hq/); [Airguide](https://airguide.info/travel-curious-acquires-redeam-forms-travel-curious-group/)
- Klook partnered with Redeam to grow in North America (older). — [MarTech Series](https://martechseries.com/content/content-marketing/klook-partners-redeam-accelerate-development-north-american-market/)

**Other**
- Tiqets' Distributor API partners include Klook, Fever, Hellotickets and Ctrip. — [Tiqets API program](https://www.tiqets.com/partner-program/api-program)
- Livn and Flight Centre partnership (2020). — [TTG Asia](https://www.ttgasia.com/2020/07/15/flight-centre-livn-partner-to-automate-tour-and-activity-bookings/)
- OCTO: more than 130 resellers and technology providers use the spec (an earlier count was 114 trading partners). Date of the 130 figure unclear. — [eGlobal Travel Media](https://eglobaltravelmedia.com.au/?p=1354216); [TTG Asia](https://www.ttgasia.com/?p=82668). OCTO is a community sponsor of Ventrata Open 2026. — [Swapcard: Ventrata Open 2026](https://app.swapcard.com/widget/event/ventrata-open-2026/exhibitor/RXhoaWJpdG9yXzI0OTkzODI=). Expert session on OCTO, Nov 2025. — [Ventrata support](https://support.ventrata.com/en/articles/12899573-expert-discussion-octo-explained-why-it-matters-and-how-to-get-involved)
- Amadeus Self-Service shutdown (17 Jul 2026), followed by an Amadeus–Anthropic developer initiative. — [PhocusWire](https://www.phocuswire.com/amadeus-shut-down-self-service-apis-portal-developers); [PhocusWire](https://www.phocuswire.com/news/technology/amadeus-anthropic-claude-developers-travel-sellers)

### Inferences
- The fintech pattern (Revolut, Capital One, earlier Chase) shows that "one big marketplace as MoR" (Viator) is the default for consumer apps that want zero operational burden. Aggregators like Holibob and Bridgify pitch more inventory and more margin control to the same buyers.
- HBX now owns both a classic wholesaler (Hotelbeds activities and transfers) and a fintech-oriented aggregator of aggregators (Bridgify). That makes HBX a plausible one-stop shop, but its integration roadmap is unclear after the acquisition.

### Gaps
- No public source naming which provider powers Hopper's consumer app experiences in 2024–26, or whether PlacePass/Hopper Cloud still distributes T&A.
- No confirmed list of Holibob's current (2025–26) live demand partners beyond the older names.
- Bridgify's named fintech or bank clients: not found.
- OCTO's 2026 adoption figures: not found.

---

## Q7. Pros and cons per provider for a US startup consumer app (WhereTo Trips)

### Takeaway
For a Nuitée-style plug-in, **Holibob** is the best documented fit: one API, Stripe-based provider-as-MoR, 500k+ products, a free SDK and a startup-friendly onboarding narrative. **Viator Full + Booking** is the lowest-risk fallback, with Viator as MoR and support owner but Viator-only inventory. **Hotelbeds Transfers** (and possibly Activities) suits airport-transfer add-ons on net rates, if WhereTo will act as MoR. **HBX/Bridgify** and **Travel Curious** are worth a sales conversation. Supplier-side systems and OCTO are phase-2 tools for direct supplier deals, not launch inventory.

### Cited Findings (supporting facts per provider are cited in Q1–Q6; key ones repeated)
- **Holibob.**
  - Pros: provider acts as MoR via a Stripe flow ([payment flow](https://partner.documentation.holibob.tech/general/Working-version/the-holibob-api-payment-flow)); net or commission models ([holibob.tech](https://holibob.tech/)); 500k+ products and 45+ API partners ([Travolution](https://www.travolution.com/en/article/holibob-launches-software-development-kit-to-cut-integration-times-to-days)); GraphQL with sandbox and introspection ([docs](https://docs.holibob.tech/docs/graphql/overview)); free SDK ([ShortTermRentalz](https://shorttermrentalz.com/news/holibob-launches-toolkit-experience-bookings/)); Google Things to Do integration ([PhocusWire](https://www.phocuswire.com/news/technology/holibob-conversational-booking-travel-experiences)).
  - Cons: UK-based mid-size startup (last disclosed round $12M Series A in 2022 plus an undisclosed 2024 investment), so there is counterparty and scale risk ([PhocusWire](https://www.phocuswire.com/news/technology/holibob-conversational-booking-travel-experiences)); supply sources undisclosed; commission levels unknown.
- **Viator (Full + Booking affiliate).**
  - Pros: Viator is MoR and handles customer service ([Viator affiliate](https://partnerresources.viator.com/travel-commerce/affiliate/)); proven with Revolut and Capital One ([Revolut](https://www.revolut.com/en-NZ/legal/experiences/), [Capital One](https://www.capitalone.com/learn-grow/more-than-money/things-to-do-in-san-francisco)).
  - Cons: Viator-only supply; needs authorization and certification; the merchant tier (higher margin) requires infrastructure ([Viator docs](https://docs.viator.com/partner-api/)).
- **Hotelbeds Activities + Transfers.**
  - Pros: mature JSON REST, simulated and partial cancellation, 2026 transfer-API improvements ([HBX Feb 2026](https://www.hbxgroup.com/resources/quarterly-product-update-february-2026)); direct contracting; transfers pair with flights.
  - Cons: net-rate wholesale (WhereTo as MoR, inferred); must cache content and build the cart ([Activities docs](https://developer.hotelbeds.com/documentation/activities/), [Transfers docs](https://developer.hotelbeds.com/documentation/transfers/)); last public activities count is only ~18k (2021) ([TravelDailyNews](https://www.traveldailynews.com/post/hotelbeds-further-expands-experiences-distribution-reach-through-nemo-group-partnership)).
- **HBX/Bridgify.**
  - Pros: 1M+ experiences; explicitly targets banks, fintechs and super-apps; API plus white label ([PhocusWire](https://www.phocuswire.com/news/technology/hbx-group-acquires-bridgify), [startupim](https://startupim.com/company/bridgify)).
  - Cons: acquired May 2026, so the product and contracting roadmap is in flux. No public API docs found.
- **TUI Musement.**
  - Pros: 88k experiences plus 125k transfer routes, merchant API, airline track record, provides customer support in some deals ([TUI](https://tuigroup.com/en-en/media/press-releases/2023/2023-10-06-tui-driving-further-growth-in-tours-and-activities), [Volaris](https://partner.musement.com/tui-continues-global-growth-in-tours-activities-with-partnership-with-leading-mexican-airline-volaris)).
  - Cons: Europe and resort heavy (inferred); partner terms for small startups unknown.
- **Travel Curious Group (UXP, ex-Redeam).**
  - Pros: US HQ, loyalty and hospitality focus, hundreds of supply integrations ([Travolution](https://www.travolution.com/news/travel-sectors/tours-and-activities/travel-curious-acquires-redeam-relocates-its-global-hq/)).
  - Cons: post-merger integration, catalogue (~70k, third-party figure) smaller than Holibob or Bridgify ([BM Magazine](https://bmmagazine.co.uk/business/leading-tours-activities-apis-for-banks-loyalty-programs-in-2026/)), no public API docs found.
- **Headout / Tiqets (attraction-ticket specialists).**
  - Pros: Headout has an affiliate route where Headout handles checkout and fulfilment ([Headout](https://partner.headout.com/docs)).
  - Cons: Tiqets booking access needs ~200 orders/month ([Tiqets](https://www.tiqets.com/partner-program/api-program)).
- **Bókun / Rezdy / Ventrata / Peek / Checkfront / FareHarbor (supplier-side).**
  - Pros: direct operator relationships and better margins long term; OCTO standardisation (Ventrata, Peek, Bókun); FHDN offers one-opt-in network access ([Arival](https://arival.travel/fareharbor-adds-kayak-com-to-distribution-network-putting-spotlight-on-tech-providers-as-distributors/)).
  - Cons: per-supplier contracts and settlement ([Bókun](https://docs.bokun.io/docs/marketplace-pro/marketplace/how-does-the-bokun-marketplace-work-for-suppliers-pro), [Ventrata](https://support.ventrata.com/en/articles/9527494-headout-reseller-connection), [Rezdy](https://developers.rezdy.com/rezdyapi/index-reseller.html)); reseller becomes MoR; FareHarbor API is gated and approval-only ([Supergood](https://supergood.ai/api-report-card/fareharbor)); Checkfront API is paid and partly in maintenance mode ([Checkfront](https://checkfront-api.readthedocs.io/)); Peek's "reseller program" is a software referral scheme, not inventory ([Peek](https://peekpro.com/peekosystem)).
- **OCTO.**
  - Pros: free, open, no membership required, 130+ adopters ([eGlobal](https://eglobaltravelmedia.com.au/?p=1354216)).
  - Cons: no inventory and no MoR; keys per supplier pair ([Zaui](https://docs.zaui.com/octo)).
- **Rayna / TBO / WebBeds.**
  - Pros: strong regional (Middle East and Asia) wholesale supply (Rayna 10k+ activities in 500 cities per its [App Store listing](https://apps.apple.com/us/app/-/id1644044308)).
  - Cons: no public API docs; agency-only onboarding (TBO, per [PHPTRAVELS](https://phptravels.com/ja/providers/tbo-holidays)); WebBeds activities API undocumented ([WebBeds 2022 PR](https://www.webbeds.com/wp-content/uploads/2022/07/WB_PressRelease_TravelCompositor_060722.pdf) covers transfers only).

### Inferences
- **Suggested phased approach for WhereTo** (inference, not a documented recommendation):
  1. **Launch:** integrate Holibob's GraphQL API natively, with the Stripe PaymentIntent confirmed in the native Stripe iOS/Android SDK (to confirm with Holibob). This gives Nuitée-like economics, with Holibob as MoR and WhereTo earning commission or mark-up. In parallel, apply for Viator Full + Booking as a redundancy and US-depth source.
  2. **Add Hotelbeds Transfers** (net rate) to sell airport pickups tied to flight PNRs, once WhereTo is comfortable acting as MoR for that product line.
  3. **At scale:** use OCTO or FHDN for direct deals with top US operators to improve margin, and revisit Tiqets once WhereTo exceeds ~200 orders/month.
- **Risk to monitor:** aggregator consolidation (HBX–Bridgify, Travel Curious–Redeam, Amadeus self-service exit) means contract terms and API roadmaps can change. Contracts should include data-portability and wind-down clauses.

### Gaps
- No pricing or commission figures for Holibob, Hotelbeds, Bridgify, TUI Musement or Travel Curious, so economics cannot be compared quantitatively.
- Whether any of these aggregators can act as MoR for a **US-based** seller of travel (US sales-tax and seller-of-travel registration implications): not researched.
- Klook partner API, Withlocals and ToursByLocals B2B: not researched (search budget exhausted).
