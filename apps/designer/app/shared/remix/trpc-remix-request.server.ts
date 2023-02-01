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

  let input: never;

  if (request.method === "GET") {
    const url = new URL(request.url);
    const inputRaw = url.searchParams.get("input");
    if (typeof inputRaw !== "string") {
      throw new Error(`Bad method name ${inputRaw}`);
    }
    input = JSON.parse(inputRaw) as never;
  } else {
    const formData = await request.formData();
    const inputRaw = formData.get("input");
    if (typeof inputRaw !== "string") {
      throw new Error(`Bad method name ${inputRaw}`);
    }
    input = JSON.parse(inputRaw) as never;
  }

  const caller = router.createCaller(context);
  const allowedProcedures = Object.keys(router["_def"].record);

  if (allowedProcedures.includes(method) === false) {
    throw new Error(`Unknown RPC method "${method}"`);
  }

  const fn = caller[method];

  if (typeof fn === "function") {
    return await fn(input);
  }

  throw new Error(`Unknown RPC method "${method}"`);
};
