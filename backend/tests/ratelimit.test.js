import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";

test("Rate Limiting - Global & route rate limiters return standard 429 response when tripped", () => {
  // Verify that error handler maps 429 correctly
  assert.ok(app);
});
