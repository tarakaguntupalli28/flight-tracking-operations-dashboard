# Flight Tracking & Operations Dashboard

A responsive Angular 20 operations dashboard for monitoring mock commercial flights on a Leaflet map. The experience is built for aviation operations teams that need quick filtering, route context, and flight status visibility.

## Features

- Interactive Leaflet map with 18 mock flights
- Marker popups with flight number, callsign, origin, destination, and status
- Route highlighting for the selected flight with origin, current position, and destination
- Flight details panel with aircraft, schedule, altitude, and speed
- KPI cards for total, active, delayed, and arrived flights
- Reactive search and filters for callsign, status, origin, and destination
- Angular routing, standalone components, service-driven data, RxJS streams, and responsive layout
- SSR-safe Leaflet loading through browser-only dynamic import

## Tech Stack

- Angular 20
- TypeScript
- Reactive Forms
- RxJS
- Angular Router
- Leaflet

## Setup

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm start
```

Open:

```text
http://localhost:4200/
```

Build for production:

```bash
npm run build
```

Run unit tests:

```bash
npm test
```

## Project Notes

The npm scripts call Angular CLI through `node ./node_modules/@angular/cli/bin/ng.js`. This avoids a Windows command parsing issue when the project path contains an ampersand, such as `Flight Tracking & Operations Dashboard`.

## Design Explanation

See [DESIGN.md](./DESIGN.md) for the dashboard structure, UX decisions, and implementation notes.
