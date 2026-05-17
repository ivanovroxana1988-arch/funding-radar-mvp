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
    name: "PTJ - Apeluri de proiecte",
    url: "https://mfe.gov.ro/ptj/apeluri-de-proiecte/",
    type: "html",
    enabled: true,
    programHint: "Programul Tranzitie Justa",
  },
  {
    name: "PODD - Apeluri de proiecte",
    url: "https://mfe.gov.ro/podd/apeluri-de-proiecte/",
    type: "html",
    enabled: true,
    programHint: "Programul Dezvoltare Durabila",
  },
  {
    name: "PIDS - Apeluri de proiecte",
    url: "https://mfe.gov.ro/pids/apeluri-de-proiecte/",
    type: "html",
    enabled: true,
    programHint: "Programul Incluziune si Demnitate Sociala",
  },
  {
    name: "Programul Sanatate - Apeluri de proiecte",
    url: "https://mfe.gov.ro/programul-sanatate/apeluri-de-proiecte/",
    type: "html",
    enabled: true,
    programHint: "Programul Sanatate",
  },
  {
    name: "PoCID - Apeluri de proiecte",
    url: "https://mfe.gov.ro/pocid/apeluri-de-proiecte/",
    type: "html",
    enabled: true,
    programHint: "Programul Crestere Inteligenta, Digitalizare si Instrumente Financiare",
  },
  {
    name: "Oportunitati UE",
    url: "https://oportunitati-ue.gov.ro/",
    type: "html",
    enabled: true,
  },
  {
    name: "POCU MFE",
    url: "https://pocu.mfe.gov.ro/",
    type: "html",
    enabled: true,
    programHint: "POCU",
  },
  {
    name: "MFE Programe",
    url: "https://mfe.gov.ro/programe/",
    type: "html",
    enabled: true,
  },
  {
    name: "MFE - Programul Educatie si Ocupare",
    url: "https://mfe.gov.ro/programe/programul-educatie-si-ocupare/",
    type: "html",
    enabled: true,
    programHint: "Programul Educatie si Ocupare",
  },
  {
    name: "MFE - Programul Incluziune si Demnitate Sociala",
    url: "https://mfe.gov.ro/programe/programul-incluziune-si-demnitate-sociala/",
    type: "html",
    enabled: true,
    programHint: "Programul Incluziune si Demnitate Sociala",
  },
  {
    name: "MFE - Programul Sanatate Main",
    url: "https://mfe.gov.ro/programe/programul-sanatate/",
    type: "html",
    enabled: true,
    programHint: "Programul Sanatate",
  },
  {
    name: "MFE - Programul Dezvoltare Durabila",
    url: "https://mfe.gov.ro/programe/programul-dezvoltare-durabila/",
    type: "html",
    enabled: true,
    programHint: "Programul Dezvoltare Durabila",
  },
  {
    name: "MFE - Programul Tranzitie Justa",
    url: "https://mfe.gov.ro/programe/programul-tranzitie-justa/",
    type: "html",
    enabled: true,
    programHint: "Programul Tranzitie Justa",
  },
  {
    name: "MFE - Programul Crestere Inteligenta Digitalizare",
    url: "https://mfe.gov.ro/programe/programul-crestere-inteligenta-digitalizare-si-instrumente-financiare/",
    type: "html",
    enabled: true,
    programHint: "Programul Crestere Inteligenta, Digitalizare si Instrumente Financiare",
  },
  {
    name: "MFE - Programul Cercetare Digitalizare Inovare",
    url: "https://mfe.gov.ro/programe/programul-cercetare-digitalizare-inovare/",
    type: "html",
    enabled: true,
    programHint: "Programul Cercetare Digitalizare Inovare",
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
