import { heroicons } from "./__generated__/heroicons";

type Heroicons = typeof heroicons;
type IconsTypes = keyof Heroicons;

export const getIcon = (name: string, type: IconsTypes = "solid") => {
  try {
    const typeIcons = heroicons[type];
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return typeof typeIcons[name] === "string" ? typeIcons[name] : null;
  } catch (error) {
    /**/
  }

  return null;
};
