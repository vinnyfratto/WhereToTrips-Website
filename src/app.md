---
layout: layouts/page.njk
title: "Get the WhereTo App — iOS & Android"
description: "Download WhereTo for iOS and Android. Free to download — get personalized destination matches, plan group trips with Wander Together, and book flights, hotels, and activities, all in the app."
sections:
  - type: hero
    eyebrow: "Get the App"
    title:
      pre: "Get the "
      accent: "WhereTo"
      post: " app."
    lede: "Free to download on iOS and Android. Get personalized destination matches, plan with Wander Together, and book flights, hotels, and activities — all in one app. (In-app purchases and booking are handled in the app.)"
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
      post: " to install."
    body: |
      <p style="text-align:center;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https%3A%2F%2Fwheretotrips.com%2Fapp%2F" alt="QR code linking to the WhereTo app" width="180" height="180" style="display:inline-block;border-radius:12px;border:1px solid var(--wg200);" />
      </p>
      <p style="text-align:center;">Point your phone's camera at the code to open WhereTo on your device.</p>

  - type: email_capture
    background: false
    eyebrow: "Not ready yet?"
    title:
      pre: "Email me the "
      accent: "link"
      post: "."
    body: "On the wrong device or want it later? Drop your email and we'll send the download link straight to your inbox."
    subject: "Send me the WhereTo app link"
    intent: "app_link"
    buttonLabel: "Send Me the Link"
    note: "One email with your link. We won't add you to anything else."
---
