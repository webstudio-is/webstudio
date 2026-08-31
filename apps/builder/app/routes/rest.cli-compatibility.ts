import { json } from "@remix-run/server-runtime";
import { bundleVersion } from "@webstudio-is/protocol";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";

export const loader = () =>
  json({ bundleVersion }, { headers: privateNoStoreResponseHeaders });
