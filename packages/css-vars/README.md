# CSS Vars utils

This package helps you create uniquely named css variables as well as use them.

## API

```ts
import { cssVars } from "css-vars";

const myVariable = cssVars.define("my-variable"); // --my-variable-0

cssVars.use(myVariable, "fallback"); // var(--my-variable-0, fallback)
```

## Example using `style` prop

```ts
import { cssVars } from "css-vars";

// icon.ts
const showVar = cssVars.define("button-show"); // --button-show-0

export const buttonCssVars = ({ show }: { show: boolean }) => ({
  [showVar]: show ? "block" : "none",
});

export const Button = () => {
   return <button style={{display: cssVars.use(showVar, "none")}}></button>
}

// panel.ts
import {Button, buttonCssVars} from './button'

const Panel = (props) => {
  const [show, setShow] = useState(false)

  return (
    <div {...props} style={buttonCssVars({show})} >
      <Button />
    </div>
  )
}
```

## Example using stitches with `:hover`

```ts
import { cssVars } from "css-vars";
import {styled} from 'stitches'

// icon.ts
const showVar = cssVars.define("button-show"); // --button-show-0
const primaryBgVar = cssVars.define("button-primary-bg"); // --button-primary-bg-1

export const buttonCssVars = ({ show, variant }: { show: boolean, variant: 'primary' | 'secondary' }) => ({
  [showVar]: show ? "block" : "none",
  [primaryBgVar]: variant === 'primary' ? "red" : "grey",
});

export const Button = styled('button', {
  display: cssVars.use(showVar, "none")
  variants: {
    variant: {
      primary: {
        background: cssVars.use(primaryBgVar, "red")
      }
    }
  }
})

// panel.ts
import {Button, buttonCssVars} from './button'
import {styled} from 'stitches'

const Panel = styled('div', {
  '&:hover': buttonCssVars({show: true})
})
```
