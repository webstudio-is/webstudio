import { expect, test } from "vitest";
import { generateCurl, parseCurl, type CurlRequest } from "./curl";

test("support url", () => {
  const result = {
    url: "https://my-url/hello-world",
    method: "get",
    headers: [],
  };
  expect(parseCurl(`curl https://my-url/hello-world`)).toEqual(result);
  expect(parseCurl(`curl "https://my-url/hello-world"`)).toEqual(result);
  expect(parseCurl(`curl 'https://my-url/hello-world'`)).toEqual(result);
});

test("support multiline command with backslashes", () => {
  expect(
    parseCurl(`curl \\
      'https://my-url/hello-world'
  `)
  ).toEqual({
    url: "https://my-url/hello-world",
    method: "get",
    headers: [],
  });
});

test("forgive missing closed quotes", () => {
  expect(parseCurl(`curl "https://my-url/hello-world`)).toEqual({
    url: "https://my-url/hello-world",
    method: "get",
    headers: [],
  });
});

test("skip when invalid", () => {
  expect(parseCurl(``)).toEqual(undefined);
  expect(parseCurl(`  `)).toEqual(undefined);
  expect(parseCurl(`something else`)).toEqual(undefined);
  expect(parseCurl(`curl`)).toEqual(undefined);
  expect(parseCurl(`curl `)).toEqual(undefined);
});

test("support method with --request and -X flags", () => {
  const result = {
    url: "https://my-url/hello-world",
    method: "post",
    headers: [],
  };
  expect(parseCurl(`curl --request post https://my-url/hello-world`)).toEqual(
    result
  );
  expect(parseCurl(`curl https://my-url/hello-world -X POST`)).toEqual(result);
  expect(
    parseCurl(`curl --request put https://my-url/hello-world -X post`)
  ).toEqual(result);
  expect(
    parseCurl(`curl -X put https://my-url/hello-world --request post`)
  ).toEqual(result);
});

test("support --get and -G flags", () => {
  expect(
    parseCurl(`curl --get https://my-url --data limit=3 --data first=0`)
  ).toEqual({
    url: "https://my-url?limit=3&first=0",
    method: "get",
    headers: [],
  });
  expect(parseCurl(`curl -G https://my-url -d limit=3 -d first=0`)).toEqual({
    url: "https://my-url?limit=3&first=0",
    method: "get",
    headers: [],
  });
  expect(
    parseCurl(`curl -G https://my-url?filter=1 -d limit=3 -d first=0`)
  ).toEqual({
    url: "https://my-url?filter=1&limit=3&first=0",
    method: "get",
    headers: [],
  });
});

test("support headers with --header and -H flags", () => {
  expect(
    parseCurl(`curl https://my-url/hello-world --header "name: value"`)
  ).toEqual({
    url: "https://my-url/hello-world",
    method: "get",
    headers: [{ name: "name", value: "value" }],
  });
  expect(parseCurl(`curl https://my-url/hello-world -H "name: value"`)).toEqual(
    {
      url: "https://my-url/hello-world",
      method: "get",
      headers: [{ name: "name", value: "value" }],
    }
  );
  expect(
    parseCurl(
      `curl https://my-url/hello-world --header="name:value1" -H "name : value2"`
    )
  ).toEqual({
    url: "https://my-url/hello-world",
    method: "get",
    headers: [
      { name: "name", value: "value1" },
      { name: "name", value: "value2" },
    ],
  });
});

test("default to post method and urlencoded header when data is specified", () => {
  expect(
    parseCurl(`
      curl https://my-url \\\
        -d param=1 \\\
        --data param=2 \\\
        --data-ascii param=3 \\\
        --data-raw param=4
    `)
  ).toEqual({
    url: "https://my-url",
    method: "post",
    headers: [
      { name: "content-type", value: "application/x-www-form-urlencoded" },
    ],
    body: `param=1&param=2&param=3&param=4`,
  });
});

test("encode data for get request", () => {
  expect(
    parseCurl(`curl -G https://my-url --data-urlencode param=привет`)
  ).toEqual({
    url: "https://my-url?param=%D0%BF%D1%80%D0%B8%D0%B2%D0%B5%D1%82",
    method: "get",
    headers: [],
  });
});

test("encode data for post request", () => {
  expect(
    parseCurl(`curl https://my-url --data-urlencode param=привет`)
  ).toEqual({
    url: "https://my-url",
    method: "post",
    headers: [
      { name: "content-type", value: "application/x-www-form-urlencoded" },
    ],
    body: `param=%D0%BF%D1%80%D0%B8%D0%B2%D0%B5%D1%82`,
  });
});

test("support text body", () => {
  expect(
    parseCurl(`
      curl https://my-url/hello-world \\
        -H content-type:plain/text \\
        --data '{"param":"value"}'
    `)
  ).toEqual({
    url: "https://my-url/hello-world",
    method: "post",
    headers: [{ name: "content-type", value: "plain/text" }],
    body: `{"param":"value"}`,
  });
  expect(
    parseCurl(
      `curl https://my-url/hello-world -H content-type:plain/text -d '{"param":"value"}'`
    )
  ).toEqual({
    url: "https://my-url/hello-world",
    method: "post",
    headers: [{ name: "content-type", value: "plain/text" }],
    body: `{"param":"value"}`,
  });
});

test("support text body with explicit method", () => {
  expect(
    parseCurl(`
      curl https://my-url/hello-world \\
        -X put \\
        -H content-type:plain/text \\
        --data '{"param":"value"}'
    `)
  ).toEqual({
    url: "https://my-url/hello-world",
    method: "put",
    headers: [{ name: "content-type", value: "plain/text" }],
    body: `{"param":"value"}`,
  });
});

test("support json body", () => {
  expect(
    parseCurl(
      `curl https://my-url/hello-world --header 'content-type: application/json' --data '{"param":"value"}'`
    )
  ).toEqual({
    url: "https://my-url/hello-world",
    method: "post",
    headers: [{ name: "content-type", value: "application/json" }],
    body: { param: "value" },
  });
});

test("avoid failing on syntax error", () => {
  expect(parseCurl("curl \\")).toEqual(undefined);
});

test("generate curl with json body", () => {
  expect(
    generateCurl({
      url: "https://my-url.com",
      method: "post",
      headers: [{ name: "content-type", value: "application/json" }],
      body: { param: "value" },
    })
  ).toMatchInlineSnapshot(`
"curl "https://my-url.com" \\
  --request post \\
  --header "content-type: application/json" \\
  --data "{\\"param\\":\\"value\\"}""
`);
});

test("generate curl with text body", () => {
  expect(
    generateCurl({
      url: "https://my-url.com",
      method: "post",
      headers: [],
      body: "my data",
    })
  ).toMatchInlineSnapshot(`
"curl "https://my-url.com" \\
  --request post \\
  --data "my data""
`);
});

test("generate curl without body", () => {
  expect(
    generateCurl({
      url: "https://my-url.com",
      method: "post",
      headers: [],
    })
  ).toMatchInlineSnapshot(`
"curl "https://my-url.com" \\
  --request post"
`);
});

test("multiline graphql is idempotent", () => {
  const request: CurlRequest = {
    url: "https://eu-central-1-shared-euc1-02.cdn.hygraph.com/content/clorhpxi8qx7r01t6hfp1b5f6/master",
    method: "post",
    headers: [{ name: "Content-Type", value: "application/json" }],
    body: {
      query: `
        query Posts {
          posts {
            slug
            title
            updatedAt
            excerpt
          }
        }
      `,
    },
  };
  expect(parseCurl(generateCurl(request))).toEqual(request);
});

test("support basic http authentication", () => {
  expect(parseCurl(`curl https://my-url.com -u "user:password"`)).toEqual({
    url: "https://my-url.com",
    method: "get",
    headers: [
      {
        name: "Authorization",
        value: `Basic ${btoa("user:password")}`,
      },
    ],
  });
});
