import type { PageRedirect } from "@webstudio-is/sdk";

export const LOOP_ERROR = "This redirect would create a loop";

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
  // Self-redirect is always a loop
  if (fromPath === toPath) {
    return true;
  }

  // External URLs can't create loops (they leave the site)
  if (
    toPath.startsWith("http://") ||
    toPath.startsWith("https://") ||
    toPath.startsWith("//")
  ) {
    return false;
  }

  // Build a map for O(1) lookup
  const redirectMap = new Map<string, string>();
  for (const redirect of existingRedirects) {
    redirectMap.set(redirect.old, redirect.new);
  }

  // Follow the chain from toPath and check if we reach fromPath
  const visited = new Set<string>([fromPath]);
  let current = toPath;

  while (current) {
    // Found a loop back to the source
    if (current === fromPath) {
      return true;
    }

    // Cycle detected in existing redirects (defensive)
    if (visited.has(current)) {
      return true;
    }

    visited.add(current);

    // Get next hop
    const next = redirectMap.get(current);
    if (!next) {
      // Chain ends without looping back
      return false;
    }

    // External URL ends the chain
    if (
      next.startsWith("http://") ||
      next.startsWith("https://") ||
      next.startsWith("//")
    ) {
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
