export const createJsonStringifyProxy = <T extends object>(
  target: T,
  options?: {
    space?: number;
    excludeKeys?: readonly string[];
    fileMetadata?: boolean;
    stringifyAs?: string;
  }
): T => {
  return new Proxy(target, {
    get(target, prop, receiver) {
      if (prop === "toString") {
        return function () {
          if (options?.stringifyAs !== undefined) {
            return options.stringifyAs;
          }
          if (options === undefined) {
            return JSON.stringify(target);
          }
          const visible = Object.fromEntries(
            Object.entries(target).filter(
              ([key]) => !options.excludeKeys?.includes(key)
            )
          );
          return JSON.stringify(
            visible,
            (_key, value) => {
              if (
                options.fileMetadata &&
                typeof File !== "undefined" &&
                value instanceof File
              ) {
                return { name: value.name, type: value.type, size: value.size };
              }
              return value;
            },
            options.space
          );
        };
      }

      const value = Reflect.get(target, prop, receiver);

      if (
        typeof value === "object" &&
        value !== null &&
        !(typeof File !== "undefined" && value instanceof File)
      ) {
        return createJsonStringifyProxy(value, options);
      }

      return value;
    },
  });
};

export const isPlainObject = (value: unknown): value is object => {
  return (
    Object.prototype.toString.call(value) === "[object Object]" &&
    (Object.getPrototypeOf(value) === null ||
      Object.getPrototypeOf(value) === Object.prototype)
  );
};

export const serializeValue = (value: unknown) => {
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value);
};
