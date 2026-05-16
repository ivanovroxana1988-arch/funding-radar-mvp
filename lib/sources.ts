export interface FundingSource {
  id: string
  name: string
  url: string
  type: "rss" | "api" | "scrape"
  enabled: boolean
}

export const FUNDING_SOURCES: FundingSource[] = [
  {
    id: "mipe-calendar-finantare",
    name: "MIPE Calendar Apeluri de Finantare",
    url: "https://mfrr.gov.ro/web/guest/calendar-apeluri-finantare",
    type: "scrape",
    enabled: true,
  },
  {
    id: "mipe-calendar-proiecte",
    name: "MIPE Calendar Apeluri de Proiecte",
    url: "https://mfrr.gov.ro/web/guest/calendar-apeluri-proiecte",
    type: "scrape",
    enabled: true,
  },
  {
    id: "mipe-anunturi",
    name: "MIPE Anunturi",
    url: "https://mfrr.gov.ro/web/guest/anunturi",
    type: "scrape",
    enabled: true,
  },
  {
    id: "peo-apeluri",
    name: "PEO Apeluri de Proiecte",
    url: "https://www.fonduri-ue.ro/peo#checks",
    type: "scrape",
    enabled: true,
  },
  {
    id: "oportunitati-ue",
    name: "Oportunitati UE",
    url: "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-search",
    type: "api",
    enabled: true,
  },
]

export function getEnabledSources(): FundingSource[] {
  return FUNDING_SOURCES.filter((source) => source.enabled)
}
