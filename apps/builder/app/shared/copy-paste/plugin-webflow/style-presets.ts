const base = {
  Heading: `
    margin-bottom: 10px;
    font-weight: bold;
  `,
};

// @todo rewrite to support states
export const presets = {
  h1: `
    margin-top: 20px;
    font-size: 38px;
    line-height: 44px;
    ${base.Heading}
  `,
  h2: `
    margin-top: 20px;
    font-size: 32px;
    line-height: 36px;
    ${base.Heading}
  `,
  h3: `
    margin-top: 20px;
    font-size: 24px;
    line-height: 30px;
    ${base.Heading}
  `,
  h4: `
    margin-top: 10px;
    font-size: 18px;
    line-height: 24px;
    ${base.Heading}
  `,
  h5: `
    margin-top: 10px;
    font-size: 14px;
    line-height: 20px;
    ${base.Heading}
  `,
  h6: `
    margin-top: 10px;
    font-size: 12px;
    line-height: 18px;
    ${base.Heading}
  `,
  p: `
    margin-top: 0;
    margin-bottom: 10px;  
  `,
  blockquote: `
    border-left: 5px solid #e2e2e2;
    margin: 0 0 10px;
    padding: 10px 20px;
    font-size: 18px;
    line-height: 22px;
  `,
  figure: `
    margin: 0 0 10px;
  `,
  figcaption: `
    text-align: center;
    margin-top: 5px;
  `,
  ul: `
    margin-top: 0;
    margin-bottom: 10px;
    padding-left: 40px;
  `,
  ol: `
    margin-top: 0;
    margin-bottom: 10px;
    padding-left: 40px;
  `,
  fieldset: `
    border: 0;
    margin: 0;
    padding: 0;
  `,
  button: `
    cursor: pointer;
    -webkit-appearance: button;
    border: 0;
  `,
  label: `
    margin-bottom: 5px;
    font-weight: bold;
    display: block;  
  `,
  wButton: `
    color: #fff;
    line-height: inherit;
    cursor: pointer;
    background-color: #3898ec;
    border: 0;
    border-radius: 0;
    padding: 9px 15px;
    text-decoration: none;
    display: inline-block;  
  `,
};
