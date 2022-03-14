import { useLoaderData, type LoaderFunction } from "remix";
import { type Data } from "@webstudio-is/sdk";
import { Canvas } from "~/canvas";
import * as db from "~/shared/db";

export type ErrorData = {
  errors: string;
};

export const loader: LoaderFunction = async ({
  params,
}): Promise<Data | ErrorData> => {
  try {
    const project = await db.project.loadById(params.projectId);
    const [tree, props] = await Promise.all([
      db.tree.loadByProject(project, "development"),
      db.props.loadByProject(project, "development"),
    ]);
    return { tree, props };
  } catch (error) {
    if (error instanceof Error) {
      return {
        errors: error.message,
      };
    }
  }
  return { errors: "Unexpected error" };
};

export default () => {
  const data = useLoaderData<Data | ErrorData>();
  // @todo how should we treat this kind of errors?
  if ("errors" in data) {
    return <p>{data.errors}</p>;
  }
  return <Canvas data={data} />;
};
