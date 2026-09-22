# Gas App

Find the cheapest nearby gas stations, sorted by price and distance —
with price alerts and history tracking.

## Stack

- Expo (React Native) + TypeScript
- `expo-location` for GPS
- `expo-notifications` for local price alerts
- React Navigation (list → detail → alerts)
- AsyncStorage for favorites, alert settings, and price history

## Run it

```bash
npm install
npm start
```

Then scan the QR code with **Expo Go** (free, install from the App Store /
Play Store — it's the app that actually runs this project; it's separate
from Claude) or press `i` / `a` for a simulator.

Your phone and the computer running `npm start` need to be on the same
Wi-Fi network. If they aren't (e.g. phone on cellular), run
`npx expo start --tunnel` instead — same QR flow, but works over the
internet.

## Data sources

`getStationsForLocation` in `src/data/stationProvider.ts` tries these in
order, each falling back to the next if it fails or isn't configured:

### 1. Google Places API (real stations + real per-station prices)

The only source with genuine per-station pricing — Google's Places API
(New) has a `fuelOptions` field with real, per-fuel-type prices per gas
station (delayed, not live-live, but real numbers, not simulated).

Setup (requires a billing-enabled Google Cloud project — a card on file,
though usage should stay within the monthly free credit for personal
use):

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com/).
2. Link a billing account (**Billing** in the sidebar).
3. Enable **"Places API (New)"** under **APIs & Services → Library**.
4. Create a key under **APIs & Services → Credentials**, and restrict it
   to Places API (New) only.
5. Put it in `.env` as `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`.

When this is set and the request succeeds, it's used exclusively —
stations, addresses, and every price shown are Google's real data.

### 2. OpenStreetMap + EIA (real stations, regionally-anchored simulated prices)

If Google isn't configured or its request fails:

- **Station names/addresses/locations** come from **OpenStreetMap**
  (`src/data/overpass.ts`, the free public Overpass API — no key needed).
  Real gas stations near you, crowd-sourced map data.
- **Prices** are simulated per station, anchored to a real regional
  average from **[EIA](https://www.eia.gov/opendata/register.php)** (free,
  instant key, no approval wait) instead of a fixed guess:

  ```bash
  cp .env.example .env
  # then edit .env and paste your key into EXPO_PUBLIC_EIA_API_KEY
  ```

  With a key set, the app reverse-geocodes your location to a US state,
  pulls that state's real current weekly average, and anchors the
  simulated per-station prices around it (±12%). The list screen also
  shows a real 12-week trend sparkline for your state.

### 3. Fully simulated (last resort)

If both of the above are unavailable or fail (offline, no keys, network
issues), everything — stations and prices — is simulated around a fixed
baseline so the app never breaks. It always tells you which parts of
what you're seeing are simulated.

## Price alerts

Tap the 🔔 in the header to set a target price per fuel type. On every
refresh, if the cheapest nearby station is at or below your target, you
get a local push notification (cooldown of 6h per fuel type so it doesn't
spam you for the same price).

## Price history

Every refresh snapshots each station's prices to AsyncStorage (last 30
points). The station detail screen shows a sparkline per fuel type once
it has at least two data points — this is real history of what *this
app* has observed on *this device*, not a historical market feed.

## Structure

```
App.tsx                        navigation root (list → detail → alerts)
src/
  types.ts                     Station / FuelPrice types
  data/
    stationProvider.ts         data source waterfall: Google Places -> OSM+EIA -> mock
    googlePlaces.ts            Google Places API client (real per-station prices)
    overpass.ts                OpenStreetMap client (real station names/addresses/coordinates)
    eia.ts                     EIA API client (regional average + history)
    priceHistory.ts            AsyncStorage-backed per-station price snapshots
    alerts.ts                  AsyncStorage-backed alert thresholds + notify de-dupe
    favorites.ts               AsyncStorage-backed favorites
  services/notifications.ts    expo-notifications wrapper
  hooks/useLocation.ts         GPS permission + current position
  utils/distance.ts            haversine distance calc
  components/                  StationCard, FuelTypeTabs, Sparkline
  screens/                     StationListScreen, StationDetailScreen, AlertsScreen
```
