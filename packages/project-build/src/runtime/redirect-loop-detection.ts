import type { PageRedirect } from "@webstudio-is/sdk";
import {
  doesRedirectSourceMatchLocalUrl,
  getRedirectSourcePathname,
  normalizeRedirectSource,
} from "./redirect-source";

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

export const wouldCreateLoop = (
  fromPath: string,
  toPath: string,
  existingRedirects: PageRedirect[]
): boolean => {
  const source = normalizeRedirectSource(fromPath);
  const target = resolveLocalTarget(source, toPath);

  if (target === undefined) {
    return false;
  }

  if (doesRedirectSourceMatchLocalUrl(source, target)) {
    return true;
  }

  const redirectEntries = existingRedirects.map((redirect) => {
    const redirectSource = normalizeRedirectSource(redirect.old);
    return {
      source: redirectSource,
      target: resolveLocalTarget(redirectSource, redirect.new),
    };
  });

  const visited = new Set<string>([source]);
  let current = target;

  while (current) {
    if (doesRedirectSourceMatchLocalUrl(source, current)) {
      return true;
    }

    if (visited.has(current)) {
      return true;
    }

    visited.add(current);

    let next: string | undefined;
    for (const redirect of redirectEntries) {
      if (doesRedirectSourceMatchLocalUrl(redirect.source, current)) {
        next = redirect.target;
        break;
      }
    }
    if (next === undefined) {
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

export const detectLoopsInBatch = (
  newRedirects: PageRedirect[],
  existingRedirects: PageRedirect[]
): BatchLoopResult => {
  const valid: PageRedirect[] = [];
  const looped: LoopedRedirect[] = [];
  const currentRedirects = [...existingRedirects];

  for (const redirect of newRedirects) {
    if (wouldCreateLoop(redirect.old, redirect.new, currentRedirects)) {
      looped.push({
        redirect,
        reason: "Creates redirect loop",
      });
    } else {
      valid.push(redirect);
      currentRedirects.push(redirect);
    }
  }

  return { valid, looped };
};
