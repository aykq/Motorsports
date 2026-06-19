import type { Driver } from "@/types/series";

interface WECEntry {
  carNo: number;
  teamId: string;
  team: string;
  drivers: Array<{ firstName: string; lastName: string; nationality: string; image?: string }>;
}

const HYPERCAR_2026: WECEntry[] = [
  { carNo: 7, teamId: "toyota-racing", team: "Toyota Racing", drivers: [
    { firstName: "Mike", lastName: "Conway", nationality: "British", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-7-mike-conway-right-69e1f22de058c661102174.png" },
    { firstName: "Kamui", lastName: "Kobayashi", nationality: "Japanese", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-7-kamui-kobayashi-right-69e1f22db6d08760572733.png" },
    { firstName: "Nyck", lastName: "de Vries", nationality: "Dutch", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-7-nyck-de-vries-right-69e1f233088df563086067.png" },
  ]},
  { carNo: 8, teamId: "toyota-racing", team: "Toyota Racing", drivers: [
    { firstName: "Sébastien", lastName: "Buemi", nationality: "Swiss", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-8-sebastien-buemi-right-69e1f22fd6db6530188059.png" },
    { firstName: "Brendon", lastName: "Hartley", nationality: "New Zealander", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-8-brendon-hartley-right-69e1f22f7fbac838023269.png" },
    { firstName: "Ryō", lastName: "Hirakawa", nationality: "Japanese", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-8-ryo-hirakawa-right-69e1f22fabb70936336865.png" },
  ]},
  { carNo: 9, teamId: "aston-martin-thor", team: "Aston Martin THOR Team", drivers: [
    { firstName: "Alex", lastName: "Riberas", nationality: "Spanish", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-009-alex-riberas-right-69e1f223c60c6281831072.png" },
    { firstName: "Marco", lastName: "Sørensen", nationality: "Danish", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-009-marco-sorensen-right-69e1f23201e3a153352452.png" },
    { firstName: "Roman", lastName: "De Angelis", nationality: "Canadian" },
  ]},
  { carNo: 12, teamId: "cadillac-jota", team: "Cadillac Hertz Team Jota", drivers: [
    { firstName: "Norman", lastName: "Nato", nationality: "French", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-12-norman-nato-right-69e1f22485ff0802804412.png" },
    { firstName: "Will", lastName: "Stevens", nationality: "British", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-12-will-stevens-right-69e1f224b122c323021459.png" },
    { firstName: "Louis", lastName: "Delétraz", nationality: "Swiss" },
  ]},
  { carNo: 15, teamId: "bmw-wrt", team: "BMW M Team WRT", drivers: [
    { firstName: "Kevin", lastName: "Magnussen", nationality: "Danish", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-15-kevin-magnussen-right-69e1f224dd077900745434.png" },
    { firstName: "Raffaele", lastName: "Marciello", nationality: "Italian", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-15-raffaele-marciello-right-69e1f225192bf853265424.png" },
    { firstName: "Dries", lastName: "Vanthoor", nationality: "Belgian", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-15-dries-vanthoor-right-69fe1f9e1cac4455023330.png" },
  ]},
  { carNo: 17, teamId: "genesis-magma", team: "Genesis Magma Racing", drivers: [
    { firstName: "Pipo", lastName: "Derani", nationality: "Brazilian", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-17-luis-felipe-derani-right-69e1f23228597021506228.png" },
    { firstName: "Mathys", lastName: "Jaubert", nationality: "French", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-17-mathys-jaubert-right-69e1f22571d41588338418.png" },
    { firstName: "André", lastName: "Lotterer", nationality: "German", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-17-andre-lotterer-right-69e1f225439c8246545587.png" },
  ]},
  { carNo: 19, teamId: "genesis-magma", team: "Genesis Magma Racing", drivers: [
    { firstName: "Paul-Loup", lastName: "Chatin", nationality: "French", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-19-paul-loup-chatin-right-69e1f23250a1b641201593.png" },
    { firstName: "Mathieu", lastName: "Jaminet", nationality: "French", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-19-mathieu-jaminet-right-69e1f225c81eb978886287.png" },
    { firstName: "Daniel", lastName: "Juncadella", nationality: "Spanish", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-19-daniel-juncadella-right-69e1f2259f025435219463.png" },
  ]},
  { carNo: 20, teamId: "bmw-wrt", team: "BMW M Team WRT", drivers: [
    { firstName: "Robin", lastName: "Frijns", nationality: "Dutch", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-20-robin-frijns-right-69e1f22629959297130826.png" },
    { firstName: "René", lastName: "Rast", nationality: "German", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-20-rene-rast-right-69e1f225f3261309694954.png" },
    { firstName: "Sheldon", lastName: "van der Linde", nationality: "South African", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-20-sheldon-van-der-linde-right-69fe1f9f40fa2516445749.png" },
  ]},
  { carNo: 35, teamId: "alpine-endurance", team: "Alpine Endurance Team", drivers: [
    { firstName: "António", lastName: "Félix da Costa", nationality: "Portuguese", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-35-antonio-felix-da-costa-right-69e1f232a7ad5929080471.png" },
    { firstName: "Ferdinand", lastName: "Habsburg", nationality: "Austrian", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-35-ferdinand-habsburg-right-69e1f2298ff92620981827.png" },
    { firstName: "Charles", lastName: "Milesi", nationality: "French", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-35-charles-milesi-right-69e1f22962410952787119.png" },
  ]},
  { carNo: 36, teamId: "alpine-endurance", team: "Alpine Endurance Team", drivers: [
    { firstName: "Jules", lastName: "Gounon", nationality: "French", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-36-jules-gounon-right-69e1f229e58f6278150122.png" },
    { firstName: "Frédéric", lastName: "Makowiecki", nationality: "French", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-36-frederic-makowiecki-right-69e1f229bb322141603865.png" },
    { firstName: "Victor", lastName: "Martins", nationality: "French", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-36-victor-martins-right-69e1f22a1b782168546228.png" },
  ]},
  { carNo: 38, teamId: "cadillac-jota", team: "Cadillac Hertz Team Jota", drivers: [
    { firstName: "Earl", lastName: "Bamber", nationality: "New Zealander", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-38-earl-bamber-right-69e1f22a48a34219261096.png" },
    { firstName: "Sébastien", lastName: "Bourdais", nationality: "French", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-38-sebastien-bourdais-right-69e1f22a7332c351753583.png" },
    { firstName: "Jack", lastName: "Aitken", nationality: "British", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-38-jack-aitken-right-69fe1f9d69fd5067851003.png" },
  ]},
  { carNo: 50, teamId: "ferrari-af-corse", team: "Ferrari AF Corse", drivers: [
    { firstName: "Antonio", lastName: "Fuoco", nationality: "Italian", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-50-antonio-fuoco-right-69e1f22aa6faf347560807.png" },
    { firstName: "Miguel", lastName: "Molina", nationality: "Spanish", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-50-miguel-molina-right-69e1f22ad051f610966537.png" },
    { firstName: "Nicklas", lastName: "Nielsen", nationality: "Danish", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-50-nicklas-nielsen-right-69e1f22b031c6398499742.png" },
  ]},
  { carNo: 51, teamId: "ferrari-af-corse", team: "Ferrari AF Corse", drivers: [
    { firstName: "James", lastName: "Calado", nationality: "British", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-51-james-calado-right-69e1f22b5dbd8695586862.png" },
    { firstName: "Antonio", lastName: "Giovinazzi", nationality: "Italian", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-51-antonio-giovinazzi-right-69e1f22b2d631280497480.png" },
    { firstName: "Alessandro", lastName: "Pier Guidi", nationality: "Italian", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-51-alessandro-pier-guidi-right-69e1f232d26a3201493181.png" },
  ]},
  { carNo: 83, teamId: "af-corse", team: "AF Corse", drivers: [
    { firstName: "Phil", lastName: "Hanson", nationality: "British", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-83-philip-hanson-right-69e1f2300b3a4808537591.png" },
    { firstName: "Robert", lastName: "Kubica", nationality: "Polish", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-83-robert-kubica-right-69e1f2303d3db380837716.png" },
    { firstName: "Yifei", lastName: "Ye", nationality: "Chinese", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-83-yifei-ye-right-69e1f2306934d244395376.png" },
  ]},
  { carNo: 93, teamId: "peugeot-totalenergies", team: "Peugeot TotalEnergies", drivers: [
    { firstName: "Nick", lastName: "Cassidy", nationality: "New Zealander", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-93-nick-cassidy-right-69fe218d6fce3297344757.png" },
    { firstName: "Paul", lastName: "di Resta", nationality: "British", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-93-paul-di-resta-right-69fe218e5f729841909857.png" },
    { firstName: "Stoffel", lastName: "Vandoorne", nationality: "Belgian", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-93-stoffel-vandoorne-right-69fe218d9f421153087790.png" },
  ]},
  { carNo: 94, teamId: "peugeot-totalenergies", team: "Peugeot TotalEnergies", drivers: [
    { firstName: "Loïc", lastName: "Duval", nationality: "French", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-94-loic-duval-right-69fe218dd282c067885858.png" },
    { firstName: "Malthe", lastName: "Jakobsen", nationality: "Danish", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-94-malthe-jakobsen-right-69fe218e0a5a5233661293.png" },
    { firstName: "Théo", lastName: "Pourchaire", nationality: "French", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-94-theo-pourchaire-right-69fe218e34515461428335.png" },
  ]},
  { carNo: 7, teamId: "aston-martin-thor", team: "Aston Martin THOR Team", drivers: [
    { firstName: "Tom", lastName: "Gamble", nationality: "British", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-007-tom-gamble-right-69e1f22394b1c876766494.png" },
    { firstName: "Harry", lastName: "Tincknell", nationality: "British", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-007-harry-tincknell-right-69e1f22359c4f325145752.png" },
    { firstName: "Ross", lastName: "Gunn", nationality: "British" },
  ]},
];

const LMGT3_2026: WECEntry[] = [
  { carNo: 10, teamId: "garage-59", team: "Garage 59", drivers: [
    { firstName: "Antares", lastName: "Au", nationality: "Hong Kong", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-10-antares-au-right-69e1f223f135b242335408.png" },
    { firstName: "Tom", lastName: "Fleming", nationality: "American", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-10-thomas-fleming-right-69e1f2245c826886812043.png" },
    { firstName: "Marvin", lastName: "Kirchhöfer", nationality: "German", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-10-marvin-kirchhofer-right-69e1f2242cc2b596558280.png" },
  ]},
  { carNo: 21, teamId: "vista-af-corse", team: "Vista AF Corse", drivers: [
    { firstName: "François", lastName: "Hériau", nationality: "French", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-21-francois-heriau-right-69e1f22682632847679827.png" },
    { firstName: "Simon", lastName: "Mann", nationality: "American", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-21-simon-mann-right-69e1f226b088c642894361.png" },
    { firstName: "Alessio", lastName: "Rovera", nationality: "Italian", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-21-alessio-rovera-right-69e1f22655e29742712995.png" },
  ]},
  { carNo: 23, teamId: "heart-of-racing", team: "Heart of Racing Team", drivers: [
    { firstName: "Jonny", lastName: "Adam", nationality: "British", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-23-jonny-adam-right-69e1f2271588c967836045.png" },
    { firstName: "Gray", lastName: "Newell", nationality: "American", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-23-gray-newell-right-69e1f226dfa8e161752614.png" },
    { firstName: "Eduardo", lastName: "Barrichello", nationality: "Brazilian", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-23-eduardo-barrichello-right-69fe1f9dccdf5093317097.png" },
  ]},
  { carNo: 27, teamId: "heart-of-racing", team: "Heart of Racing Team", drivers: [
    { firstName: "Ian", lastName: "James", nationality: "American", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-27-ian-james-right-69e1f2274153d823348551.png" },
    { firstName: "Zach", lastName: "Robichon", nationality: "Canadian", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-27-zacharie-robichon-right-69e1f22797286943554357.png" },
    { firstName: "Mattia", lastName: "Drudi", nationality: "Italian", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-27-mattia-drudi-right-69e1f2276a997369872081.png" },
  ]},
  { carNo: 32, teamId: "team-wrt", team: "Team WRT", drivers: [
    { firstName: "Augusto", lastName: "Farfus", nationality: "Brazilian", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-32-augusto-farfus-right-69e1f227c33ec273662328.png" },
    { firstName: "Sean", lastName: "Gelael", nationality: "Indonesian", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-32-sean-gelael-right-69e1f228274f1856711704.png" },
    { firstName: "Darren", lastName: "Leung", nationality: "British", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-32-darren-leung-right-69e1f227ef58f651900367.png" },
  ]},
  { carNo: 33, teamId: "tf-sport", team: "TF Sport", drivers: [
    { firstName: "Nicky", lastName: "Catsburg", nationality: "Dutch", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-33-nicky-catsburg-right-69e1f228a5d84535447891.png" },
    { firstName: "Jonny", lastName: "Edgar", nationality: "British", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/jonny-edgar-268485-68f03c93d7fb6059316057.png" },
    { firstName: "Ben", lastName: "Keating", nationality: "American" },
  ]},
  { carNo: 34, teamId: "racing-team-turkey", team: "Racing Team Turkey by TF", drivers: [
    { firstName: "Peter", lastName: "Dempsey", nationality: "Irish", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-34-peter-dempsey-right-69e1f2290a617255166091.png" },
    { firstName: "Charlie", lastName: "Eastwood", nationality: "British", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-34-charlie-eastwood-right-69e1f228d2b49954610871.png" },
    { firstName: "Salih", lastName: "Yoluç", nationality: "Turkish", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-34-salih-yoluc-right-69e1f22933797322861021.png" },
  ]},
  { carNo: 54, teamId: "vista-af-corse", team: "Vista AF Corse", drivers: [
    { firstName: "Francesco", lastName: "Castellacci", nationality: "Italian", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-54-francesco-castellacci-right-69e1f22bb478d778308836.png" },
    { firstName: "Thomas", lastName: "Flohr", nationality: "Swiss", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-54-thomas-flohr-right-69e1f22be16b3339906187.png" },
    { firstName: "Davide", lastName: "Rigon", nationality: "Italian", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-54-davide-rigon-right-69e1f22b8ad50680285072.png" },
  ]},
  { carNo: 58, teamId: "garage-59", team: "Garage 59", drivers: [
    { firstName: "Finn", lastName: "Gehrsitz", nationality: "German", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-58-finn-gehrsitz-right-69e1f22c72544622614261.png" },
    { firstName: "Benjamin", lastName: "Goethe", nationality: "German", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-58-benjamin-goethe-right-69e1f22c46675875142375.png" },
    { firstName: "Alexander", lastName: "West", nationality: "Swedish", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-58-alexander-west-right-69e1f22c1940a287945251.png" },
  ]},
  { carNo: 61, teamId: "iron-lynx", team: "Iron Lynx", drivers: [
    { firstName: "Rui", lastName: "Andrade", nationality: "Portuguese", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-61-rui-andrade-right-69e1f22d04fa2552922649.png" },
    { firstName: "Martin", lastName: "Berry", nationality: "British", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-61-martin-berry-right-69e1f22c9e6ce328190174.png" },
    { firstName: "Maxime", lastName: "Martin", nationality: "Belgian", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-61-maxime-martin-right-69e1f22cccb73769899426.png" },
  ]},
  { carNo: 69, teamId: "team-wrt", team: "Team WRT", drivers: [
    { firstName: "Dan", lastName: "Harper", nationality: "British", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-69-daniel-harper-right-69e1f22d5b7bb747592958.png" },
    { firstName: "Anthony", lastName: "McIntosh", nationality: "Canadian", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-69-anthony-mcintosh-right-69e1f22d2e797059841256.png" },
    { firstName: "Parker", lastName: "Thompson", nationality: "Canadian", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-69-parker-thompson-right-69e1f22d8b5c8753443132.png" },
  ]},
  { carNo: 77, teamId: "proton-competition", team: "Proton Competition", drivers: [
    { firstName: "Eric", lastName: "Powell", nationality: "British", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-77-eric-powell-right-69e1f22e456df170025101.png" },
    { firstName: "Sebastian", lastName: "Priaulx", nationality: "British", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-77-sebastian-priaulx-right-69e1f22e710c6811597967.png" },
    { firstName: "Ben", lastName: "Tuck", nationality: "British", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-77-ben-tuck-right-69e1f22e1ac76608521614.png" },
  ]},
  { carNo: 78, teamId: "akkodis-asp", team: "Akkodis ASP Team", drivers: [
    { firstName: "Hadrien", lastName: "David", nationality: "French", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-78-hadrien-david-right-69e1f22ec8f2f676137912.png" },
    { firstName: "Tom", lastName: "Van Rompuy", nationality: "Belgian", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-78-tom-van-rompuy-right-69e1f23332751850673054.png" },
    { firstName: "José María", lastName: "López", nationality: "Argentine", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-87-jose-maria-lopez-right-69e1f2335b009157066166.png" },
  ]},
  { carNo: 79, teamId: "iron-lynx", team: "Iron Lynx", drivers: [
    { firstName: "Matteo", lastName: "Cressoni", nationality: "Italian", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-79-matteo-cressoni-right-69e1f22f55797841364386.png" },
    { firstName: "Lin", lastName: "Hodenius", nationality: "Dutch", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-79-lin-hodenius-right-69e1f22f2816c474418604.png" },
    { firstName: "Johannes", lastName: "Zelger", nationality: "Austrian", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-79-johannes-zelger-right-69e1f22ef2f9a489940830.png" },
  ]},
  { carNo: 87, teamId: "akkodis-asp", team: "Akkodis ASP Team", drivers: [
    { firstName: "Clemens", lastName: "Schmid", nationality: "Austrian", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-87-clemens-schmid-right-69e1f2309a08c006437039.png" },
    { firstName: "Răzvan", lastName: "Umbrărescu", nationality: "Romanian", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-87-petru-umbrarescu-right-69e1f230c18e8993070032.png" },
    { firstName: "Jack", lastName: "Hawksworth", nationality: "British" },
  ]},
  { carNo: 88, teamId: "proton-competition", team: "Proton Competition", drivers: [
    { firstName: "Stefano", lastName: "Gattuso", nationality: "Italian", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-88-stefano-gattuso-right-69e1f2314b3a3499145502.png" },
    { firstName: "Giammarco", lastName: "Levorato", nationality: "Italian", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-88-giammarco-levorato-right-69e1f230ebfef922309168.png" },
    { firstName: "Logan", lastName: "Sargeant", nationality: "American", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-88-logan-sargeant-right-69e1f2311fccf975585926.png" },
  ]},
  { carNo: 91, teamId: "manthey-dk", team: "Manthey DK Engineering", drivers: [
    { firstName: "Timur", lastName: "Boguslavskiy", nationality: "Russian", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-91-timur-boguslavskiy-right-69e1f231cdaa9957876516.png" },
    { firstName: "James", lastName: "Cottingham", nationality: "British", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-91-james-cottingham-right-69e1f231a096f719610110.png" },
    { firstName: "Ayhancan", lastName: "Güven", nationality: "Turkish", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-91-ayhancan-guven-right-69e1f23177a9d825696688.png" },
  ]},
  { carNo: 92, teamId: "manthey-bend", team: "The Bend Manthey", drivers: [
    { firstName: "Richard", lastName: "Lietz", nationality: "Austrian", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-92-richard-lietz-right-69fe218d0a678856276339.png" },
    { firstName: "Riccardo", lastName: "Pera", nationality: "Italian", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-92-riccardo-pera-right-69fe218ccd58f374687101.png" },
    { firstName: "Yasser", lastName: "Shahin", nationality: "Australian", image: "https://www.fiawec.com/media/cache/resolve/news_card/uploads/2026-wec-92-yasser-shahin-right-69fe218d3abd8647039420.png" },
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
  const mapEntries = (entries: WECEntry[], category: string) =>
    entries.flatMap((entry) =>
      entry.drivers.map((d) => ({
        id: toId(d.firstName, d.lastName),
        firstName: d.firstName,
        lastName: d.lastName,
        nationality: d.nationality,
        team: entry.team,
        teamId: entry.teamId,
        number: entry.carNo,
        image: d.image,
        category,
      }))
    );
  return [...mapEntries(HYPERCAR_2026, "Hypercar"), ...mapEntries(LMGT3_2026, "LMGT3")];
}
