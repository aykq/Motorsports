import type { Driver } from "@/types/series";

interface WECEntry {
  carNo: number;
  teamId: string;
  team: string;
  drivers: Array<{ firstName: string; lastName: string; nationality: string }>;
}

const HYPERCAR_2026: WECEntry[] = [
  { carNo: 7, teamId: "toyota-racing", team: "Toyota Racing", drivers: [
    { firstName: "Mike", lastName: "Conway", nationality: "British" },
    { firstName: "Kamui", lastName: "Kobayashi", nationality: "Japanese" },
    { firstName: "Nyck", lastName: "de Vries", nationality: "Dutch" },
  ]},
  { carNo: 8, teamId: "toyota-racing", team: "Toyota Racing", drivers: [
    { firstName: "Sébastien", lastName: "Buemi", nationality: "Swiss" },
    { firstName: "Brendon", lastName: "Hartley", nationality: "New Zealander" },
    { firstName: "Ryō", lastName: "Hirakawa", nationality: "Japanese" },
  ]},
  { carNo: 9, teamId: "aston-martin-thor", team: "Aston Martin THOR Team", drivers: [
    { firstName: "Alex", lastName: "Riberas", nationality: "Spanish" },
    { firstName: "Marco", lastName: "Sørensen", nationality: "Danish" },
    { firstName: "Roman", lastName: "De Angelis", nationality: "Canadian" },
  ]},
  { carNo: 12, teamId: "cadillac-jota", team: "Cadillac Hertz Team Jota", drivers: [
    { firstName: "Norman", lastName: "Nato", nationality: "French" },
    { firstName: "Will", lastName: "Stevens", nationality: "British" },
    { firstName: "Louis", lastName: "Delétraz", nationality: "Swiss" },
  ]},
  { carNo: 15, teamId: "bmw-wrt", team: "BMW M Team WRT", drivers: [
    { firstName: "Kevin", lastName: "Magnussen", nationality: "Danish" },
    { firstName: "Raffaele", lastName: "Marciello", nationality: "Italian" },
    { firstName: "Dries", lastName: "Vanthoor", nationality: "Belgian" },
  ]},
  { carNo: 17, teamId: "genesis-magma", team: "Genesis Magma Racing", drivers: [
    { firstName: "Pipo", lastName: "Derani", nationality: "Brazilian" },
    { firstName: "Mathys", lastName: "Jaubert", nationality: "French" },
    { firstName: "André", lastName: "Lotterer", nationality: "German" },
  ]},
  { carNo: 19, teamId: "genesis-magma", team: "Genesis Magma Racing", drivers: [
    { firstName: "Paul-Loup", lastName: "Chatin", nationality: "French" },
    { firstName: "Mathieu", lastName: "Jaminet", nationality: "French" },
    { firstName: "Daniel", lastName: "Juncadella", nationality: "Spanish" },
  ]},
  { carNo: 20, teamId: "bmw-wrt", team: "BMW M Team WRT", drivers: [
    { firstName: "Robin", lastName: "Frijns", nationality: "Dutch" },
    { firstName: "René", lastName: "Rast", nationality: "German" },
    { firstName: "Sheldon", lastName: "van der Linde", nationality: "South African" },
  ]},
  { carNo: 35, teamId: "alpine-endurance", team: "Alpine Endurance Team", drivers: [
    { firstName: "António", lastName: "Félix da Costa", nationality: "Portuguese" },
    { firstName: "Ferdinand", lastName: "Habsburg", nationality: "Austrian" },
    { firstName: "Charles", lastName: "Milesi", nationality: "French" },
  ]},
  { carNo: 36, teamId: "alpine-endurance", team: "Alpine Endurance Team", drivers: [
    { firstName: "Jules", lastName: "Gounon", nationality: "French" },
    { firstName: "Frédéric", lastName: "Makowiecki", nationality: "French" },
    { firstName: "Victor", lastName: "Martins", nationality: "French" },
  ]},
  { carNo: 38, teamId: "cadillac-jota", team: "Cadillac Hertz Team Jota", drivers: [
    { firstName: "Earl", lastName: "Bamber", nationality: "New Zealander" },
    { firstName: "Sébastien", lastName: "Bourdais", nationality: "French" },
    { firstName: "Jack", lastName: "Aitken", nationality: "British" },
  ]},
  { carNo: 50, teamId: "ferrari-af-corse", team: "Ferrari AF Corse", drivers: [
    { firstName: "Antonio", lastName: "Fuoco", nationality: "Italian" },
    { firstName: "Miguel", lastName: "Molina", nationality: "Spanish" },
    { firstName: "Nicklas", lastName: "Nielsen", nationality: "Danish" },
  ]},
  { carNo: 51, teamId: "ferrari-af-corse", team: "Ferrari AF Corse", drivers: [
    { firstName: "James", lastName: "Calado", nationality: "British" },
    { firstName: "Antonio", lastName: "Giovinazzi", nationality: "Italian" },
    { firstName: "Alessandro", lastName: "Pier Guidi", nationality: "Italian" },
  ]},
  { carNo: 83, teamId: "af-corse", team: "AF Corse", drivers: [
    { firstName: "Phil", lastName: "Hanson", nationality: "British" },
    { firstName: "Robert", lastName: "Kubica", nationality: "Polish" },
    { firstName: "Yifei", lastName: "Ye", nationality: "Chinese" },
  ]},
  { carNo: 93, teamId: "peugeot-totalenergies", team: "Peugeot TotalEnergies", drivers: [
    { firstName: "Nick", lastName: "Cassidy", nationality: "New Zealander" },
    { firstName: "Paul", lastName: "di Resta", nationality: "British" },
    { firstName: "Stoffel", lastName: "Vandoorne", nationality: "Belgian" },
  ]},
  { carNo: 94, teamId: "peugeot-totalenergies", team: "Peugeot TotalEnergies", drivers: [
    { firstName: "Loïc", lastName: "Duval", nationality: "French" },
    { firstName: "Malthe", lastName: "Jakobsen", nationality: "Danish" },
    { firstName: "Théo", lastName: "Pourchaire", nationality: "French" },
  ]},
  { carNo: 7, teamId: "aston-martin-thor", team: "Aston Martin THOR Team", drivers: [
    { firstName: "Tom", lastName: "Gamble", nationality: "British" },
    { firstName: "Harry", lastName: "Tincknell", nationality: "British" },
    { firstName: "Ross", lastName: "Gunn", nationality: "British" },
  ]},
];

const LMGT3_2026: WECEntry[] = [
  { carNo: 10, teamId: "garage-59", team: "Garage 59", drivers: [
    { firstName: "Antares", lastName: "Au", nationality: "Hong Kong" },
    { firstName: "Tom", lastName: "Fleming", nationality: "American" },
    { firstName: "Marvin", lastName: "Kirchhöfer", nationality: "German" },
  ]},
  { carNo: 21, teamId: "vista-af-corse", team: "Vista AF Corse", drivers: [
    { firstName: "François", lastName: "Hériau", nationality: "French" },
    { firstName: "Simon", lastName: "Mann", nationality: "American" },
    { firstName: "Alessio", lastName: "Rovera", nationality: "Italian" },
  ]},
  { carNo: 23, teamId: "heart-of-racing", team: "Heart of Racing Team", drivers: [
    { firstName: "Jonny", lastName: "Adam", nationality: "British" },
    { firstName: "Gray", lastName: "Newell", nationality: "American" },
    { firstName: "Eduardo", lastName: "Barrichello", nationality: "Brazilian" },
  ]},
  { carNo: 27, teamId: "heart-of-racing", team: "Heart of Racing Team", drivers: [
    { firstName: "Ian", lastName: "James", nationality: "American" },
    { firstName: "Zach", lastName: "Robichon", nationality: "Canadian" },
    { firstName: "Mattia", lastName: "Drudi", nationality: "Italian" },
  ]},
  { carNo: 32, teamId: "team-wrt", team: "Team WRT", drivers: [
    { firstName: "Augusto", lastName: "Farfus", nationality: "Brazilian" },
    { firstName: "Sean", lastName: "Gelael", nationality: "Indonesian" },
    { firstName: "Darren", lastName: "Leung", nationality: "British" },
  ]},
  { carNo: 33, teamId: "tf-sport", team: "TF Sport", drivers: [
    { firstName: "Nicky", lastName: "Catsburg", nationality: "Dutch" },
    { firstName: "Jonny", lastName: "Edgar", nationality: "British" },
    { firstName: "Ben", lastName: "Keating", nationality: "American" },
  ]},
  { carNo: 34, teamId: "racing-team-turkey", team: "Racing Team Turkey by TF", drivers: [
    { firstName: "Peter", lastName: "Dempsey", nationality: "Irish" },
    { firstName: "Charlie", lastName: "Eastwood", nationality: "British" },
    { firstName: "Salih", lastName: "Yoluç", nationality: "Turkish" },
  ]},
  { carNo: 54, teamId: "vista-af-corse", team: "Vista AF Corse", drivers: [
    { firstName: "Francesco", lastName: "Castellacci", nationality: "Italian" },
    { firstName: "Thomas", lastName: "Flohr", nationality: "Swiss" },
    { firstName: "Davide", lastName: "Rigon", nationality: "Italian" },
  ]},
  { carNo: 58, teamId: "garage-59", team: "Garage 59", drivers: [
    { firstName: "Finn", lastName: "Gehrsitz", nationality: "German" },
    { firstName: "Benjamin", lastName: "Goethe", nationality: "German" },
    { firstName: "Alexander", lastName: "West", nationality: "Swedish" },
  ]},
  { carNo: 61, teamId: "iron-lynx", team: "Iron Lynx", drivers: [
    { firstName: "Rui", lastName: "Andrade", nationality: "Portuguese" },
    { firstName: "Martin", lastName: "Berry", nationality: "British" },
    { firstName: "Maxime", lastName: "Martin", nationality: "Belgian" },
  ]},
  { carNo: 69, teamId: "team-wrt", team: "Team WRT", drivers: [
    { firstName: "Dan", lastName: "Harper", nationality: "British" },
    { firstName: "Anthony", lastName: "McIntosh", nationality: "Canadian" },
    { firstName: "Parker", lastName: "Thompson", nationality: "Canadian" },
  ]},
  { carNo: 77, teamId: "proton-competition", team: "Proton Competition", drivers: [
    { firstName: "Eric", lastName: "Powell", nationality: "British" },
    { firstName: "Sebastian", lastName: "Priaulx", nationality: "British" },
    { firstName: "Ben", lastName: "Tuck", nationality: "British" },
  ]},
  { carNo: 78, teamId: "akkodis-asp", team: "Akkodis ASP Team", drivers: [
    { firstName: "Hadrien", lastName: "David", nationality: "French" },
    { firstName: "Tom", lastName: "Van Rompuy", nationality: "Belgian" },
    { firstName: "José María", lastName: "López", nationality: "Argentine" },
  ]},
  { carNo: 79, teamId: "iron-lynx", team: "Iron Lynx", drivers: [
    { firstName: "Matteo", lastName: "Cressoni", nationality: "Italian" },
    { firstName: "Lin", lastName: "Hodenius", nationality: "Dutch" },
    { firstName: "Johannes", lastName: "Zelger", nationality: "Austrian" },
  ]},
  { carNo: 87, teamId: "akkodis-asp", team: "Akkodis ASP Team", drivers: [
    { firstName: "Clemens", lastName: "Schmid", nationality: "Austrian" },
    { firstName: "Răzvan", lastName: "Umbrărescu", nationality: "Romanian" },
    { firstName: "Jack", lastName: "Hawksworth", nationality: "British" },
  ]},
  { carNo: 88, teamId: "proton-competition", team: "Proton Competition", drivers: [
    { firstName: "Stefano", lastName: "Gattuso", nationality: "Italian" },
    { firstName: "Giammarco", lastName: "Levorato", nationality: "Italian" },
    { firstName: "Logan", lastName: "Sargeant", nationality: "American" },
  ]},
  { carNo: 91, teamId: "manthey-dk", team: "Manthey DK Engineering", drivers: [
    { firstName: "Timur", lastName: "Boguslavskiy", nationality: "Russian" },
    { firstName: "James", lastName: "Cottingham", nationality: "British" },
    { firstName: "Ayhancan", lastName: "Güven", nationality: "Turkish" },
  ]},
  { carNo: 92, teamId: "manthey-bend", team: "The Bend Manthey", drivers: [
    { firstName: "Richard", lastName: "Lietz", nationality: "Austrian" },
    { firstName: "Riccardo", lastName: "Pera", nationality: "Italian" },
    { firstName: "Yasser", lastName: "Shahin", nationality: "Australian" },
  ]},
];

function toId(firstName: string, lastName: string): string {
  return `${firstName}-${lastName}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getWECDrivers(season: number): Driver[] {
  if (season !== 2026) return [];
  const entries = [...HYPERCAR_2026, ...LMGT3_2026];
  return entries.flatMap((entry) =>
    entry.drivers.map((d) => ({
      id: toId(d.firstName, d.lastName),
      firstName: d.firstName,
      lastName: d.lastName,
      nationality: d.nationality,
      team: entry.team,
      teamId: entry.teamId,
      number: entry.carNo,
    }))
  );
}
