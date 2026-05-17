import type { SourceConfig } from "./types";

export const SOURCES: SourceConfig[] = [
  {
    name: "MFE Discovery",
    url: "https://mfe.gov.ro/",
    type: "discovery",
    enabled: true,
    fallbackUrls: [
      "https://mfe.gov.ro/sitemap_index.xml",
      "https://mfe.gov.ro/page-sitemap.xml",
      "https://mfe.gov.ro/post-sitemap.xml",
      "https://mfe.gov.ro/wp-json/wp/v2/search?search=apel&per_page=100",
      "https://mfe.gov.ro/wp-json/wp/v2/pages?search=finantare&_fields=link,title&per_page=100",
      "https://mfe.gov.ro/wp-json/wp/v2/posts?search=ghid&_fields=link,title&per_page=100",
    ],
  },
  {
    name: "Oportunitati UE",
    url: "https://oportunitati-ue.gov.ro/",
    fallbackUrls: [
      "https://oportunitati-ue.gov.ro/wp-sitemap.xml",
      "https://oportunitati-ue.gov.ro/wp-json/wp/v2/posts?search=apel&_fields=link,title&per_page=100",
    ],
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
