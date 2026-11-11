/** Story-only HTTP boundary. Install before stories import clients that capture fetch. */
export type RequestFixture = (
  request: Request
) => Response | Promise<Response> | undefined;

const originalFetch = globalThis.fetch;
let fixture: RequestFixture | undefined;

globalThis.fetch = async (input, init) => {
  if (fixture === undefined) {
    return originalFetch(input, init);
  }
  const request = new Request(
    typeof input === "string" ? new URL(input, location.href) : input,
    init
  );
  const response = fixture(request);
  return response === undefined ? originalFetch(input, init) : response;
};

export const setRequestFixture = (next: RequestFixture) => {
  const previous = fixture;
  fixture = next;
  return () => {
    fixture = previous;
  };
};
