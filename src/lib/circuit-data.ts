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

// F1 media CDN circuit layout images (Jolpica circuit ID → F1 CDN slug)
const F1_CIRCUIT_LAYOUT_SLUGS: Record<string, string> = {
  bahrain:       "bahrain",
  jeddah:        "jeddah",
  albert_park:   "australia",
  suzuka:        "japan",
  shanghai:      "china",
  miami:         "miami",
  imola:         "emilia_romagna",
  monaco:        "monaco",
  villeneuve:    "canada",
  catalunya:     "spain",
  red_bull_ring: "austria",
  silverstone:   "great_britain",
  hungaroring:   "hungary",
  spa:           "belgium",
  zandvoort:     "netherlands",
  monza:         "italy",
  baku:          "azerbaijan",
  marina_bay:    "singapore",
  americas:      "united_states",
  rodriguez:     "mexico",
  interlagos:    "brazil",
  las_vegas:     "las_vegas",
  losail:        "qatar",
  yas_marina:    "abu_dhabi",
};

export function getF1CircuitLayoutUrl(circuitId: string): string | null {
  const slug = F1_CIRCUIT_LAYOUT_SLUGS[circuitId];
  if (!slug) return null;
  return `https://media.formula1.com/image/upload/f_auto/q_auto/v1677244985/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/${slug}.png`;
}

// Jolpica circuit ID → [lat, lng]
const F1_CIRCUIT_COORDS: Record<string, [number, number]> = {
  bahrain:       [26.0325,  50.5106],
  jeddah:        [21.6319,  39.1044],
  albert_park:   [-37.8497, 144.9680],
  suzuka:        [34.8431,  136.5407],
  shanghai:      [31.3389,  121.2198],
  miami:         [25.9581,  -80.2389],
  imola:         [44.3439,  11.7167],
  monaco:        [43.7347,   7.4206],
  villeneuve:    [45.5000,  -73.5228],
  catalunya:     [41.5700,   2.2611],
  red_bull_ring: [47.2197,  14.7647],
  silverstone:   [52.0786,  -1.0169],
  hungaroring:   [47.5789,  19.2486],
  spa:           [50.4372,   5.9714],
  zandvoort:     [52.3888,   4.5409],
  monza:         [45.6156,   9.2811],
  baku:          [40.3725,  49.8533],
  marina_bay:    [1.2914,   103.8640],
  americas:      [30.1328,  -97.6411],
  rodriguez:     [19.4042,  -99.0907],
  interlagos:    [-23.7036, -46.6997],
  las_vegas:     [36.1147, -115.1728],
  losail:        [25.4900,   51.4542],
  yas_marina:    [24.4672,   54.6031],
};

export function getF1CircuitCoords(circuitId: string): [number, number] | null {
  return F1_CIRCUIT_COORDS[circuitId] ?? null;
}
