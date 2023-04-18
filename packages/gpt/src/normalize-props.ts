let i = 0;
const cache = {
  computed: {},
  getCacheKey: ({ prop, value }) => `PropsValue${i++}`,
};

function normalizeProps(props, cache, filter = () => true) {
  return Object.entries(props).reduce((normalizedProps, [prop, value]) => {
    if (!filter(prop)) {
      return normalizedProps;
    }
    const valueToJSON = JSON.stringify(value);

    if (!cache.computed[valueToJSON]) {
      cache.computed[valueToJSON] = cache.getCacheKey({ prop, value });
    }

    normalizedProps[prop] = cache.computed[valueToJSON];
    return normalizedProps;
  }, {});
}

console.log(
  `type BoxProps = ${JSON.stringify(
    normalizeProps(p, cache, (prop) => !prop.startsWith("aria-"))
  )};\n\n`
);
console.log(
  Object.entries(cache.computed)
    .map(([value, name]) => `type ${name} = ${value};`)
    .join("\n")
);
