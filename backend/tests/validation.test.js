import test from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeText,
  readText,
  isHoneypotTriggered,
  isValidObjectId,
  normalizeHttpUrl,
} from "../src/utils/validation.js";
import { escapeRegex } from "../src/utils/query.js";

test("Validation Utils - sanitizeText", () => {
  const dirty = "  <script>alert('xss')</script>Hello\x00 World!  ";
  const cleaned = sanitizeText(dirty);
  assert.equal(cleaned, "alert('xss')Hello World!");

  const multiline = "Line 1   \n\n\n\n   Line 2";
  const cleanedMultiline = sanitizeText(multiline, { multiline: true });
  assert.equal(cleanedMultiline, "Line 1\n\nLine 2");
});

test("Validation Utils - readText rejection of non-string injections", () => {
  const errors = {};
  const maliciousBody = { name: { $gt: "" } };
  const result = readText(maliciousBody, "name", errors, {
    label: "Name",
    required: true,
    min: 2,
    max: 50,
  });

  assert.equal(result, "");
  assert.equal(errors.name, "Name must be a string");
});

test("Validation Utils - isHoneypotTriggered", () => {
  assert.equal(isHoneypotTriggered({}), false);
  assert.equal(isHoneypotTriggered({ website: "" }), false);
  assert.equal(isHoneypotTriggered({ website: "https://spam.com" }), true);
});

test("Validation Utils - isValidObjectId", () => {
  assert.equal(isValidObjectId("507f1f77bcf86cd799439011"), true);
  assert.equal(isValidObjectId("invalid-id-string"), false);
  assert.equal(isValidObjectId(12345), false);
});

test("Validation Utils - normalizeHttpUrl", () => {
  assert.equal(
    normalizeHttpUrl("https://ashivamtechnologies.com"),
    "https://ashivamtechnologies.com/"
  );
  assert.equal(
    normalizeHttpUrl("ashivamtechnologies.com"),
    "https://ashivamtechnologies.com/"
  );
  assert.equal(normalizeHttpUrl("javascript:alert(1)"), null);
  assert.equal(normalizeHttpUrl("http://localhost"), null);
});

test("Query Utils - escapeRegex defends against ReDoS", () => {
  const maliciousPattern = ".*+?^${}()|[]\\";
  const escaped = escapeRegex(maliciousPattern);
  assert.equal(escaped, "\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\");

  const regex = new RegExp(escaped);
  assert.equal(regex.test(".*+?^${}()|[]\\"), true);
  assert.equal(regex.test("other text"), false);
});
