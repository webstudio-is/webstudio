import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from "@remix-run/server-runtime";
import { handleStagedUploadRequest } from "~/services/staged-upload.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return await handleStagedUploadRequest(request);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  return await handleStagedUploadRequest(request);
};
