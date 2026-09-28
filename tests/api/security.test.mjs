import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cleanHeaderText,
  isValidEmail,
  parseCookies,
  parseJsonBody,
  parseRequestBody,
  sameOriginJsonGuard,
  timingSafeEqual,
} from "../../api/_security.js";

const post = (body, headers = {}) =>
  new Request("https://example.test/api/x", { method: "POST", headers, body });

test("parseJsonBody accepts a JSON object", async () => {
  assert.deepEqual(await parseJsonBody(post('{"a":1}')), { a: 1 });
  assert.deepEqual(await parseJsonBody(post("")), {});
});

test("parseJsonBody rejects valid JSON that is not an object with 400", async () => {
  for (const body of ["null", "[]", "[1,2]", "42", '"text"', "true"]) {
    await assert.rejects(parseJsonBody(post(body)), (err) => err.status === 400, body);
  }
});

test("parseJsonBody rejects malformed JSON (400) and oversized bodies (413)", async () => {
  await assert.rejects(parseJsonBody(post("{nope")), (err) => err.status === 400);
  await assert.rejects(parseJsonBody(post(JSON.stringify({ a: "x".repeat(50) })), 20), (err) => err.status === 413);
});

test("parseRequestBody rejects non-object JSON but still parses forms", async () => {
  await assert.rejects(
    parseRequestBody(post("null", { "content-type": "application/json" })),
    (err) => err.status === 400,
  );
  const form = await parseRequestBody(post("email=a%40b.co&name=Ann", { "content-type": "application/x-www-form-urlencoded" }));
  assert.equal(form.email, "a@b.co");
  assert.equal(form.name, "Ann");
});

test("sameOriginJsonGuard: same-origin JSON passes, text/plain is 415, cross-site is 403", async () => {
  assert.equal(sameOriginJsonGuard(post("{}", { "content-type": "application/json" })), null);
  assert.equal(sameOriginJsonGuard(post("{}", { "content-type": "application/json; charset=utf-8", "sec-fetch-site": "same-origin" })), null);
  assert.equal(sameOriginJsonGuard(post("{}", { "content-type": "text/plain;charset=UTF-8" })).status, 415);
  assert.equal(sameOriginJsonGuard(post("{}", { "content-type": "application/jsonp" })).status, 415);
  assert.equal(sameOriginJsonGuard(post("{}")).status, 415);
  const cross = sameOriginJsonGuard(post("{}", { "content-type": "application/json", "sec-fetch-site": "cross-site" }));
  assert.equal(cross.status, 403);
  assert.equal((await cross.json()).code, "cross_site");
});

test("cleanHeaderText removes CR, LF and other control characters", () => {
  assert.equal(cleanHeaderText("Ann\r\nBcc: evil@example.com", 200), "Ann Bcc: evil@example.com");
  assert.equal(cleanHeaderText("a\u2028b\u2029c\u0000d\u007fe\tf", 200), "a b c d e f");
  assert.equal(cleanHeaderText("  x  ", 200), "x");
  assert.equal(cleanHeaderText("abcdef", 3), "abc");
  assert.equal(cleanHeaderText(undefined, 10), "");
});

test("isValidEmail rejects whitespace and control characters", () => {
  assert.equal(isValidEmail("parent@example.com"), true);
  assert.equal(isValidEmail("parent@example.com\r\nBcc:x@y.z"), false);
  assert.equal(isValidEmail("par\u0000ent@example.com"), false);
  assert.equal(isValidEmail("no-at-sign.example.com"), false);
});

test("timingSafeEqual compares values of any length", async () => {
  assert.equal(await timingSafeEqual("secret-code", "secret-code"), true);
  assert.equal(await timingSafeEqual("secret-code", "secret-codf"), false);
  assert.equal(await timingSafeEqual("short", "a much longer value"), false);
  assert.equal(await timingSafeEqual("", ""), true);
});

test("parseCookies does not let a cookie named __proto__ touch the prototype", () => {
  const req = new Request("https://example.test/", { headers: { cookie: "__proto__=x; gms_session=abc" } });
  const cookies = parseCookies(req);
  assert.equal(cookies.gms_session, "abc");
  assert.equal(Object.getPrototypeOf(cookies), null);
  assert.equal({}.gms_session, undefined);
});
