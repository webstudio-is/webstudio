export const createJsonStringifyProxy = <T extends object>(target: T): T => {
  return new Proxy(target, {
    get(target, prop, receiver) {
      if (prop === "toString") {
        return function () {
          return JSON.stringify(target);
        };
      }

      const value = Reflect.get(target, prop, receiver);

      if (typeof value === "object" && value !== null) {
        return createJsonStringifyProxy(value);
      }

      return value;
    },
  });
};

export const isPlainObject = (obj: unknown): obj is object => {
  return (
    Object.prototype.toString.call(obj) === "[object Object]" &&
    (Object.getPrototypeOf(obj) === null ||
      Object.getPrototypeOf(obj) === Object.prototype)
  );
};
