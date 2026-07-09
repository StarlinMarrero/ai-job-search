// Smoke tests for the Get on Board CLI. Exactly ONE live network request
// (the search test) — everything else validates argument handling offline.
// Keep it that way: this hits a real third-party site.

import { describe, test, expect } from "bun:test";
import { runCLI, parseJSON } from "./helpers";

interface SearchResult {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  date: string | null;
  url: string;
}

interface SearchOutput {
  meta: { count: number; page: number };
  results: SearchResult[];
}

function parsedStderr(stderr: string): { error?: string; code?: string } {
  try {
    return JSON.parse(stderr);
  } catch {
    return {};
  }
}

describe("getonbrd CLI smoke", () => {
  test("live: search -q node --limit 5 returns valid results", async () => {
    const result = await runCLI(["search", "-q", "node", "--limit", "5"]);
    expect(result.exitCode).toBe(0);
    const data = parseJSON<SearchOutput>(result);
    expect(data.meta.count).toBeGreaterThanOrEqual(1);
    expect(data.meta.page).toBe(1);
    expect(data.results.length).toBeGreaterThanOrEqual(1);
    expect(data.results.length).toBeLessThanOrEqual(5);
    const first = data.results[0];
    expect(first.id).toBeTruthy();
    expect(first.title).toBeTruthy();
    expect(first.url).toMatch(/^https:\/\/www\.getonbrd\.com\/jobs\//);
  }, 30000);

  test("non-numeric --jobage exits 1 with BAD_ARG on stderr", async () => {
    const result = await runCLI(["search", "-q", "node", "--jobage", "foo"]);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    const err = parsedStderr(result.stderr);
    expect(err.code).toBe("BAD_ARG");
    expect(err.error).toMatch(/jobage/);
  });

  test("invalid --remote mode exits 1 with BAD_ARG on stderr", async () => {
    const result = await runCLI(["search", "-q", "node", "--remote", "moon"]);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    const err = parsedStderr(result.stderr);
    expect(err.code).toBe("BAD_ARG");
    expect(err.error).toMatch(/remote/);
  });

  test("detail without an id exits 1 with NO_ID on stderr", async () => {
    const result = await runCLI(["detail"]);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    const err = parsedStderr(result.stderr);
    expect(err.code).toBe("NO_ID");
  });

  test("unknown command exits 1 with BAD_CMD on stderr", async () => {
    const result = await runCLI(["frobnicate"]);
    expect(result.exitCode).toBe(1);
    const err = parsedStderr(result.stderr);
    expect(err.code).toBe("BAD_CMD");
  });
});
