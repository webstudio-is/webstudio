import { createCookie } from "@remix-run/node";
import { compareUrls } from "~/shared/router-utils";

// https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Cookies#name
export const returnToCookie = createCookie("__Host-_returnTo", {
  path: "/",
  httpOnly: true,
  sameSite: "lax",
  // Set the expiration to 5 minutes as it is unnecessary to retain the cookie for a longer duration.
  maxAge: 60 * 5,
  secure: true,
});

export const returnToPath = async (
  request: Request
): Promise<string | null> => {
  const returnTo = await returnToCookie.parse(request.headers.get("Cookie"));

  if (returnTo === null || typeof returnTo === "string") {
    return returnTo;
  }
  return null;
};

export const isRedirectResponse = (response: Response) => {
  return (
    response.status >= 300 &&
    response.status < 400 &&
    response.headers.get("Location") !== null
  );
};

export const clearReturnToCookie = async (
  request: Request,
  response: Response
) => {
  const returnTo = await returnToPath(request);

  if (returnTo === null) {
    return response;
  }

  if (false === isRedirectResponse(response)) {
    return response;
  }

  if (false === compareUrls(returnTo, response.headers.get("Location")!)) {
    return response;
  }

  const resultResponse = new Response(response.body, response);
  resultResponse.headers.append(
    "Set-Cookie",
    await returnToCookie.serialize(null, { maxAge: -1 })
  );
  return resultResponse;
};
