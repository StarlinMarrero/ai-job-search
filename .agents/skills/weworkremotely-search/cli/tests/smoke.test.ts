// Live smoke tests — hit the real WWR RSS feeds. Kept minimal (one search run)
// to keep request volume low; everything else is offline flag validation.
import { describe, test, expect } from "bun:test";
import { runCLI, parseJSON } from "./helpers";

interface SearchPayload {
  meta: { count: number; page: number };
  results: Array<{
    id: string | null;
    title: string | null;
    company: string | null;
    location: string | null;
    date: string | null;
    url: string | null;
  }>;
}

function parsedStderr(stderr: string): { error?: string; code?: string } {
  try {
    return JSON.parse(stderr);
  } catch {
    return {};
  }
}

describe("weworkremotely CLI live smoke", () => {
  test('search -q "developer" --limit 5 returns valid results', async () => {
    const result = await runCLI(["search", "-q", "developer", "--limit", "5"]);
    expect(result.exitCode).toBe(0);
    const payload = parseJSON<SearchPayload>(result);
    expect(payload.meta.count).toBeGreaterThanOrEqual(1);
    expect(payload.meta.count).toBeLessThanOrEqual(5);
    expect(payload.meta.page).toBe(1);
    expect(payload.results.length).toBe(payload.meta.count);
    for (const job of payload.results) {
      expect(job.id).toBeTruthy();
      expect(job.title).toBeTruthy();
      expect(job.url).toMatch(/^https:\/\/weworkremotely\.com\/remote-jobs\//);
      // Contract: fields are null when missing, never omitted.
      expect("company" in job).toBe(true);
      expect("location" in job).toBe(true);
      expect("date" in job).toBe(true);
    }
  });
});

describe("weworkremotely CLI flag validation (offline)", () => {
  test("bogus --jobage value exits 1 with JSON error on stderr", async () => {
    const result = await runCLI(["search", "--jobage", "banana"]);
    expect(result.exitCode).toBe(1);
    const err = parsedStderr(result.stderr);
    expect(err.code).toBe("BAD_ARG");
    expect(err.error).toMatch(/jobage/);
  });

  test("bogus --page value exits 1 with BAD_ARG", async () => {
    const result = await runCLI(["search", "--page", "abc"]);
    expect(result.exitCode).toBe(1);
    expect(parsedStderr(result.stderr).code).toBe("BAD_ARG");
  });

  test("bogus --limit value exits 1 with BAD_ARG", async () => {
    const result = await runCLI(["search", "--limit", "xyz"]);
    expect(result.exitCode).toBe(1);
    expect(parsedStderr(result.stderr).code).toBe("BAD_ARG");
  });

  test("unknown --category exits 1 with BAD_CATEGORY", async () => {
    const result = await runCLI(["search", "--category", "cooking"]);
    expect(result.exitCode).toBe(1);
    const err = parsedStderr(result.stderr);
    expect(err.code).toBe("BAD_CATEGORY");
    expect(err.error).toMatch(/full-stack/);
  });

  test("unknown command exits 1 with BAD_CMD", async () => {
    const result = await runCLI(["frobnicate"]);
    expect(result.exitCode).toBe(1);
    expect(parsedStderr(result.stderr).code).toBe("BAD_CMD");
  });

  test("detail without an id exits 1 with NO_ID", async () => {
    const result = await runCLI(["detail"]);
    expect(result.exitCode).toBe(1);
    expect(parsedStderr(result.stderr).code).toBe("NO_ID");
  });

  test("detail with an unparseable id exits 1 with BAD_ID", async () => {
    const result = await runCLI(["detail", "!!not a slug!!"]);
    expect(result.exitCode).toBe(1);
    expect(parsedStderr(result.stderr).code).toBe("BAD_ID");
  });
});
