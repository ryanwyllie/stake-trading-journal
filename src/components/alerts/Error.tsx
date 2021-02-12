import React, { ComponentProps } from "react";
import { AlertCircle } from "react-feather";
import Alert from "./Alert";
import { mergeClassNames } from "../../libs/components";

interface ErrorAlertProps
  extends Omit<ComponentProps<typeof Alert>, "icon" | "closeButtonClassName"> {}

const ErrorAlert: React.FC<ErrorAlertProps> = ({
  className = "",
  ...otherProps
}) => {
  return (
    <Alert
      className={mergeClassNames("bg-red-200 text-red-900", className)}
      closeButtonClassName="text-red-900 hover:bg-red-300 focus:bg-red-300"
      icon={<AlertCircle />}
      {...otherProps}
    />
  );
};

export default ErrorAlert;
