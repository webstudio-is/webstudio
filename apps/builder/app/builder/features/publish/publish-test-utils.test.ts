import { expect, test } from "vitest";
import { createTrpcInterceptor } from "./publish-test-utils";

const requestUrl = "/trpc/api.publish.getJob?input=%7B%220%22%3Anull%7D";

test("reports an unexpected procedure instead of treating it as a network failure", async () => {
  const interceptor = createTrpcInterceptor({});
  interceptor.start();
  try {
    await expect(fetch(requestUrl)).rejects.toThrow();
  } finally {
    expect(() => interceptor.stop()).toThrow("Unexpected request");
  }
});

test("preserves an HTTP error response from a procedure", async () => {
  const interceptor = createTrpcInterceptor({
    "api.publish.getJob": () =>
      new Response(JSON.stringify({ error: { message: "Unavailable" } }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }),
  });
  interceptor.start();
  try {
    const response = await fetch(requestUrl);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: { message: "Unavailable" },
    });
  } finally {
    interceptor.stop();
  }
});

test("rejects unsupported request methods", async () => {
  const interceptor = createTrpcInterceptor({
    "api.publish.getJob": () => ({ status: "success" }),
  });
  interceptor.start();
  try {
    await fetch("/trpc/api.publish.getJob", {
      method: "PUT",
      body: JSON.stringify({ "0": null }),
    }).catch(() => {});
  } finally {
    expect(() => interceptor.stop()).toThrow("Unexpected request method");
  }
});

test("rejects an invalid tRPC batch envelope", async () => {
  const interceptor = createTrpcInterceptor({
    "api.publish.getJob": () => ({ status: "success" }),
  });
  interceptor.start();
  try {
    await expect(
      fetch("/trpc/api.publish.getJob?input=null")
    ).rejects.toThrow();
  } finally {
    expect(() => interceptor.stop()).toThrow("Unexpected request input");
  }
});
