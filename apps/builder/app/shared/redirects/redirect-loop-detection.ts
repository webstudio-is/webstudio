import type { PageRedirect } from "@webstudio-is/sdk";
import {
  doesRedirectSourceMatchUrl,
  getRedirectSourcePathname,
  getRedirectSourceSearchIndex,
  isRedirectSourcePattern,
  normalizeRedirectSource,
} from "./redirect-source";
import { matchPath } from "@remix-run/react";

export const LOOP_ERROR = "This redirect would create a loop";

const isExternalTarget = (path: string) => {
  return /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(path) || path.startsWith("//");
};

const resolveLocalTarget = (source: string, target: string) => {
  if (isExternalTarget(target) || target.startsWith("#")) {
    return;
  }

  if (target.startsWith("/")) {
    return normalizeRedirectSource(target);
  }

  try {
    const resolved = new URL(
      target,
      `https://example.com${getRedirectSourcePathname(source)}`
    );
    return normalizeRedirectSource(`${resolved.pathname}${resolved.search}`);
  } catch {
    return;
  }
};

const doesRedirectSourceMatchLocalUrl = (source: string, url: string) => {
  const normalizedSource = normalizeRedirectSource(source);
  const normalizedUrl = normalizeRedirectSource(url);
  if (getRedirectSourceSearchIndex(normalizedSource) !== -1) {
    return normalizedSource === normalizedUrl;
  }
  if (isRedirectSourcePattern(normalizedSource) === false) {
    return doesRedirectSourceMatchUrl(normalizedSource, normalizedUrl);
  }
  return (
    matchPath(
      {
        path: normalizedSource,
        caseSensitive: true,
        end: true,
      },
      getRedirectSourcePathname(normalizedUrl)
    ) !== null
  );
};

/**
 * Checks if adding a redirect from `fromPath` to `toPath` would create a loop
 * given the existing redirects.
 *
 * A loop occurs when following the redirect chain eventually leads back to fromPath.
 */
export const wouldCreateLoop = (
  fromPath: string,
  toPath: string,
  existingRedirects: PageRedirect[]
): boolean => {
  const source = normalizeRedirectSource(fromPath);
  const target = resolveLocalTarget(source, toPath);

  // External URLs can't create loops (they leave the site)
  if (target === undefined) {
    return false;
  }

  // Self-redirect is always a loop
  if (doesRedirectSourceMatchLocalUrl(source, target)) {
    return true;
  }

  // Keep normalized sources so exact-query and path-only matching can follow
  // the same semantics as the published runtime.
  const redirectEntries = existingRedirects.map((redirect) => {
    const redirectSource = normalizeRedirectSource(redirect.old);
    return {
      source: redirectSource,
      target: resolveLocalTarget(redirectSource, redirect.new),
    };
  });

  // Follow the chain from toPath and check if we reach fromPath
  const visited = new Set<string>([source]);
  let current = target;

  while (current) {
    // Found a loop back to the source
    if (doesRedirectSourceMatchLocalUrl(source, current)) {
      return true;
    }

    // Cycle detected in existing redirects (defensive)
    if (visited.has(current)) {
      return true;
    }

    visited.add(current);

    // Get next hop
    let next: string | undefined;
    for (const redirect of redirectEntries) {
      if (doesRedirectSourceMatchLocalUrl(redirect.source, current)) {
        next = redirect.target;
        break;
      }
    }
    if (!next) {
      // Chain ends without looping back
      return false;
    }

    current = next;
  }

  return false;
};

export type LoopedRedirect = {
  redirect: PageRedirect;
  reason: string;
};

export type BatchLoopResult = {
  valid: PageRedirect[];
  looped: LoopedRedirect[];
};

/**
 * Detects loops in a batch of new redirects, checking both:
 * 1. Loops within the new set itself
 * 2. Loops that would form with existing redirects
 *
 * Processes redirects in order, adding valid ones to the check map
 * so subsequent redirects are checked against the growing set.
 */
export const detectLoopsInBatch = (
  newRedirects: PageRedirect[],
  existingRedirects: PageRedirect[]
): BatchLoopResult => {
  const valid: PageRedirect[] = [];
  const looped: LoopedRedirect[] = [];

  // Start with existing redirects
  const currentRedirects = [...existingRedirects];

  for (const redirect of newRedirects) {
    if (wouldCreateLoop(redirect.old, redirect.new, currentRedirects)) {
      looped.push({
        redirect,
        reason: "Creates redirect loop",
      });
    } else {
      valid.push(redirect);
      // Add to current set so subsequent redirects check against it
      currentRedirects.push(redirect);
    }
  }

  return { valid, looped };
};
