import { useLoaderData } from "@remix-run/react";
import type { LoaderFunction } from "@remix-run/node";
import { Canvas } from "~/canvas";
import { loadCanvasData, type ErrorData, type CanvasData } from "~/shared/db";

export const loader: LoaderFunction = async ({
  params,
}): Promise<CanvasData | ErrorData> => {
  if (params.projectId === undefined) {
    return { errors: "Missing projectId" };
  }
  try {
    return await loadCanvasData({ projectId: params.projectId });
  } catch (error) {
    if (error instanceof Error) {
      return {
        errors: error.message,
      };
    }
  }
  return { errors: "Unexpected error" };
};

const CanvasRoute = () => {
  const data = useLoaderData<CanvasData | ErrorData>();
  // @todo how should we treat this kind of errors?
  if ("errors" in data) {
    return <p>{data.errors}</p>;
  }
  return <Canvas data={data} />;
};

export default CanvasRoute;
