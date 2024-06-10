import type { ActionFunctionArgs } from "@remix-run/server-runtime";
import type { Asset } from "@webstudio-is/sdk";
import { uploadFile } from "@webstudio-is/asset-uploader/index.server";
import type { ActionData } from "~/builder/shared/assets";
import { createAssetClient } from "~/shared/asset-client";
import { z } from "zod";

const UrlBody = z.object({
  url: z.string(),
});

export const action = async (
  props: ActionFunctionArgs
): Promise<ActionData | Array<Asset> | undefined> => {
  const { request, params } = props;

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

      const asset = await uploadFile(params.name, body, createAssetClient());
      return {
        uploadedAssets: [asset],
      };
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error({ error });
      return {
        errors: error.message,
      };
    }
  }
};
