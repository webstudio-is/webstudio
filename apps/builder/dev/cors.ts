import type { IncomingMessage } from "node:http";
import type { CorsOptions } from "vite";
import {
  getAuthorizationServerOrigin,
  isBuilderUrl,
} from "../app/shared/router-utils/origins";

export const builderDevCors = (
  req: IncomingMessage,
  callback: (error: Error | null, options: CorsOptions | null) => void
) => {
  // Handle CORS preflight requests in development to mimic Remix production behavior
  if (req.method === "OPTIONS" || req.method === "POST") {
    if (req.headers.origin != null && req.url != null) {
      const url = new URL(req.url, `https://${req.headers.host}`);

      if (url.pathname === "/rest/page-copy/content") {
        // The grant endpoint owns its credentialless CORS response.
        return callback(null, { origin: false });
      }
      // Allow CORS for /builder-logout path when requested from the authorization server
      if (url.pathname === "/builder-logout" && isBuilderUrl(url.href)) {
        return callback(null, {
          origin: getAuthorizationServerOrigin(url.href),
          preflightContinue: false,
          credentials: true,
        });
      }
    }

    if (req.method === "OPTIONS") {
      // Respond with method not allowed for other preflight requests
      return callback(null, {
        preflightContinue: false,
        optionsSuccessStatus: 405,
      });
    }
  }

  // Disable CORS for all other requests
  return callback(null, {
    origin: false,
  });
};
