import React from "react";

export const mergeClassNames = (base: string, overrides: string) => {
  const overrideKeys = overrides
    .split(" ")
    .reduce<string[]>((carry, override) => {
      const prefix = override.split("-").slice(0, -1).join("-");

      if (prefix !== "") {
        carry.push(prefix);
      }

      return carry;
    }, []);
  const filteredBaseclassNames = base
    .split(" ")
    .filter(
      (className) =>
        !overrideKeys.some((overrideKey) => className.startsWith(overrideKey))
    )
    .join(" ");
  return `${filteredBaseclassNames} ${overrides}`;
};

export function mergeRefs<T = any>(
  refs: Array<React.MutableRefObject<T> | React.LegacyRef<T>>
): React.RefCallback<T> {
  return (value) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") {
        ref(value);
      } else if (ref !== null) {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    });
  };
}
