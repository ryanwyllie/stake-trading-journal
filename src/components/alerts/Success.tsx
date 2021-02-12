import React, { ComponentProps } from "react";
import { CheckCircle } from "react-feather";
import Alert from "./Alert";
import { mergeClassNames } from "../../libs/components";

interface SuccessAlertProps
  extends Omit<ComponentProps<typeof Alert>, "icon" | "closeButtonClassName"> {}

const SuccessAlert: React.FC<SuccessAlertProps> = ({
  className = "",
  ...otherProps
}) => {
  return (
    <Alert
      className={mergeClassNames("bg-green-200 text-green-900", className)}
      closeButtonClassName="text-green-900 hover:bg-green-300 focus:bg-green-300"
      icon={<CheckCircle />}
      {...otherProps}
    />
  );
};

export default SuccessAlert;
