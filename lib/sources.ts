import type { SourceConfig } from "./types";

export const SOURCES: SourceConfig[] = [
  {
    name: "MIPE - Calendar apeluri de finantare",
    url: "https://mfe.gov.ro/calendar-apeluri-de-finantare/",
    type: "html",
    enabled: true,
  },
  {
    name: "MIPE - Calendar apeluri de proiecte",
    url: "https://mfe.gov.ro/calendar-apeluri-de-proiecte/",
    type: "html",
    enabled: true,
  },
  {
    name: "MIPE - Anunturi",
    url: "https://mfe.gov.ro/informatii-de-interes-public/anunturi/",
    type: "html",
    enabled: true,
  },
  {
    name: "PEO - Apeluri de proiecte",
    url: "https://mfe.gov.ro/peos/apeluri-de-proiecte/",
    type: "html",
    enabled: true,
    programHint: "Programul Educatie si Ocupare",
  },
  {
    name: "Oportunitati UE",
    url: "https://oportunitati-ue.gov.ro/",
    type: "html",
    enabled: true,
  },
];

export const DEFAULT_PROFILE = `
Profil de interes:
- organizatii patronale, parteneri sociali, ONG-uri, asociatii sau consortii;
- piata muncii, ocupare, formare profesionala, competente;
- digitalizare, AI, transformare digitala, competente digitale;
- tranzitie verde, sustenabilitate, economie verde;
- cercetare, inovare, capacitate institutionala;
- turism rural, dezvoltare locala, patrimoniu, comunitati;
- prioritate pentru apeluri unde solicitantul poate fi organizatie sau partener intr-un consortiu.
Scor mare doar daca exista indicii reale de eligibilitate si potrivire, nu doar cuvinte frumoase aruncate in ghid.
`;
