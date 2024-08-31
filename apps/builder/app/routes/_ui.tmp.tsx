import { useLoaderData, type ClientLoaderFunctionArgs } from "@remix-run/react";
import { json, type LoaderFunctionArgs } from "@remix-run/server-runtime";

const generateToken = () => {
  return "super-secret-csrf-token";
};

export const loader = ({ request }: LoaderFunctionArgs) => {
  const csrf =
    request.headers.get("sec-fetch-mode") === "navigate"
      ? generateToken()
      : "fake-csrf-token";

  const headers = new Headers();
  headers.set("Set-Cookie", `csrf=${csrf}; Path=/; HttpOnly`);

  return json({ hello: "world", csrf }, { headers });
};

export const headers = () => {
  return {
    "Cache-Control": "no-store",
  };
};

export const clientLoader = async ({
  serverLoader,
}: ClientLoaderFunctionArgs) => {
  const serverData = await serverLoader<typeof loader>();

  console.log("FIRST-TOKEN-IS-REAL", serverData.csrf);

  // Hide real CSRF token window.__remixContext
  serverData.csrf = "set-to-any-shit";
  return serverData;
};

clientLoader.hydrate = true;

export default function Test() {
  const data = useLoaderData<typeof loader>();
  return <div>Test {data.hello}</div>;
}
