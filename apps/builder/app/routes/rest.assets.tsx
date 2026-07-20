import { json, type ActionFunctionArgs } from "@remix-run/server-runtime";
import { createUploadTicket } from "@webstudio-is/asset-uploader/index.server";
import isValidFilename from "valid-filename";
import { createContext } from "~/shared/context.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { checkCsrf } from "~/services/csrf-session.server";
import { parseError } from "~/shared/error/error-parse";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";

export const loader = async () => {
  return json(
    { errors: "Method not allowed" },
    { status: 405, headers: privateNoStoreResponseHeaders }
  );
};

export const action = async (props: ActionFunctionArgs) => {
  try {
    preventCrossOriginCookie(props.request);
    await checkCsrf(props.request);

    const { request } = props;

    const context = await createContext(request);

    if (request.method === "POST") {
      const formData = await request.formData();
      const projectId = formData.get("projectId");
      const type = formData.get("type");
      const filename = formData.get("filename");
      const displayFilename = formData.get("displayFilename");
      if (
        typeof projectId !== "string" ||
        typeof type !== "string" ||
        typeof filename !== "string" ||
        (displayFilename !== null &&
          (typeof displayFilename !== "string" ||
            isValidFilename(displayFilename) === false))
      ) {
        throw Error("Project id, type or filename are invalid");
      }
      const ticket = await createUploadTicket(
        {
          projectId,
          type,
          filename,
          displayFilename: displayFilename ?? undefined,
        },
        context
      );
      return json(ticket, { headers: privateNoStoreResponseHeaders });
    }

    return json(
      { errors: "Method not allowed" },
      { status: 405, headers: privateNoStoreResponseHeaders }
    );
  } catch (error) {
    console.error(error);

    return json(
      { errors: parseError(error).message },
      { headers: privateNoStoreResponseHeaders }
    );
  }
};
