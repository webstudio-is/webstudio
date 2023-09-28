import { heroicons } from "../heroicons/__generated__/heroicons";

export const getIcon = (name: string, type: "outline" | "solid" = "solid") => {
  try {
    return heroicons[type][name];
  } catch (error) {
    console.log("Icon error ", error);
    /**/
  }

  return null;
};
