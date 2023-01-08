import { ActionFunction } from "@remix-run/node";
import { createCssEngine } from "@webstudio-is/css-engine";
import {
  addGlobalRules,
  getPresetStyleRules,
  getStyleRules,
} from "@webstudio-is/project";
import { idAttribute } from "@webstudio-is/react-sdk";
import { Env } from "~/env";
import { buildSitesStorageKey } from "~/lib";

export const loader: ActionFunction = async ({ request, context }) => {
  try {
    const url = new URL(request.url);
    const env = context.env as Env;
    const domain = url.hostname.split(".")[0];
    const pageUrl = url.searchParams.get("pageUrl");
    const kvStoreName = buildSitesStorageKey(domain, pageUrl);
    const pageCache = await env.SITES.get(kvStoreName);
    if (!pageCache) {
      throw new Error(`Project ${kvStoreName} is not published yet.`);
    }
    const pageDataJson = JSON.parse(pageCache).page;
    const engine = createCssEngine();
    addGlobalRules(engine, pageDataJson);
    for (const breakpoint of pageDataJson.breakpoints) {
      engine.addMediaRule(breakpoint.id, breakpoint);
    }

    const presetStyleRules = getPresetStyleRules(
      pageDataJson.tree?.presetStyles
    );
    for (const { component, style } of presetStyleRules) {
      engine.addStyleRule(`[data-ws-component="${component}"]`, { style });
    }

    const styleRules = getStyleRules(pageDataJson.tree?.styles);
    for (const { breakpointId, instanceId, style } of styleRules) {
      engine.addStyleRule(`[${idAttribute}="${instanceId}"]`, {
        breakpoint: breakpointId,
        style,
      });
    }

    const { cssText } = engine;
    return new Response(cssText, {
      headers: {
        "Content-Type": "text/css",
        // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    // If a Response is thrown, we're rethrowing it for Remix to handle.
    // https://remix.run/docs/en/v1/api/conventions#throwing-responses-in-loaders
    if (error instanceof Response) {
      throw error;
    }

    return {
      errors: error instanceof Error ? error.message : String(error),
    };
  }
};
