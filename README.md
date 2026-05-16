# Mercatus

**Peer-to-peer barter for communities** — trade what you have for what you need. No money; built around trust, geolocation, and fast resource exchange.

Hackathon project: **hackathon2026kmp20**.

---

## Why Mercatus

When stores and logistics fail, people still need water, food, medicine, tools, and connectivity. Mercatus connects neighbors: post **what you offer** and **what you need**, find matches on the map or feed, chat to coordinate, and confirm the swap with a QR code.

---

## Features

| Area | Description |
|------|-------------|
| **Feed** | Active listings, search, urgency/category filters, distance |
| **Map** | Listings on `react-native-maps` |
| **Create** | Categories, description, photo, geolocation |
| **Trade** | Swap status, QR meetup confirmation, cancel, reports |
| **Chats** | Messaging per listing |
| **Profile** | Reputation, trade history, avatar |
| **Notifications** | Critical-urgency offers nearby |

UI: **English** and **Ukrainian**.

---

## Stack

- React Native + **Expo 54** (TypeScript)
- **Supabase** — REST API, Storage, polling for live updates
- `expo-location`, `react-native-maps`, `expo-camera`, QR scanner

---

## Quick start

**Requirements:** Node.js 18+, [Expo Go](https://expo.dev/go) or an emulator, internet.

```bash
cd mercatus
npm install
npx expo start
```

In the Expo terminal: **`a`** (Android), **`i`** (iOS, macOS), or scan the QR for Expo Go.

```bash
npm run android
npm run ios
npm run web
```

Allow location and camera permissions on a real device.

---

## Project structure

```
hackaton2026/
└── mercatus/
    ├── App.tsx
    ├── supabase.ts      # users, listings, chats, trades
    └── src/
        ├── screens/
        ├── components/
        ├── i18n/
        └── theme/
```

**Flow:** listing → chat → QR confirmation → trade history + reputation.

---

## Resource categories

Water, batteries, medicine, fuel, food, tools, clothing, hygiene, connectivity, transport, first aid, baby items.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Feed empty | Check internet and Supabase |
| Map empty | Enable location; listings need coordinates |
| QR fails | Camera permission and lighting |
| Install errors | Node 18+; remove `mercatus/node_modules` and run `npm install` again |
