import { useLoaderData, type LoaderFunction } from "remix";
import { Root } from "@webstudio-is/sdk";
import { loadPreviewData, type PreviewData, type ErrorData } from "~/shared/db";

export const loader: LoaderFunction = async ({
  params,
}): Promise<PreviewData | ErrorData> => {
  if (params.projectId === undefined) {
    return { errors: "Missing projectId" };
  }
  try {
    return await loadPreviewData({ projectId: params.projectId });
  } catch (error) {
    if (error instanceof Error) {
      return {
        errors: error.message,
      };
    }
  }
  return { errors: "Unexpected error" };
};

const PreviewRoute = () => {
  const data = useLoaderData<PreviewData | ErrorData>();
  if ("errors" in data) {
    return <p>{data.errors}</p>;
  }
  return <Root data={data} />;
};

export default PreviewRoute;
