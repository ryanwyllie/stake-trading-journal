// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
export function escapeRegExp(value: string) {
  return value.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

export function debounce<T extends (...args: any) => void>(
  func: T,
  delay: number
): T {
  let timeoutId: number | null = null;
  let previousCall: number = 0;
  let args: any = undefined;

  const delayedCallback = () => {
    const timeSinceLastCall = Date.now() - previousCall;

    if (timeSinceLastCall > delay) {
      func(...args);
      timeoutId = null;
      previousCall = 0;
      args = undefined;
    } else {
      timeoutId = window.setTimeout(delayedCallback, delay - timeSinceLastCall);
    }
  };

  return (((...newArgs: any) => {
    if (timeoutId === null) {
      timeoutId = window.setTimeout(delayedCallback, delay);
    }

    args = newArgs;
    previousCall = Date.now();
  }) as unknown) as T;
}

export function clampImageHeight(
  height: number,
  width: number,
  maxHeight: number
) {
  let newHeight = height;
  let newWidth = width;

  if (height > maxHeight) {
    const ratio = maxHeight / height;
    newHeight = height * ratio;
    newWidth = width * ratio;
  }

  return [newHeight, newWidth] as [number, number];
}

export function clampImageWidth(
  height: number,
  width: number,
  maxWidth: number
) {
  let newHeight = height;
  let newWidth = width;

  if (width > maxWidth) {
    const ratio = maxWidth / width;
    newHeight = height * ratio;
    newWidth = width * ratio;
  }

  return [newHeight, newWidth] as [number, number];
}

export function clampImageSize(
  height: number,
  width: number,
  maxHeight: number,
  maxWidth: number
) {
  return clampImageWidth(
    ...clampImageHeight(height, width, maxHeight),
    maxWidth
  );
}
