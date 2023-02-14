import path from "path";
import appRoot from "app-root-path";
import { FsEnv } from "../../schema";
const fsEnv = FsEnv.parse(process.env);

export const FILE_DIRECTORY =
  // @todo this will be wrong once we have a local app that is in production and yet saves to local dir
  process.env.NODE_ENV === "production"
    ? path.join(appRoot.path, fsEnv.FILE_UPLOAD_PATH)
    : path.join(appRoot.path, "apps", "builder", fsEnv.FILE_UPLOAD_PATH);
