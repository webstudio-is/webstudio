// Our root outlet doesn't contain a layout because we have 2 types of documents: canvas and designer and we need to decide down the line which one to render, thre is no single root document.
export { Outlet as default } from "@remix-run/react";
