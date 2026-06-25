---
layout: layouts/page.njk
title: "Contact WhereTo"
description: "Get in touch with WhereTo. Traveler support, creator partnerships, and travel-industry partnerships — routed to the right team."
sections:
  - type: hero
    eyebrow: "Contact"
    title:
      pre: "We'd love to "
      accent: "hear from you"
      post: "."
    lede: "Pick the path that fits and we'll route your message to the right team."
    primaryBtn:
      label: "Send a message"
      href: "#message"
    ghostBtn:
      label: "Read the FAQ"
      href: "/faq/"
    image:
      src: "/media/together.jpg"
      alt: "Friendly conversation"

  - type: tile_grid
    background: true
    eyebrow: "Who are you?"
    title:
      pre: "Find the right "
      accent: "team"
      post: "."
    columns: 3
    tiles:
      - { label: "Travelers", icon: "🧳", blurb: "Questions or support? Send us a note below.", href: "#message" }
      - { label: "Creators", icon: "⭐", blurb: "Partnership opportunities for creators & influencers.", href: "/partners/creators/" }
      - { label: "Travel Industry", icon: "🏢", blurb: "Strategic partnerships for travel brands.", href: "/partners/industry/" }

  - type: contact_form
    id: "message"
    eyebrow: "Traveler support"
    title:
      pre: "Send us a "
      accent: "message"
      post: "."
    body: "Questions about WhereTo, your account, or a trip? We're here to help."
    intent: "contact_traveler"
    subject: "Traveler contact — WhereTo"
    placeholder: "How can we help?"
    buttonLabel: "Send message"
---
