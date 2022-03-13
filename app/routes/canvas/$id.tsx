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
  if (params.id === undefined) throw new Error("Project id undefined");
  const data = {} as Data;
  try {
    const project = await db.project.loadOne(params.id);
    if (project === null) {
      return {
        errors: `Project "${params.id}" doesn't exist`,
      };
    }
    // @todo parallelize
    data.tree = await db.tree.load(project.devTreeId);
    data.props = await db.props.loadForTree(project.devTreeId);
  } catch (error) {
    if (error instanceof Error) {
      return {
        errors: error.message,
      };
    }
  }
  return data;
};

export default () => {
  const data = useLoaderData<Data | ErrorData>();
  // @todo how should we treat this kind of errors?
  if ("errors" in data) {
    return <p>{data.errors}</p>;
  }
  return <Canvas data={data} />;
};
