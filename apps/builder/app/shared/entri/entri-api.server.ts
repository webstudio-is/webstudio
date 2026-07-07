import { z } from "zod";
import env from "~/env/env.server";

const entryResponse = z.object({
  auth_token: z.string(),
});

/**
 * Short lived JWT token for Entri API
 *  https://developers.entri.com/docs/install#3-fetch-the-json-web-token-jwt
 */
const getEntriToken = async () => {
  const { ENTRI_APPLICATION_ID, ENTRI_SECRET } = env;

  if (ENTRI_SECRET === undefined) {
    throw new Error(`ENTRI_SECRET is not defined`);
  }

  const response = await fetch("https://api.goentri.com/token", {
    method: "POST",
    body: JSON.stringify({
      // These values come from the Entri dashboard
      applicationId: ENTRI_APPLICATION_ID,
      secret: ENTRI_SECRET,
    }),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  if (response.ok === false) {
    throw new Error(`Entri API error: ${await response.text()}`);
  }

  const entryJson = await response.json();
  const responseData = entryResponse.parse(entryJson);

  return {
    token: responseData.auth_token,
    applicationId: ENTRI_APPLICATION_ID,
  } as const;
};

export const entryApi = {
  getEntriToken,
};
