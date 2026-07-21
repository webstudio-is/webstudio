export const createLocalResourceRequest = (
  outerRequest: Request,
  input: string,
  init?: RequestInit
) => new Request(new URL(input, outerRequest.url), init);
