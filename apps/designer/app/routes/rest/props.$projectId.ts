import { type LoaderFunction } from "@remix-run/node";
import { type InstanceProps } from "@webstudio-is/react-sdk";
import * as projectdomain from "@webstudio-is/project";
type ErrorData = {
  errors: string;
};

export const loader: LoaderFunction = async ({
  params,
}): Promise<Array<InstanceProps> | ErrorData> => {
  try {
    const project = await projectdomain.project.loadById(params.projectId);
    return await projectdomain.props.loadByProject(project, "production");
  } catch (error) {
    if (error instanceof Error) {
      return {
        errors: error.message,
      };
    }
  }
  return { errors: "Unexpected error" };
};
