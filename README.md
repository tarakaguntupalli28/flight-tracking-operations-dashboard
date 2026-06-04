# Flight Tracking & Operations Dashboard

A responsive Angular 20 operations dashboard for monitoring mock commercial flights on a Leaflet map. The experience is built for aviation operations teams that need quick filtering, route context, and flight status visibility.

## Features

- Interactive Flight Monitoring Dashboard
- Leaflet Map Integration
- Route Visualization with Polylines
- Auto-focus on selected flight route bounds
- Highlighted selected marker
- Route distance and estimated duration summary
- Flight Details Panel
- KPI Dashboard
- Search by Callsign
- Filter by Status, Origin and Destination
- Day/Night Mode
- Responsive Design
- SSR-safe Leaflet loading through browser-only dynamic import

## Tech Stack

- Angular 20
- TypeScript
- Reactive Forms
- RxJS
- Angular Router
- Leaflet
- CSS

## Architecture

```text
Components
|-- Dashboard
|-- Flight Map
|-- Flight Details
|-- KPI Cards
|-- Search & Filters
`-- Flight List

Services
`-- Flight Service
```

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
