const createMetaProxy = (prefix: string): Record<string, string> => {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        return `${prefix}${prop as string}`;
      },
    }
  );
};

export const animation = createMetaProxy(
  "@webstudio-is/sdk-components-animation:"
);
