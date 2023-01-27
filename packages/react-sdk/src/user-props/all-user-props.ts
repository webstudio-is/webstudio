import { atom } from "nanostores";
import type { Instance, PropsItem } from "@webstudio-is/project-build";

export type AllUserProps = {
  [id: Instance["id"]]: PropsItem[];
};

export const allUserPropsContainer = atom<AllUserProps>({});
