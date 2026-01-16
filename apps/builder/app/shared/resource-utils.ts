import hash from "@emotion/hash";
import type { ResourceRequest } from "@webstudio-is/sdk";

export const getResourceKey = (resource: ResourceRequest) => {
  try {
    return hash(
      JSON.stringify([
        // explicitly list all fields to keep hash stable
        resource.name,
        resource.method,
        resource.url,
        resource.searchParams,
        resource.headers,
        resource.body,
      ])
    );
  } catch {
    // guard from invalid resources
    return "";
  }
};
