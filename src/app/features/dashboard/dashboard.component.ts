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
import { Flight, FlightFilters, FlightStatus } from '../../models/flight.model';

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
        this.drawSelectedRoute();
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
    this.drawSelectedRoute();
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
      } else {
        const nextMarker = this.leaflet
          .marker(position, {
            icon: this.createAircraftIcon(flight.status),
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
    if (!this.leaflet || !this.map || !this.selectedFlight) {
      return;
    }

    this.routeLine?.removeFrom(this.map);

    const route: Leaflet.LatLngExpression[] = [
      [this.selectedFlight.origin.lat, this.selectedFlight.origin.lng],
      [this.selectedFlight.currentPosition.lat, this.selectedFlight.currentPosition.lng],
      [this.selectedFlight.destination.lat, this.selectedFlight.destination.lng],
    ];

    this.routeLine = this.leaflet
      .polyline(route, {
        color: '#00a4ff',
        weight: 4,
        opacity: 0.92,
        dashArray: '8 10',
      })
      .addTo(this.map);

    this.map.fitBounds(this.routeLine.getBounds(), {
      padding: [58, 58],
      maxZoom: 5,
    });

    this.markers.get(this.selectedFlight.id)?.openPopup();
  }

  private createAircraftIcon(status: FlightStatus): Leaflet.DivIcon {
    const statusClass = status.toLowerCase();

    return this.leaflet!.divIcon({
      className: `aircraft-marker aircraft-marker--${statusClass}`,
      html: '<span aria-hidden="true"></span>',
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -18],
    });
  }

  private popupTemplate(flight: Flight): string {
    return `
      <strong>${flight.flightNumber} - ${flight.callsign}</strong>
      <span>${flight.origin.code} to ${flight.destination.code}</span>
      <span>Status: ${flight.status}</span>
    `;
  }
}
