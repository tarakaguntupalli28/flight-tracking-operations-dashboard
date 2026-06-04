import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { FlightService } from './flight.service';

describe('FlightService', () => {
  let service: FlightService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FlightService);
  });

  it('should calculate dashboard KPIs from mock flights', async () => {
    const kpis = await firstValueFrom(service.kpis$);

    expect(kpis.total).toBe(18);
    expect(kpis.active).toBe(8);
    expect(kpis.delayed).toBe(3);
    expect(kpis.arrived).toBe(3);
  });

  it('should filter flights by callsign and status', async () => {
    service.updateFilters({
      callsign: 'AIC',
      status: 'Active',
      origin: 'All',
      destination: 'All',
    });

    const flights = await firstValueFrom(service.filteredFlights$);

    expect(flights.length).toBe(2);
    expect(flights.every((flight) => flight.callsign.includes('AIC'))).toBeTrue();
    expect(flights.every((flight) => flight.status === 'Active')).toBeTrue();
  });
});
