# Ticketed Events APIs (Concerts, Sports, Theater/Broadway, Festivals, Local Events, Attractions) for WhereTo Trips

## What each provider's API allows (discovery only vs. affiliate deep links vs. transactional in-app booking vs. white label), and who is merchant of record / delivers tickets / handles refunds and customer service

### Takeaway
Open, self-serve access in event ticketing is almost all **discovery data plus affiliate redirect**: Ticketmaster Discovery API, SeatGeek API, and the affiliate programs of StubHub, Vivid Seats, Gametime, TickPick, Event Tickets Center, Fever and Hellotickets. **In-app purchase via API** is only available through gated B2B channels: the Ticketmaster Partner API (official distribution partners only), Ticket Evolution (white-label affiliate, partner or hosted checkout), TicketNetwork Private Label and Mercury, Headout's "API Partner" tier, Tiqets' Booking API (needs about 200 orders a month) and Fever's distributor platform. In the affiliate and white-label-affiliate models the provider is the merchant of record and handles payment, fraud, delivery and customer service. In the "partner/API partner" models (Ticket Evolution partner, Headout API partner) the integrator takes on payment and/or customer service.

### Cited Findings

**Ticketmaster (Discovery API, Commerce, Partner API, affiliate) and Ticketmaster International**
- The Discovery API is open. Default quota is 5,000 calls per day at 5 requests per second. Ticketmaster's FAQ is inconsistent and elsewhere says 2 requests per second. Deep paging is capped at the 1,000th item (size × page < 1000) — [Ticketmaster Discovery API docs](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/); [APIs.io rate-limit summary](https://apis.io/rate-limits/ticketmaster/ticketmaster-rate-limits/)
- Higher limits are granted case by case after a compliance and branding review. Over-limit requests return HTTP 429 — [APIs.io](https://apis.io/rate-limits/ticketmaster/ticketmaster-rate-limits/)
- Ticketmaster's getting-started page says that on registration "you will be able to access our Discovery and Commerce APIs instantly," and that it offers "event discovery and commerce APIs with various access tiers" — [Ticketmaster Getting Started](https://developer.ticketmaster.com/products-and-docs/apis/getting-started/)
- The Partner API is "not an open API." It is "restricted to companies with whom Ticketmaster has existing, official distribution relationships" and lets clients "reserve, purchase, and retrieve ticket and event information" — [Ticketmaster Partner API](https://developer.ticketmaster.com/products-and-docs/apis/partner/); [Partner API FAQ](https://developer.ticketmaster.com/support/partner-api-faq/)
- The Partner API FAQ says access goes to "a select number of partners, for specific use cases." Existing partners are routed to the Distributed Commerce team — [Partner API FAQ](https://developer.ticketmaster.com/support/partner-api-faq/)
- Documented Partner API flow:
  1. Availability
  2. Cart POST (the response includes a hold time)
  3. Payment PUT (needs a `third_party_account_id` and a unique user ID with the billing information)
  4. Cart PUT (commit)
  5. Orders POST, which returns the initial SafeTix token
  - SafeTix delivery uses a rotating entry token rendered through the Secure Entry SDK and refreshed via the Secure Render API. The SafeTix page is old: its sample responses are dated 2019–2020 — [Partner API SafeTix](https://developer.ticketmaster.com/products-and-docs/apis/partner/safetix/); [Availability API](https://developer.ticketmaster.com/products-and-docs/apis/partner/availability/); [Interactive Console](https://developer.ticketmaster.com/products-and-docs/apis/partner/interactive-console/)
- Affiliate program:
  - Approved publishers are routed through Impact.
  - A third-party guide says selling through the affiliate's own cart is "generally unavailable." I could not find this wording on an official Ticketmaster page — [Vorp Labs](https://vorplabs.com/agent-tools/ticketmaster-cli)
  - The same third-party guide says Ticketmaster's consumer terms prohibit automated software that searches, reserves or buys tickets — [Vorp Labs](https://vorplabs.com/agent-tools/ticketmaster-cli)
- Developers can link their Impact Publisher ID to their API key so that "Impact tracking is added to event links in the Discovery API/Feed." This is the documented deep-link mechanism — [Ticketmaster Affiliate Sign Up](https://developer.ticketmaster.com/partners/distribution-partners/affiliate-sign-up/)
- Ticketmaster describes an "open Discovery API and partner Data Feed which is used by 1000+ global Affiliate Partner sites" — [Ticketmaster Business, Sell Tickets Where Your Fans Are](https://business.ticketmaster.com/sell-tickets-where-your-fans-are/)
- Example of a distribution partner without native checkout (dated February 2022): Ticketmaster's Snapchat FAQ says "Currently, this is not a native sales integration," and Snapchatters go "through a seamless flow directing them to checkout on Ticketmaster.com" — [TM Snapchat FAQ (2022)](https://business.ticketmaster.com/wp-content/uploads/2022/02/TM-Snapchat-FAQs.pdf)
- International coverage:
  - Ticketmaster's FAQ says Discovery covers North American and international markets, "over 25 markets" — [Ticketmaster FAQ](https://developer.ticketmaster.com/support/faq/)
  - The Discovery Feed is a separate product with downloadable per-country JSON/CSV event data — [Discovery Feed 2.0](https://developer.ticketmaster.com/products-and-docs/apis/discovery-feed/)
  - The Global Affiliate Program sign-up "automatically applies you to all listed markets," with possible exceptions by audience or business category — [Ticketmaster Affiliate Sign Up](https://developer.ticketmaster.com/partners/distribution-partners/affiliate-sign-up/)

**Live Nation**
- Ticketmaster is a subsidiary of Live Nation, and the jury verdict addresses "Live Nation and its subsidiary Ticketmaster" — [NY AG press release, 2026](https://ag.ny.gov/press-release/2026/attorney-general-james-and-coalition-states-win-trial-against-live-nation-and). I found no separate public Live Nation developer or affiliate API.

**SeatGeek**
- The public API exposes GET `/2/events`, `/2/performers` and `/2/venues` with a `client_id` query parameter. One directory instead claims Bearer-token auth, which conflicts — [publicapi.dev](https://publicapi.dev/seat-geek-api); [Educative](https://www.educative.io/courses/live-event-seatgeek-api-python/get-started-with-the-seatgeek-api)
- Third-party docs describe the API as discovery-only: it does not support booking or buying, and is meant to "direct those users to the SeatGeek booking page" — [publicapi.dev](https://publicapi.dev/seat-geek-api)
- SeatGeek's API/SDK terms allow use in free and commercial apps. SeatGeek "reserves the right to modify or discontinue the SeatGeek API … with or without notice." Exceptions can be requested at hi@seatgeek.com — [SeatGeek API/SDK Terms](https://seatgeek.com/api-terms)
- Older SeatGeek platform/partner pages describe a "50/50 rev share whenever a user buys tickets using one of their links," with partners averaging "$11 per sale," run through Impact — [SeatGeek Partner Program blog](https://seatgeek.com/blog/seatgeek-partner-program-instructions-info); [SeatGeek Build](https://seatgeek.com/build); [VentureBeat (undated, older)](https://venturebeat.com/dev/seatgeek-developer-platform-api-live-events-tickets)
- **Conflict:** the Partner License Agreement (index age about 2,400 days) says SeatGeek "is not required to make any payments to you," and SeatGeek may terminate "for any or no reason and at any time" — [SeatGeek Partner Terms](https://seatgeek.com/partner-terms)
- SeatGeek has a distribution partnership with Eventbrite. The press release date was not captured — [SeatGeek press release](https://seatgeek.com/press/seatgeek-announces-distribution-partnership-with-eventbrite-to-further-open-up-access-to-live-events)

**StubHub (incl. viagogo / StubHub International)**
- The North America affiliate program is "managed via Partnerize" and uses "a 30-day cookie length" — [StubHub Affiliates](https://stubhub.com/affiliates)
- I found no public StubHub developer/API or developer partner program in search results. The SEC filings checked mention none — [StubHub 10-K FY2025](https://www.sec.gov/Archives/edgar/data/1337634/000162828026014844/stub-20251231.htm)

**Vivid Seats**
- The official affiliate page describes a "Standard Affiliate Program" with access to "entire inventory, real-time reporting, and account management." Sign-up goes through Impact. I found no Vivid Seats public partner API — [Vivid Seats Affiliates](https://www.vividseats.com/affiliates); [UpPromote directory](https://uppromote.com/affiliate-program-directory/vivid-seats)

**TicketNetwork (affiliate, Private Label / white label, Mercury)**
- Affiliate program: TicketNetwork's own page lists a 12.5%–14.5% rate with a 30-day cookie — [TicketNetwork Affiliate Program](https://www.ticketnetwork.com/en/affiliate-program)
- Private Label: "go live with a fully branded ticketing site without managing supply or fulfillment," with built-in checkout and payments. Backend operations are managed by TicketNetwork — [TicketNetwork Private Label (Crunchbase)](https://www.crunchbase.com/organization/ticketnetwork-private-label); [TicketNetwork LinkedIn](https://www.linkedin.com/company/ticketnetwork)
- A LinkedIn post cites "$10B+ in live event inventory," with TicketNetwork handling fulfillment and customer support. Contact: team@tnprivatelabel.com — [TicketNetwork LinkedIn](https://www.linkedin.com/company/ticketnetwork)
- An older (2014–2015) TN Private Label blog says private-label affiliates can set their own commissions (markups), unlike flat-rate affiliate programs — [tnPrivateLabel blog](http://blog.tnprivatelabel.com/)
- Mercury Web Services is TicketNetwork's real-time exchange data API. A data-sharing agreement filed as an SEC exhibit (2021) requires partners to follow the "TicketNetwork Broker Guidebook" and the Mercury API technical documentation, with payment by ACH withdrawal from the partner's bank account — [SEC exhibit, TicketNetwork Data Sharing Agreement for Mercury Web Services](https://www.sec.gov/Archives/edgar/data/1750450/000173112221001008/e2818_ex6-6.htm); [Reveal Markets setup doc](https://docs.revealmarkets.com/article/173-how-to-set-up-ticket-network-and-mercury)

**Ticket Evolution (B2B secondary aggregator, not in the original list but directly relevant)**
- The API docs define three user types: white-label affiliates, partners and brokers.
  - For white-label affiliates, "Ticket Evolution handles the credit card transaction and all fraud checks" and customer service.
  - Partners "keep control of their brand, including customer service and card processing" — [Ticket Evolution API, Getting Access](https://ticketevolution.atlassian.net/wiki/spaces/API/pages/342229112)
- Hosted Checkout: "The customer remains your customer, but Ticket Evolution will handle all of the complexities of the checkout process including … Apple Pay and Google Pay." A sales rep sets it up on a separate domain that the partner points to Ticket Evolution's servers, and the partner links to it with event and ticket-group IDs — [Ticket Evolution Hosted Checkout](https://ticketevolution.atlassian.net/wiki/spaces/API/pages/3798958097/Hosted+Checkout)
- There is a dedicated "Creating Orders (Affiliates)" API page, so affiliates can create orders via API — [Ticket Evolution, 11.2 Creating Orders Affiliates](https://ticketevolution.atlassian.net/wiki/spaces/API/pages/357630027/11.2+Creating+Orders+Affiliates)

**Tixstock**
- Tixstock is a B2B service that lets brokers list inventory once and publish it to several resale platforms. It shares event, ticket, venue and performer inventory with partner sites — [CB Insights profile](https://www.cbinsights.com/company/tixstock/); [ZealousWeb case study (secondary)](https://www.zealousweb.com/case-studies/tixstock-global-growth-tech-solutions/)
- Two-way inventory feed with Ticket Evolution, July 2023 — [SalesTechStar](https://salestechstar.com/partner-management-channel-enablement/ticket-evolution-and-tixstock-join-forces-in-transatlantic-partnership-unveiling-two-way-ticketing-inventory-feed-for-global-event-access/)
- I found no public API docs or consumer-affiliate terms.

**Gametime / TickPick / Event Tickets Center**
- These are affiliate programs only. No partner API was found for any of them — [FlexOffers Gametime](https://www.flexoffers.com/affiliate-programs/gametime-affiliate-program); [LinkClicky TickPick](https://linkclicky.com/affiliate-program/tickpick/); [FlexOffers Event Tickets Center](https://www.flexoffers.com/affiliate-programs/event-tickets-center-affiliate-program)
- Cuelinks shows the TickPick campaign as "paused by the advertiser" — [Cuelinks TickPick](https://www.cuelinks.com/campaigns/tickpick-affiliate-program)
- Event Tickets Center allows text links only, with banners, coupons and email disallowed and multi-touch commissioning disabled (Cuelinks) — [Cuelinks ETC](https://www.cuelinks.com/campaigns/event-tickets-center-affiliate-program)

**Fever (and DICE, owned by Fever since June 2025)**
- Fever affiliate program: commissions "on every booking," with partner types including publishers, discovery platforms and app developers — [Fever Affiliate Program](https://business.feverup.com/en/partner-programs/affiliate-program/)
- Fever's distributor/reseller platform ("Experience Distribution Platform"):
  - wholesale prices and margins on bookings
  - real-time availability
  - "free to join"
  - "200K+ Experiences across 500+ Cities"
  - partners can "integrate Fever's event catalog directly into your platform, products, or AI assistants"
  - partners can "book for your clients and pay after confirmation" via card, transfer or prepaid credit
  - [Fever for Distributors & Resellers](https://business.feverup.com/en/partner-programs/experience-distribution-platform/)
- DICE has no public developer API, per an API-tracking profile — [APIs.io DICE](https://apis.io/providers/dice/)
- DICE partners can access fan data via its "Ticket Holder API" (2021) — [DICE 2021 product round-up](https://dice.fm/blog/dices-big-fat-2021-product-round-up)
- DICE's embeddable event-list widget (widgets.dice.fm) needs a Partner ID and API key and supports a "purchase overlay." The source is a community plugin, not affiliated with DICE — [WordPress plugin "Xinc Events for Dice"](https://ar.wordpress.org/plugins/?p=293328)

**Eventbrite**
- Public access to the Event Search endpoint (GET /v3/events/search/) was removed starting December 12, 2019, and requests were denied after February 20, 2020. Developers were pointed to retrieval by event ID, venue or organization — [GitHub issue quoting Eventbrite notice](https://github.com/Automattic/eventbrite-api/issues/83)
- A 2024 integration guide says there is "no public API endpoint for searching events across the entire Eventbrite platform" — [Rollout Eventbrite API essentials](https://rollout.com/integration-guides/eventbrite/api-essentials)

**AXS**
- A third-party (MoEngage) help article says AXS "does not currently offer a public events discovery API." Its developer tools are scoped to venue operators (access control, redemption), and bespoke access goes through the AXS partnerships team — [MoEngage AXS article](https://partners.moengage.com/hc/en-us/articles/49399922705940-AXS)
- AXS distributes via API to partners: for example, a live API integration with Tickets for Good (US, then UK in Feb 2026, with Germany planned later in 2026) — [Business Wire, Feb 2026](https://www.businesswire.com/news/home/20260225943147/en/AXS-Expands-Tickets-for-Good-Partnership-to-the-UK-Enabling-More-Community-Access-to-Live-Events)
- AXS Anywhere added Groupon, Goldstar, Gametime and EBG as distribution partners in 2017, with AXS issuing tickets directly — [TheTicketingBusiness (2017)](https://www.theticketingbusiness.com/?p=20174)
- AXS advertises a partnerships role for "onboarding and technical implementations of distribution partners" — [Rise job listing](https://app.joinrise.co/jobs/axs-partnerships-specialist-402j)

**Tickets.com**
- Tickets.com runs ProVenue for MLB clubs and was named the official MiLB provider in 2017 — [Ballpark Digest (2017)](https://ballparkdigest.com/2017/08/07/tickets-com-named-official-milb-provider/); [MLB.com, Orioles/ProVenue](https://www.mlb.com/news/mlbs-baltimore-orioles-choose-provenue-from-ticketscom/c-40497932)
- The only API reference found is a UK G-Cloud listing describing "Open Architecture for APIs and Integration" — [G-Cloud listing](https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud/services/668103947909244)
- No public affiliate or consumer-distribution API was found.

**Universe**
- Universe "provides a GraphQL API for building integrations," plus widget callbacks and webhooks — [Universe Developers, API Options](https://developers.universe.com/docs/api-options)
- Universe operates as "an independent entity within the larger Ticketmaster/Live Nation family" — [Built In Toronto job posting](https://builtintoronto.com/job/senior-software-developer/4517325)

**Attractions and shows aggregators (Tiqets, Headout, Hellotickets, Broadway Direct)**
- Tiqets:
  - The Distributor API is free. Sign-up gives access to the affiliate portal plus the Content and Availability APIs.
  - The Booking API is performance-gated: Tiqets considers about 200 orders a month the minimum.
  - Named API partners include Klook, Fever, Hellotickets and Ctrip.
  - [Tiqets API Program](https://www.tiqets.com/en/partner-program/api-program/)
- Headout's Partner API has two tiers:
  - "API Partner: full booking flow in your product." These partners see `netPrice` and `headoutSellingPrice`, and must not sell below `headoutSellingPrice`.
  - "Affiliate: discovery plus handoff to Headout checkout." These partners see `headoutSellingPrice` and `commissionAmount`, and product responses include deep-link URLs.
  - Booking lifecycle: UNCAPTURED → PENDING → COMPLETED / FAILED / CANCELLED.
  - Refunds: for API partners, Headout tops up the partner's wallet on eligible cancellations and the partner refunds the customer. For affiliates, Headout refunds the end customer directly.
  - [Headout Partner docs](https://partner.headout.com/docs); [Headout key concepts](https://partner.headout.com/docs/guide/key-concepts); [Headout older docs](https://docs.headout.com/guide/getting-started)
  - Broadway shows are in the Headout catalog — [Headout Partner docs](https://partner.headout.com/docs)
- Hellotickets is affiliate-only (referral link plus dashboard). Affiliates promote Hellotickets' inventory of sports (NBA, NFL), concerts and theater aimed at travelers. No API was found — [Tapfiliate Hellotickets](https://tapfiliate.com/offers/hellotickets-affiliate-program/); [Hellotickets affiliate invite](https://hellotickets.tapfiliate.com/)
- Broadway Direct runs its own affiliate program on Awin, excluding group sales and lottery tickets — [Broadway Direct affiliate program](https://broadwaydirect.com/affiliate-program/)

**Travel experience APIs (Viator, GetYourGuide, Holibob): concert and sports coverage**
- Viator: "over 300,000 entertainment options," 8% commission, with affiliate API and widgets. This is a third-party blog — [Travelpayouts blog](https://www.travelpayouts.com/blog/best-concert-event-ticket-affiliate-program/)
- One event-seller vendor says Viator maps sellers' events onto its platform and charges 15–20% supplier commission — [Starboard Suite support](https://support.starboardsuite.com/en/articles/1572860-introducing-viator)
- Holibob signed a deal with Classictic to distribute classical concerts, operas and ballets in Europe — [Travolution](https://www.travolution.com/news/holibob-curates-experiences-for-music-and-culture-lovers-with-classictic-partnership/)
- GetYourGuide is "focused more solely on experiences and tours" and includes musicals. Travel bloggers send readers elsewhere (Hellotickets, Ticketmaster) for concerts and sports games — [SmarterTravel](https://www.smartertravel.com/best-ticket-websites-tours-activities/); [Full Suitcase](https://fullsuitcase.com/travel-resources/)

### Inferences

**Classification matrix.** This is my synthesis from the findings above. "Doc" means documented in a cited source; "Inf" means inferred.

| Provider | (a) Discovery data | (b) Affiliate deep links | (c) In-app purchase via API | (d) White-label store | Merchant of record / delivery / customer service |
|---|---|---|---|---|---|
| Ticketmaster (incl. Live Nation, Universe and TM International inventory) | Yes, open Discovery API and Feed (Doc) | Yes, via Impact; tracking auto-added to Discovery links (Doc) | Partner API only, restricted (Doc) | None found | Ticketmaster in all cases (Inf); SafeTix delivered via TM SDK (Doc) |
| SeatGeek | Yes, open API (Doc) | Yes, Impact/FlexOffers (Doc; terms conflict) | Not public (Doc: discovery-only) | None found | SeatGeek (Inf) |
| StubHub / viagogo | No public API found | Yes, Partnerize (Doc) | None found | None found | StubHub (Inf) |
| Vivid Seats | No public API found (affiliate feed/tools likely via Impact; Inf) | Yes, Impact (Doc) | None found | None found | Vivid Seats (Inf) |
| TicketNetwork | Mercury (broker/partner data) (Doc) | Yes, 12.5–14.5% (Doc) | Via Private Label / Mercury (Doc, terms not public) | Yes, Private Label (Doc) | TN handles checkout, payments, fulfillment, CS on Private Label (Doc) |
| Ticket Evolution | Yes, API (Doc) | Hosted Checkout links (Doc) | Yes, affiliate orders API (Doc) | Yes, white-label affiliate / private label (Doc) | White-label affiliate: TEvo handles card, fraud, CS. Partner: integrator handles card and CS (Doc) |
| Tixstock | B2B feed (Doc) | No | B2B only (Inf) | No | n/a (B2B) |
| Gametime / TickPick / Event Tickets Center | No public API found | Yes (Doc) | No | None found | Provider (Inf) |
| Fever (+ DICE) | Distributor catalog integration (Doc) | Yes, Tradedoubler/FlexOffers (Doc) | Yes, distributor booking at wholesale (Doc; API docs not seen) | None found | Provider (Inf) |
| Eventbrite | Only by event/venue/organizer ID, no search (Doc) | No publisher program found | Not for third-party marketplaces (Inf) | No | Eventbrite / organizer (Inf) |
| AXS | No public discovery API (third-party Doc) | AXS UK on Impact (unverified) | Partner-only via partnerships team (Doc) | No | AXS issues tickets via partners (Doc, 2017) |
| Tickets.com | Not public | None found | Not public | No | Tickets.com / club (Inf) |
| DICE | No public API (Doc) | None found | Partner widget with purchase overlay (Doc, community plugin) | No | DICE (Inf) |
| Tiqets | Yes, Content/Availability API, free (Doc) | Yes (Doc) | Booking API at about 200 orders/month (Doc) | None found | Tiqets for affiliates (Inf) |
| Headout | Yes (Doc) | Yes, deep links in API (Doc) | Yes, API Partner tier (Doc) | None found | Affiliate: Headout refunds customer. API partner: partner refunds, Headout tops up wallet (Doc) |
| Hellotickets | No | Yes, 10% (Doc) | No | No | Hellotickets (Inf) |
| Viator / GetYourGuide / Holibob | Yes, but thin concert and sports coverage (Doc/Inf) | Yes | Yes (outside this scope) | Holibob has white label (Doc) | Platform (Inf) |

- In every pure affiliate model above, the provider is almost certainly the merchant of record and handles payment, ticket delivery (mobile transfer / SafeTix / PDF), refunds, event-cancellation policy and customer service. Only Headout explicitly documents this ("Headout refunds the end customer directly"), so for the others it is an inference.
- The only documented routes that let WhereTo **own the checkout UI while offloading merchant-of-record and customer-service liability** are:
  - Ticket Evolution white-label affiliate (TEvo processes the card, does fraud checks and customer service)
  - Ticket Evolution Hosted Checkout
  - TicketNetwork Private Label

  All three are secondary-market inventory. The Headout API Partner and Ticket Evolution "partner" tiers push payment and/or customer service onto WhereTo. That would mirror the hotel setup only if WhereTo takes on merchant-of-record duties itself, unlike Nuitée/LiteAPI, which acts as merchant of record.
- Ticketmaster's open "Commerce" tier, mentioned on the getting-started page, is most likely read-only offers/pricing data, not checkout, because the Partner API is described as the purchase path and is restricted. This is inferred from my background knowledge of Ticketmaster's older Commerce API v2 and was not verified this session.

### Gaps
- **Research limitations:**
  - Every direct page fetch was blocked by the environment proxy (developer.ticketmaster.com, stubhub.com, partnerize.com, seatgeek.com, vividseats.com, ticketnetwork.com, feverup.com, tiqets.com, headout.com, ftc.gov, billboard.com, and others all returned CONNECT 403 or DNS failure).
  - The session-wide web-search budget ran out before searches on Eventbrite embedded checkout/affiliate options and Holibob's concert/sports catalog could run.
  - All findings come from search-result snippets of the cited pages. They were not read in full.
- Could not confirm whether Ticketmaster's open "Commerce" APIs include any purchase capability, or the current Partner API payment model (whether card data is passed to Ticketmaster for processing). The SafeTix docs are dated 2019–2020.
- No source found for whether StubHub, Vivid Seats or Gametime provide product or event data feeds to affiliates (e.g., via Partnerize or Impact catalogs).
- Fever distributor API technical docs (endpoints, auth, merchant of record) were not found.
- Event Tickets Center's inventory source (it may be powered by an exchange such as TicketNetwork) and whether it offers white label: no source found.
- Eventbrite embedded checkout and affiliate-publisher options: not researched (search budget exhausted).
- Live Nation: no source confirms or denies a standalone Live Nation API. Presumably its events go through Ticketmaster's APIs.

## Primary vs. resale (secondary) inventory; inventory size and geographic coverage

### Takeaway
Ticketmaster (with Universe and Ticketmaster Resale), AXS, Tickets.com, Eventbrite, DICE and Fever are **primary** sources. StubHub/viagogo, Vivid Seats, TicketNetwork, Ticket Evolution, Tixstock, Gametime and TickPick are **secondary/resale**. SeatGeek is both: a primary ticketer for teams and venues plus a resale marketplace. StubHub (now also distributing MLB primary via Direct Issuance) also mixes the two. International breadth is strongest at Ticketmaster (25+ markets), StubHub/viagogo (200+ countries) and Fever (500+ cities). Attraction aggregators (Tiqets, Headout, Viator, Holibob) cover tours, attractions and some shows, but concerts and sports only thinly.

### Cited Findings
- **Ticketmaster family:**
  - Per JamBase, a competitor (unverified by Ticketmaster docs), the Discovery API/Feed surfaces Ticketmaster, Universe, FrontGate Tickets and Ticketmaster Resale inventory — [JamBase comparison](https://data.jambase.com/compare/ticketmaster)
  - Ticketmaster says it covers "over 25 markets" — [Ticketmaster FAQ](https://developer.ticketmaster.com/support/faq/)
  - Its SDK market domains include the US, Canada, UK, Ireland, Australia, New Zealand, Mexico and several European countries — [Ticketmaster Android SDK market-domain enum](https://code.ticketmaster.com/Android-Ignite-Retail-SDK/docs/discoveryAPI/-ticketmaster%20-discovery%20-a-p-i/com.ticketmaster.discoveryapi.enums/-t-m-market-domain/index.html)
- **Live Nation/Ticketmaster's primary dominance:** a 2026 jury found the companies "unlawfully monopolized primary ticketing services and amphitheaters" — [NH DOJ](https://www.doj.nh.gov/news-and-media/live-nation-and-ticketmaster-antitrust-verdict); [NY AG](https://ag.ny.gov/press-release/2026/attorney-general-james-and-coalition-states-win-trial-against-live-nation-and)
- **StubHub:**
  - "a leading global ticketing marketplace for live events … services customers in over 200 countries and territories" — [StubHub 10-K FY2025](https://www.sec.gov/Archives/edgar/data/1337634/000162828026014844/stub-20251231.htm)
  - Multi-year MLB deal to distribute primary ticket inventory through StubHub "Direct Issuance" technology, starting with the 2026 season — [StubHub 10-K](https://www.sec.gov/Archives/edgar/data/1337634/000162828026014844/stub-20251231.htm); [StubHub Q3 2025 results](https://s204.q4cdn.com/138970181/files/doc_news/StubHub-Announces-Third-Quarter-2025-Results-2025.pdf)
- **Vivid Seats** (secondary marketplace):
  - Q2 2026 Marketplace GOV $659.4M and revenue $129.9M, helped by FIFA World Cup demand — [Barchart, Q2 2026 results](https://www.barchart.com/story/news/3630853/vivid-seats-reports-second-quarter-2026-results)
  - Q1 2026 GOV $612.4M — [Seeking Alpha PR, Q1 2026](https://seekingalpha.com/pr/20500004)
- **SeatGeek primary wins (2025–2026):**
  - Minnesota Wild / Grand Casino Arena switched from Ticketmaster to SeatGeek effective July 1, 2026 — [Fox 9](https://www.fox9.com/sports/mn-wild-grand-casino-arena-drop-ticketmaster-switch-seatgeek)
  - Philadelphia Union from the 2026 season, its ninth MLS club — [Business Wire, June 2025](https://www.businesswire.com/news/home/20250617960607/en)
  - USGA championships from 2026 — [USGA, May 2025](https://www.usga.org/content/usga/home-page/articles/2025/05/seatgeek-official-ticketing-partner-usga-championships.html)
- **SeatGeek** has described itself as "the world's biggest ticket search engine" (older) — [VentureBeat](https://venturebeat.com/dev/seatgeek-developer-platform-api-live-events-tickets)
- **TicketNetwork:** "$10B+ in live event inventory" (company claim) — [TicketNetwork LinkedIn](https://www.linkedin.com/company/ticketnetwork). Mercury agreements reference a "Broker Guidebook," which indicates broker-sourced resale inventory — [SEC exhibit](https://www.sec.gov/Archives/edgar/data/1750450/000173112221001008/e2818_ex6-6.htm)
- **Ticket Evolution + Tixstock:** the two-way feed lets North American and European sellers manage inventory across channels (July 2023) — [SalesTechStar](https://salestechstar.com/partner-management-channel-enablement/ticket-evolution-and-tixstock-join-forces-in-transatlantic-partnership-unveiling-two-way-ticketing-inventory-feed-for-global-event-access/)
- **Tixstock** is listed as founded in 2019 and based in Geneva, Switzerland — [CB Insights](https://www.cbinsights.com/company/tixstock/)
- **TickPick** (resale) charges sellers a flat 10% fee — [ProductMint](https://productmint.com/how-does-tickpick-make-money/)
- **Fever:** "200K+ Experiences across 500+ Cities" — [Fever distributor page](https://business.feverup.com/en/partner-programs/experience-distribution-platform/)
- **DICE** had passed 10 million monthly active users at acquisition (June 2025) — [Pollstar](https://news.pollstar.com/2025/06/05/ticketer-dice-acquired-by-events-discovery-platform-fever/)
- **Ministry of Sound** (UK) signed a ticketing partnership with DICE (2026) that mentions direct API connections — [Record of the Day](https://www.recordoftheday.com/news-and-press/ministry-of-sound-announces-landmark-ticketing-partnership-with-dice)
- **AXS** (AEG's primary ticketer): US and UK, with Germany planned — [Business Wire, Feb 2026](https://www.businesswire.com/news/home/20260225943147/en/AXS-Expands-Tickets-for-Good-Partnership-to-the-UK-Enabling-More-Community-Access-to-Live-Events)
- **Tickets.com:** primary MLB/MiLB ticketing — [Ballpark Digest](https://ballparkdigest.com/2017/08/07/tickets-com-named-official-milb-provider/). A competitor page says MLB owns Tickets.com, "confirmed via SEC public record" — [Intix comparison](https://www.intix.com/platform/compare/tickets-dot-com)
- **Hellotickets:** global sports (NBA, NFL), concerts and theater, plus tours and activities, aimed at travelers — [Tapfiliate](https://tapfiliate.com/offers/hellotickets-affiliate-program/). TradeTracker lists tickets "averaging around €300" (marketing claim) — [TradeTracker](https://tradetracker.com/gb/campaigns/travel-and-holidays-26/hello-tickets-38448/)
- **Viator:** "over 300,000 entertainment options" — [Travelpayouts blog](https://www.travelpayouts.com/blog/best-concert-event-ticket-affiliate-program/)
- **Holibob:** 100,000 experiences, plus Classictic classical concerts in Europe — [Travolution](https://www.travolution.com/news/holibob-curates-experiences-for-music-and-culture-lovers-with-classictic-partnership/)
- **Average order value:** Tiqets on Travelpayouts, $72.66 — [Travelpayouts Tiqets offer](https://travelpayouts.com/en/offers/tiqets-affiliate-program)

### Inferences
- For a traveler use case ("what's on in my destination this week"), Ticketmaster Discovery is the broadest single free source of primary event data in the US, Canada, UK, Ireland, Australia, New Zealand, Mexico and parts of Europe. Resale marketplaces (StubHub, Vivid Seats, SeatGeek) fill in sold-out and high-demand events. Their US/North America catalogues are deep, but only StubHub/viagogo has documented international reach.
- Secondary inventory carries higher commissions (TicketNetwork 12.5–14.5% vs Ticketmaster around 1%), but also higher prices, consumer-trust and fee-disclosure risks.
- Attraction and show aggregators (Tiqets, Headout, Fever) are the best fit for transactional booking inside a travel app because they offer documented booking APIs. They do not replace Ticketmaster/StubHub for concerts and pro sports.

### Gaps
- No reliable listing-count or event-count figures were found for Ticketmaster, SeatGeek, StubHub, Vivid Seats or TicketNetwork APIs.
- SeatGeek, Vivid Seats, Gametime and TickPick international coverage: no source found. They are likely US/North America-centric, but that is unverified.
- StubHub's international (viagogo) affiliate program terms and network were not confirmed.
- The Tixstock headquarters location conflicts with my general understanding of it as a UK firm. Only CB Insights (Geneva) was found, so treat the location as unverified.

## Commission / affiliate payout rates, payout terms, cookie windows

### Takeaway
Published rates come mostly from third-party affiliate directories and **conflict heavily**. Treat every figure as indicative until confirmed in the network dashboard. Broadly:
- Ticketmaster about 1% (or $0.30 per ticket in some markets)
- SeatGeek 2–5% on Impact (historically a 50/50 revenue share)
- StubHub 3.2–9% (4% standard, 0.8% MLB per Partnerize's own blog)
- Vivid Seats 3.2–6%
- TicketNetwork 12.5–14.5% (highest; official page)
- Gametime 2.4–7%; TickPick 4–10%; Event Tickets Center 2.4–3%
- Fever 6.4–8% but with a 1-day cookie
- Tiqets about 8% (share of gross margin); Headout 1–8% (conflicting); Hellotickets 10%

Cookies are typically 30 days, with notable short exceptions: Fever 1 day, SeatGeek on FlexOffers 2 days, Event Tickets Center 14 days, Ticketmaster UK 7 days.

### Cited Findings

**Ticketmaster (Impact)**
- Ticketmaster's FAQ says rates "can be tailored during the onboarding process" and that rewards are based on "actual sales generated" — [Ticketmaster FAQ](https://developer.ticketmaster.com/support/faq/)
- By market:
  - Australia: $0.30 per ticket sale; UK: 1% of ticket cost; Germany: 1–2% of order. Cookies run from 7 days (UK) to 30 days elsewhere — [Travelpayouts Ticketmaster offer](https://www.travelpayouts.com/en/offers/ticketmaster-affiliate-program); [Travelpayouts blog](https://www.travelpayouts.com/blog/earn-on-tickets-to-the-worlds-biggest-events-with-ticketmaster/)
  - Other sources: 1% per sale with a 30-day cookie — [Lasso](https://getlasso.co/affiliate/ticketmaster/); $0.30 flat per sale with 30-day attribution — [UpPromote blog](https://uppromote.com/blog/event-ticket-affiliate-programs)
- Payouts via Impact by direct deposit, wire or PayPal — [UpPromote blog](https://uppromote.com/blog/event-ticket-affiliate-programs)

**SeatGeek**
- Impact 2–5%, FlexOffers 0.4–0.8%. FlexOffers cookie is 2 days, Impact cookie 30 days — [UpPromote SeatGeek](https://uppromote.com/affiliate-directory/seatgeek/); [FlexOffers SeatGeek](https://www.flexoffers.com/affiliate-programs/seatgeek-affiliate-program)
- Another listing says 1% — [LinkClicky SeatGeek](https://linkclicky.com/affiliate-program/seatgeek/)
- Historical: 50/50 revenue share, average $11 per sale — [SeatGeek Partner Program blog](https://seatgeek.com/blog/seatgeek-partner-program-instructions-info). Contradicted by the partner license: "not required to make any payments" — [SeatGeek Partner Terms](https://seatgeek.com/partner-terms)

**StubHub (Partnerize)**
- 4% standard on all events, 0.8% on MLB, "paid on the ticket price and StubHub fees, excluding any discounts and taxes" — [Partnerize blog](https://partnerize.com/resources/blog/stubhub-affiliate-program-spotlight-and-sign-up-information)
- Conflicting: 9% on all valid sales — [UpPromote StubHub](https://uppromote.com/affiliate-program-directory/stubhub); [Lasso](https://getlasso.co/niche/music/). 3.2% (dated March 2026) — [Ecomobi](https://ecomobi.com/stubhub-affiliate-program/)
- 30-day cookie (official) — [StubHub Affiliates](https://stubhub.com/affiliates)
- Monthly payouts by EFT or PayPal. Payout threshold is $30 per UpPromote vs $50 per Lasso — [UpPromote](https://uppromote.com/affiliate-program-directory/stubhub)

**Vivid Seats (Impact)**
- 3.2% of purchases "(in-app or online)," 1.6% on MLB, 30-day cookie — [FlexOffers Vivid Seats](https://www.flexoffers.com/affiliate-programs/vivid-seats-affiliate-program/)
- Conflicting: 6% on all ticket types including iOS/Android purchases, with Impact monthly payouts and a $10 minimum — [UpPromote Vivid Seats](https://uppromote.com/affiliate-program-directory/vivid-seats); 4% — [LinkClicky Vivid Seats](https://linkclicky.com/affiliate-program/vivid-seats/)

**TicketNetwork**
- 12.5–14.5%, 30-day cookie (official page) — [TicketNetwork Affiliate Program](https://www.ticketnetwork.com/en/affiliate-program)
- Conflicting:
  - 12.5% with a 45-day cookie and monthly payouts with no minimum — [Post Affiliate Pro directory](https://www.postaffiliatepro.com/affiliate-program-directory/ticketnetwork-affiliate-program/)
  - "up to 6–12%," lower for price-comparison sites (2026 roundup) — [TicketWebsite.com](https://www.ticketwebsite.com/top-5-ticket-resale-affiliate-programs/)
- Commission is paid on ticket price only, not service fees or shipping. Network listings conflict (CJ vs ShareASale) — [Affiliate Toolkit](https://www.affiliate-toolkit.com/program/ticketnetwork/)
- Commissions are earned only on sales during the agreement term — [TicketNetwork Affiliate Agreement](https://www.ticketnetwork.com/en/affiliate-agreement)

**Gametime, TickPick, Event Tickets Center**
- Gametime: 2.4% of new-customer sales with a 30-day cookie — [FlexOffers Gametime](https://www.flexoffers.com/affiliate-programs/gametime-affiliate-program). Up to 7% — [Affpaying](https://www.affpaying.com/gametime). 5–7% on Impact — [LinkClicky Gametime](https://linkclicky.com/affiliate-program/gametime/)
- TickPick: 4–5% on Impact — [LinkClicky TickPick](https://linkclicky.com/affiliate-program/tickpick/). 5–10% — [Shopper.com](https://shopper.com/partnerships/tickpick-com-affiliate-program). Campaign shown as paused — [Cuelinks](https://www.cuelinks.com/campaigns/tickpick-affiliate-program)
- Event Tickets Center: 2.4%, 14-day cookie — [FlexOffers ETC](https://www.flexoffers.com/affiliate-programs/event-tickets-center-affiliate-program). 3% baseline, in-house, "open to increases" — [FMTC](https://www.fmtc.co/fmtc-featured-merchant-event-tickets-center/)

**Fever**
- 8% per validated sale (Fever US on Tradedoubler) — [Tradedoubler Fever US](https://directory.tradedoubler.com/en/programs/354826-Fever-US)
- FlexOffers: 6.4% base, 8% for Candlelight concerts, 4.8% on limited plans, and a 1-day cookie — [FlexOffers Fever](https://www.flexoffers.com/affiliate-programs/fever-up-affiliate-program)
- Fever's official page says commissions "scale with sales volume" — [Fever Affiliate Program](https://business.feverup.com/en/partner-programs/affiliate-program/)

**Tiqets**
- Standard model is a fixed percentage of gross margin after payment and handling costs, with custom rates for high performers. Tiqets issues a monthly invoice and pays within 30 days — [Tiqets NL affiliate page](https://www.tiqets.com/nl/partnerprogramma/affiliate/); [Tiqets DA partner page](https://www.tiqets.com/da/partnerprogram/partner/)
- 8% of booking price with a 30-day cookie on Travelpayouts — [Travelpayouts Tiqets](https://travelpayouts.com/en/offers/tiqets-affiliate-program)

**Headout**
- Conflicting rates:
  - 8% with a 30-day cookie — [WeGoTrip comparison](https://partner.wegotrip.com/headout-affiliate-program-vs-wegotrip)
  - 5% on Impact — [LinkClicky Headout](https://linkclicky.com/affiliate-program/headout/)
  - 1.6% — [FlexOffers Headout](https://www.flexoffers.com/affiliate-programs/headout-inc-affiliate-program/)
  - 1% — [AuthorityHacker](https://AuthorityHacker.com/tickets-affiliate-programs/)
- The Headout API returns a `commissionAmount` field to affiliates — [Headout Partner docs](https://partner.headout.com/docs)

**Hellotickets, Viator, GetYourGuide, Musement**
- Hellotickets: 10% CPA, 30-day cookie, monthly payouts Net-15, €100 threshold, PayPal or bank transfer — [Tapfiliate Hellotickets](https://tapfiliate.com/offers/hellotickets-affiliate-program/). Higher tiers for top performers — [Groupon Hellotickets](https://www.groupon.com/coupons/hellotickets)
- Viator: 8% in one Travelpayouts article vs 4% in another. GetYourGuide: up to 10%. Musement: "50% of the advertiser's revenue" (looks unusually high, unverified) — [Travelpayouts blog](https://www.travelpayouts.com/blog/best-concert-event-ticket-affiliate-program/)

**AXS**
- AXS UK affiliate on Impact, "Status: Opened," 30-day cookie. Revenue fields are blank (unverified) — [affi.io AXS UK](https://affi.io/m/axs-uk)

### Inferences
- On a typical $150 resale ticket order, expected affiliate revenue is roughly $1.50 (Ticketmaster at 1%), $5–7 (StubHub/Vivid Seats at 3–4%) or about $19–22 (TicketNetwork at 12.5–14.5%, ticket price only). This is illustrative arithmetic on the cited rates, not quoted figures.
- Commission rates for MLB inventory are consistently cut (StubHub 0.8%, Vivid Seats 1.6%). This likely reflects MLB's league-level resale deals (StubHub's MLB Direct Issuance partnership is one example).
- Fever's 1-day cookie and SeatGeek/FlexOffers' 2-day cookie are poorly suited to travel planning, where trips are researched days or weeks ahead. Their effective payout will be lower than headline rates.
- Tiqets' gross-margin share and Headout's `commissionAmount` field mean attraction commissions vary per product. A flat-percentage assumption in financial models is risky.

### Gaps
- No official, current US commission figure for Ticketmaster was found. Only non-US market rates (Australia, UK, Germany) were sourced via Travelpayouts.
- Vivid Seats, Gametime and TickPick official rate sheets were not accessible (page fetches blocked).
- Payout timing (net-30/60, reversal windows for cancelled or postponed events) was not found for most event programs. This matters because event-ticket commissions are often locked until after the event date, which is an inference, unverified.
- Ticket Evolution and TicketNetwork Private Label economics (markup control, license fees) are not public.

## Onboarding: approval, traffic minimums, contracts, fees; difficulty of transactional access

### Takeaway
Discovery APIs (Ticketmaster, SeatGeek) and affiliate programs (Impact, Partnerize, FlexOffers, Tradedoubler, Tapfiliate) are free and quick to join. Approval is based on audience quality rather than published traffic minimums. Transactional access is gated by relationship and volume:
- Ticketmaster Partner API: official distribution relationship only
- Tiqets Booking API: about 200 orders a month
- Ticket Evolution, TicketNetwork Private Label, Fever distribution, AXS and DICE: sales-led partnerships

### Cited Findings

**Ticketmaster**
- Discovery API: you get a key instantly on registration — [Ticketmaster Getting Started](https://developer.ticketmaster.com/products-and-docs/apis/getting-started/). Rate increases need a compliance and branding review — [APIs.io](https://apis.io/rate-limits/ticketmaster/ticketmaster-rate-limits/)
- The developer terms let Ticketmaster limit or block apps making large volumes of calls "not primarily responses to direct user actions" — [Ticketmaster Discovery API search summary via Vorp Labs](https://vorplabs.com/agent-tools/ticketmaster-cli)
- Affiliate program:
  - "ideally designed for websites and apps capable of bringing distinct and unique audiences to Ticketmaster's Marketplace"; Ticketmaster suggests reaching out before signing up with Impact to confirm you meet requirements — [Ticketmaster FAQ](https://developer.ticketmaster.com/support/faq/)
  - Approved partners receive an onboarding guide, an Impact publisher ID and an API key or other content tools, and need their own Impact publisher account — [Ticketmaster Affiliate Sign Up](https://developer.ticketmaster.com/partners/distribution-partners/affiliate-sign-up/)
  - Using disallowed traffic types can get commissions suspended. Each country site has its own terms — [Travelpayouts Ticketmaster](https://www.travelpayouts.com/en/offers/ticketmaster-affiliate-program)
- Ticketmaster markets its affiliate network to clients (rights holders) — [Ticketmaster Business, Affiliate Partners](https://business.ticketmaster.com/distributed-commerce-affiliate-partners/); [PartnerStack Ticketmaster](https://partnerstack.com/account/ticketmaster)
- Partner API: "restricted," "select number of partners, for specific use cases" — [Partner API FAQ](https://developer.ticketmaster.com/support/partner-api-faq/)

**SeatGeek**
- A free client ID is available at seatgeek.com/account/develop — [Apify SeatGeek scraper (third-party)](https://apify.com/hoholabs/seatgeek-scraper.md)
- Commercial use is allowed. The API can be discontinued without notice, and the partner license can be terminated at any time — [SeatGeek API Terms](https://seatgeek.com/api-terms); [SeatGeek Partner Terms](https://seatgeek.com/partner-terms)
- SeatGeek support has an article titled "Can I Use SeatGeek Data or an API?" (content not retrieved) — [SeatGeek support](https://support.seatgeek.com/hc/en-us/articles/4409765051283-Can-I-Use-SeatGeek-Data-or-an-API)

**StubHub and Vivid Seats**
- StubHub: apply via Partnerize, then promote with unique links once approved — [Partnerize blog](https://partnerize.com/resources/blog/stubhub-affiliate-program-spotlight-and-sign-up-information)
- Vivid Seats: "Sign up to become a partner" leads to Impact registration, with review "within a few business days" — [UpPromote Vivid Seats](https://uppromote.com/affiliate-directory/vivid-seats/)

**TicketNetwork and Ticket Evolution**
- TicketNetwork Mercury: a signed data-sharing agreement, compliance with the Broker Guidebook and technical docs, and ACH payment authorization — [SEC exhibit](https://www.sec.gov/Archives/edgar/data/1750450/000173112221001008/e2818_ex6-6.htm)
- TicketNetwork Private Label: contact team@tnprivatelabel.com — [TicketNetwork LinkedIn](https://www.linkedin.com/company/ticketnetwork)
- Ticket Evolution: access requests are routed by user type. Hosted Checkout is set up by a sales representative on a partner-controlled domain — [Ticket Evolution Getting Access](https://ticketevolution.atlassian.net/wiki/spaces/API/pages/342229112); [Ticket Evolution Hosted Checkout](https://ticketevolution.atlassian.net/wiki/spaces/API/pages/3798958097/Hosted+Checkout)

**Attractions and shows (Tiqets, Headout, Fever, Hellotickets)**
- Tiqets: the affiliate tier has no minimum visitors or orders. The Booking API is granted after a performance review at about 200 orders a month — [Tiqets API Program](https://www.tiqets.com/en/partner-program/api-program/)
- Headout: tiered access, with API Partner (booking) vs Affiliate (discovery plus deep links). Affiliates "will not require access to booking and inventory APIs" — [Headout Partner docs](https://partner.headout.com/docs); [Headout older docs](https://docs.headout.com/guide/getting-started)
- Fever distributor platform is "free to join" — [Fever distributor page](https://business.feverup.com/en/partner-programs/experience-distribution-platform/)
- Fever affiliate restrictions (Mexico listing): no brand-keyword bidding, no unauthorized images, no discount codes — [Tradedoubler Fever MX](https://directory.tradedoubler.com/nl/programs/354822-Fever-MX)
- Hellotickets: join via Tapfiliate. Contact affiliate@hellotickets.com — [Hellotickets affiliate invite](https://hellotickets.tapfiliate.com/)

**AXS, DICE, Eventbrite**
- AXS: bespoke access only through the partnerships team — [MoEngage AXS](https://partners.moengage.com/hc/en-us/articles/49399922705940-AXS)
- DICE: widget needs a Partner ID and API key — [WordPress plugin](https://ar.wordpress.org/plugins/?p=293328)
- Eventbrite: API is scoped to your own organization's events — [Rollout](https://rollout.com/integration-guides/eventbrite/api-essentials)

### Inferences
- Realistic difficulty ranking for WhereTo, easiest to hardest:
  1. Ticketmaster Discovery key; SeatGeek client ID
  2. Impact/Partnerize affiliate approvals (StubHub, Vivid Seats, Ticketmaster, SeatGeek, Gametime); Tiqets, Headout and Fever affiliate APIs
  3. Headout API Partner; Fever distributor
  4. Tiqets Booking API (needs about 200 orders a month first)
  5. Ticket Evolution white label / Hosted Checkout; TicketNetwork Private Label (sales-led, contracts, likely credit and compliance review)
  6. AXS or DICE partnership
  7. Ticketmaster Partner API (effectively unavailable to a pre-scale startup)
- A pre-launch app with no web traffic may struggle with Ticketmaster's affiliate "distinct and unique audiences" test. Having a live app with an established travel audience (flight and hotel bookers) is the relevant credential to present.
- No source documented application fees for any affiliate program.

### Gaps
- No published traffic minimums were found for Ticketmaster, StubHub, Vivid Seats or SeatGeek affiliate approval.
- Contract terms, credit requirements and fees for Ticket Evolution, TicketNetwork Private Label and Fever distribution were not found.
- Whether Ticketmaster's affiliate approval covers mobile-app-only publishers (vs websites) is not explicitly documented. The FAQ says "websites and apps," which suggests apps are eligible.

## Mobile app suitability (deep links into provider apps, native checkout)

### Takeaway
For a native iOS/Android app, the practical options are:
- render discovery data natively (Ticketmaster, SeatGeek, Headout, Tiqets APIs all return structured data) and hand off to tracked deep links that open the provider's site or app
- for in-app checkout, use Headout API Partner, Tiqets Booking API, Fever distributor booking, or Ticket Evolution's hosted/white-label checkout (Apple Pay/Google Pay supported)

Only Vivid Seats is documented as crediting in-app purchases. App-to-web cookie attribution and short cookie windows are the main risks.

### Cited Findings
- **Ticketmaster:**
  - Impact tracking is automatically added to event links returned by the Discovery API/Feed once the Impact Publisher ID is linked — [Ticketmaster Affiliate Sign Up](https://developer.ticketmaster.com/partners/distribution-partners/affiliate-sign-up/)
  - The affiliate program is aimed at "websites and apps" — [Ticketmaster FAQ](https://developer.ticketmaster.com/support/faq/)
  - Snapchat example (2022): no native sales integration; users are redirected to checkout on Ticketmaster.com — [TM Snapchat FAQ](https://business.ticketmaster.com/wp-content/uploads/2022/02/TM-Snapchat-FAQs.pdf)
  - Partner API ticket delivery uses the Secure Entry SDK for rotating SafeTix barcodes — [Partner API SafeTix](https://developer.ticketmaster.com/products-and-docs/apis/partner/safetix/)
- **Vivid Seats:** commission applies to purchases "(in-app or online)" — [FlexOffers Vivid Seats](https://www.flexoffers.com/affiliate-programs/vivid-seats-affiliate-program/). Another listing says purchases on iOS and Android count — [UpPromote Vivid Seats](https://uppromote.com/affiliate-program-directory/vivid-seats)
- **Headout:** product responses include deep-link URLs for affiliates, and the API Partner tier supports a "full booking flow in your product" — [Headout Partner docs](https://partner.headout.com/docs)
- **Ticket Evolution:** Hosted Checkout supports Apple Pay and Google Pay — [Ticket Evolution Hosted Checkout](https://ticketevolution.atlassian.net/wiki/spaces/API/pages/3798958097/Hosted+Checkout)
- **DICE:** widget with purchase overlay (web embed) — [WordPress plugin](https://ar.wordpress.org/plugins/?p=293328)
- **Fever:** distributor catalog can be integrated "into your platform, products, or AI assistants" — [Fever distributor page](https://business.feverup.com/en/partner-programs/experience-distribution-platform/)
- **Cookie windows:** Fever 1 day — [FlexOffers Fever](https://www.flexoffers.com/affiliate-programs/fever-up-affiliate-program); SeatGeek on FlexOffers 2 days — [FlexOffers SeatGeek](https://www.flexoffers.com/affiliate-programs/seatgeek-affiliate-program)

### Inferences
- **Attribution risk:** when a tracked link opens a provider's native app (e.g., Ticketmaster, StubHub or SeatGeek universal links) rather than the mobile web, attribution depends on the network's app-tracking support (Impact and Partnerize both offer mobile-app tracking products, per my background knowledge; not verified here). Vivid Seats is the only program found that explicitly credits in-app purchases.
- **Option A, deep-link out:** opening affiliate links in an in-app browser (SFSafariViewController / Chrome Custom Tabs) keeps the user near WhereTo and preserves web-cookie attribution. However, the user may not be signed in to Ticketmaster or StubHub there, and ticket delivery will still land in the provider's app or account.
- **Option B, native in-app checkout:** this needs a booking API (Headout, Tiqets, Fever, Ticket Evolution) and WhereTo's own payment flow, or a hosted checkout. Apple and Google generally require non-IAP payment methods for real-world goods and services such as event tickets, so standard card or Apple Pay processing is allowed. This is background knowledge of App Store Guideline 3.1.5, not verified this session.
- **Delivery:** for resale tickets bought through white-label partners, tickets are often delivered as transfers into the primary ticketer's app (e.g., Ticketmaster/AXS mobile transfer) rather than inside WhereTo. Customer-service flows must account for this (inference).

### Gaps
- No source confirmed Ticketmaster, StubHub or SeatGeek support for app-to-app deep-link attribution (e.g., Impact Mobile / Partnerize app tracking for these specific brands).
- No documentation found on whether Ticket Evolution Hosted Checkout can be embedded in a native webview, or whether it requires a full browser.

## Recent news 2024–2026 (antitrust, fee rules, API and corporate changes)

### Takeaway
The regulatory and structural landscape is moving fast:
- A jury found Live Nation/Ticketmaster liable for monopolization (April 15, 2026). Remedies, possibly including a Ticketmaster breakup, are not expected before 2027, and final resolution not before 2028.
- The FTC's all-in-pricing Fees Rule took effect May 12, 2025, and was first enforced against StubHub ($10M, April 2026).
- The federal TICKET Act has not been confirmed as law.
- Consolidation continues: StubHub IPO (Sept 2025), Fever acquired DICE (June 2025), Bending Spoons acquired Eventbrite (closed March 2026).

### Cited Findings

**Live Nation / Ticketmaster antitrust**
- Jury verdict April 15, 2026 (SDNY) for the plaintiff states on all claims. The jury found that Live Nation/Ticketmaster unlawfully monopolized primary ticketing services and amphitheaters and tied amphitheaters to concert promotion. It found an overcharge of $1.72 per ticket across 22 states — [NH DOJ](https://www.doj.nh.gov/news-and-media/live-nation-and-ticketmaster-antitrust-verdict); [NY AG](https://ag.ny.gov/press-release/2026/attorney-general-james-and-coalition-states-win-trial-against-live-nation-and); [Billboard](https://www.billboard.com/pro/live-nation-verdict-ticketmaster-loses-antitrust-trial/); [Paul Weiss](https://www.paulweiss.com/insights/client-memos/live-nationticketmaster-antitrust-verdict-key-takeaways-from-the-states-jury-trial-win)
- The DOJ settled mid-trial. The settlement included a $280M fund, did not require divesting Ticketmaster, divested 13 amphitheater booking agreements and capped service fees. The states continued the case. Sources conflict on the count: "33 states and DC" vs "34 states and DC" — [Paul Weiss](https://www.paulweiss.com/insights/client-memos/live-nationticketmaster-antitrust-verdict-key-takeaways-from-the-states-jury-trial-win); [TheTicketingBusiness, May 2026](https://www.theticketingbusiness.com/2026/05/live-nation-ticketmaster-antitrust-penalties-not-expected-until-2027/); [Hypebot](https://www.hypebot.com/live-nation-legal-battles-what-happens-next-in-2026-2027/)
- Remedies phase:
  - A bench trial before Judge Arun Subramanian. Breakup arguments are not expected before February 2027, and the trial may run into spring 2027.
  - The states seek structural separation, amphitheater divestiture, re-entry limits, disgorgement and penalties. Possible remedies also include "mandatory multi-vendor ticketing access, fee caps, open-platform requirements."
  - The DOJ settlement is the "floor."
  - A Tunney Act ruling was expected by September–October 2026.
  - Live Nation filed Rule 50/59 motions, which the judge said raise "serious issues."
  - Final resolution is not expected before 2028.
  - [Courthouse News](https://courthousenews.com/penalties-phase-of-live-nation-ticket-monopoly-trial-will-stretch-into-2027/); [CelebrityAccess, May 2026](https://celebrityaccess.com/2026/05/12/live-nation-remedies-trial-could-run-into-2027/); [Hypebot](https://www.hypebot.com/live-nation-legal-battles-what-happens-next-in-2026-2027/); [Billboard, What's Next](https://www.billboard.com/pro/live-nation-lost-monopoly-trial-what-happens-ticketmaster/)

**FTC Fees Rule**
- The Rule on Unfair or Deceptive Fees took effect May 12, 2025, for live-event tickets and short-term lodging. It requires the total price wherever a price appears, plus disclosure of the nature and purpose of fees — [TechCrunch, May 2025](https://techcrunch.com/2025/05/05/ftc-bans-hidden-fees-for-live-events-and-short-term-rentals-effective-may-12/); [Ohio AG, Aug 2025](https://ohioattorneygeneral.gov/Media/Newsletters/Consumer-Advocate/August-2025/Know-your-rights-FTC-s-rule-on-unfair-or-deceptive)
- Search summaries of these sources say the rule covers "sellers, resellers, and third-party platforms" — [Ohio AG](https://ohioattorneygeneral.gov/Media/Newsletters/Consumer-Advocate/August-2025/Know-your-rights-FTC-s-rule-on-unfair-or-deceptive)
- Penalties: up to $50,120 per violation, a figure from the proposed-rule stage — [AGG](https://www.agg.com/news-insights/publications/that-dont-make-it-junk-the-proposed-junk-fee-ban-will-fundamentally-change-concert-ticketing/)
- Live Nation said it adopted all-in pricing in late 2023. SeatGeek and TickPick moved to all-in pricing before the mandate — [TechCrunch](https://techcrunch.com/2025/05/05/ftc-bans-hidden-fees-for-live-events-and-short-term-rentals-effective-may-12/)
- First major enforcement: on April 9, 2026, StubHub agreed to $10M in consumer redress for purchases made May 12–14, 2025 (proposed order, SDNY). StubHub disputed the FTC's assertions — [FTC press release](https://www.ftc.gov/news-events/news/press-releases/2026/04/stubhub-refunding-10-million-fees-consumers-after-deceptive-ticket-pricing); [JD Supra](https://www.jdsupra.com/legalnews/ftc-v-stubhub-10-million-settlement-8021470/); [NBC Chicago](https://www.nbcchicago.com/news/national-international/stubhub-refund-10m-ftc-violations/3920499/?amp=1)

**Other ticketing law**
- TICKET Act (all-in pricing; the House version banned speculative tickets): passed the House 409–15, and the tracker lists House passage on April 29, 2025. Senate Commerce Committee approval was announced by Markey/Schmitt, and the committee version dropped the speculative-ticket ban. No evidence it became law — [Music Business Worldwide](https://www.musicbusinessworldwide.com/us-house-passes-ticket-act-mandating-all-in-pricing-for-ticket-sales-heads-to-senate); [Sen. Markey release](https://www.markey.senate.gov/news/press-releases/senators-markey-schmitt-applaud-committee-passage-of-legislation-to-increase-transparency-in-ticket-sales); [The Lobby, H.R. 1402 tracker](https://www.thelobbynews.com/congress/bills/119/house-bill/1402?tab=votes)
- New York enacted its own fee-transparency law for live-event ticketing — [Frankfurt Kurnit advertising law blog](https://advertisinglaw.fkks.com/post/102hvkw/new-york-enacts-fee-transparency-law-for-live-event-ticketing)
- President Trump issued an executive order on ticketing, which the Sports Fans Coalition applauded — [SFC statement](https://www.sportsfans.org/latest-news/sfc-statement-applauding-president-trumps-executive-order-on-ticketing)

**Corporate and API changes**
- StubHub IPO completed September 18, 2025, at $23.50 per share (34.0M shares, about $758M net, used mostly to repay about $750M of debt). NYSE listed — [StubHub 10-Q Q3 2025](https://www.sec.gov/Archives/edgar/data/1337634/000162828025052164/stub-20250930.htm)
- StubHub signed MLB primary distribution via Direct Issuance from 2026 — [StubHub 10-K](https://www.sec.gov/Archives/edgar/data/1337634/000162828026014844/stub-20251231.htm)
- Fever acquired DICE (announced June 5, 2025; terms undisclosed) after raising $100M — [Pollstar](https://news.pollstar.com/2025/06/05/ticketer-dice-acquired-by-events-discovery-platform-fever/); [Davis Polk](https://www.davispolk.com/index%2Ephp/experience/fever-acquisition-dice)
- Bending Spoons agreed to acquire Eventbrite for about $500M ($4.50 per share), announced December 2, 2025. Its Q2 2026 6-K records the acquisition date as March 10, 2026 — [Skift Meetings](https://meetings.skift.com/2025/12/02/bending-spoons-to-acquire-eventbrite-in-500-million-cash-deal/); [Bending Spoons 6-K](https://www.sec.gov/Archives/edgar/data/0002004711/000200471126000011/bsp_ex99-2.htm)
- Vivid Seats: Lawrence Fey succeeded Stan Chia as CEO in November 2025. 2026 guidance projected declines, partly offset by World Cup demand in Q2 2026 — [Vivid Seats 8-K 2026](https://www.sec.gov/Archives/edgar/data/0001856031/000114036126018995/ef20072417_ex99-1.htm); [Barchart Q2 2026](https://www.barchart.com/story/news/3630853/vivid-seats-reports-second-quarter-2026-results)
- SeatGeek continued winning primary contracts from Ticketmaster: Minnesota Wild (July 2026), Philadelphia Union, USGA — [Fox 9](https://www.fox9.com/sports/mn-wild-grand-casino-arena-drop-ticketmaster-switch-seatgeek)
- AXS–Tickets for Good API distribution expanded to the UK in February 2026, with Germany planned — [Business Wire](https://www.businesswire.com/news/home/20260225943147/en/AXS-Expands-Tickets-for-Good-Partnership-to-the-UK-Enabling-More-Community-Access-to-Live-Events)
- Ticketmaster Partner API docs note "the captcha token is not used anymore and can be omitted from reserve request" (date not given) — [Partner API docs](https://developer.ticketmaster.com/products-and-docs/apis/partner/)
- Ticketmaster publishes a Discovery Feed release-notes page and a "Distributed Commerce 2024 Year in Review" (content not retrieved) — [Discovery Feed release notes](https://developer.ticketmaster.com/products-and-docs/apis/discovery-feed/release-notes/); [Distributed Commerce 2024 Year in Review](https://business.ticketmaster.com/distributed-commerce-2024-year-in-review/)

### Inferences
- **All-in pricing applies to WhereTo:** if WhereTo shows ticket prices pulled from APIs, it should show all-in prices including mandatory fees. The Fees Rule covers third-party platforms, and the StubHub case shows active enforcement. This is my reading of the cited scope and has not been verified by counsel. Discovery APIs that return face-value price ranges (e.g., Ticketmaster `priceRanges`) may not include fees, so showing "from $X" without fees could create exposure (inference).
- **Possible opening at Ticketmaster:** remedies under discussion, such as "open-platform requirements" and "multi-vendor ticketing access," could eventually widen third-party access to Ticketmaster primary inventory. This is speculative, and court-ordered remedies are unlikely to take effect before 2027–2028 given appeals.
- **Consolidation and API risk:** Eventbrite is now under Bending Spoons and DICE under Fever. Both acquirers have reputations for restructuring products (inference), so API and partner terms for these brands may change.

### Gaps
- No post-May-2026 reporting was found on the Tunney Act ruling or on the Rule 50/59 decisions. Status as of October 2026 is unverified.
- The current status (as of October 2026) of the TICKET Act (H.R. 1402 / S. 281) was not confirmed.
- The date and contents of the Trump executive order were not retrieved. My background knowledge suggests March 31, 2025, but this is unverified.
- I did not find (search budget exhausted) coverage of any FTC action against Live Nation/Ticketmaster itself, or of BOTS Act enforcement in 2025–2026.
- No information found on 2025–2026 changes to the Ticketmaster Discovery API (versions, deprecations) or the SeatGeek API.

## Pros and cons for a startup consumer travel app (WhereTo Trips)

### Takeaway
A phased approach fits best:
1. **Launch** with free discovery data (Ticketmaster Discovery plus SeatGeek) and affiliate deep links. Use Ticketmaster for primary inventory and StubHub, Vivid Seats or SeatGeek for resale. Add the attractions/shows APIs (Tiqets, Headout, Fever), which include content APIs and later booking APIs.
2. **Add native in-app booking** for attractions and shows once volume qualifies (Headout API Partner; Tiqets Booking API at about 200 orders a month).
3. **Evaluate white-label/in-app resale checkout** through Ticket Evolution or TicketNetwork Private Label, the only documented ways to sell concert and sports tickets in-app with the provider as payment, fraud and customer-service owner, if margin justifies the trust and compliance burden.

The Ticketmaster Partner API is not realistic for a pre-scale startup.

### Cited Findings
- Ticketmaster Discovery is free, broad (25+ markets) and has built-in Impact link tracking. But commissions are low (about 1% or $0.30 per ticket in sourced markets), the quota is 5,000 calls/day, and the Partner API is restricted — [Ticketmaster Discovery API](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/); [Ticketmaster Affiliate Sign Up](https://developer.ticketmaster.com/partners/distribution-partners/affiliate-sign-up/); [Travelpayouts Ticketmaster](https://www.travelpayouts.com/en/offers/ticketmaster-affiliate-program); [Partner API](https://developer.ticketmaster.com/products-and-docs/apis/partner/)
- SeatGeek offers a free commercial-use API. But it is discovery-only, can be discontinued without notice, and its partner license and commission terms conflict (2–5% on Impact vs "no payment obligation") — [SeatGeek API Terms](https://seatgeek.com/api-terms); [SeatGeek Partner Terms](https://seatgeek.com/partner-terms); [UpPromote SeatGeek](https://uppromote.com/affiliate-directory/seatgeek/)
- StubHub has the broadest geography (200+ countries) and an official 30-day cookie, but no public API was found and rates conflict (3.2–9%). It also carries regulatory baggage (FTC $10M settlement, April 2026) — [StubHub 10-K](https://www.sec.gov/Archives/edgar/data/1337634/000162828026014844/stub-20251231.htm); [StubHub Affiliates](https://stubhub.com/affiliates); [FTC](https://www.ftc.gov/news-events/news/press-releases/2026/04/stubhub-refunding-10-million-fees-consumers-after-deceptive-ticket-pricing)
- Vivid Seats explicitly credits in-app purchases with a 30-day cookie, but its business has been declining in 2026 and no API was found — [FlexOffers Vivid Seats](https://www.flexoffers.com/affiliate-programs/vivid-seats-affiliate-program/); [Seeking Alpha Q1 2026](https://seekingalpha.com/pr/20500004)
- TicketNetwork has the highest affiliate commission (12.5–14.5%) and a turnkey Private Label (checkout, payments, fulfillment, customer service handled by TN). But inventory is resale-only, and commission is on ticket price only — [TicketNetwork Affiliate Program](https://www.ticketnetwork.com/en/affiliate-program); [TicketNetwork LinkedIn](https://www.linkedin.com/company/ticketnetwork); [Affiliate Toolkit](https://www.affiliate-toolkit.com/program/ticketnetwork/)
- Ticket Evolution's white-label affiliate model means TEvo processes the card and handles fraud and customer service. Hosted Checkout supports Apple Pay and Google Pay. The trade-off is a sales-led setup and resale inventory — [Ticket Evolution Getting Access](https://ticketevolution.atlassian.net/wiki/spaces/API/pages/342229112); [Hosted Checkout](https://ticketevolution.atlassian.net/wiki/spaces/API/pages/3798958097/Hosted+Checkout)
- Headout's documented two-tier API (affiliate deep links → full booking) includes Broadway. Headout refunds affiliate customers directly — [Headout Partner docs](https://partner.headout.com/docs)
- Tiqets has a free content/availability API and a path to the Booking API at about 200 orders a month, at about 8% — [Tiqets API Program](https://www.tiqets.com/en/partner-program/api-program/); [Travelpayouts Tiqets](https://travelpayouts.com/en/offers/tiqets-affiliate-program)
- Fever offers wholesale distribution with catalog integration and owns DICE. Its affiliate cookie is 1 day — [Fever distributor page](https://business.feverup.com/en/partner-programs/experience-distribution-platform/); [FlexOffers Fever](https://www.flexoffers.com/affiliate-programs/fever-up-affiliate-program)
- Hellotickets is traveler-oriented (sports, concerts, theater), pays 10% with a 30-day cookie, and has no API — [Tapfiliate Hellotickets](https://tapfiliate.com/offers/hellotickets-affiliate-program/)
- Viator, GetYourGuide and Holibob carry only limited concert/sports inventory (musicals, classical concerts) — [SmarterTravel](https://www.smartertravel.com/best-ticket-websites-tours-activities/); [Travolution](https://www.travolution.com/news/holibob-curates-experiences-for-music-and-culture-lovers-with-classictic-partnership/)
- Eventbrite has no cross-platform search API, so it is not usable for destination discovery — [Rollout](https://rollout.com/integration-guides/eventbrite/api-essentials)
- AXS, DICE, Tickets.com and Universe offer partner-only or organizer-scoped access — [MoEngage AXS](https://partners.moengage.com/hc/en-us/articles/49399922705940-AXS); [APIs.io DICE](https://apis.io/providers/dice/); [Universe API Options](https://developers.universe.com/docs/api-options)

### Inferences

**Ticketmaster (Discovery + Impact affiliate)**
- Pros: best free primary-event data, international, official, deep links with auto-tracking.
- Cons: about 1% commission, no in-app checkout, approval subjective, quota limits, antitrust uncertainty.
- Best use: core "events at your destination" feed.

**SeatGeek API + affiliate**
- Pros: free, clean API, mixes primary and resale, all-in pricing.
- Cons: discovery-only; terms say API can be discontinued; conflicting commission terms; short FlexOffers cookie.
- Best use: secondary discovery source and price comparison.

**StubHub / Vivid Seats / Gametime / TickPick affiliates**
- Pros: 3–7% commissions; 30-day cookies; resale fills sold-out shows.
- Cons: no API or data feed found, so WhereTo needs Ticketmaster/SeatGeek data to build cards and then link out to search pages (inference); FTC and fee-disclosure risk; TickPick program possibly paused.
- Best use: "find resale tickets" fallback links.

**TicketNetwork Private Label / Ticket Evolution white label**
- Pros: highest margins (12.5%+ or own markup); in-app checkout possible; provider handles payment, fraud, delivery and customer service.
- Cons: resale-only, higher prices; brand-trust risk for a travel app; contracts and sales-led onboarding; WhereTo branding on resale ticket complaints; FTC all-in pricing compliance on WhereTo's surface.
- Best use: phase 3, if event GMV is material.

**Ticketmaster Partner API**
- Pros: true primary in-app checkout with SafeTix.
- Cons: restricted to official distribution partners; realistically unavailable to a startup.
- Best use: long-term business-development target only.

**Headout / Tiqets / Fever (attractions, Broadway, Candlelight etc.)**
- Pros: travel-native; documented booking APIs; 5–8% typical; Broadway via Headout; global cities.
- Cons: thin coverage of major concerts and pro sports; Fever 1-day cookie; Tiqets booking needs volume; API-partner tier shifts refunds and customer service to WhereTo.
- Best use: first transactional in-app booking.

**Hellotickets**
- Pros: travel-oriented sports and concerts; 10%.
- Cons: affiliate-only, no API; smaller brand.
- Best use: supplementary link-out for travelers.

**Eventbrite / AXS / DICE / Tickets.com / Universe / Tixstock**
- Pros: n/a for a startup (partner-only).
- Cons: no open discovery or affiliate access for consumer apps (Eventbrite search removed in 2020).
- Best use: skip for now; Universe inventory likely surfaces via Ticketmaster Discovery (inference).

**Overall**
- Since WhereTo already uses a merchant-of-record partner (Nuitée/LiteAPI) for hotels, the most analogous event model is one where the supplier is merchant of record and owns customer service. Among the options found, that means Ticket Evolution white-label affiliate, TicketNetwork Private Label, or Headout/Tiqets in affiliate mode. Any "API partner" tier (Headout API Partner, Ticket Evolution partner) would make WhereTo responsible for payments and refunds, which is a materially different risk profile.
- **Data-licensing caveat:** combining Ticketmaster Discovery data with competitor (StubHub/Vivid Seats) links on the same screen may conflict with Ticketmaster's affiliate or developer terms. I did not verify this; check the terms before launch.

### Gaps
- No official confirmation that StubHub, Vivid Seats or Gametime provide product or event feeds to affiliates. Without feeds, WhereTo can only link out to search or category pages for those brands.
- No published data on conversion rates or average order values for event affiliates in travel apps, beyond Tiqets' $72.66 average order value via Travelpayouts.
- Ticketmaster developer and affiliate terms on displaying competitor resale links alongside Ticketmaster data were not retrieved (page fetch blocked).
- Recommendations above are synthesized inferences, not sourced conclusions, and should be validated with each provider's partnerships team.
