// Offline unit tests for the RSS parsing layer — no network access.
import { describe, test, expect } from "bun:test";
import {
  parseFeedItems,
  dedupeByUrl,
  splitTitle,
  splitList,
  stripFlags,
  htmlToText,
  decodeEntities,
  parsePubDate,
  slugFromUrl,
} from "../src/helpers";
import { normalizeId } from "../src/commands/detail";

const FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss">
  <channel>
    <title>We Work Remotely: Test Feed</title>
    <link>https://weworkremotely.com/categories/test.rss</link>
    <item>
      <media:content url="https://example.com/logo.gif" type="image/png"/>
      <title>Acme Corp: Senior Node.js Developer</title>
      <region>Anywhere in the World</region>
      <country>\u{1F1E9}\u{1F1F4} Dominican Republic, \u{1F1FA}\u{1F1F8} United States of America, and \u{1F1E9}\u{1F1EA} Germany</country>
      <skills>Node.js, TypeScript, and PostgreSQL</skills>
      <category>Back-End Programming</category>
      <type>Full-Time</type>
      <description>&lt;p&gt;First paragraph &amp;amp; more.&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Bullet one&lt;/li&gt;&lt;li&gt;Bullet two&lt;/li&gt;&lt;/ul&gt;</description>
      <pubDate>Wed, 08 Jul 2026 15:28:25 +0000</pubDate>
      <guid>https://weworkremotely.com/remote-jobs/acme-corp-senior-node-js-developer</guid>
      <link>https://weworkremotely.com/remote-jobs/acme-corp-senior-node-js-developer</link>
    </item>
    <item>
      <title><![CDATA[Widgets & Co: React Engineer]]></title>
      <region>USA Only</region>
      <description><![CDATA[<p>CDATA description with <b>markup</b>.</p>]]></description>
      <pubDate>not a real date</pubDate>
      <link>https://weworkremotely.com/remote-jobs/widgets-co-react-engineer</link>
    </item>
    <item>
      <title>Malformed: No Link Here</title>
      <region>Anywhere in the World</region>
    </item>
    <item>
      <title>Acme Corp: Senior Node.js Developer (duplicate)</title>
      <link>https://weworkremotely.com/remote-jobs/acme-corp-senior-node-js-developer</link>
    </item>
  </channel>
</rss>`;

describe("parseFeedItems", () => {
  const jobs = parseFeedItems(FIXTURE);

  test("parses valid items and skips the malformed (link-less) one", () => {
    expect(jobs.length).toBe(3); // dedupe happens later; malformed item dropped
    expect(jobs.map((j) => j.id)).toEqual([
      "acme-corp-senior-node-js-developer",
      "widgets-co-react-engineer",
      "acme-corp-senior-node-js-developer",
    ]);
  });

  test("splits 'Company: Role' titles", () => {
    expect(jobs[0].company).toBe("Acme Corp");
    expect(jobs[0].title).toBe("Senior Node.js Developer");
  });

  test("parses region, category, type and ISO date", () => {
    expect(jobs[0].location).toBe("Anywhere in the World");
    expect(jobs[0].category).toBe("Back-End Programming");
    expect(jobs[0].type).toBe("Full-Time");
    expect(jobs[0].date).toBe("2026-07-08");
  });

  test("splits skills list and strips the Oxford 'and'", () => {
    expect(jobs[0].skills).toEqual(["Node.js", "TypeScript", "PostgreSQL"]);
  });

  test("strips emoji flags from countries", () => {
    expect(jobs[0].countries).toEqual([
      "Dominican Republic",
      "United States of America",
      "Germany",
    ]);
  });

  test("double-decodes the entity-encoded HTML description and keeps breaks", () => {
    expect(jobs[0].description).toContain("First paragraph & more.");
    expect(jobs[0].description).toContain("- Bullet one");
    expect(jobs[0].description).not.toContain("<p>");
  });

  test("handles CDATA in title and description without entity decoding", () => {
    expect(jobs[1].company).toBe("Widgets & Co");
    expect(jobs[1].title).toBe("React Engineer");
    expect(jobs[1].description).toBe("CDATA description with markup.");
  });

  test("missing optional fields are null, never omitted", () => {
    expect(jobs[1].skills).toBeNull();
    expect(jobs[1].countries).toBeNull();
    expect(jobs[1].category).toBeNull();
    expect(jobs[1].type).toBeNull();
    expect(jobs[1].date).toBeNull(); // unparseable pubDate
  });

  test("dedupeByUrl keeps the first occurrence", () => {
    const deduped = dedupeByUrl(jobs);
    expect(deduped.length).toBe(2);
    expect(deduped[0].title).toBe("Senior Node.js Developer");
  });
});

describe("helper functions", () => {
  test("splitTitle without a colon yields null company", () => {
    expect(splitTitle("Just A Role")).toEqual({ company: null, role: "Just A Role" });
  });

  test("splitList returns null for empty input", () => {
    expect(splitList(null)).toBeNull();
    expect(splitList("")).toBeNull();
  });

  test("stripFlags removes regional indicator pairs", () => {
    expect(stripFlags("\u{1F1E9}\u{1F1F4} Dominican Republic")).toBe("Dominican Republic");
  });

  test("decodeEntities handles named and numeric references", () => {
    expect(decodeEntities("&amp;&lt;&gt;&quot;&#39;&#233;&#xE9;")).toBe("&<>\"'éé");
  });

  test("htmlToText collapses blank lines to paragraph breaks", () => {
    expect(htmlToText("<p>One</p>\n\n\n<p>Two</p>")).toBe("One\n\nTwo");
  });

  test("parsePubDate handles valid and invalid input", () => {
    expect(parsePubDate("Wed, 08 Jul 2026 15:28:25 +0000").iso).toBe("2026-07-08");
    expect(parsePubDate("garbage").iso).toBeNull();
    expect(parsePubDate(null).ms).toBeNull();
  });

  test("slugFromUrl and normalizeId accept slugs and URLs", () => {
    const url = "https://weworkremotely.com/remote-jobs/acme-corp-senior-node-js-developer";
    expect(slugFromUrl(url)).toBe("acme-corp-senior-node-js-developer");
    expect(normalizeId(url)).toBe("acme-corp-senior-node-js-developer");
    expect(normalizeId("acme-corp-senior-node-js-developer")).toBe(
      "acme-corp-senior-node-js-developer"
    );
    expect(normalizeId("not a slug!!")).toBeNull();
  });
});
