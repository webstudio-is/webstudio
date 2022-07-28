import path from "path";
import appRoot from "app-root-path";
import { fsEnvVariables } from "../schema";
const fsUploadVars = fsEnvVariables.parse(process.env);

export const imageFSDirectory = () => {
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) return path.join(appRoot.path, fsUploadVars.FILE_UPLOAD_PATH);

  return path.join(
    appRoot.path,
    "apps",
    "designer",
    fsUploadVars.FILE_UPLOAD_PATH
  );
};
