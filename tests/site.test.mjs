import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import {
  travelNotes,
  travelYears,
  travelRange,
  selectTravelNotes,
  RECENT_COUNT,
} from "../data/travel.mjs";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

test("travel notes are unique, dated to month precision, and newest first", () => {
  assert.equal(travelNotes.length, 70);
  assert.equal(
    new Set(travelNotes.map((n) => `${n.country}|${n.place}|${n.start}`)).size,
    travelNotes.length,
  );
  for (const note of travelNotes) {
    assert.match(note.start, /^20\d{2}-(0[1-9]|1[0-2])$/);
    assert.ok(note.place && note.country && note.period);
  }
  assert.deepEqual(
    travelNotes.map((n) => n.start),
    travelNotes
      .map((n) => n.start)
      .sort()
      .reverse(),
  );
  assert.equal(travelNotes[0].place, "Trieste & Slovenia");
  assert.equal(travelRange, "2017–2026");
});

test("missing Swedish journeys are included and cross-year trips occur once", () => {
  const are = travelNotes.filter((n) => n.place === "Åre");
  assert.equal(are.length, 1);
  assert.equal(are[0].start, "2020-12");
  assert.match(are[0].period, /2020–January 2021/);
  assert.ok(selectTravelNotes("2020").visible.some((n) => n.place === "Åre"));
  assert.ok(!selectTravelNotes("2021").visible.some((n) => n.place === "Åre"));
  assert.ok(
    selectTravelNotes("2020").visible.some(
      (n) => n.place === "Central and northern road trip",
    ),
  );
  assert.ok(
    selectTravelNotes("2021").visible.some((n) => n.place === "Gotland"),
  );
  assert.equal(
    travelNotes.filter((n) => n.place === "New York City").length,
    1,
  );
  assert.ok(
    selectTravelNotes("2025").visible.some((n) => n.place === "New York City"),
  );
});

test("overlapping route notes are consolidated without deleting distinct repeat visits", () => {
  assert.equal(travelNotes.filter((n) => n.country === "Iceland").length, 1);
  assert.equal(travelNotes.filter((n) => n.country === "Mexico").length, 1);
  assert.equal(travelNotes.filter((n) => n.country === "Ireland").length, 1);
  assert.ok(
    travelNotes.some(
      (n) =>
        n.place === "Lombardy, Rome, Puglia & Gargano" && n.start === "2021-06",
    ),
  );
  assert.equal(
    travelNotes.filter(
      (n) => n.place === "Stockholm" && n.start.startsWith("2018"),
    ).length,
    2,
  );
});

test("recent/all/year views preserve chronology and exact year totals", () => {
  assert.equal(selectTravelNotes().visible.length, RECENT_COUNT);
  assert.equal(selectTravelNotes("all", true).visible.length, 70);
  const expected = {
    2026: 5,
    2025: 11,
    2024: 6,
    2023: 9,
    2022: 7,
    2021: 5,
    2020: 4,
    2019: 6,
    2018: 9,
    2017: 8,
  };
  assert.deepEqual(travelYears, Object.keys(expected).sort().reverse());
  for (const year of travelYears) {
    const { visible, matching } = selectTravelNotes(year);
    assert.equal(visible.length, expected[year]);
    assert.deepEqual(visible, matching);
    assert.ok(visible.every((n) => n.start.startsWith(year)));
  }
  assert.equal(selectTravelNotes("2099").visible.length, 0);
});

test("all internal links and locally referenced assets resolve", async () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, "Duplicate section id");
  for (const anchor of [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]))
    assert.ok(ids.includes(anchor), anchor);
  for (const anchor of [
    "top",
    "main",
    "about",
    "life",
    "launch",
    "friends",
    "passport",
    "things",
    "find-me",
  ])
    assert.ok(ids.includes(anchor));
  const references = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map(
    (m) => m[1],
  );
  references.push(
    ...[...css.matchAll(/url\(['"]?(assets\/[^'"\)]+)/g)].map((m) => m[1]),
  );
  for (const path of references.filter((r) => !r.startsWith("http")))
    await access(new URL("../" + path.split("?")[0], import.meta.url));
  for (const match of html.matchAll(/srcset="([^"]+)"/g)) {
    for (const candidate of match[1].split(","))
      await access(
        new URL("../" + candidate.trim().split(" ")[0], import.meta.url),
      );
  }
});

test("metadata, public links, and non-JavaScript disclosures remain available", () => {
  assert.match(html, /name="google-site-verification"/);
  assert.match(
    html,
    /rel="canonical"\s+href="https:\/\/ottopanciotto.github.io\/"/,
  );
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.equal((html.match(/class="friend-dossier"/g) || []).length, 11);
  assert.equal((html.match(/class="interest"/g) || []).length, 6);
  assert.match(html, /<noscript\b/);
  assert.match(html, new RegExp(`id="travel-total">${travelNotes.length}<`));
  for (const url of [
    "https://www.instagram.com/panciotto.otto",
    "https://t.me/otto_panciotto_diary",
    "https://github.com/ottopanciotto",
  ])
    assert.ok(html.includes(url));
  assert.doesNotMatch(
    html,
    /Today I launched|cloud-based brain|cloud brain era|192\.168\.|\/(?:home|Users)\/|@gmail\.com/i,
  );
});

test("every image reserves its dimensions and has an alt attribute", () => {
  for (const [image] of html.matchAll(/<img\b[^>]*>/g)) {
    assert.match(image, /\bwidth="\d+"/);
    assert.match(image, /\bheight="\d+"/);
    assert.match(image, /\balt="[^"]*"/);
  }
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(css, /fonts\.googleapis\.com|@import/);
});

function luminance(hex) {
  const rgb = hex
    .match(/[\da-f]{2}/gi)
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
test("text palette meets WCAG AA contrast on its surfaces", () => {
  for (const [fg, bg] of [
    ["24291e", "f7f1e5"],
    ["ae4120", "f7f1e5"],
    ["ae4120", "e8edda"],
    ["244ac0", "f7f1e5"],
    ["5d6359", "fffdf7"],
    ["5d6359", "e8edda"],
    ["d1d8e7", "172f55"],
    ["f5ca53", "172f55"],
    ["24291e", "ed7344"],
  ]) {
    const a = luminance(fg),
      b = luminance(bg),
      ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    assert.ok(ratio >= 4.5, `${fg} on ${bg}: ${ratio.toFixed(2)}`);
  }
});
