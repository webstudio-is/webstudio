import { setEnv } from "@webstudio-is/feature-flags";
import env from "./shared/env";

setEnv(env.FEATURES as string);
