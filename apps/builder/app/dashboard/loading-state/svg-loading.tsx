import { css, rawTheme } from "@webstudio-is/design-system";

const svgContainerStyle = css({
  filter: "drop-shadow(#183dcce3 4px -4px 15px) blur(.7px)",
});

const svgStyle = css({
  margin: "auto",
  background: "transparent",
  display: "block",
  opacity: "0.8",
});

export const SvgLoading = ({ size = 100 }: { size?: number }) => {
  return (
    <div className={svgContainerStyle()}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={svgStyle()}
        width={size}
        height={size}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid"
      >
        <defs>
          <filter
            id="ldio-j2o7tmr292-filter"
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="4"
            ></feGaussianBlur>
            <feComponentTransfer result="cutoff">
              <feFuncA type="linear" slope="60" intercept="-40"></feFuncA>
            </feComponentTransfer>
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="1"
              floodColor="#00ffff78"
            />
          </filter>
        </defs>
        <g filter="url(#ldio-j2o7tmr292-filter)">
          <animateTransform
            attributeName="transform"
            type="rotate"
            repeatCount="indefinite"
            dur="3.0303030303030303s"
            values="0 50 50;360 50 50"
            keyTimes="0;1"
          ></animateTransform>
          <g>
            <g transform="translate(50 20)">
              <circle
                cx="0"
                cy="0"
                r="17"
                fill="#FFAE3C"
                transform="scale(0.5)"
              >
                <animate
                  attributeType="XML"
                  attributeName="fill"
                  values={variations[0].join(";")}
                  dur="1.01s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
            <animateTransform
              attributeName="transform"
              calcMode="spline"
              type="rotate"
              values="0 50 50;360 50 50"
              keyTimes="0;1"
              dur="1.1"
              keySplines="0.7666666666666666 0 0.6666666666666666 1"
              repeatCount="indefinite"
            ></animateTransform>
          </g>
          <g>
            <g transform="translate(50 20)">
              <circle
                cx="0"
                cy="0"
                r="17"
                fill="#FFAE3C"
                transform="scale(0.5)"
              >
                <animate
                  attributeType="XML"
                  attributeName="fill"
                  values={variations[0].join(";")}
                  dur="1.01s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
            <animateTransform
              attributeName="transform"
              calcMode="spline"
              type="rotate"
              values="0 50 50;360 50 50"
              keyTimes="0;1"
              dur="1.1"
              keySplines="0.7333333333333333 0 0.6333333333333333 1"
              repeatCount="indefinite"
            ></animateTransform>
          </g>
          <g>
            <g transform="translate(50 20)">
              <circle
                cx="0"
                cy="0"
                r="17"
                fill="#FFAE3C"
                transform="scale(0.5)"
              >
                <animate
                  attributeType="XML"
                  attributeName="fill"
                  values={variations[0].join(";")}
                  dur="1.01s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
            <animateTransform
              attributeName="transform"
              calcMode="spline"
              type="rotate"
              values="0 50 50;360 50 50"
              keyTimes="0;1"
              dur="1.1"
              keySplines="0.7 0 0.6 1"
              repeatCount="indefinite"
            ></animateTransform>
          </g>
          <g>
            <g transform="translate(50 20)">
              <circle
                cx="0"
                cy="0"
                r="17"
                fill="#FFAE3C"
                transform="scale(0.5)"
              >
                <animate
                  attributeType="XML"
                  attributeName="fill"
                  values={variations[0].join(";")}
                  dur="1.01s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
            <animateTransform
              attributeName="transform"
              calcMode="spline"
              type="rotate"
              values="0 50 50;360 50 50"
              keyTimes="0;1"
              dur="1.1"
              keySplines="0.6666666666666666 0 0.5666666666666667 1"
              repeatCount="indefinite"
            ></animateTransform>
          </g>
          <g>
            <g transform="translate(50 20)">
              <circle
                cx="0"
                cy="0"
                r="17"
                fill="#FFAE3C"
                transform="scale(0.5)"
              >
                <animate
                  attributeType="XML"
                  attributeName="fill"
                  values={variations[1].join(";")}
                  dur="1.01s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
            <animateTransform
              attributeName="transform"
              calcMode="spline"
              type="rotate"
              values="0 50 50;360 50 50"
              keyTimes="0;1"
              dur="1.1"
              keySplines="0.6333333333333333 0 0.5333333333333333 1"
              repeatCount="indefinite"
            ></animateTransform>
          </g>
          <g>
            <g transform="translate(50 20)">
              <circle
                cx="0"
                cy="0"
                r="17"
                fill="#E63CFE"
                transform="scale(0.5)"
              >
                <animate
                  attributeType="XML"
                  attributeName="fill"
                  values={variations[1].join(";")}
                  dur="1.01s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
            <animateTransform
              attributeName="transform"
              calcMode="spline"
              type="rotate"
              values="0 50 50;360 50 50"
              keyTimes="0;1"
              dur="1.1"
              keySplines="0.6 0 0.5 1"
              repeatCount="indefinite"
            ></animateTransform>
          </g>
          <g>
            <g transform="translate(50 20)">
              <circle
                cx="0"
                cy="0"
                r="17"
                fill="#E63CFE"
                transform="scale(0.5)"
              >
                <animate
                  attributeType="XML"
                  attributeName="fill"
                  values={variations[1].join(";")}
                  dur="1.01s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
            <animateTransform
              attributeName="transform"
              calcMode="spline"
              type="rotate"
              values="0 50 50;360 50 50"
              keyTimes="0;1"
              dur="1.1"
              keySplines="0.5666666666666667 0 0.4666666666666667 1"
              repeatCount="indefinite"
            ></animateTransform>
          </g>
          <g>
            <g transform="translate(50 20)">
              <circle
                cx="0"
                cy="0"
                r="17"
                fill="#E63CFE"
                transform="scale(0.5)"
              >
                <animate
                  attributeType="XML"
                  attributeName="fill"
                  values={variations[1].join(";")}
                  dur="1.01s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
            <animateTransform
              attributeName="transform"
              calcMode="spline"
              type="rotate"
              values="0 50 50;360 50 50"
              keyTimes="0;1"
              dur="1.1"
              keySplines="0.5333333333333333 0 0.43333333333333335 1"
              repeatCount="indefinite"
            ></animateTransform>
          </g>
          <g>
            <g transform="translate(50 20)">
              <circle
                cx="0"
                cy="0"
                r="17"
                fill="#E63CFE"
                transform="scale(0.5)"
              >
                <animate
                  attributeType="XML"
                  attributeName="fill"
                  values={variations[2].join(";")}
                  dur="1.01s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
            <animateTransform
              attributeName="transform"
              calcMode="spline"
              type="rotate"
              values="0 50 50;360 50 50"
              keyTimes="0;1"
              dur="1.1"
              keySplines="0.5 0 0.4 1"
              repeatCount="indefinite"
            ></animateTransform>
          </g>
          <g>
            <g transform="translate(50 20)">
              <circle
                cx="0"
                cy="0"
                r="17"
                fill="#E63CFE"
                transform="scale(0.5)"
              >
                <animate
                  attributeType="XML"
                  attributeName="fill"
                  values={variations[2].join(";")}
                  dur="1.01s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
            <animateTransform
              attributeName="transform"
              calcMode="spline"
              type="rotate"
              values="0 50 50;360 50 50"
              keyTimes="0;1"
              dur="1.1"
              keySplines="0.4666666666666667 0 0.36666666666666664 1"
              repeatCount="indefinite"
            ></animateTransform>
          </g>
          <g>
            <g transform="translate(50 20)">
              <circle
                cx="0"
                cy="0"
                r="17"
                fill="#4A4EFA"
                transform="scale(0.5)"
              >
                <animate
                  attributeType="XML"
                  attributeName="fill"
                  values={variations[2].join(";")}
                  dur="1.01s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
            <animateTransform
              attributeName="transform"
              calcMode="spline"
              type="rotate"
              values="0 50 50;360 50 50"
              keyTimes="0;1"
              dur="1.1"
              keySplines="0.43333333333333335 0 0.3333333333333333 1"
              repeatCount="indefinite"
            ></animateTransform>
          </g>
          <g>
            <g transform="translate(50 20)">
              <circle
                cx="0"
                cy="0"
                r="17"
                fill="#4A4EFA"
                transform="scale(0.5)"
              >
                <animate
                  attributeType="XML"
                  attributeName="fill"
                  values={variations[2].join(";")}
                  dur="1.01s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
            <animateTransform
              attributeName="transform"
              calcMode="spline"
              type="rotate"
              values="0 50 50;360 50 50"
              keyTimes="0;1"
              dur="1.1"
              keySplines="0.4 0 0.3 1"
              repeatCount="indefinite"
            ></animateTransform>
          </g>
          <g>
            <g transform="translate(50 20)">
              <circle
                cx="0"
                cy="0"
                r="17"
                fill="#4A4EFA"
                transform="scale(0.5)"
              >
                <animate
                  attributeType="XML"
                  attributeName="fill"
                  values={variations[3].join(";")}
                  dur="1.01s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
            <animateTransform
              attributeName="transform"
              calcMode="spline"
              type="rotate"
              values="0 50 50;360 50 50"
              keyTimes="0;1"
              dur="1.1"
              keySplines="0.3666666666666667 0 0.26666666666666666 1"
              repeatCount="indefinite"
            ></animateTransform>
          </g>
          <g>
            <g transform="translate(50 20)">
              <circle
                cx="0"
                cy="0"
                r="17"
                fill="#4A4EFA"
                transform="scale(0.5)"
              >
                <animate
                  attributeType="XML"
                  attributeName="fill"
                  values={variations[3].join(";")}
                  dur="1.01s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
            <animateTransform
              attributeName="transform"
              calcMode="spline"
              type="rotate"
              values="0 50 50;360 50 50"
              keyTimes="0;1"
              dur="1.1"
              keySplines="0.33333333333333337 0 0.23333333333333334 1"
              repeatCount="indefinite"
            ></animateTransform>
          </g>
          <g>
            <g transform="translate(50 20)">
              <circle
                cx="0"
                cy="0"
                r="17"
                fill="#4A4EFA"
                transform="scale(0.5)"
              >
                <animate
                  attributeType="XML"
                  attributeName="fill"
                  values={variations[3].join(";")}
                  dur="1.01s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
            <animateTransform
              attributeName="transform"
              calcMode="spline"
              type="rotate"
              values="0 50 50;360 50 50"
              keyTimes="0;1"
              dur="1.1"
              keySplines="0.30000000000000004 0 0.2 1"
              repeatCount="indefinite"
            ></animateTransform>
          </g>
          <g>
            <g transform="translate(50 20)">
              <circle
                cx="0"
                cy="0"
                r="17"
                fill="#39FBBB"
                transform="scale(0.5)"
              >
                <animate
                  attributeType="XML"
                  attributeName="fill"
                  values={variations[3].join(";")}
                  dur="1.01s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
            <animateTransform
              attributeName="transform"
              calcMode="spline"
              type="rotate"
              values="0 50 50;360 50 50"
              keyTimes="0;1"
              dur="1.1"
              keySplines="0.26666666666666666 0 0.16666666666666666 1"
              repeatCount="indefinite"
            ></animateTransform>
          </g>
          <g>
            <g transform="translate(50 20)">
              <circle
                cx="0"
                cy="0"
                r="17"
                fill="#39FBBB"
                transform="scale(0.5)"
              >
                <animate
                  attributeType="XML"
                  attributeName="fill"
                  values={variations[4].join(";")}
                  dur="1.01s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
            <animateTransform
              attributeName="transform"
              calcMode="spline"
              type="rotate"
              values="0 50 50;360 50 50"
              keyTimes="0;1"
              dur="1.1"
              keySplines="0.23333333333333334 0 0.13333333333333333 1"
              repeatCount="indefinite"
            ></animateTransform>
          </g>
          <g>
            <g transform="translate(50 20)">
              <circle
                cx="0"
                cy="0"
                r="17"
                fill="#39FBBB"
                transform="scale(0.5)"
              >
                <animate
                  attributeType="XML"
                  attributeName="fill"
                  values={variations[4].join(";")}
                  dur="1.01s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
            <animateTransform
              attributeName="transform"
              calcMode="spline"
              type="rotate"
              values="0 50 50;360 50 50"
              keyTimes="0;1"
              dur="1.1"
              keySplines="0.2 0 0.1 1"
              repeatCount="indefinite"
            ></animateTransform>
          </g>
          <g>
            <g transform="translate(50 20)">
              <circle
                cx="0"
                cy="0"
                r="17"
                fill="#39FBBB"
                transform="scale(0.5)"
              >
                <animate
                  attributeType="XML"
                  attributeName="fill"
                  values={variations[4].join(";")}
                  dur="1.01s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
            <animateTransform
              attributeName="transform"
              calcMode="spline"
              type="rotate"
              values="0 50 50;360 50 50"
              keyTimes="0;1"
              dur="1.1"
              keySplines="0.16666666666666669 0 0.06666666666666667 1"
              repeatCount="indefinite"
            ></animateTransform>
          </g>
          <g>
            <g transform="translate(50 20)">
              <circle
                cx="0"
                cy="0"
                r="17"
                fill="#39FBBB"
                transform="scale(0.5)"
              >
                <animate
                  attributeType="XML"
                  attributeName="fill"
                  values={variations[4].join(";")}
                  dur="1.01s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
            <animateTransform
              attributeName="transform"
              calcMode="spline"
              type="rotate"
              values="0 50 50;360 50 50"
              keyTimes="0;1"
              dur="1.1"
              keySplines="0.13333333333333333 0 0.03333333333333333 1"
              repeatCount="indefinite"
            ></animateTransform>
          </g>
        </g>
      </svg>
    </div>
  );
};

const colors = {
  turquoise: rawTheme.colors.brandSpinnerTurquoise,
  blue: rawTheme.colors.brandSpinnerBlue,
  purple: rawTheme.colors.brandSpinnerPurple,
  orange: rawTheme.colors.brandSpinnerOrange,
};
const variations = [
  [
    colors.turquoise,
    colors.turquoise,
    colors.turquoise,
    colors.turquoise,
    colors.blue,
    colors.blue,
    colors.blue,
    colors.blue,
    colors.purple,
    colors.purple,
    colors.purple,
    colors.purple,
    colors.orange,
    colors.orange,
    colors.orange,
    colors.orange,
  ],
  [
    colors.turquoise,
    colors.turquoise,
    colors.turquoise,
    colors.turquoise,
    colors.blue,
    colors.blue,
    colors.blue,
    colors.blue,
    colors.purple,
    colors.purple,
    colors.purple,
    colors.purple,
    colors.orange,
    colors.orange,
    colors.orange,
    colors.orange,
  ],
  [
    colors.turquoise,
    colors.turquoise,
    colors.turquoise,
    colors.blue,
    colors.blue,
    colors.blue,
    colors.purple,
    colors.purple,
    colors.purple,
    colors.orange,
    colors.orange,
    colors.orange,
  ],
  [
    colors.turquoise,
    colors.turquoise,
    colors.blue,
    colors.blue,
    colors.purple,
    colors.purple,
    colors.orange,
    colors.orange,
  ],
  [colors.turquoise, colors.blue, colors.purple, colors.orange],
];
