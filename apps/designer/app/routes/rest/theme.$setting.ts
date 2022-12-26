import { json, type LoaderArgs } from "@remix-run/node";
import { themeCookieParser } from "~/shared/theme";

export const loader = async ({ params }: LoaderArgs) => {
  const { setting } = params;
  const headers = {
    "Set-Cookie": await themeCookieParser.serialize(setting),
  };
  return json({ setting }, { headers });
};
