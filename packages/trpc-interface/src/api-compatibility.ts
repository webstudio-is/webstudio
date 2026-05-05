import { z } from "zod";

export const apiCompatibilityErrorType = "webstudioApiCompatibilityError";

export const apiClientHeader = "x-webstudio-client";
export const apiClientVersionHeader = "x-webstudio-client-version";

export const ApiCompatibilityTarget = z.enum(["browser", "cli"]);
export type ApiCompatibilityTarget = z.infer<typeof ApiCompatibilityTarget>;

export const ApiClient = z.enum(["browser", "cli", "service"]);
export type ApiClient = z.infer<typeof ApiClient>;

const ApiCompatibilityAction = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("reloadBrowser"),
  }),
  z.object({
    type: z.literal("updateCli"),
  }),
]);

export const ApiCompatibilityPayload = z.object({
  type: z.literal(apiCompatibilityErrorType),
  reason: z.enum(["apiRouteNotFound", "apiProcedureNotFound"]),
  target: ApiCompatibilityTarget,
  message: z.string(),
  action: ApiCompatibilityAction,
});

export type ApiCompatibilityPayload = z.infer<typeof ApiCompatibilityPayload>;

export const createApiCompatibilityPayload = ({
  reason,
  target,
}: {
  reason: ApiCompatibilityPayload["reason"];
  target: ApiCompatibilityTarget;
}): ApiCompatibilityPayload => {
  if (target === "browser") {
    return {
      type: apiCompatibilityErrorType,
      reason,
      target,
      message: "This browser tab is out of date. Reload to continue.",
      action: { type: "reloadBrowser" },
    };
  }

  return {
    type: apiCompatibilityErrorType,
    reason,
    target,
    message:
      "This version of the Webstudio CLI is incompatible with the current API.",
    action: { type: "updateCli" },
  };
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const getApiCompatibilityPayload = (
  value: unknown
): ApiCompatibilityPayload | undefined => {
  const findPayload = (
    value: unknown,
    seen: WeakSet<object>
  ): ApiCompatibilityPayload | undefined => {
    const parsed = ApiCompatibilityPayload.safeParse(value);
    if (parsed.success) {
      return parsed.data;
    }

    if (isObject(value) === false) {
      return;
    }

    if (seen.has(value)) {
      return;
    }
    seen.add(value);

    if (Array.isArray(value)) {
      for (const item of value) {
        const payload = findPayload(item, seen);
        if (payload !== undefined) {
          return payload;
        }
      }
      return;
    }

    const candidates = [
      value.payload,
      value.error,
      value.data,
      isObject(value.data) ? value.data.apiCompatibility : undefined,
      isObject(value.shape) ? value.shape.data : undefined,
      isObject(value.shape) && isObject(value.shape.data)
        ? value.shape.data.apiCompatibility
        : undefined,
      value.cause,
    ];

    for (const candidate of candidates) {
      const payload = findPayload(candidate, seen);
      if (payload !== undefined) {
        return payload;
      }
    }
  };

  return findPayload(value, new WeakSet());
};
