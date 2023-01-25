import type { ActionArgs } from "@remix-run/node";
import type { AnyRouter } from "@trpc/server";

export const handleTrpcRemixAction = async <Router extends AnyRouter>({
  router,
  params,
  request,
  context,
}: {
  router: Router;
  params: ActionArgs["params"];
  request: Request;
  context: Router["_def"]["_config"]["$types"]["ctx"];
}) => {
  const { method } = params;

  if (typeof method !== "string") {
    throw new Error("Missing method");
  }

  const data = Object.fromEntries(await request.formData()) as never;
  const caller = router.createCaller(context);
  const allowedProcedures = Object.keys(router["_def"].record);

  if (allowedProcedures.includes(method) === false) {
    throw new Error(`Unknown RPC method "${method}"`);
  }

  const fn = caller[method];

  if (typeof fn === "function") {
    return await fn(data);
  }

  throw new Error(`Unknown RPC method "${method}"`);
};
