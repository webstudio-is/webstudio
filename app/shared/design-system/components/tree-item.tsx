import { styled } from '../stitches.config';

export const TreeItem = styled('div', {
  // Reset
  alignItems: 'center',
  boxSizing: 'border-box',
  display: 'flex',
  lineHeight: '1',
  userSelect: 'none',
  WebkitTapHighlightColor: 'transparent',
  '&:disabled': {
    pointerEvents: 'none',
  },
  '&::before': {
    boxSizing: 'border-box',
  },
  '&::after': {
    boxSizing: 'border-box',
  },

  // Custom
  height: '29px',
  px: '$2',
  fontSize: '$1',
  color: '$hiContrast',

  variants: {
    variant: {
      gray: {
        backgroundColor: '$slate3',
        '&:hover': {
          backgroundColor: '$slate4',
        },
        '&:active': {
          backgroundColor: '$slate5',
        },
      },
      red: {
        backgroundColor: '$red3',
        '&:hover': {
          backgroundColor: '$red4',
        },
        '&:active': {
          backgroundColor: '$red5',
        },
      },
      crimson: {
        backgroundColor: '$crimson3',
        '&:hover': {
          backgroundColor: '$crimson4',
        },
        '&:active': {
          backgroundColor: '$crimson5',
        },
      },
      pink: {
        backgroundColor: '$pink3',
        '&:hover': {
          backgroundColor: '$pink4',
        },
        '&:active': {
          backgroundColor: '$pink5',
        },
      },
      purple: {
        backgroundColor: '$purple3',
        '&:hover': {
          backgroundColor: '$purple4',
        },
        '&:active': {
          backgroundColor: '$purple5',
        },
      },
      violet: {
        backgroundColor: '$violet3',
        '&:hover': {
          backgroundColor: '$violet4',
        },
        '&:active': {
          backgroundColor: '$violet5',
        },
      },
      indigo: {
        backgroundColor: '$indigo3',
        '&:hover': {
          backgroundColor: '$indigo4',
        },
        '&:active': {
          backgroundColor: '$indigo5',
        },
      },
      blue: {
        backgroundColor: '$blue3',
        '&:hover': {
          backgroundColor: '$blue4',
        },
        '&:active': {
          backgroundColor: '$blue5',
        },
      },
      cyan: {
        backgroundColor: '$cyan3',
        '&:hover': {
          backgroundColor: '$cyan4',
        },
        '&:active': {
          backgroundColor: '$cyan5',
        },
      },
      teal: {
        backgroundColor: '$teal3',
        '&:hover': {
          backgroundColor: '$teal4',
        },
        '&:active': {
          backgroundColor: '$teal5',
        },
      },
      green: {
        backgroundColor: '$green3',
        '&:hover': {
          backgroundColor: '$green4',
        },
        '&:active': {
          backgroundColor: '$green5',
        },
      },
      lime: {
        backgroundColor: '$lime3',
        '&:hover': {
          backgroundColor: '$lime4',
        },
        '&:active': {
          backgroundColor: '$lime5',
        },
      },
      yellow: {
        backgroundColor: '$yellow3',
        '&:hover': {
          backgroundColor: '$yellow4',
        },
        '&:active': {
          backgroundColor: '$yellow5',
        },
      },
      amber: {
        backgroundColor: '$amber3',
        '&:hover': {
          backgroundColor: '$amber4',
        },
        '&:active': {
          backgroundColor: '$amber5',
        },
      },
      orange: {
        backgroundColor: '$orange3',
        '&:hover': {
          backgroundColor: '$orange4',
        },
        '&:active': {
          backgroundColor: '$orange5',
        },
      },
      gold: {
        backgroundColor: '$gold3',
        '&:hover': {
          backgroundColor: '$gold4',
        },
        '&:active': {
          backgroundColor: '$gold5',
        },
      },
      brown: {
        backgroundColor: '$brown3',
        '&:hover': {
          backgroundColor: '$brown4',
        },
        '&:active': {
          backgroundColor: '$brown5',
        },
      },
      bronze: {
        backgroundColor: '$bronze3',
        '&:hover': {
          backgroundColor: '$bronze4',
        },
        '&:active': {
          backgroundColor: '$bronze5',
        },
      },
    },
  },
});
