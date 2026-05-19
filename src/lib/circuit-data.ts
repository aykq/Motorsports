export interface CircuitSpecs {
  lengthKm: number;
  corners: number;
  drsZones: number;
  officialLaps: number;
}

const F1_CIRCUIT_SPECS: Record<string, CircuitSpecs> = {
  bahrain:        { lengthKm: 5.412, corners: 15, drsZones: 3, officialLaps: 57 },
  jeddah:         { lengthKm: 6.174, corners: 27, drsZones: 3, officialLaps: 50 },
  albert_park:    { lengthKm: 5.303, corners: 16, drsZones: 4, officialLaps: 58 },
  suzuka:         { lengthKm: 5.807, corners: 18, drsZones: 2, officialLaps: 53 },
  shanghai:       { lengthKm: 5.451, corners: 16, drsZones: 2, officialLaps: 56 },
  miami:          { lengthKm: 5.412, corners: 19, drsZones: 3, officialLaps: 57 },
  imola:          { lengthKm: 4.909, corners: 19, drsZones: 2, officialLaps: 63 },
  monaco:         { lengthKm: 3.337, corners: 19, drsZones: 1, officialLaps: 78 },
  villeneuve:     { lengthKm: 4.361, corners: 14, drsZones: 2, officialLaps: 70 },
  catalunya:      { lengthKm: 4.657, corners: 16, drsZones: 2, officialLaps: 66 },
  red_bull_ring:  { lengthKm: 4.318, corners: 10, drsZones: 3, officialLaps: 71 },
  silverstone:    { lengthKm: 5.891, corners: 18, drsZones: 2, officialLaps: 52 },
  hungaroring:    { lengthKm: 4.381, corners: 14, drsZones: 2, officialLaps: 70 },
  spa:            { lengthKm: 7.004, corners: 19, drsZones: 2, officialLaps: 44 },
  zandvoort:      { lengthKm: 4.259, corners: 14, drsZones: 2, officialLaps: 72 },
  monza:          { lengthKm: 5.793, corners: 11, drsZones: 2, officialLaps: 53 },
  baku:           { lengthKm: 6.003, corners: 20, drsZones: 2, officialLaps: 51 },
  marina_bay:     { lengthKm: 4.940, corners: 23, drsZones: 3, officialLaps: 62 },
  americas:       { lengthKm: 5.513, corners: 20, drsZones: 2, officialLaps: 56 },
  rodriguez:      { lengthKm: 4.304, corners: 17, drsZones: 2, officialLaps: 71 },
  interlagos:     { lengthKm: 4.309, corners: 15, drsZones: 2, officialLaps: 71 },
  las_vegas:      { lengthKm: 6.201, corners: 17, drsZones: 2, officialLaps: 50 },
  losail:         { lengthKm: 5.419, corners: 16, drsZones: 2, officialLaps: 57 },
  yas_marina:     { lengthKm: 5.281, corners: 16, drsZones: 2, officialLaps: 58 },
};

export function getF1CircuitSpecs(circuitId: string): CircuitSpecs | null {
  return F1_CIRCUIT_SPECS[circuitId] ?? null;
}
