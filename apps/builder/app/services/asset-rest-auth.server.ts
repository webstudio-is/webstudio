/**
 * Browser mutations use cookie authentication and therefore require CSRF
 * validation. API clients authenticate explicitly with a project share token.
 * Keep this decision shared so every mutable Assets REST operation has the same
 * authentication behavior.
 */
export const requiresAssetMutationCsrf = (request: Request) =>
  request.headers.has("x-auth-token") === false;
