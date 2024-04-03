import { json, type LoaderFunctionArgs } from "@remix-run/server-runtime";
import { themeCookieParser } from "~/shared/theme";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { setting } = params;
  const headers = {
    "Set-Cookie": await themeCookieParser.serialize(setting),
  };
  return json({ setting }, { headers });
};
