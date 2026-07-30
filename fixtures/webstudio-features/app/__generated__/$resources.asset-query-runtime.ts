import { createGeneratedAssetResourceRuntime } from "./$resources.asset-query-vendor.js";
import { assetQueryDatabase } from "./$resources.asset-query-manifest";

const deploymentId = "1b66ee06-8ea5-4420-9a0e-e0d3a67aca32";
const runtimeAssets = {"2b151fc7b4b0324e6ab78c40f72c7f59273f81fb1be3d08b3f9976428601b95e":{"url":"/assets/e-mail-39993_vrxyjxQv3j67Krs62Vz7Y.mp3"},"42e55b0464790758b9352d675cf28fadfcf8a3259fc1e890100617d3e731be88":{"url":"/assets/cabinsketch-bold_TLCbytfxf8ENHwZ6ze3Jj.ttf","family":"CabinSketch","style":"normal","weight":700},"4afe692f78ec0530e355a551a3860302c4478037db7b25a3bdae82c32c78634d":{"url":"/assets/webm-example_2r_6VmRBjhAy3ldaqz0gk.webm"},"7cf5892080fa66b5e6175ffd2d27c304ee6b09ce1f21847a95000225ad1afa59":{"url":"/assets/cat_silhouette_BDpTbUFSpVbfUWQZNxbBG.png","width":790,"height":786},"9a8bc926-7804-4d3f-af81-69196b1d2ed8":{"url":"/assets/small-avif-kitty_FnabJsioMWpBtXZSGf4DR.webp","width":100,"height":100},"cbf6b1b052e52b256cef54a032a546bf43bf3f5441be4d1c5eeaabce26903d78":{"url":"/assets/video_QamtUWsD-ShifhzZLoNIv_ald_1xtyEb3uHhFb7nCQa.mp4"},"cd939c56-bcdd-4e64-bd9c-567a9bccd3da":{"url":"/assets/_937084ed-a798-49fe-8664-df93a2af605e_uiBk3o6UWdqolyakMvQJ9.jpeg","width":1024,"height":1024}};
const createRuntimeFetch = createGeneratedAssetResourceRuntime({
  deploymentId,
  artifact: assetQueryDatabase,
  runtimeAssets,
});

export const createGeneratedAssetResourceFetch = ({ request, fallback }: {
    request: Request;
    context: unknown;
    fallback: typeof fetch;
  }) =>
  createRuntimeFetch({ request, fallback });
