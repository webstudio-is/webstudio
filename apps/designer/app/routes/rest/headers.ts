import { LoaderFunction } from "@remix-run/node";

export const loader: LoaderFunction = async ({ request }) => {
  // eslint-disable-next-line no-console
  console.log("TEST LOG");
  return { headers: [...request.headers.entries()] };
};
