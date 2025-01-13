export const tryGetStored = (name: string, defaultValue: any) => {
  if (typeof window === "undefined") return defaultValue;

  return window.localStorage.getItem(name)
    ? JSON.parse(window.localStorage.getItem(name)!)
    : defaultValue;
};
