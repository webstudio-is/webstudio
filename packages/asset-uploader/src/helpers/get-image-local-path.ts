import path from "path";
import { fsEnvVariables } from "../schema";
const fsUploadVars = fsEnvVariables.parse(process.env);

export const getImageLocalDirectory = (dirname: string) => {
  const uploads = path.join(dirname, "../public");
  const directory = path.join(uploads, fsUploadVars.FILE_UPLOAD_PATH);

  return directory;
};
