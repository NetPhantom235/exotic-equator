import { showToast } from '../stores/toastStore.js';

export const notify = {
  success: (message: string) => {
    showToast({
      type: 'success',
      message,
      duration: 3000
    });
  },

  error: (message: string) => {
    showToast({
      type: 'error',
      message,
      duration: 5000
    });
  },

  warning: (message: string) => {
    showToast({
      type: 'warning',
      message,
      duration: 4000
    });
  },

  info: (message: string) => {
    showToast({
      type: 'info',
      message,
      duration: 3000
    });
  }
}; 