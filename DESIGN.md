# Design Explanation

## Product Direction

The dashboard is designed as a working operations surface rather than a landing page. The map is the primary workspace, while the left panel provides the controls and operational context a dispatcher would need during repeated monitoring work.

The visual style uses a dark aviation operations theme with restrained contrast, compact KPI cards, clear status colors, and dense but readable flight rows. The goal is to make active flights, delays, and selected route context easy to scan without oversized decorative sections.

## Layout

The application uses a two-column desktop layout:

- Left operations panel: product title, KPI cards, filters, and selected-flight details.
- Right map workspace: route map, visible-flight count, and filtered flight list.

On tablet and smaller screens the layout stacks into a single column. Filters and details adapt to one-column grids so text stays readable and controls remain large enough for touch input.

## Map Interaction

Leaflet is loaded only in the browser through a dynamic import so Angular SSR can build and prerender safely. The map starts over a broad corridor covering India, the Middle East, Europe, and long-haul routes. Each flight marker is placed using mock current-position data.

Selecting a marker or flight row:

- Stores the selected flight in the dashboard component.
- Opens the marker popup.
- Draws a highlighted route from origin to current position to destination.
- Fits the map bounds around the selected route.

The route includes the current position so operations users can distinguish a planned route from the aircraft's current progress.

## Data and Angular Architecture

Mock data lives in `src/app/data/mock-flights.ts` and uses typed domain models from `src/app/models/flight.model.ts`.

`FlightService` owns:

- The mock flight stream.
- Reactive filter state.
- Filtered flight results.
- KPI calculations.
- Airport option derivation.

The dashboard component consumes those streams with the async pipe and uses a reactive form for callsign, status, origin, and destination filters. This keeps filtering logic out of the template and makes the code easier to extend if real backend data is added later.

## Accessibility and UX

The interface uses semantic sections, form labels, button rows for selectable flights, focus states, and clear status text in addition to color. The map and panels have explicit ARIA labels, and controls keep stable sizes to reduce layout shift while filtering.

## Future Enhancements

Good next additions would be marker clustering, animated playback based on route progress, airport markers, weather layers, and unit tests around filter/KPI behavior.
