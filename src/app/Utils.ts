
export const tryGetStored = (name: string, defaultValue: any) => {
  return localStorage.getItem(name)
    ? JSON.parse(localStorage.getItem(name)!)
    : defaultValue;
};
