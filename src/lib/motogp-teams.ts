export interface MotoGPTeamConfig {
  slug: string;
  name: string;
  short: string;
  color: string;
  logo: string;
}

// slug değerleri motogp-api.ts'teki teamSlug() fonksiyonuyla oluşturulan Driver.teamId ile eşleşir.
// Logo URL'leri doğrudan photos.motogp.com CDN'inden gelir (next.config.ts'te whitelist'te).

export const MOTOGP_TEAMS: MotoGPTeamConfig[] = [
  // ── MotoGP ─────────────────────────────────────────────────────────────────
  {
    slug: "ducati-lenovo-team",
    name: "Ducati Lenovo Team",
    short: "DCT",
    color: "#CC0000",
    logo: "https://photos.motogp.com/teams/8/9/892fff2f-7402-4fbd-99fb-5fd567d8a80c/main-picture.png",
  },
  {
    slug: "aprilia-racing",
    name: "Aprilia Racing",
    short: "APR",
    color: "#002C6E",
    logo: "https://photos.motogp.com/teams/1/1/11d18b37-baba-400a-80c2-f8ddf040f97e/main-picture.png",
  },
  {
    slug: "red-bull-ktm-factory-racing",
    name: "Red Bull KTM Factory Racing",
    short: "KTM",
    color: "#FF6B00",
    logo: "https://photos.motogp.com/teams/0/b/0b6cc118-a286-4343-9020-fb53c6f77c1a/main-picture.png",
  },
  {
    slug: "red-bull-ktm-tech3",
    name: "Red Bull KTM Tech3",
    short: "KT3",
    color: "#FF6B00",
    logo: "https://photos.motogp.com/teams/8/a/8a8633cd-a3e2-4a3d-aa24-66b99014a9dd/main-picture.png",
  },
  {
    slug: "monster-energy-yamaha-motogp",
    name: "Monster Energy Yamaha MotoGP",
    short: "YAM",
    color: "#0058A0",
    logo: "https://photos.motogp.com/teams/1/4/141b6f0f-7e53-4d27-9bdb-0ea8fba7e842/main-picture.png",
  },
  {
    slug: "yamaha-factory-racing-team",
    name: "Yamaha Factory Racing Team",
    short: "YMH",
    color: "#0058A0",
    logo: "https://photos.motogp.com/teams/3/8/3863560b-e4e2-441a-86a9-f764204e9857/main-picture.png",
  },
  {
    slug: "prima-pramac-yamaha-motogp",
    name: "Prima Pramac Yamaha MotoGP",
    short: "PRM",
    color: "#0058A0",
    logo: "https://photos.motogp.com/teams/5/9/598ccfb2-e0f1-4ad7-92b7-00ec9238a72c/main-picture.png",
  },
  {
    slug: "honda-hrc-castrol",
    name: "Honda HRC Castrol",
    short: "HRC",
    color: "#CC0000",
    logo: "https://photos.motogp.com/teams/c/e/ce837bd3-bc07-40ef-83cf-6a8025bededf/main-picture.png",
  },
  {
    slug: "lcr-honda",
    name: "LCR Honda",
    short: "LCR",
    color: "#CC0000",
    logo: "https://photos.motogp.com/teams/7/7/77a0174a-c84d-4955-a722-b39e4d8e4ce5/main-picture.png",
  },
  {
    slug: "pertamina-enduro-vr46-racing-team",
    name: "Pertamina Enduro VR46 Racing Team",
    short: "VR46",
    color: "#FFD700",
    logo: "https://photos.motogp.com/teams/4/1/4130a48f-fa91-48be-a50c-f8a2e3f863a0/main-picture.png",
  },
  {
    slug: "superfile-trackhouse-motogp-team",
    name: "SuperFile Trackhouse MotoGP Team",
    short: "TRH",
    color: "#003B8E",
    logo: "https://photos.motogp.com/teams/8/5/8532f5e4-c2f3-417b-8c76-09302a826dd4/main-picture.png",
  },
  {
    slug: "bk8-gresini-racing-motogp",
    name: "BK8 Gresini Racing MotoGP",
    short: "GRS",
    color: "#FF5500",
    logo: "https://photos.motogp.com/teams/1/1/11729e67-d2cb-41ad-b3a8-4a0ac5768a5f/main-picture.png",
  },

  // ── Moto2 ──────────────────────────────────────────────────────────────────
  {
    slug: "red-bull-ktm-ajo",
    name: "Red Bull KTM Ajo",
    short: "AJO",
    color: "#FF6B00",
    logo: "https://photos.motogp.com/teams/3/c/3c73638c-cffb-4e42-a6ca-b6506ab6bf5c/main-picture.png",
  },
  {
    slug: "elf-marc-vds-racing-team",
    name: "ELF Marc VDS Racing Team",
    short: "MVD",
    color: "#E4002B",
    logo: "https://photos.motogp.com/teams/2/3/2369c22c-90fb-4d77-8270-4df47c1fdf23/main-picture.png",
  },
  {
    slug: "liqui-moly-dynavolt-intact-gp",
    name: "Liqui Moly Dynavolt Intact GP",
    short: "IGP",
    color: "#0071C5",
    logo: "https://photos.motogp.com/teams/5/7/57dc8016-70b3-4eea-bec1-7f8f6cdf8609/main-picture.png",
  },
  {
    slug: "cfmoto-aspar-team",
    name: "CFMOTO Aspar Team",
    short: "ASP",
    color: "#003DA5",
    logo: "https://photos.motogp.com/teams/e/3/e3320217-761f-4bad-88d6-f5467835fefa/main-picture.png",
  },
  {
    slug: "idemitsu-honda-team-asia",
    name: "Idemitsu Honda Team Asia",
    short: "HTA",
    color: "#CC0000",
    logo: "https://photos.motogp.com/teams/b/2/b208e1d8-b4cf-4cb8-a912-0dba179dd7cf/main-picture.png",
  },
  {
    slug: "italjet-gresini-moto2",
    name: "ITALJET Gresini Moto2",
    short: "GRS",
    color: "#FF5500",
    logo: "https://photos.motogp.com/teams/5/1/5119ab4e-9d4c-4ecb-b18a-d377cf518506/main-picture.png",
  },
  {
    slug: "blu-cru-pramac-yamaha-moto2",
    name: "BLU CRU Pramac Yamaha Moto2",
    short: "PRY",
    color: "#0058A0",
    logo: "https://photos.motogp.com/teams/d/4/d4b6a18c-5647-4667-9085-489ca4ff5649/main-picture.png",
  },
  {
    slug: "reds-fantic-racing",
    name: "REDS Fantic Racing",
    short: "FNT",
    color: "#E30000",
    logo: "https://photos.motogp.com/teams/1/8/187e0f58-020e-490f-b45d-575e2d6a6ef2/main-picture.png",
  },
  {
    slug: "onlyfans-american-racing-team",
    name: "OnlyFans American Racing Team",
    short: "AMR",
    color: "#1B3A6B",
    logo: "https://photos.motogp.com/teams/3/0/30da094b-fd92-4cb2-80c5-04602c67004e/main-picture.png",
  },
  {
    slug: "italtrans-racing-team",
    name: "Italtrans Racing Team",
    short: "ITL",
    color: "#003082",
    logo: "https://photos.motogp.com/teams/1/0/100348da-52fa-49e5-aee8-b276282bbaa0/main-picture.png",
  },
  {
    slug: "qj-motor-galfer-msi",
    name: "QJ MOTOR - GALFER - MSI",
    short: "QJM",
    color: "#D10000",
    logo: "https://photos.motogp.com/teams/e/1/e1df9a44-e0f2-4a53-8248-0871270fc60a/main-picture.png",
  },
  {
    slug: "speedrs-team",
    name: "SpeedRS Team",
    short: "SPD",
    color: "#222222",
    logo: "https://photos.motogp.com/teams/1/0/1030dc7b-7fae-4369-946b-1a1b1edd49e7/main-picture.png",
  },
  {
    slug: "klint-racing-team",
    name: "KLINT Racing Team",
    short: "KLN",
    color: "#0B3D91",
    logo: "https://photos.motogp.com/teams/d/4/d41e19d0-b661-4719-9402-d172e36f419e/main-picture.png",
  },
  {
    slug: "momoven-idrofoglia-rw-racing-team",
    name: "Momoven Idrofoglia RW Racing Team",
    short: "RWR",
    color: "#006400",
    logo: "https://photos.motogp.com/teams/1/c/1c011306-8178-4c32-85e8-c7603e43948d/main-picture.png",
  },

  // ── Moto3 ──────────────────────────────────────────────────────────────────
  {
    slug: "leopard-racing",
    name: "Leopard Racing",
    short: "LEO",
    color: "#FFC300",
    logo: "https://photos.motogp.com/teams/a/7/a713a7ba-16ec-4c15-b4a3-7211b43f9a89/main-picture.png",
  },
  {
    slug: "sic58-squadra-corse",
    name: "SIC58 Squadra Corse",
    short: "SIC",
    color: "#CC0000",
    logo: "https://photos.motogp.com/teams/5/a/5a444866-8ea4-42fa-bcf7-8c2d0d07a238/main-picture.png",
  },
  {
    slug: "cfmoto-gaviota-aspar-team",
    name: "CFMOTO Gaviota Aspar Team",
    short: "ASP",
    color: "#003DA5",
    logo: "https://photos.motogp.com/teams/c/8/c8943f04-52b2-4e40-b5cc-d184cc534807/main-picture.png",
  },
  {
    slug: "honda-team-asia",
    name: "Honda Team Asia",
    short: "HTA",
    color: "#CC0000",
    logo: "https://photos.motogp.com/teams/8/3/83291c7a-76ca-400c-bda5-a17a6531f9e3/main-picture.png",
  },
  {
    slug: "red-bull-ktm-ajo",
    name: "Red Bull KTM Ajo",
    short: "AJO",
    color: "#FF6B00",
    logo: "https://photos.motogp.com/teams/9/3/9340a4a6-b2d4-4b72-be92-86718936c547/main-picture.png",
  },
  {
    slug: "red-bull-ktm-tech3",
    name: "Red Bull KTM Tech3",
    short: "KT3",
    color: "#FF6B00",
    logo: "https://photos.motogp.com/teams/2/7/274007da-aa69-4f74-b987-e910363bf8e3/main-picture.png",
  },
  {
    slug: "liqui-moly-dynavolt-intact-gp",
    name: "Liqui Moly Dynavolt Intact GP",
    short: "IGP",
    color: "#0071C5",
    logo: "https://photos.motogp.com/teams/0/c/0c8d75e7-f283-4713-b1a8-6440e0aafa0a/main-picture.png",
  },
  {
    slug: "rivacold-snipers-team",
    name: "Rivacold Snipers Team",
    short: "SNP",
    color: "#1A1A2E",
    logo: "https://photos.motogp.com/teams/a/f/af16ee18-7558-42dd-9e2c-b455a66b4a16/main-picture.png",
  },
  {
    slug: "cip-green-power",
    name: "CIP Green Power",
    short: "CIP",
    color: "#2E7D32",
    logo: "https://photos.motogp.com/teams/5/f/5f0a22a4-af1f-46ca-baf6-e688f6da8843/main-picture.png",
  },
  {
    slug: "aeon-credit-mt-helmets-msi",
    name: "AEON Credit - MT Helmets - MSI",
    short: "MSI",
    color: "#C62828",
    logo: "https://photos.motogp.com/teams/c/8/c8d2f693-73de-4c4b-bb92-6adbd8be070d/main-picture.png",
  },
  {
    slug: "gryd-racing",
    name: "GRYD Racing",
    short: "GRY",
    color: "#0D47A1",
    logo: "https://photos.motogp.com/teams/2/2/2289ee89-1833-4d23-9a46-0014424c6c03/main-picture.png",
  },
  {
    slug: "code-motorsports",
    name: "CODE Motorsports",
    short: "COD",
    color: "#37474F",
    logo: "https://photos.motogp.com/teams/9/c/9c3b2f14-28e0-4c9f-a3ac-be1531bcd514/main-picture.png",
  },
  {
    slug: "level-up-mta",
    name: "LEVEL UP - MTA",
    short: "MTA",
    color: "#6A1B9A",
    logo: "https://photos.motogp.com/teams/d/f/df8e39c5-dd52-4c4f-9c7c-3853768e3bee/main-picture.png",
  },
];

// slug (Driver.teamId) ile ara — tam eşleşme
export function getMotoGPTeam(slug: string): MotoGPTeamConfig | undefined {
  if (!slug) return undefined;
  return MOTOGP_TEAMS.find((t) => t.slug === slug);
}

// İsme göre ara — tam eşleşme yoksa slug benzerliğine bak
export function getMotoGPTeamByName(name: string): MotoGPTeamConfig | undefined {
  if (!name) return undefined;
  const lower = name.toLowerCase();
  return (
    MOTOGP_TEAMS.find((t) => t.name.toLowerCase() === lower) ??
    MOTOGP_TEAMS.find((t) => t.slug === lower.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))
  );
}
