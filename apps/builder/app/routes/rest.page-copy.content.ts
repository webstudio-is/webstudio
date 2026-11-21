import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from "@remix-run/server-runtime";
import {
  handlePageCopyRoute,
  loadPageCopyRoute,
} from "~/services/page-copy-content-route.server";

export const loader = (args: LoaderFunctionArgs) => loadPageCopyRoute(args);

export const action = (args: ActionFunctionArgs) => handlePageCopyRoute(args);
