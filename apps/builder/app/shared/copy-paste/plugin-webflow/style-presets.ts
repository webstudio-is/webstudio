const base = {
  Heading: `
    font-weight: bold;
    margin-bottom: 10px;
  `,
};

// @todo rewrite to support states
export const presets = {
  h1: `
    font-size: 38px;
    line-height: 44px;
    margin-top: 20px;
    ${base.Heading}
  `,
  h2: `
    font-size: 32px;
    line-height: 36px;
    margin-top: 20px;
    ${base.Heading}
  `,
  h3: `
    font-size: 24px;
    line-height: 30px;
    margin-top: 20px;
    ${base.Heading}
  `,
  h4: `
    font-size: 18px;
    line-height: 24px;
    margin-top: 10px;
    ${base.Heading}
  `,
  h5: `
    font-size: 14px;
    line-height: 20px;
    margin-top: 10px;
    ${base.Heading}
  `,
  h6: `
    font-size: 12px;
    line-height: 18px;
    margin-top: 10px;
    ${base.Heading}
  `,
};
