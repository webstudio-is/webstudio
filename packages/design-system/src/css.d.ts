declare module "*.css";

declare module "*.css?raw" {
  const source: string;
  export default source;
}
