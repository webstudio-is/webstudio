import path from "path";
import appRoot from "app-root-path";
import { fsEnvVariables } from "../schema";
const fsUploadVars = fsEnvVariables.parse(process.env);

export const imageFSDirectory = () => {
  const basePath =
    process.env.NODE_ENV === "development"
      ? path.join(
          appRoot.path,
          "apps",
          "designer",
          fsUploadVars.FILE_UPLOAD_PATH
        )
      : "";

  return basePath;
};
