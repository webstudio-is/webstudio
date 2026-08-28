import type { ColorTokenSource } from "../src/colors/color-recipe-utils";

export const colorTokenSource = {
  version: 1,
  controllers: {
    canvas: {
      description: "The page and panel foundation.",
      light: [98.5, 0.002, 250],
      dark: [17, 0.012, 250],
    },
    ink: {
      description: "The foreground and neutral-contrast foundation.",
      light: [20.5, 0.015, 250],
      dark: [94, 0.006, 250],
    },
    accent: {
      description: "The primary action, selection, and focus color.",
      light: [55, 0.21, 255],
      dark: [72, 0.16, 255],
    },
    positive: {
      description: "Successful and confirmed outcomes.",
      light: [50, 0.14, 152],
      dark: [74, 0.14, 152],
    },
    negative: {
      description: "Destructive actions and invalid states.",
      light: [54, 0.19, 27],
      dark: [72, 0.17, 27],
    },
    warning: {
      description: "Conditions requiring attention.",
      light: [57, 0.14, 75],
      dark: [80, 0.14, 75],
    },
    informative: {
      description: "Informational and remote-state communication.",
      light: [55, 0.14, 225],
      dark: [74, 0.13, 225],
    },
  },
  semantic: {
    backgroundPrimary: "theme.canvas",
    backgroundSecondary: ["mix", "theme.canvas", 97, "theme.ink"],
    backgroundMuted: ["mix", "theme.canvas", 92, "theme.ink"],
    backgroundSecondaryHover: ["mix", "theme.canvas", 88, "theme.ink"],
    backgroundSecondaryPressed: ["mix", "theme.canvas", 82, "theme.ink"],
    backgroundDisabled: ["mix", "theme.canvas", 96, "theme.ink"],
    backgroundStrong: ["mix", "theme.canvas", 68, "theme.ink"],
    backgroundInverse: "theme.ink",
    backgroundInverseHover: ["mix", "theme.ink", 88, "theme.canvas"],
    backgroundAccent: "theme.accent",
    backgroundAccentHover: ["mix", "theme.accent", 88, "theme.ink"],
    backgroundAccentPressed: ["mix", "theme.accent", 78, "theme.ink"],
    backgroundAccentSubtle: ["mix", "theme.accent", 12, "theme.canvas"],
    backgroundAccentSubtleHover: ["mix", "theme.accent", 20, "theme.canvas"],
    backgroundPositive: "theme.positive",
    backgroundPositiveHover: ["mix", "theme.positive", 88, "theme.ink"],
    backgroundPositiveSubtle: ["mix", "theme.positive", 12, "theme.canvas"],
    backgroundPositiveSubtleHover: [
      "mix",
      "theme.positive",
      20,
      "theme.canvas",
    ],
    backgroundNegative: "theme.negative",
    backgroundNegativeHover: ["mix", "theme.negative", 88, "theme.ink"],
    backgroundNegativeSubtle: ["mix", "theme.negative", 12, "theme.canvas"],
    backgroundNegativeSubtleHover: [
      "mix",
      "theme.negative",
      20,
      "theme.canvas",
    ],
    backgroundWarning: "theme.warning",
    backgroundWarningHover: ["mix", "theme.warning", 88, "theme.ink"],
    backgroundWarningSubtle: ["mix", "theme.warning", 12, "theme.canvas"],
    backgroundWarningSubtleHover: ["mix", "theme.warning", 20, "theme.canvas"],
    backgroundInformative: "theme.informative",
    backgroundInformativeHover: ["mix", "theme.informative", 88, "theme.ink"],
    backgroundInformativeSubtle: [
      "mix",
      "theme.informative",
      12,
      "theme.canvas",
    ],
    backgroundInformativeSubtleHover: [
      "mix",
      "theme.informative",
      20,
      "theme.canvas",
    ],
    foregroundPrimary: "theme.ink",
    foregroundSecondary: ["mix", "theme.ink", 68, "theme.canvas"],
    foregroundMuted: ["mix", "theme.ink", 52, "theme.canvas"],
    foregroundDisabled: ["mix", "theme.ink", 34, "theme.canvas"],
    foregroundInverse: "theme.canvas",
    foregroundInverseSecondary: ["mix", "theme.canvas", 72, "theme.ink"],
    foregroundAccent: ["mix", "theme.accent", 86, "theme.ink"],
    foregroundPositive: ["mix", "theme.positive", 86, "theme.ink"],
    foregroundNegative: ["mix", "theme.negative", 86, "theme.ink"],
    foregroundWarning: ["mix", "theme.warning", 86, "theme.ink"],
    foregroundInformative: ["mix", "theme.informative", 86, "theme.ink"],
    borderDefault: ["mix", "theme.canvas", 80, "theme.ink"],
    borderStrong: ["mix", "theme.canvas", 62, "theme.ink"],
    borderFocus: "theme.accent",
    borderAccent: ["mix", "theme.accent", 62, "theme.canvas"],
    borderPositive: ["mix", "theme.positive", 62, "theme.canvas"],
    borderNegative: ["mix", "theme.negative", 62, "theme.canvas"],
    borderWarning: ["mix", "theme.warning", 62, "theme.canvas"],
    borderInformative: ["mix", "theme.informative", 62, "theme.canvas"],
    overlaySubtle: ["alpha", "theme.ink", 6],
    overlayPressed: ["alpha", "theme.ink", 11],
    overlayScrim: ["alpha", "theme.ink", 48],
  },
  compatibility: {
    white: ["channels", "theme.canvas", 100, 0],
    black: ["channels", "theme.ink", 0, 0],
    backgroundPanel: "semantic.backgroundPrimary",
    backgroundPrimary: "semantic.backgroundAccent",
    backgroundHover: "semantic.backgroundSecondaryHover",
    backgroundActive: "semantic.backgroundAccent",
    backgroundMenu: "semantic.backgroundSecondary",
    backgroundControls: "semantic.backgroundSecondary",
    backgroundAssetcardHover: "semantic.backgroundSecondaryHover",
    backgroundNeutralMain: "semantic.backgroundMuted",
    backgroundNeutralAccent: "semantic.backgroundInverse",
    backgroundNeutralNotification: "semantic.backgroundSecondary",
    backgroundNeutralDark: "semantic.backgroundStrong",
    backgroundDestructiveMain: "semantic.backgroundNegative",
    backgroundDestructiveNotification: "semantic.backgroundNegativeSubtle",
    backgroundSuccessMain: "semantic.backgroundPositive",
    backgroundSuccessNotification: "semantic.backgroundPositiveSubtle",
    backgroundStatusAttention: "semantic.backgroundWarningSubtle",
    backgroundAlertMain: "semantic.backgroundWarning",
    backgroundAlertNotification: "semantic.backgroundWarningSubtle",
    backgroundInfoMain: "semantic.backgroundInformative",
    backgroundInfoNotification: "semantic.backgroundInformativeSubtle",
    backgroundPresetMain: "semantic.backgroundMuted",
    backgroundPresetHover: "semantic.backgroundSecondaryHover",
    backgroundLocalMain: "semantic.backgroundInformativeSubtle",
    backgroundLocalHover: "semantic.backgroundInformativeSubtleHover",
    backgroundRemoteMain: "semantic.backgroundWarningSubtle",
    backgroundRemoteHover: "semantic.backgroundWarningSubtleHover",
    backgroundInputSelected: "semantic.backgroundInformativeSubtle",
    backgroundInputDisabled: "semantic.backgroundDisabled",
    backgroundInputHighlight: "semantic.backgroundInformativeSubtle",
    backgroundButtonHover: "semantic.overlaySubtle",
    backgroundButtonPressed: "semantic.overlayPressed",
    backgroundButtonDisabled: "semantic.backgroundDisabled",
    backgroundButtonDisabledDark: "semantic.backgroundStrong",
    backgroundItemCurrent: "semantic.backgroundAccentSubtle",
    backgroundItemCurrentChild: ["mix", "theme.accent", 7, "theme.canvas"],
    backgroundItemCurrentHidden: "semantic.foregroundMuted",
    backgroundItemMenuItemHover: "semantic.backgroundSecondaryHover",
    backgroundTooltipMain: "semantic.backgroundInverse",
    backgroundTooltipBuilder: "semantic.backgroundPrimary",
    backgroundTooltipDesigner: "semantic.backgroundPrimary",
    backgroundSpacingTopBottom: "semantic.backgroundDisabled",
    backgroundSpacingLeftRight: "semantic.backgroundSecondary",
    backgroundSpacingHover: "semantic.backgroundSecondaryHover",
    backgroundStyleSourceSelected: "semantic.backgroundAccent",
    backgroundStyleSourceTag: "semantic.backgroundNegative",
    backgroundStyleSourceState: "semantic.backgroundPositive",
    backgroundStyleSourceNeutral: "semantic.foregroundSecondary",
    backgroundStyleSourceDisabled: "semantic.foregroundDisabled",
    backgroundStyleSourceGradientSelected: [
      "linearGradient",
      90,
      [
        {
          color: ["alpha", "theme.accent", 0],
          position: 0,
        },
        {
          color: "theme.accent",
          position: 31.87,
        },
      ],
    ],
    backgroundStyleSourceGradientTag: [
      "linearGradient",
      90,
      [
        {
          color: ["alpha", "theme.negative", 0],
          position: 0,
        },
        {
          color: "theme.negative",
          position: 31.87,
        },
      ],
    ],
    backgroundStyleSourceGradientUnselected: [
      "linearGradient",
      90,
      [
        {
          color: ["alpha", "theme.ink", 0],
          position: 0,
        },
        {
          color: "semantic.foregroundSecondary",
          position: 31.87,
        },
      ],
    ],
    backgroundStyleSourceBreakpoint: ["rotateHue", "theme.accent", 72],
    backgroundTopbar: "semantic.backgroundInverse",
    backgroundGradientPrimary: [
      "linearGradient",
      135,
      [
        {
          color: "theme.accent",
        },
        {
          color: ["rotateHue", "theme.accent", 72],
        },
      ],
    ],
    backgroundGradientVertical: [
      "linearGradient",
      180,
      [
        {
          color: "theme.accent",
        },
        {
          color: ["rotateHue", "theme.accent", 72],
        },
      ],
    ],
    backgroundGradientHorizontal: [
      "linearGradient",
      90,
      [
        {
          color: "theme.accent",
        },
        {
          color: ["rotateHue", "theme.accent", 72],
        },
      ],
    ],
    backgroundGradientHorizontalReverse: [
      "linearGradient",
      90,
      [
        {
          color: ["rotateHue", "theme.accent", 72],
        },
        {
          color: "theme.accent",
        },
      ],
    ],
    backgroundMenuHint: "semantic.backgroundSecondaryHover",
    backgroundTopbarHover: "semantic.backgroundInverseHover",
    backgroundWorkspace: "semantic.backgroundStrong",
    backgroundIconSubtle: ["mix", "theme.ink", 84, "theme.canvas"],
    backgroundPrimaryLight: ["mix", "theme.accent", 88, "theme.canvas"],
    backgroundOverwrittenMain: "semantic.backgroundNegativeSubtle",
    backgroundOverwrittenHover: "semantic.backgroundNegativeSubtleHover",
    backgroundDisabledDark: ["mix", "theme.ink", 88, "theme.canvas"],
    brandBackgroundProjectCardFront: [
      "linearGradient",
      0,
      [
        {
          color: "semantic.backgroundPrimary",
        },
        {
          color: "semantic.backgroundMuted",
        },
      ],
    ],
    brandBackgroundProjectCardBack: [
      "linearGradient",
      0,
      [
        {
          color: "semantic.backgroundPrimary",
        },
        {
          color: "semantic.backgroundStrong",
        },
      ],
    ],
    brandBackgroundProjectCardTextArea: "semantic.backgroundPrimary",
    brandBackgroundPublishedMain: "semantic.backgroundPositive",
    brandBackgroundGradient: [
      "linearGradient",
      180,
      [
        {
          color: ["rotateHue", "theme.accent", 72],
        },
        {
          color: ["rotateHue", "theme.accent", 210],
        },
      ],
    ],
    brandBackgroundPublishedContrast: "semantic.backgroundPositiveSubtle",
    brandBackgroundDashboard: [
      "layers",
      [
        [
          "radialGradient",
          {
            shape: "circle",
            position: [50, 50],
          },
          [
            {
              color: ["alpha", "theme.canvas", 100],
            },
            {
              color: ["alpha", "theme.canvas", 0],
              position: 55,
            },
          ],
        ],
        [
          "linearGradient",
          145,
          [
            {
              color: ["alpha", ["rotateHue", "theme.accent", 72], 24],
            },
            {
              color: ["alpha", "theme.positive", 16],
            },
            {
              color: "semantic.backgroundPrimary",
            },
          ],
        ],
      ],
    ],
    brandBackgroundRegularButtonSelected: [
      "linearGradient",
      180,
      [
        {
          color: ["mix", "theme.positive", 24, "theme.canvas"],
        },
        {
          color: "semantic.backgroundPrimary",
        },
      ],
    ],
    brandBackgroundCtaButton: [
      "linearGradient",
      135,
      [
        {
          color: "theme.accent",
        },
        {
          color: ["rotateHue", "theme.accent", 72],
        },
      ],
    ],
    brandForegroundPublished: "semantic.foregroundPositive",
    brandBorderPublished: "semantic.borderPositive",
    brandBorderFullGradient: [
      "linearGradient",
      135,
      [
        {
          color: "theme.positive",
        },
        {
          color: "theme.accent",
        },
        {
          color: ["rotateHue", "theme.accent", 72],
        },
        {
          color: ["rotateHue", "theme.accent", 210],
        },
      ],
    ],
    brandBorderNavbar: [
      "linearGradient",
      90,
      [
        {
          color: ["alpha", "theme.positive", 0],
        },
        {
          color: "theme.positive",
        },
        {
          color: "theme.accent",
        },
        {
          color: ["rotateHue", "theme.accent", 72],
        },
        {
          color: ["rotateHue", "theme.accent", 210],
        },
        {
          color: ["alpha", ["rotateHue", "theme.accent", 210], 0],
        },
      ],
    ],
    brandSpinnerTurquoise: "theme.positive",
    brandSpinnerBlue: "theme.accent",
    brandSpinnerPurple: ["rotateHue", "theme.accent", 72],
    brandSpinnerOrange: ["rotateHue", "theme.accent", 210],
    borderMain: "semantic.borderDefault",
    borderMenuInner: ["mix", "theme.canvas", 98, "theme.ink"],
    borderColorSwatch: "semantic.borderStrong",
    borderNeutral: "semantic.borderDefault",
    borderSuccess: "semantic.borderPositive",
    borderAlert: "semantic.borderWarning",
    borderInfo: "semantic.borderInformative",
    borderContrast: "semantic.foregroundInverse",
    borderItemChildLine: "semantic.foregroundMuted",
    borderItemChildLineCurrent: "semantic.borderAccent",
    borderLocalMain: "semantic.borderInformative",
    borderLocalFlexUi: "semantic.borderFocus",
    borderRemoteMain: "semantic.borderWarning",
    borderRemoteFlexUi: "semantic.foregroundWarning",
    borderDestructiveMain: "semantic.borderNegative",
    borderDestructiveNotification: [
      "mix",
      "theme.negative",
      30,
      "theme.canvas",
    ],
    borderDark: "semantic.borderStrong",
    borderOverwrittenMain: "semantic.borderNegative",
    borderOverwrittenFlexUi: "semantic.foregroundNegative",
    borderPrimary: "semantic.borderFocus",
    foregroundMain: "semantic.foregroundPrimary",
    foregroundSubtle: "semantic.foregroundSecondary",
    foregroundCategoryLabel: "semantic.foregroundMuted",
    foregroundTextSubtle: "semantic.foregroundSecondary",
    foregroundDestructive: "semantic.foregroundNegative",
    foregroundSuccess: "semantic.foregroundPositive",
    foregroundInfo: "semantic.foregroundInformative",
    foregroundDisabled: "semantic.foregroundDisabled",
    foregroundHiddenItem: "semantic.foregroundMuted",
    foregroundFlexUiMain: "semantic.foregroundDisabled",
    foregroundFlexUiHover: "semantic.foregroundSecondary",
    foregroundContrastMain: "semantic.foregroundInverse",
    foregroundContrastSubtle: "semantic.foregroundInverseSecondary",
    foregroundLocalMain: "semantic.foregroundInformative",
    foregroundLocalFlexUi: "semantic.foregroundInformative",
    foregroundRemoteMain: "semantic.foregroundWarning",
    foregroundRemoteFlexUi: "semantic.foregroundWarning",
    foregroundTextMoreSubtle: "semantic.foregroundMuted",
    foregroundPrimary: "semantic.foregroundAccent",
    foregroundSuccessText: "semantic.foregroundPositive",
    foregroundGridControlsDot: "semantic.foregroundDisabled",
    foregroundGridControlsDotHover: "semantic.foregroundSecondary",
    foregroundGridControlsFlexHover: "semantic.foregroundSecondary",
    foregroundIconSecondary: "semantic.foregroundDisabled",
    foregroundIconMain: "semantic.foregroundPrimary",
    foregroundMoreSubtle: "semantic.foregroundDisabled",
    foregroundScrollBar: ["alpha", "theme.ink", 48],
    foregroundOverwrittenMain: "semantic.foregroundNegative",
    foregroundOverwrittenFlexUi: "semantic.foregroundNegative",
    foregroundInversePrimary: ["rotateHue", "theme.accent", 145],
    foregroundReusable: ["rotateHue", "theme.accent", 72],
    maintenanceLight: "semantic.backgroundSecondary",
    maintenanceMedium: "semantic.backgroundStrong",
    maintenanceDark: "semantic.foregroundMuted",
    maintenanceSpacerViz: "semantic.backgroundNegativeSubtle",
    darkBlueFade: [
      "linearGradient",
      180,
      [
        {
          color: ["mix", "theme.accent", 18, "theme.ink"],
        },
        {
          color: ["alpha", "theme.ink", 0],
        },
      ],
    ],
    strokeFade: [
      "linearGradient",
      180,
      [
        {
          color: ["mix", "theme.accent", 70, "theme.canvas"],
        },
        {
          color: ["alpha", "theme.accent", 0],
        },
      ],
    ],
  },
} as const satisfies ColorTokenSource;
