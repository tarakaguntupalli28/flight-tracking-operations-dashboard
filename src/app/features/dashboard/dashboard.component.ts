import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewChild,
  inject,
} from '@angular/core';
import { AsyncPipe, DecimalPipe, NgClass, NgFor, NgIf, isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type * as Leaflet from 'leaflet';
import { FlightService } from '../../services/flight.service';
import { Airport, Flight, FlightFilters, FlightStatus } from '../../models/flight.model';

interface RouteMetrics {
  distanceKm: number;
  duration: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [AsyncPipe, DecimalPipe, NgClass, NgFor, NgIf, ReactiveFormsModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements AfterViewInit {
  @ViewChild('mapContainer', { static: true }) private readonly mapContainer?: ElementRef<HTMLElement>;

  private readonly flightService = inject(FlightService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private leaflet?: typeof Leaflet;
  private map?: Leaflet.Map;
  private routeLine?: Leaflet.Polyline;
  private routeEndpointMarkers: Leaflet.Marker[] = [];
  private readonly markers = new Map<number, Leaflet.Marker>();
  private latestFlights: Flight[] = [];

  readonly filtersForm = this.fb.nonNullable.group({
    callsign: [''],
    status: ['All' as FlightStatus | 'All'],
    origin: ['All'],
    destination: ['All'],
  });

  readonly flights$ = this.flightService.filteredFlights$;
  readonly kpis$ = this.flightService.kpis$;
  readonly airports$ = this.flightService.airports$;
  readonly statuses = this.flightService.statuses;
  selectedFlight?: Flight;
  selectedRouteMetrics?: RouteMetrics;
  isNightMode = true;

  constructor() {
    this.filtersForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((filters) => this.flightService.updateFilters(filters as FlightFilters));

    this.flights$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((flights) => {
      this.latestFlights = flights;
      this.syncMapMarkers(flights);

      if (this.selectedFlight && !flights.some((flight) => flight.id === this.selectedFlight?.id)) {
        this.selectedFlight = flights[0];
        this.selectedRouteMetrics = this.selectedFlight
          ? this.calculateRouteMetrics(this.selectedFlight)
          : undefined;
        this.drawSelectedRoute();
        this.updateMarkerIcons();
      }
    });
  }

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !this.mapContainer) {
      return;
    }

    this.leaflet = await import('leaflet');
    this.createMap();
    this.syncMapMarkers(this.latestFlights);
  }

  selectFlight(flight: Flight): void {
    this.selectedFlight = flight;
    this.selectedRouteMetrics = this.calculateRouteMetrics(flight);
    this.drawSelectedRoute();
    this.updateMarkerIcons();
  }

  resetFilters(): void {
    this.filtersForm.setValue(this.flightService.getInitialFilters());
  }

  toggleTheme(): void {
    this.isNightMode = !this.isNightMode;
  }

  trackFlight(_: number, flight: Flight): number {
    return flight.id;
  }

  private createMap(): void {
    if (!this.leaflet || !this.mapContainer) {
      return;
    }

    this.map = this.leaflet
      .map(this.mapContainer.nativeElement, {
        center: [24.5, 62],
        zoom: 4,
        zoomControl: false,
      })
      .setView([24.5, 62], 4);

    this.leaflet.control.zoom({ position: 'bottomright' }).addTo(this.map);
    this.leaflet
      .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 10,
        attribution: '&copy; OpenStreetMap contributors',
      })
      .addTo(this.map);
  }

  private syncMapMarkers(flights: Flight[]): void {
    if (!this.leaflet || !this.map) {
      return;
    }

    const visibleIds = new Set(flights.map((flight) => flight.id));

    for (const [id, marker] of this.markers) {
      if (!visibleIds.has(id)) {
        marker.removeFrom(this.map);
        this.markers.delete(id);
      }
    }

    for (const flight of flights) {
      const position: Leaflet.LatLngExpression = [flight.currentPosition.lat, flight.currentPosition.lng];
      const marker = this.markers.get(flight.id);

      if (marker) {
        marker.setLatLng(position);
        marker.setPopupContent(this.popupTemplate(flight));
        marker.setIcon(this.createAircraftIcon(flight.status, this.selectedFlight?.id === flight.id));
      } else {
        const nextMarker = this.leaflet
          .marker(position, {
            icon: this.createAircraftIcon(flight.status, this.selectedFlight?.id === flight.id),
            title: `${flight.callsign} ${flight.origin.code}-${flight.destination.code}`,
          })
          .bindPopup(this.popupTemplate(flight))
          .on('click', () => this.selectFlight(flight))
          .addTo(this.map);

        this.markers.set(flight.id, nextMarker);
      }
    }
  }

  private drawSelectedRoute(): void {
    if (this.routeLine && this.map) {
      this.routeLine.removeFrom(this.map);
    }

    this.routeLine = undefined;
    this.clearRouteEndpointMarkers();

    if (!this.leaflet || !this.map || !this.selectedFlight) {
      return;
    }

    const routeLine: Leaflet.LatLngExpression[] = [
      [this.selectedFlight.origin.lat, this.selectedFlight.origin.lng],
      [this.selectedFlight.destination.lat, this.selectedFlight.destination.lng],
    ];
    const routeBounds: Leaflet.LatLngExpression[] = [
      [this.selectedFlight.origin.lat, this.selectedFlight.origin.lng],
      [this.selectedFlight.currentPosition.lat, this.selectedFlight.currentPosition.lng],
      [this.selectedFlight.destination.lat, this.selectedFlight.destination.lng],
    ];

    this.routeLine = this.leaflet
      .polyline(routeLine, {
        color: '#00a4ff',
        weight: 4,
        opacity: 0.96,
        dashArray: '8 10',
        lineCap: 'round',
        lineJoin: 'round',
      })
      .addTo(this.map);

    this.routeEndpointMarkers = [
      this.createRouteEndpointMarker(this.selectedFlight.origin, 'origin'),
      this.createRouteEndpointMarker(this.selectedFlight.destination, 'destination'),
    ];

    const bounds = this.leaflet.latLngBounds(routeBounds);

    this.map.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 5,
    });

    this.markers.get(this.selectedFlight.id)?.openPopup();
  }

  private createAircraftIcon(status: FlightStatus, isSelected = false): Leaflet.DivIcon {
    const statusClass = status.toLowerCase();
    const selectedClass = isSelected ? ' aircraft-marker--selected' : '';
    const iconSize: [number, number] = isSelected ? [44, 44] : [34, 34];
    const iconAnchor: [number, number] = isSelected ? [22, 22] : [17, 17];

    return this.leaflet!.divIcon({
      className: `aircraft-marker aircraft-marker--${statusClass}${selectedClass}`,
      html: '<span aria-hidden="true"></span>',
      iconSize,
      iconAnchor,
      popupAnchor: [0, -18],
    });
  }

  private createRouteEndpointMarker(airport: Airport, type: 'origin' | 'destination'): Leaflet.Marker {
    const indicator = type === 'origin' ? 'Origin' : 'Destination';
    const position: Leaflet.LatLngExpression = [airport.lat, airport.lng];

    return this.leaflet!
      .marker(position, {
        icon: this.createRouteEndpointIcon(type, airport.code),
        title: `${indicator}: ${airport.code}`,
        zIndexOffset: 650,
      })
      .bindTooltip(`${indicator}: ${airport.code}`, {
        className: `route-endpoint-tooltip route-endpoint-tooltip--${type}`,
        direction: 'top',
        offset: [0, -16],
        permanent: true,
      })
      .bindPopup(this.airportPopupTemplate(airport, indicator))
      .addTo(this.map!);
  }

  private createRouteEndpointIcon(type: 'origin' | 'destination', code: string): Leaflet.DivIcon {
    const shortCode = code.slice(0, 3).toUpperCase();

    return this.leaflet!.divIcon({
      className: `route-endpoint-marker route-endpoint-marker--${type}`,
      html: `
        <span class="route-endpoint-marker__pin" aria-hidden="true">
          <span>${type === 'origin' ? 'O' : 'D'}</span>
        </span>
        <span class="route-endpoint-marker__code">${shortCode}</span>
      `,
      iconSize: [44, 54],
      iconAnchor: [22, 44],
      popupAnchor: [0, -42],
      tooltipAnchor: [0, -38],
    });
  }

  private popupTemplate(flight: Flight): string {
    const metrics = this.calculateRouteMetrics(flight);

    return `
      <strong>${flight.flightNumber} - ${flight.callsign}</strong>
      <span>${flight.origin.code} to ${flight.destination.code}</span>
      <span>Status: ${flight.status}</span>
      <span>Route Distance: ${metrics.distanceKm.toLocaleString()} km</span>
      <span>Estimated Duration: ${metrics.duration}</span>
    `;
  }

  private airportPopupTemplate(airport: Airport, indicator: string): string {
    return `
      <strong>${indicator}: ${airport.code}</strong>
      <span>Airport Code: ${airport.code}</span>
      <span>Airport Name: ${airport.name || 'Not available'}</span>
      <span>City: ${airport.city}</span>
    `;
  }

  private clearRouteEndpointMarkers(): void {
    if (!this.map) {
      this.routeEndpointMarkers = [];
      return;
    }

    for (const marker of this.routeEndpointMarkers) {
      marker.removeFrom(this.map);
    }

    this.routeEndpointMarkers = [];
  }

  private updateMarkerIcons(): void {
    if (!this.leaflet) {
      return;
    }

    for (const flight of this.latestFlights) {
      this.markers
        .get(flight.id)
        ?.setIcon(this.createAircraftIcon(flight.status, this.selectedFlight?.id === flight.id));
    }
  }

  private calculateRouteMetrics(flight: Flight): RouteMetrics {
    const distanceKm = Math.round(
      this.distanceBetween(
        flight.origin.lat,
        flight.origin.lng,
        flight.destination.lat,
        flight.destination.lng,
      ),
    );
    const speedKmh = (flight.speedKts > 0 ? flight.speedKts : 450) * 1.852;
    const totalMinutes = Math.max(1, Math.round((distanceKm / speedKmh) * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return {
      distanceKm,
      duration: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
    };
  }

  private distanceBetween(originLat: number, originLng: number, destinationLat: number, destinationLng: number): number {
    const earthRadiusKm = 6371;
    const latDelta = this.toRadians(destinationLat - originLat);
    const lngDelta = this.toRadians(destinationLng - originLng);
    const originLatRad = this.toRadians(originLat);
    const destinationLatRad = this.toRadians(destinationLat);
    const haversine =
      Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
      Math.cos(originLatRad) *
        Math.cos(destinationLatRad) *
        Math.sin(lngDelta / 2) *
        Math.sin(lngDelta / 2);

    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  }

  private toRadians(value: number): number {
    return (value * Math.PI) / 180;
  }
}
