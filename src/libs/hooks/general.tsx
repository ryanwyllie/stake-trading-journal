import React, {
  useRef,
  useContext,
  useEffect,
  useCallback,
  useState,
  useMemo,
} from "react";
import ErrorAlert from "../../components/alerts/Error";
import LoaderIcon from "../../components/icons/Loader";

export const usePrevious = <T extends any>(value: T): T | null => {
  const ref = useRef<T | null>(null);
  const previousValue = ref.current;

  if (value !== undefined && value !== previousValue) {
    ref.current = value;
  }

  return previousValue;
};

interface ErrorAlertProps {
  className?: string;
  dismissable?: boolean;
}
export const useErrorAlert = () => {
  const [errorData, set] = useState<{
    title: string;
    message: React.ReactNode;
  } | null>(null);

  const clear = () => set(null);

  const error = (props?: ErrorAlertProps) => {
    const { className = "", dismissable = true } = props || {};
    return errorData ? (
      <ErrorAlert
        className={className}
        title={errorData.title}
        message={errorData.message}
        dismissable={dismissable}
        onDismiss={clear}
      />
    ) : null;
  };

  return {
    error,
    set,
    clear,
    has: () => errorData !== null,
  };
};

interface UseAsyncStateProps {
  defaultLoading?: boolean;
}
export const useAsyncState = (props?: UseAsyncStateProps) => {
  const { defaultLoading = false } = props || {};
  const [loading, setLoading] = useState(defaultLoading);
  const {
    error,
    set: setError,
    clear: clearError,
    has: hasError,
  } = useErrorAlert();

  const loadingText = (textProps: { loading: string; default: string }) => {
    return loading ? (
      <div className="flex items-center">
        <LoaderIcon className="mr-2" />
        <span>{textProps.loading}</span>
      </div>
    ) : (
      textProps.default
    );
  };

  return {
    loading,
    loadingText,
    setLoading,
    error,
    setError,
    clearError,
    hasError,
  };
};
