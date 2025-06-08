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

export const radix = createMetaProxy(
  "@webstudio-is/sdk-components-react-radix:"
);
