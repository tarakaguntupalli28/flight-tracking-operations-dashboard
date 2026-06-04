export type FlightStatus = 'Scheduled' | 'Active' | 'Delayed' | 'Arrived';

export interface Airport {
  code: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
}

export interface Flight {
  id: number;
  flightNumber: string;
  callsign: string;
  aircraftType: string;
  origin: Airport;
  destination: Airport;
  status: FlightStatus;
  estimatedDeparture: string;
  estimatedArrival: string;
  currentPosition: {
    lat: number;
    lng: number;
  };
  altitudeFt: number;
  speedKts: number;
}

export interface FlightFilters {
  callsign: string;
  status: FlightStatus | 'All';
  origin: string;
  destination: string;
}
