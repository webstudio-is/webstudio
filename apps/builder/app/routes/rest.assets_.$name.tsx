import { z } from "zod";
import type { ActionFunctionArgs } from "@remix-run/server-runtime";
import type { Asset } from "@webstudio-is/sdk";
import { uploadFile } from "@webstudio-is/asset-uploader/index.server";
import type { ActionData } from "~/builder/shared/assets";
import { createAssetClient } from "~/shared/asset-client";
import { createContext } from "~/shared/context.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { checkCsrf } from "~/services/csrf-session.server";
import { parseError } from "~/shared/error/error-parse";

const UrlBody = z.object({
  url: z.string(),
});

export const action = async (
  props: ActionFunctionArgs
): Promise<ActionData | Array<Asset> | undefined> => {
  preventCrossOriginCookie(props.request);
  await checkCsrf(props.request);

  const { request, params } = props;

  // await new Promise((resolve) => setTimeout(resolve, 20000));

  if (params.name === undefined) {
    throw new Error("Name is undefined");
  }

  try {
    if (request.method === "POST" && request.body !== null) {
      let body = request.body;

      const contentType = request.headers.get("Content-Type");

      if (contentType?.includes("application/json")) {
        const { url } = UrlBody.parse(await request.json());
        const imageRequest = await fetch(url, {
          method: "GET",
          headers: {
            // Image formats we support
            Accept:
              "image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/x-icon,image/ico",
          },
        });

        if (false === imageRequest.ok) {
          const error = await imageRequest.text();
          const errors = `An error occurred while fetching the image at ${url}: ${error.slice(0, 500)}`;
          throw new Error(errors);
        }

        if (imageRequest.body === null) {
          throw new Error(
            `An error occurred while fetching the image at ${url}: Image body is null`
          );
        }

        body = imageRequest.body;
      }

      const url = new URL(request.url);
      const contentTypeArr = contentType?.split(";")[0]?.split("/") ?? [];

      const format =
        contentTypeArr[0] === "video" ? contentTypeArr[1] : undefined;

      const width = url.searchParams.has("width")
        ? Number.parseInt(url.searchParams.get("width")!, 10)
        : undefined;
      const height = url.searchParams.has("height")
        ? Number.parseInt(url.searchParams.get("height")!, 10)
        : undefined;

      const assetInfoFallback =
        height !== undefined && width !== undefined && format !== undefined
          ? { width, height, format }
          : undefined;

      const context = await createContext(request);
      const asset = await uploadFile(
        params.name,
        body,
        createAssetClient(),
        context,
        assetInfoFallback
      );
      return {
        uploadedAssets: [asset],
      };
    }
  } catch (error) {
    console.error(error);

    return {
      errors: parseError(error).message,
    };
  }
};
