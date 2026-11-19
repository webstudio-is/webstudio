import { expect, test } from "vitest";
import { createTrpcInterceptor } from "./trpc-test-utils";

const procedure = "api.publish.getJob";
const input = JSON.stringify({ 0: { projectId: "project-1", jobId: "job-1" } });
const encodedInput = encodeURIComponent(input);
const requestUrl = `/trpc/${procedure}?batch=1&input=${encodedInput}`;
const queries = { [procedure]: () => ({ status: "success" }) };

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
  const error = {
    message: "Publish job not found",
    code: -32004,
    data: { code: "NOT_FOUND", httpStatus: 404, path: procedure },
  };
  const interceptor = createTrpcInterceptor({
    GET: {
      [procedure]: () => Response.json([{ error }], { status: 404 }),
    },
  });
  interceptor.start();
  try {
    const response = await fetch(requestUrl);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual([{ error }]);
  } finally {
    interceptor.stop();
  }
});

test("rejects unsupported request methods", async () => {
  const interceptor = createTrpcInterceptor({
    GET: queries,
  });
  interceptor.start();
  try {
    await expect(
      fetch(`/trpc/${procedure}?batch=1`, {
        method: "PUT",
        body: input,
      })
    ).rejects.toThrow();
  } finally {
    expect(() => interceptor.stop()).toThrow("Unexpected request method");
  }
});

test.each([
  { name: "missing", flag: "" },
  { name: "incorrect", flag: "batch=0&" },
])("rejects a request with a $name batch flag", async ({ flag }) => {
  const interceptor = createTrpcInterceptor({
    GET: queries,
  });
  interceptor.start();
  try {
    await expect(
      fetch(`/trpc/${procedure}?${flag}input=${encodedInput}`)
    ).rejects.toThrow();
  } finally {
    expect(() => interceptor.stop()).toThrow("Unexpected request batch");
  }
});

test("rejects POST for a query procedure", async () => {
  const interceptor = createTrpcInterceptor({
    GET: queries,
  });
  interceptor.start();
  try {
    await expect(
      fetch(`/trpc/${procedure}?batch=1`, {
        method: "POST",
        body: input,
      })
    ).rejects.toThrow();
  } finally {
    expect(() => interceptor.stop()).toThrow("Unexpected request method");
  }
});

test("does not match inherited properties as procedures", async () => {
  const interceptor = createTrpcInterceptor({
    GET: queries,
  });
  interceptor.start();
  try {
    await expect(
      fetch(`/trpc/toString?batch=1&input=${encodedInput}`)
    ).rejects.toThrow();
  } finally {
    expect(() => interceptor.stop()).toThrow("Unexpected request: toString");
  }
});

test("rejects an invalid tRPC batch envelope", async () => {
  const interceptor = createTrpcInterceptor({
    GET: queries,
  });
  interceptor.start();
  try {
    await expect(
      fetch(`/trpc/${procedure}?batch=1&input=null`)
    ).rejects.toThrow();
  } finally {
    expect(() => interceptor.stop()).toThrow("Unexpected request input");
  }
});
