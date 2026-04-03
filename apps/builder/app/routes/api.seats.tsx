import { json, type ActionFunctionArgs } from "@remix-run/server-runtime";
import { z } from "zod";
import { createContext } from "~/shared/context.server";
import env from "~/env/env.server";
import * as workspaceApi from "@webstudio-is/project/index.server";

const MIN_SEATS = 5;
const MAX_SEATS = 20;

const Body = z.object({
  newQuantity: z
    .number()
    .int("newQuantity must be an integer")
    .min(MIN_SEATS, `Minimum ${MIN_SEATS} seats required`)
    .max(MAX_SEATS, `Maximum ${MAX_SEATS} seats per account`),
});

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const context = await createContext(request);

  if (context.authorization.type !== "user") {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = context.authorization.userId;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { newQuantity } = parsed.data;

  // Builder-side validation: cannot reduce below current member count + owner (1)
  const memberCount = await workspaceApi.workspace.countAllMembers(
    userId,
    context
  );
  const currentlyUsed = 1 + memberCount;

  if (newQuantity < currentlyUsed) {
    return json(
      {
        error: `Cannot reduce seats below current usage (${currentlyUsed} seats in use). Remove members first.`,
      },
      { status: 400 }
    );
  }

  if (env.PAYMENT_WORKER_URL === "" || env.PAYMENT_WORKER_TOKEN === "") {
    return json({ error: "Payment worker not configured" }, { status: 503 });
  }

  const workerResponse = await fetch(`${env.PAYMENT_WORKER_URL}/seats/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.PAYMENT_WORKER_TOKEN}`,
      "X-User-Id": userId,
    },
    body: JSON.stringify({ newQuantity }),
  });

  const workerData = (await workerResponse.json()) as object;

  if (!workerResponse.ok) {
    const message =
      "error" in workerData && typeof workerData.error === "string"
        ? workerData.error
        : "Failed to update seats";
    return json({ error: message }, { status: workerResponse.status });
  }

  return json({ success: true });
};
