import { action as pageAction } from "./[form]._index";

export const action = async (args: Parameters<typeof pageAction>[0]) => {
  const url = new URL(args.request.url);
  url.pathname = url.pathname.slice(10) || "/";
  url.searchParams.set("ws--managed-form-request", "1");
  const request = new Request(url, args.request);
  const result = await pageAction({ ...args, request });
  return Response.json(result, {
    status: "status" in result ? result.status : 200,
  });
};
