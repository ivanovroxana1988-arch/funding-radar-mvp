import OpenAI from "openai";
import { analysisSchema } from "./aiSchema";
import { DEFAULT_PROFILE } from "./sources";
import type { AiAnalysis } from "./types";

export async function analyzeFundingCall(input: {
  title: string;
  source_url: string;
  source_name?: string | null;
  existing_program?: string | null;
  existing_status?: string | null;
  page_text?: string | null;
  profile?: string | null;
}): Promise<AiAnalysis> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const content = `
Analizeaza apelul de finantare de mai jos pentru un dashboard intern.

Nu inventa date. Daca nu gasesti clar bugetul, deadline-ul sau eligibilitatea, pune null sau mentioneaza ca trebuie verificat manual.
Scorul de relevanta trebuie sa fie conservator:
- 85-100: foarte probabil relevant si eligibil
- 65-84: merita analizat
- 40-64: posibil relevant, dar incert
- 0-39: probabil nerelevant

Profil folosit pentru matching:
${input.profile || DEFAULT_PROFILE}

Titlu: ${input.title}
Sursa: ${input.source_name || ""}
URL: ${input.source_url}
Program existent: ${input.existing_program || ""}
Status existent: ${input.existing_status || ""}

Text extras:
${(input.page_text || "").slice(0, 45000)}
`;

  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          "Esti un analist de fonduri europene. Extragi date structurate, explici relevanta si marchezi incertitudinile. Raspunzi exclusiv JSON conform schemei.",
      },
      {
        role: "user",
        content,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "funding_call_analysis",
        schema: analysisSchema,
        strict: true,
      },
    },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("OpenAI returned empty analysis.");

  return JSON.parse(raw) as AiAnalysis;
}
