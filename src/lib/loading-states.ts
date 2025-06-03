import { atom } from 'nanostores';

export const loadingStates = {
  dashboard: atom(false),
  devices: atom(false),
  loans: atom(false),
  alerts: atom(false)
};

export const setLoading = (key: keyof typeof loadingStates, value: boolean) => {
  loadingStates[key].set(value);
};

export const getLoadingState = (key: keyof typeof loadingStates) => {
  return loadingStates[key].get();
};
