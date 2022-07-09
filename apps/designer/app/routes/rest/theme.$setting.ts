import { json, type LoaderFunction } from "@remix-run/node";
import { themeCookieParser } from "~/shared/theme/index.server";

export const loader: LoaderFunction = async ({ params }) => {
  const { setting } = params;
  const headers = {
    "Set-Cookie": await themeCookieParser.serialize(setting),
  };
  return json({ setting }, { headers });
};
