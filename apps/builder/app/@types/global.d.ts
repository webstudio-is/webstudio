type Prettify<T> = { [k in keyof T]: T[k] } & {
  /* comment to fix eslint error */
};
