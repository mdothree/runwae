// RUNWAE-NEW-TERMS-CLICK-SUBMITS + RUNWAE-NEW-UNLABELLED-NAV regressions (coverage fixers 2026-10-18).
// Run: node --test tests/a11y/coverage-misc-nav-terms.test.mjs   (no dependencies)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (f) => readFileSync(join(root, f), "utf8");

test("signup: the Terms label is a plain checkbox label (no link or button inside it)", () => {
  const s = read("login.html");
  const m = s.match(/<label[^>]*>((?:(?!<\/label>)[\s\S])*id="termsCheckbox"(?:(?!<\/label>)[\s\S])*)<\/label>/);
  assert.ok(m, "terms checkbox label not found");
  assert.ok(!/<a\b|<button\b/i.test(m[1]), "the Terms label must not contain a link or a button");
  const link = s.match(/<a\b[^>]*href="\/?terms"[^>]*>/);
  assert.ok(link, "a link to /terms must remain on the signup form");
  assert.ok(!/type="submit"|role="button"/.test(link[0]), "the /terms link must not be a submit control");
  assert.ok(/target="_blank"/.test(link[0]) && /rel="noopener"/.test(link[0]), "the /terms link opens in a new tab");
  const btn = s.match(/<button[^>]*id="btnSignUp"[^>]*>/)[0];
  assert.ok(/type="button"/.test(btn), "Sign Up stays a type=button control");
});

const PAGES = ["account.html", "explore.html", "profile.html", "messages.html", "notifications.html", "gig.html"];
for (const page of PAGES) {
  test(`${page}: every icon-only header control has an accessible name and a tooltip`, () => {
    const s = read(page);
    const header = s.slice(s.indexOf('<header class="header" id="site-header"'), s.indexOf("</header>"));
    const block = header.slice(header.indexOf('class="control-block"'));
    const opens = [...block.matchAll(/<(div|a)\b[^>]*class="control-icon[^"]*"[^>]*>/g)].map((m) => m[0]);
    assert.ok(opens.length >= 5, `expected >= 5 header controls, found ${opens.length}`);
    for (const o of opens) {
      assert.ok(/aria-label="[^"]+"/.test(o), `unlabelled control: ${o}`);
      assert.ok(/title="[^"]+"/.test(o), `control without a tooltip: ${o}`);
    }
    const shop = opens.find((o) => /Shop/.test(o));
    assert.ok(shop && /^<a\b/.test(shop) && /href="explore"/.test(shop), "desktop shop control is a real link to explore");
  });

  test(`${page}: mobile header tabs are labelled and the shop tab is not a no-op`, () => {
    const s = read(page);
    const i = s.indexOf('id="site-header-responsive"');
    const mob = s.slice(i, s.indexOf("</ul>", i));
    const links = [...mob.matchAll(/<a\b[^>]*class="nav-link[^"]*"[^>]*>/g)].map((m) => m[0]);
    assert.ok(links.length >= 4, `expected >= 4 mobile tabs, found ${links.length}`);
    for (const l of links) assert.ok(/aria-label="[^"]+"/.test(l), `unlabelled mobile tab: ${l}`);
    const shop = links.find((l) => /Shop/.test(l));
    assert.ok(shop && /href="explore"/.test(shop) && !/href="#"/.test(shop), "mobile shop tab links to explore");
  });
}
