import { redirect } from "@remix-run/server-runtime";
import { dashboardPath } from "~/shared/router-utils";

// This is the builder path in the next PR
export const loader = async () => {
  throw redirect(dashboardPath());
};
