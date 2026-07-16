import { encodeDataVariableId } from "@webstudio-is/sdk";
import type { BuilderState } from "../state/builder-state";

const createPage = ({
  id,
  name,
  path,
  rootInstanceId,
  title,
  description,
}: {
  id: string;
  name: string;
  path: string;
  rootInstanceId: string;
  title: string;
  description: string;
}) => ({
  id,
  name,
  path,
  rootInstanceId,
  title,
  meta: {
    description,
    custom: [{ property: "og:description", content: description }],
  },
});

export const createBindingVerificationFixture = (): BuilderState => {
  const featuredProductId = "featured-product";
  const productsId = "products-data";
  const itemParameterId = "collection-item";
  const itemKeyParameterId = "collection-item-key";
  const healthDataSourceId = "health-data";
  const featuredProduct = encodeDataVariableId(featuredProductId);
  const products = encodeDataVariableId(productsId);
  const itemParameter = encodeDataVariableId(itemParameterId);
  const itemKeyParameter = encodeDataVariableId(itemKeyParameterId);

  return {
    pages: {
      homePageId: "catalog-page",
      rootFolderId: "root-folder",
      meta: {},
      compiler: {},
      pages: new Map([
        [
          "catalog-page",
          createPage({
            id: "catalog-page",
            name: "Catalog",
            path: "",
            rootInstanceId: "body",
            title: "siteName",
            description: `${featuredProduct}.name + " catalog"`,
          }),
        ],
        [
          "detail-page",
          createPage({
            id: "detail-page",
            name: "Product detail",
            path: "/products/example",
            rootInstanceId: "detail-body",
            title: '"Product detail"',
            description: '"A product detail page"',
          }),
        ],
      ]),
      folders: new Map([
        [
          "root-folder",
          {
            id: "root-folder",
            name: "Root",
            slug: "",
            children: ["catalog-page", "detail-page"],
          },
        ],
      ]),
    },
    instances: new Map([
      [
        "body",
        {
          type: "instance",
          id: "body",
          component: "Body",
          children: [
            { type: "id", value: "hero" },
            { type: "id", value: "catalog" },
            { type: "id", value: "checkout" },
          ],
        },
      ],
      [
        "hero",
        {
          type: "instance",
          id: "hero",
          component: "Text",
          tag: "h1",
          children: [{ type: "expression", value: `${featuredProduct}.name` }],
        },
      ],
      [
        "catalog",
        {
          type: "instance",
          id: "catalog",
          component: "Collection",
          children: [{ type: "id", value: "product-card" }],
        },
      ],
      [
        "product-card",
        {
          type: "instance",
          id: "product-card",
          component: "Text",
          tag: "article",
          children: [
            { type: "expression", value: `${itemParameter}?.name` },
            { type: "expression", value: `${itemKeyParameter}` },
          ],
        },
      ],
      [
        "checkout",
        {
          type: "instance",
          id: "checkout",
          component: "Form",
          children: [],
        },
      ],
      [
        "detail-body",
        {
          type: "instance",
          id: "detail-body",
          component: "Body",
          children: [{ type: "id", value: "detail-title" }],
        },
      ],
      [
        "detail-title",
        {
          type: "instance",
          id: "detail-title",
          component: "Text",
          children: [],
        },
      ],
    ]),
    props: new Map([
      [
        "hero-title",
        {
          id: "hero-title",
          instanceId: "hero",
          name: "title",
          type: "expression",
          value: `${featuredProduct}.name ?? "Untitled"`,
        },
      ],
      [
        "catalog-data",
        {
          id: "catalog-data",
          instanceId: "catalog",
          name: "data",
          type: "expression",
          value: `${products}?.data?.items`,
        },
      ],
      [
        "product-link",
        {
          id: "product-link",
          instanceId: "product-card",
          name: "href",
          type: "expression",
          value: `${itemParameter}?.slug`,
        },
      ],
      [
        "product-parameter",
        {
          id: "product-parameter",
          instanceId: "product-card",
          name: "item",
          type: "parameter",
          value: itemParameterId,
        },
      ],
      [
        "product-resource",
        {
          id: "product-resource",
          instanceId: "checkout",
          name: "action",
          type: "resource",
          value: "product-action",
        },
      ],
      [
        "checkout-action",
        {
          id: "checkout-action",
          instanceId: "checkout",
          name: "onSubmit",
          type: "action",
          value: [
            {
              type: "execute",
              args: ["event"],
              code: "event.submitted = true",
            },
          ],
        },
      ],
    ]),
    dataSources: new Map([
      [
        featuredProductId,
        {
          id: featuredProductId,
          type: "variable",
          name: "featuredProduct",
          scopeInstanceId: "body",
          value: {
            type: "json",
            value: { id: "starter", name: "Starter", tenant: "northstar" },
          },
        },
      ],
      [
        "site-name",
        {
          id: "site-name",
          type: "variable",
          name: "siteName",
          scopeInstanceId: "body",
          value: { type: "string", value: "Northstar Catalog" },
        },
      ],
      [
        productsId,
        {
          id: productsId,
          type: "resource",
          name: "Products",
          scopeInstanceId: "body",
          resourceId: "products-resource",
        },
      ],
      [
        itemParameterId,
        {
          id: itemParameterId,
          type: "parameter",
          name: "collectionItem",
          scopeInstanceId: "catalog",
        },
      ],
      [
        itemKeyParameterId,
        {
          id: itemKeyParameterId,
          type: "parameter",
          name: "collectionItemKey",
          scopeInstanceId: "catalog",
        },
      ],
      [
        healthDataSourceId,
        {
          id: healthDataSourceId,
          type: "resource",
          name: "Health",
          resourceId: "health-resource",
        },
      ],
    ]),
    resources: new Map([
      [
        "products-resource",
        {
          id: "products-resource",
          name: "Products",
          method: "get",
          url: '"/api/products?tenant=" + featuredProduct.tenant',
          headers: [{ name: "x-path", value: "system.pathname" }],
          searchParams: [{ name: "page", value: '"1"' }],
        },
      ],
      [
        "product-action",
        {
          id: "product-action",
          name: "Submit product",
          method: "post",
          url: '"/api/products/" + featuredProduct.id',
          headers: [{ name: "Content-Type", value: '"application/json"' }],
          searchParams: [],
          body: "{ id: featuredProduct.id, source: system.pathname }",
        },
      ],
      [
        "health-resource",
        {
          id: "health-resource",
          name: "Health",
          method: "get",
          url: '"/api/health?path=" + system.pathname',
          headers: [],
          searchParams: [],
        },
      ],
    ]),
    styleSources: new Map(),
    styleSourceSelections: new Map(),
    styles: new Map(),
    breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
    assets: new Map(),
  };
};
