import * as cheerio from "cheerio";

export async function extractReadableTextFromUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "user-agent": "FundingRadarBot/0.1 (+internal research assistant)",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Cannot fetch document/page: ${res.status}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  const buffer = Buffer.from(await res.arrayBuffer());

  if (contentType.includes("text/html") || url.endsWith("/")) {
    const html = buffer.toString("utf8");
    const $ = cheerio.load(html);
    $("script, style, nav, footer, header").remove();
    return $("body").text().replace(/\s+/g, " ").trim().slice(0, 60000);
  }

  if (contentType.includes("application/pdf") || url.toLowerCase().endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default;
    const parsed = await pdfParse(buffer);
    return parsed.text.replace(/\s+/g, " ").trim().slice(0, 60000);
  }

  if (contentType.includes("wordprocessingml") || url.toLowerCase().endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value.replace(/\s+/g, " ").trim().slice(0, 60000);
  }

  if (contentType.includes("spreadsheetml") || url.toLowerCase().endsWith(".xlsx")) {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const text = workbook.SheetNames.map((name) => {
      const sheet = workbook.Sheets[name];
      return XLSX.utils.sheet_to_csv(sheet);
    }).join("\n\n");
    return text.replace(/\s+/g, " ").trim().slice(0, 60000);
  }

  return buffer.toString("utf8").replace(/\s+/g, " ").trim().slice(0, 60000);
}
