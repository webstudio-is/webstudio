// eslint-disable-next-line import/no-internal-modules
import config from "tailwindcss/defaultConfig";

type Theme = NonNullable<(typeof config)["theme"]>;

type ThemeProperties = keyof Theme;

type Extract<K> = NonNullable<K> extends infer X
  ? X extends (...args: never[]) => infer T
    ? T
    : X
  : K;

type ThemeResolved = {
  [key in keyof Theme]: Extract<Theme[key]>;
};

export const theme = <T extends ThemeProperties>(name: T): ThemeResolved[T] => {
  const value = config?.theme?.[name];

  if (typeof value === "function") {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
    return value({ theme, colors: {} });
  }

  return value;
};
