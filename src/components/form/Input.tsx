import React, { forwardRef, useMemo, useState } from "react";
import { nanoid } from "nanoid";
import { mergeClassNames } from "../../libs/components";
import { debounce } from "../../libs/utils";

interface InputProps
  extends React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  > {
  error?: boolean;
  className?: string;
  debounceOnChange?: (newValue: string) => void;
  debounceTimeout?: number;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = "",
      id = nanoid(),
      error = false,
      debounceOnChange = undefined,
      debounceTimeout = 500,
      value,
      onChange,
      ...inputProps
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState(
      value === undefined ? "" : value
    );

    const debouncedUpdate = useMemo(
      () =>
        debounce((newValue: string) => {
          if (debounceOnChange) {
            debounceOnChange(newValue);
          }
        }, debounceTimeout),
      [debounceOnChange, debounceTimeout]
    );

    const internalOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInternalValue(e.target.value);
      debouncedUpdate(e.target.value);
    };

    return (
      <input
        ref={ref}
        id={id}
        className={mergeClassNames(
          `py-3 px-4 w-full rounded-lg default-transition border-2 focus:border-black ${
            error ? "border-red-500" : "border-gray-300"
          }`,
          className
        )}
        value={debounceOnChange ? internalValue : value}
        onChange={debounceOnChange ? internalOnChange : onChange}
        {...inputProps}
      />
    );
  }
);

export default Input;
