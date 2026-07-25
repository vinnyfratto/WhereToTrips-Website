---
layout: layouts/page.njk
title: "Get the WhereTo App — iOS & Android"
description: "Download WhereTo for iOS and Android. Free to download — get personalized destination matches, plan group trips with Wander Together, and book flights, hotels, and activities, all in the app."
sections:
  - type: hero
    eyebrow: "Get the App"
    title:
      pre: "This is where the trip "
      accent: "actually starts"
      post: "."
    lede: "Everything on this site points here. Let's go. Free to download on iOS and Android — get personalized destination matches, plan with Wander, and book flights, hotels, and activities, all in the app."
    primaryBtn:
      label: "Get the App"
      href: "#download"
    ghostBtn:
      label: "What you can do"
      href: "#what"
    image:
      src: "/media/hero.jpg"
      alt: "A traveler using the WhereTo app"

  - type: cta_band
    id: "download"
    eyebrow: "Install WhereTo"
    title:
      pre: "Your next trip is one "
      accent: "tap"
      post: " away."
    body: "Free to download. No subscription. Just better travel."

  - type: tile_grid
    id: "what"
    background: true
    eyebrow: "Inside the app"
    title:
      pre: "What you can "
      accent: "do"
      post: "."
    columns: 3
    tiles:
      - { label: "Get matched", icon: "🎯", blurb: "Personalized destination matches for your budget, dates, and vibe." }
      - { label: "Plan together", icon: "👥", blurb: "Start a group trip with Wander Together and find where you all want to go." }
      - { label: "Book it", icon: "🧾", blurb: "Flights, hotels, and activities — booked in one flow, in the app." }

  - type: rich_text
    id: "qr"
    title:
      pre: "On a computer? "
      accent: "Scan"
      post: " to get WhereTo on your phone."
    body: |
      <p style="text-align:center;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https%3A%2F%2Fwheretotrips.com%2Fapp%2F" alt="QR code linking to the WhereTo app" width="180" height="180" style="display:inline-block;border-radius:12px;border:1px solid var(--wg200);" />
      </p>
      <p style="text-align:center;">Scan to get WhereTo on your phone.</p>

  - type: email_capture
    background: false
    eyebrow: "Not ready yet?"
    title:
      pre: "Email me the "
      accent: "link"
      post: "."
    body: "Not ready yet? We'll send you the link."
    subject: "Send me the WhereTo app link"
    intent: "app_link"
    buttonLabel: "Send Me the Link"
    note: "One email with your link. We won't add you to anything else."
---
