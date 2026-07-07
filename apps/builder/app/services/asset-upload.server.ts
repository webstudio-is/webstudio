import { z } from "zod";
import { RESIZABLE_IMAGE_MIME_TYPES } from "@webstudio-is/sdk";

const urlBody = z.object({
  url: z.string(),
});

export const getBrowserUploadBody = async (
  request: Request,
  contentType: string | null
) => {
  let body = request.body;
  if (body === null) {
    throw new Error("Asset body is empty");
  }

  if (contentType?.includes("application/json")) {
    const jsonBody = await request.json();
    const urlParse = urlBody.safeParse(jsonBody);

    if (urlParse.success) {
      const { url } = urlParse.data;
      const imageRequest = await fetch(url, {
        method: "GET",
        headers: {
          Accept: RESIZABLE_IMAGE_MIME_TYPES.join(","),
        },
      });

      if (imageRequest.ok === false) {
        const error = await imageRequest.text();
        throw new Error(
          `An error occurred while fetching the image at ${url}: ${error.slice(0, 500)}`
        );
      }

      if (imageRequest.body === null) {
        throw new Error(
          `An error occurred while fetching the image at ${url}: Image body is null`
        );
      }

      body = imageRequest.body;
    } else {
      body = new Blob([JSON.stringify(jsonBody)], {
        type: "application/json",
      }).stream();
    }
  }

  return body;
};
