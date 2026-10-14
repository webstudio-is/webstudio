import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type ComponentProps,
  type ElementRef,
} from "react";
import {
  useLocation,
  useNavigate,
  useNavigation,
  useRevalidator,
} from "@remix-run/react";
import { Form as SharedForm } from "@webstudio-is/sdk-components-react/components";

export const Form = forwardRef<
  ElementRef<typeof SharedForm>,
  ComponentProps<typeof SharedForm>
>((props, ref) => {
  const location = useLocation();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const navigationToken = `${location.key}:${navigation.location?.key ?? ""}`;
  const pendingRefresh = useRef<
    { sawLoading: boolean; resolve: () => void } | undefined
  >();
  const previousNavigationToken = useRef(navigationToken);
  const resolvePendingRefresh = useCallback(() => {
    pendingRefresh.current?.resolve();
    pendingRefresh.current = undefined;
  }, []);

  useEffect(() => {
    if (previousNavigationToken.current !== navigationToken) {
      resolvePendingRefresh();
      previousNavigationToken.current = navigationToken;
    }
  }, [navigationToken, resolvePendingRefresh]);
  useEffect(() => {
    const refresh = pendingRefresh.current;
    if (revalidator.state === "loading") {
      if (refresh) {
        refresh.sawLoading = true;
      }
    } else if (refresh?.sawLoading) {
      resolvePendingRefresh();
    }
  }, [revalidator.state, resolvePendingRefresh]);
  useEffect(() => () => resolvePendingRefresh(), [resolvePendingRefresh]);

  const revalidate = () => {
    const refreshPromise = new Promise<void>((resolve) => {
      pendingRefresh.current = {
        sawLoading: revalidator.state === "loading",
        resolve,
      };
    });
    revalidator.revalidate();
    requestAnimationFrame(() => {
      if (!pendingRefresh.current?.sawLoading) {
        resolvePendingRefresh();
      }
    });
    return refreshPromise;
  };

  return (
    <SharedForm
      {...props}
      ref={ref}
      navigationToken={navigationToken}
      onSubmissionSuccess={revalidate}
      onQueryNavigate={(url) => navigate(url, { preventScrollReset: true })}
    />
  );
});

Form.displayName = "Form";
