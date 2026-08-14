import assert from "node:assert/strict";
import test from "node:test";
import { parseResponsePayload } from "./api.js";

test("accepts a 204 response with an empty JSON body", async () => {
  const response = new Response(null, {
    status: 204,
    headers: { "content-type": "application/json" },
  });

  assert.equal(await parseResponsePayload(response), null);
});

test("accepts an empty successful JSON response", async () => {
  const response = new Response("", {
    status: 200,
    headers: { "content-type": "application/json" },
  });

  assert.equal(await parseResponsePayload(response), null);
});

test("parses a non-empty JSON response", async () => {
  const response = new Response(JSON.stringify({ uploaded: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

  assert.deepEqual(await parseResponsePayload(response), { uploaded: true });
});
