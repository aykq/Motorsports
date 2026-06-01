function normalizeKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type Coords = [number, number];

const CIRCUIT_COORDS: Record<string, Coords> = {
  // ── Formula 1 / common ────────────────────────────────────────────────────
  "bahrain-international-circuit":        [26.0325,   50.5106],
  "bahrain":                              [26.0325,   50.5106],
  "jeddah-corniche-circuit":              [21.6319,   39.1044],
  "jeddah":                               [21.6319,   39.1044],
  "albert-park-circuit":                  [-37.8497, 144.9680],
  "albert-park":                          [-37.8497, 144.9680],
  "suzuka-international-racing-course":   [34.8431,  136.5406],
  "suzuka":                               [34.8431,  136.5406],
  "shanghai-international-circuit":       [31.3389,  121.2196],
  "miami-international-autodrome":        [25.9581,  -80.2389],
  "autodromo-enzo-e-dino-ferrari":        [44.3439,   11.7167],
  "imola":                                [44.3439,   11.7167],
  "autodromo-internazionale-enzo-e-dino-ferrari": [44.3439, 11.7167],
  "circuit-de-monaco":                    [43.7347,    7.4205],
  "monaco":                               [43.7347,    7.4205],
  "circuit-gilles-villeneuve":            [45.5000,  -73.5228],
  "villeneuve":                           [45.5000,  -73.5228],
  "circuit-de-barcelona-catalunya":       [41.5700,    2.2611],
  "barcelona-catalunya":                  [41.5700,    2.2611],
  "catalunya":                            [41.5700,    2.2611],
  "red-bull-ring":                        [47.2197,   14.7647],
  "silverstone-circuit":                  [52.0786,   -1.0169],
  "silverstone":                          [52.0786,   -1.0169],
  "hungaroring":                          [47.5789,   19.2486],
  "circuit-de-spa-francorchamps":         [50.4372,    5.9714],
  "spa-francorchamps":                    [50.4372,    5.9714],
  "spa":                                  [50.4372,    5.9714],
  "circuit-zandvoort":                    [52.3888,    4.5457],
  "zandvoort":                            [52.3888,    4.5457],
  "autodromo-nazionale-monza":            [45.6156,    9.2811],
  "monza":                                [45.6156,    9.2811],
  "baku-city-circuit":                    [40.3725,   49.8533],
  "baku":                                 [40.3725,   49.8533],
  "marina-bay-street-circuit":            [1.2914,   103.8639],
  "circuit-of-the-americas":              [30.1328,  -97.6411],
  "americas":                             [30.1328,  -97.6411],
  "autodromo-hermanos-rodriguez":         [19.4042,  -99.0907],
  "rodriguez":                            [19.4042,  -99.0907],
  "autodromo-jose-carlos-pace":           [-23.7014,  -46.6969],
  "interlagos":                           [-23.7014,  -46.6969],
  "las-vegas-strip-circuit":              [36.1699, -115.1398],
  "las-vegas":                            [36.1699, -115.1398],
  "losail-international-circuit":         [25.4900,   51.4542],
  "losail":                               [25.4900,   51.4542],
  "yas-marina-circuit":                   [24.4672,   54.6031],
  "yas-marina":                           [24.4672,   54.6031],

  // ── WEC specific ──────────────────────────────────────────────────────────
  "circuit-de-la-sarthe":                 [47.9542,    0.2083],
  "le-mans":                              [47.9542,    0.2083],
  "circuit-des-24-heures-du-mans":        [47.9542,    0.2083],
  "fuji-speedway":                        [35.3717,  138.9267],
  "fuji":                                 [35.3717,  138.9267],
  "sebring-international-raceway":        [27.4542,  -81.3489],
  "sebring":                              [27.4542,  -81.3489],
  "autodromo-do-algarve":                 [37.2272,   -8.6260],
  "autodromo-internacional-do-algarve":   [37.2272,   -8.6260],
  "portimao":                             [37.2272,   -8.6260],
  "portiamo":                             [37.2272,   -8.6260],
  "algarve-international-circuit":        [37.2272,   -8.6260],
  "circuit-de-nevers-magny-cours":        [46.8642,    3.1636],
  "magny-cours":                          [46.8642,    3.1636],

  // ── GT3 (GT World Challenge Europe) ──────────────────────────────────────
  "circuit-paul-ricard":                  [43.2506,    5.7916],
  "paul-ricard":                          [43.2506,    5.7916],
  "brands-hatch":                         [51.3578,    0.2634],
  "misano-world-circuit":                 [43.9626,   12.6976],
  "misano-world-circuit-marco-simoncelli": [43.9626,  12.6976],
  "misano":                               [43.9626,   12.6976],
  "nurburgring":                          [50.3356,    6.9475],
  "n-rburgring":                          [50.3356,    6.9475],

  // ── Carrera Cup / GT4 specific ────────────────────────────────────────────
  "dekra-lausitzring":                    [51.5317,   14.1220],
  "eurospeedway-lausitz":                 [51.5317,   14.1220],
  "lausitzring":                          [51.5317,   14.1220],
  "norisring":                            [49.4572,   11.0796],
  "hockenheimring":                       [49.3278,    8.5656],
  "hockenheim":                           [49.3278,    8.5656],

  // ── MotoGP specific ───────────────────────────────────────────────────────
  "termas-de-rio-hondo":                  [-27.4969,  -64.7164],
  "termas-de-r-o-hondo":                  [-27.4969,  -64.7164],
  "termas":                               [-27.4969,  -64.7164],
  "circuito-de-jerez-angel-nieto":        [36.7083,   -6.0342],
  "circuito-de-jerez-ngel-nieto":         [36.7083,   -6.0342],
  "jerez":                                [36.7083,   -6.0342],
  "bugatti-circuit":                      [47.9542,    0.2083],
  "le-mans-bugatti":                      [47.9542,    0.2083],
  "autodromo-del-mugello":                [43.9975,   11.3719],
  "mugello":                              [43.9975,   11.3719],
  "sachsenring":                          [50.7900,   12.6878],
  "tt-circuit-assen":                     [52.9622,    6.5247],
  "assen":                                [52.9622,    6.5247],
  "twin-ring-motegi":                     [36.5369,  140.1953],
  "motegi":                               [36.5369,  140.1953],
  "motorland-aragon":                     [41.1263,   -0.2517],
  "aragon":                               [41.1263,   -0.2517],
  "pertamina-mandalika-street-circuit":   [-8.8893,  116.2931],
  "mandalika":                            [-8.8893,  116.2931],
  "phillip-island-grand-prix-circuit":    [-38.7622,  145.3733],
  "phillip-island":                       [-38.7622,  145.3733],
  "sepang-international-circuit":         [2.7606,   101.7380],
  "sepang":                               [2.7606,   101.7380],
  "circuit-ricardo-tormo":                [39.4883,   -0.6306],
  "valencia":                             [39.4883,   -0.6306],
  "ricardo-tormo":                        [39.4883,   -0.6306],
  "kazakstan-street-circuit":             [51.1694,   71.4491],

  // ── New / emerging circuits ───────────────────────────────────────────────
  "balaton-park-circuit":                 [47.0769,   18.1397],
  "balatonfukajar":                       [47.0769,   18.1397],
  "balaton-park":                         [47.0769,   18.1397],
  "buddh-international-circuit":          [28.3487,   77.5331],
  "sokol-international-racetrack":        [51.1694,   71.4491],
};

export function lookupCircuitCoords(name: string): Coords | null {
  const key = normalizeKey(name);
  if (CIRCUIT_COORDS[key]) return CIRCUIT_COORDS[key];

  // Try partial key matching for long names (e.g. API returns extra detail)
  for (const [tableKey, coords] of Object.entries(CIRCUIT_COORDS)) {
    if (key.includes(tableKey) || tableKey.includes(key)) return coords;
  }

  return null;
}
