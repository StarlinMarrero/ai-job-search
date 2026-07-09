// Live smoke tests against the real Remote OK API. Deliberately minimal:
// exactly ONE network-hitting invocation to keep volume low (the API terms
// ask for low-volume personal use). The bogus-flag test fails during flag
// validation, before any network call.

import { describe, test, expect } from "bun:test";
import { runCLI, parseJSON } from "./helpers";

interface SearchResult {
  id: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  date: string | null;
  url: string | null;
}

interface SearchPayload {
  meta: { count: number; page: number };
  results: SearchResult[];
}

describe("remoteok CLI live smoke", () => {
  test('search -q "engineer" --limit 5 returns well-formed results', async () => {
    const result = await runCLI(["search", "-q", "engineer", "--limit", "5"]);
    expect(result.exitCode).toBe(0);

    const payload = parseJSON<SearchPayload>(result);
    expect(payload.meta.count).toBeGreaterThanOrEqual(1);
    expect(payload.meta.page).toBe(1);
    expect(payload.results.length).toBeGreaterThanOrEqual(1);
    expect(payload.results.length).toBeLessThanOrEqual(5);

    const first = payload.results[0];
    expect(first.id).toBeTruthy();
    expect(first.title).toBeTruthy();
    expect(first.url).toMatch(/^https?:\/\//);
    // Contract: missing fields are null, never omitted.
    for (const key of ["id", "title", "company", "location", "date", "url"]) {
      expect(first).toHaveProperty(key);
    }
  });

  test("bogus flag exits 1 with a JSON error on stderr (no network)", async () => {
    const result = await runCLI(["search", "--bogus-flag", "x"]);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    const err = JSON.parse(result.stderr) as { error?: string; code?: string };
    expect(err.error).toBeTruthy();
    expect(err.code).toBe("BAD_FLAG");
  });
});
