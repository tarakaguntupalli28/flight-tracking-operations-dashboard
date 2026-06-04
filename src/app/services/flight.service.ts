import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import { MOCK_FLIGHTS } from '../data/mock-flights';
import { Flight, FlightFilters, FlightStatus } from '../models/flight.model';

const DEFAULT_FILTERS: FlightFilters = {
  callsign: '',
  status: 'All',
  origin: 'All',
  destination: 'All',
};

@Injectable({
  providedIn: 'root',
})
export class FlightService {
  private readonly flightsSubject = new BehaviorSubject<Flight[]>(MOCK_FLIGHTS);
  private readonly filtersSubject = new BehaviorSubject<FlightFilters>(DEFAULT_FILTERS);

  readonly flights$ = this.flightsSubject.asObservable();
  readonly filters$ = this.filtersSubject.asObservable();

  readonly filteredFlights$ = combineLatest([this.flights$, this.filters$]).pipe(
    map(([flights, filters]) => this.applyFilters(flights, filters)),
  );

  readonly kpis$ = this.flights$.pipe(
    map((flights) => ({
      total: flights.length,
      active: flights.filter((flight) => flight.status === 'Active').length,
      delayed: flights.filter((flight) => flight.status === 'Delayed').length,
      arrived: flights.filter((flight) => flight.status === 'Arrived').length,
    })),
  );

  readonly airports$ = this.flights$.pipe(
    map((flights) => ({
      origins: this.uniqueAirportCodes(flights.map((flight) => flight.origin.code)),
      destinations: this.uniqueAirportCodes(flights.map((flight) => flight.destination.code)),
    })),
  );

  readonly statuses: Array<FlightStatus | 'All'> = ['All', 'Scheduled', 'Active', 'Delayed', 'Arrived'];

  updateFilters(filters: FlightFilters): void {
    this.filtersSubject.next(filters);
  }

  getInitialFilters(): FlightFilters {
    return { ...DEFAULT_FILTERS };
  }

  private applyFilters(flights: Flight[], filters: FlightFilters): Flight[] {
    const callsign = filters.callsign.trim().toLowerCase();

    return flights.filter((flight) => {
      const matchesCallsign = !callsign || flight.callsign.toLowerCase().includes(callsign);
      const matchesStatus = filters.status === 'All' || flight.status === filters.status;
      const matchesOrigin = filters.origin === 'All' || flight.origin.code === filters.origin;
      const matchesDestination =
        filters.destination === 'All' || flight.destination.code === filters.destination;

      return matchesCallsign && matchesStatus && matchesOrigin && matchesDestination;
    });
  }

  private uniqueAirportCodes(codes: string[]): string[] {
    return [...new Set(codes)].sort((a, b) => a.localeCompare(b));
  }
}
