---
layout: layouts/page.njk
title: "Insights — Travel ideas, budgets & trends | WhereTo"
description: "Travel inspiration, budget tips, group-travel advice, hidden gems, trends, and how AI is changing travel — from the WhereTo team."
sections:
  - type: hero
    eyebrow: "Insights"
    title:
      pre: "Ideas to help you "
      accent: "wander"
      post: "."
    lede: "The research, the strategy, and the occasional rabbit hole — all in one place."
    primaryBtn:
      label: "Read the latest"
      href: "#posts"
    ghostBtn:
      label: "Get the app"
      href: "/app/"
    image:
      src: "/media/chat.jpg"
      alt: "Reading travel ideas"

  - type: tile_grid
    background: true
    eyebrow: "Browse by topic"
    title:
      pre: "Ideas for the trip you haven't "
      accent: "planned yet"
      post: "."
    columns: 3
    tiles:
      - { label: "Travel Inspiration", icon: "🌍", blurb: "Destinations and trip ideas worth chasing." }
      - { label: "Budget Travel", icon: "💸", blurb: "How to stretch a trip budget without shrinking the trip." }
      - { label: "Group Travel", icon: "🧳", blurb: "Planning strategy for friends, family, and who's paying for what." }
      - { label: "Hidden Gems", icon: "🗺️", blurb: "The places worth knowing about before everyone else does." }
      - { label: "Travel Trends", icon: "📈", blurb: "What's changing in how people plan and book trips." }
      - { label: "AI & Travel", icon: "🧭", blurb: "How tools like WhereTo's Vibe Engine are changing destination discovery." }

  - type: collection_grid
    id: "posts"
    eyebrow: "Latest"
    title:
      pre: "From the "
      accent: "blog"
      post: "."
    intro: "Practical, opinionated takes on planning better trips."
    collection: "insight"
    columns: 3

  - type: cta_band
    eyebrow: "Ready to wander?"
    title:
      pre: "Turn an idea into a "
      accent: "trip"
      post: "."
    body: "Get matched to real destinations for your budget and your vibe — in the WhereTo app."
---
