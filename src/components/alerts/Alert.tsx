import React, { ReactNode } from "react";
import { X } from "react-feather";
import { mergeClassNames } from "../../libs/components";

interface AlertProps {
  className?: string;
  closeButtonClassName?: string;
  title?: ReactNode;
  icon?: ReactNode;
  dismissable?: boolean;
  onDismiss?: () => void;
  message: ReactNode;
}

const Alert: React.FC<AlertProps> = ({
  title = null,
  icon = null,
  className = "",
  closeButtonClassName = "",
  dismissable = false,
  onDismiss = null,
  message,
}) => {
  return (
    <div
      className={mergeClassNames(
        "relative flex items-center rounded-lg py-2 px-4",
        className
      )}
      role="alert"
    >
      {dismissable && onDismiss && (
        <button
          className={mergeClassNames(
            "absolute top-0 right-0 rounded-full p-1 m-1 transform ease-in-out duration-300",
            closeButtonClassName
          )}
          type="button"
          title="Close"
          onClick={() => onDismiss()}
        >
          {<X className="w-4 h-4" />}
        </button>
      )}
      {icon && (
        <div
          className="mr-4 flex-shrink-0"
          style={{ width: "30px", height: "30px" }}
        >
          {icon}
        </div>
      )}
      <div>
        {title && <h3 className="font-bold mb-1">{title}</h3>}
        <p>{message}</p>
      </div>
    </div>
  );
};

export default Alert;
