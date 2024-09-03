type Destinations = RequestDestination | "empty";

/**
 * Prevent loaders of iframe injections like `<iframe src="/rest/data/98b712e5-247c-448d-b68c-8c1681125998">`
 * or even cross domain injections like `<iframe src="https://example.com">`
 *
 * - document: The request is intended to obtain a document or an embedded resource.
 * - empty: The request is intended to obtain a resource that is not associated with a document i.e. fetch etc
 * - iframe: The request is intended to obtain a resource that is to be embedded in an iframe.
 *
 * IMPORTANT!!!: In most cases must be used in loaders only.
 **/
export const allowedDestinations = (
  request: Request,
  destinations: Destinations[]
) => {
  const destination = request.headers.get("sec-fetch-dest");

  if (destination === null) {
    return;
  }

  if (destinations.includes(destination as Destinations)) {
    return;
  }

  throw new Response(null, {
    status: 403,
    statusText: `Forbidden: Destination ${destination} not allowed`,
  });
};

export const isFetchDestination = (request: Request) => {
  return request.headers.get("sec-fetch-dest") === "empty";
};
