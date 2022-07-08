import { json, type LoaderFunction } from "@remix-run/node";
import { themeCookieParser } from "~/shared/theme/index.server";

export const loader: LoaderFunction = async ({ params }) => {
  const { option } = params;
  const headers = {
    "Set-Cookie": await themeCookieParser.serialize(option),
  };
  return json({ option }, { headers });
};
