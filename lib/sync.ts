import { supabaseAdmin, type Call } from "./supabase"
import { getEnabledSources, type FundingSource } from "./sources"
import * as cheerio from "cheerio"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface SyncResult {
  source_id: string
  source_name: string
  status: "success" | "error"
  calls_found: number
  calls_new: number
  calls_updated: number
  error_message?: string
}

async function classifyWithAI(
  title: string,
  description: string
): Promise<{ summary: string; tags: string[] }> {
  try {
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini"
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `Esti un expert in fonduri europene. Analizeaza urmatorul apel de finantare si returneaza:
1. Un rezumat scurt (max 2 propozitii) in romana
2. 3-5 tag-uri relevante (ex: IMM, digitalizare, verde, cercetare, infrastructura, educatie, sanatate, agricultura)

Raspunde DOAR in format JSON: {"summary": "...", "tags": ["tag1", "tag2", ...]}`,
        },
        {
          role: "user",
          content: `Titlu: ${title}\n\nDescriere: ${description || "Nu exista descriere"}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
    })

    const content = response.choices[0]?.message?.content || "{}"
    const parsed = JSON.parse(content)
    return {
      summary: parsed.summary || "",
      tags: parsed.tags || [],
    }
  } catch (error) {
    console.error("AI classification error:", error)
    return { summary: "", tags: [] }
  }
}

async function scrapeSource(source: FundingSource): Promise<Partial<Call>[]> {
  const calls: Partial<Call>[] = []

  try {
    const response = await fetch(source.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Generic scraping - adapt based on source
    if (source.id.includes("mipe")) {
      // MIPE websites structure
      $("table tbody tr, .apel-item, article").each((_, el) => {
        const $el = $(el)
        const title =
          $el.find("a").first().text().trim() ||
          $el.find("h3, h4, .title").first().text().trim()
        const url = $el.find("a").first().attr("href") || ""
        const description = $el.find("p, .description").first().text().trim()

        if (title && title.length > 10) {
          calls.push({
            source_id: source.id,
            source_name: source.name,
            external_id: url || title.substring(0, 50),
            title: title.substring(0, 500),
            description: description.substring(0, 2000),
            url: url.startsWith("http") ? url : `${source.url}${url}`,
            status: "active",
          })
        }
      })
    } else if (source.id === "peo-apeluri") {
      // PEO website structure
      $(".apel, .project-call, article, .card").each((_, el) => {
        const $el = $(el)
        const title =
          $el.find("a, h3, h4, .title").first().text().trim()
        const url = $el.find("a").first().attr("href") || ""
        const description = $el.find("p, .description, .content").first().text().trim()

        if (title && title.length > 10) {
          calls.push({
            source_id: source.id,
            source_name: source.name,
            external_id: url || title.substring(0, 50),
            title: title.substring(0, 500),
            description: description.substring(0, 2000),
            url: url.startsWith("http") ? url : `https://www.fonduri-ue.ro${url}`,
            status: "active",
          })
        }
      })
    }
  } catch (error) {
    console.error(`Error scraping ${source.name}:`, error)
  }

  return calls
}

async function syncSource(source: FundingSource): Promise<SyncResult> {
  const result: SyncResult = {
    source_id: source.id,
    source_name: source.name,
    status: "success",
    calls_found: 0,
    calls_new: 0,
    calls_updated: 0,
  }

  try {
    // Log start
    const { data: logEntry } = await supabaseAdmin
      .from("sync_logs")
      .insert({
        source_id: source.id,
        source_name: source.name,
        status: "running",
      })
      .select()
      .single()

    // Scrape calls
    const calls = await scrapeSource(source)
    result.calls_found = calls.length

    // Process each call
    for (const call of calls) {
      // Check if exists
      const { data: existing } = await supabaseAdmin
        .from("calls")
        .select("id")
        .eq("source_id", call.source_id!)
        .eq("external_id", call.external_id!)
        .single()

      if (!existing) {
        // New call - classify with AI
        const { summary, tags } = await classifyWithAI(
          call.title || "",
          call.description || ""
        )

        await supabaseAdmin.from("calls").insert({
          ...call,
          ai_summary: summary,
          ai_tags: tags,
        })
        result.calls_new++
      } else {
        result.calls_updated++
      }
    }

    // Update log
    if (logEntry) {
      await supabaseAdmin
        .from("sync_logs")
        .update({
          status: "success",
          calls_found: result.calls_found,
          calls_new: result.calls_new,
          calls_updated: result.calls_updated,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logEntry.id)
    }
  } catch (error) {
    result.status = "error"
    result.error_message = error instanceof Error ? error.message : "Unknown error"
    console.error(`Sync error for ${source.name}:`, error)
  }

  return result
}

export async function syncAllSources(): Promise<SyncResult[]> {
  const sources = getEnabledSources()
  const results: SyncResult[] = []

  for (const source of sources) {
    console.log(`Syncing ${source.name}...`)
    const result = await syncSource(source)
    results.push(result)
    console.log(`${source.name}: ${result.calls_found} found, ${result.calls_new} new`)
  }

  return results
}
