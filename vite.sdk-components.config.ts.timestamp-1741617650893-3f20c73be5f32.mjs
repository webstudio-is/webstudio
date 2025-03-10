// ../../vite.sdk-components.config.ts
import { defineConfig } from "file:///workspaces/webstudio/node_modules/.pnpm/vite@5.4.11_@types+node@22.10.7/node_modules/vite/dist/node/index.js";
import { existsSync } from "node:fs";
import path from "node:path";
var hasPrivateFolders = existsSync(path.join(process.cwd(), "private-src"));
if (hasPrivateFolders) {
  throw new Error("Private folders are not allowed in the SDK");
}
var isBareImport = (id) => id.startsWith("@") || id.includes(".") === false;
var vite_sdk_components_config_default = defineConfig({
  build: {
    lib: {
      entry: [
        "src/components.ts",
        "src/metas.ts",
        "src/props.ts",
        "src/hooks.ts",
        "src/templates.ts"
      ],
      formats: ["es"]
    },
    rollupOptions: {
      external: isBareImport,
      output: {
        preserveModules: true,
        preserveModulesRoot: "src",
        dir: "lib"
      }
    }
  }
});
export {
  vite_sdk_components_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vdml0ZS5zZGstY29tcG9uZW50cy5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvd29ya3NwYWNlcy93ZWJzdHVkaW9cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi93b3Jrc3BhY2VzL3dlYnN0dWRpby92aXRlLnNkay1jb21wb25lbnRzLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vd29ya3NwYWNlcy93ZWJzdHVkaW8vdml0ZS5zZGstY29tcG9uZW50cy5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHsgZXhpc3RzU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwibm9kZTpwYXRoXCI7XG5cbmNvbnN0IGhhc1ByaXZhdGVGb2xkZXJzID0gZXhpc3RzU3luYyhwYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgXCJwcml2YXRlLXNyY1wiKSk7XG5cbmlmIChoYXNQcml2YXRlRm9sZGVycykge1xuICB0aHJvdyBuZXcgRXJyb3IoXCJQcml2YXRlIGZvbGRlcnMgYXJlIG5vdCBhbGxvd2VkIGluIHRoZSBTREtcIik7XG59XG5cbmNvbnN0IGlzQmFyZUltcG9ydCA9IChpZDogc3RyaW5nKSA9PlxuICBpZC5zdGFydHNXaXRoKFwiQFwiKSB8fCBpZC5pbmNsdWRlcyhcIi5cIikgPT09IGZhbHNlO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBidWlsZDoge1xuICAgIGxpYjoge1xuICAgICAgZW50cnk6IFtcbiAgICAgICAgXCJzcmMvY29tcG9uZW50cy50c1wiLFxuICAgICAgICBcInNyYy9tZXRhcy50c1wiLFxuICAgICAgICBcInNyYy9wcm9wcy50c1wiLFxuICAgICAgICBcInNyYy9ob29rcy50c1wiLFxuICAgICAgICBcInNyYy90ZW1wbGF0ZXMudHNcIixcbiAgICAgIF0sXG4gICAgICBmb3JtYXRzOiBbXCJlc1wiXSxcbiAgICB9LFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIGV4dGVybmFsOiBpc0JhcmVJbXBvcnQsXG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgcHJlc2VydmVNb2R1bGVzOiB0cnVlLFxuICAgICAgICBwcmVzZXJ2ZU1vZHVsZXNSb290OiBcInNyY1wiLFxuICAgICAgICBkaXI6IFwibGliXCIsXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBK1EsU0FBUyxvQkFBb0I7QUFDNVMsU0FBUyxrQkFBa0I7QUFDM0IsT0FBTyxVQUFVO0FBRWpCLElBQU0sb0JBQW9CLFdBQVcsS0FBSyxLQUFLLFFBQVEsSUFBSSxHQUFHLGFBQWEsQ0FBQztBQUU1RSxJQUFJLG1CQUFtQjtBQUNyQixRQUFNLElBQUksTUFBTSw0Q0FBNEM7QUFDOUQ7QUFFQSxJQUFNLGVBQWUsQ0FBQyxPQUNwQixHQUFHLFdBQVcsR0FBRyxLQUFLLEdBQUcsU0FBUyxHQUFHLE1BQU07QUFFN0MsSUFBTyxxQ0FBUSxhQUFhO0FBQUEsRUFDMUIsT0FBTztBQUFBLElBQ0wsS0FBSztBQUFBLE1BQ0gsT0FBTztBQUFBLFFBQ0w7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsTUFDRjtBQUFBLE1BQ0EsU0FBUyxDQUFDLElBQUk7QUFBQSxJQUNoQjtBQUFBLElBQ0EsZUFBZTtBQUFBLE1BQ2IsVUFBVTtBQUFBLE1BQ1YsUUFBUTtBQUFBLFFBQ04saUJBQWlCO0FBQUEsUUFDakIscUJBQXFCO0FBQUEsUUFDckIsS0FBSztBQUFBLE1BQ1A7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
