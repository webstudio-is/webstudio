/* eslint-disable */

console.log("Hello, world!");

const res = await fetch(
  "https://api-eu-central-1-shared-euc1-02.hygraph.com/v2/cluazrfa1000008l8gqq87iaq/master",
  {
    method: "POST",
    headers: {},
    body: JSON.stringify({
      query: `
      query Products($where: ProductWhereInput) {
        products(where: $where) {
          description
          id
          slug
          name
          images(first: 1, where: {}) {
            size
            width
            height
            url(transformation: {image: {resize: {fit: scale, width: 300}}})
          }
        }
      }
      `,
      variables: {
        where: {
          categories_some: {
            slug: "hoodies",
          },
        },
      },
    }),
  }
);

const sys = {
  search: {
    category: "hoodies",
  },
};
const b = {
  query: `
  query Products($where: ProductWhereInput) {
    products(where: $where) {
      description
      id
      slug
      name
      images(first: 1, where: {}) {
        size
        url(transformation: {image: {resize: {fit: scale, width: 300}}})
      }
    }
  }
  `,
  variables: {
    where: {
      categories_some: {
        slug: sys.search.category,
      },
    },
  },
};

console.log(res.status);
console.log(await res.text());

export {};
