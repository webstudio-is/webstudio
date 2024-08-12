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

export const isPlainObject = (value: unknown): value is object => {
  return (
    Object.prototype.toString.call(value) === "[object Object]" &&
    (Object.getPrototypeOf(value) === null ||
      Object.getPrototypeOf(value) === Object.prototype)
  );
};
