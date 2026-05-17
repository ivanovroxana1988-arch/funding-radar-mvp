import assert from "node:assert/strict";
import test from "node:test";
import { analysisSchema } from "../lib/aiSchema";
import { inferDocumentType, inferStatus, looksLikeFundingCall } from "../lib/scrape";

test("looksLikeFundingCall accepts funding and guide links", () => {
  assert.equal(looksLikeFundingCall("Ghid solicitant apel PEO", "https://example.test/ghid.pdf"), true);
  assert.equal(looksLikeFundingCall("Politica de cookies", "https://example.test/cookie"), false);
});

test("inferStatus identifies common call states", () => {
  assert.equal(inferStatus("Ghid in consultare publica"), "consultare publica");
  assert.equal(inferStatus("Apel lansat pentru proiecte"), "lansat");
  assert.equal(inferStatus("Calendar apeluri 2026"), "calendar");
});

test("inferDocumentType detects supported documents", () => {
  assert.equal(inferDocumentType("https://example.test/document.pdf?download=1"), "pdf");
  assert.equal(inferDocumentType("https://example.test/tabel.xlsx"), "xlsx");
  assert.equal(inferDocumentType("https://example.test/page"), null);
});

test("AI analysis schema requires the dashboard fields", () => {
  const required = new Set(analysisSchema.required);
  for (const key of ["summary", "relevance_score", "recommendation", "manual_checks"] as const) {
    assert.equal(required.has(key), true);
  }
  assert.equal(analysisSchema.additionalProperties, false);
});
