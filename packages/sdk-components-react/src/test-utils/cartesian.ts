export function cartesian<A, B>(a: A[], b: B[]): [A, B][];
export function cartesian<A, B, C>(a: A[], b: B[], c: C[]): [A, B, C][];

// https://stackoverflow.com/questions/12303989/cartesian-product-of-multiple-arrays-in-javascript
// eslint-disable-next-line func-style
export function cartesian(...a: unknown[][]) {
  return a.reduce((a, b) => a.flatMap((d) => b.map((e) => [d, e].flat())));
}
