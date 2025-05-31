import { atom } from 'nanostores';

export interface ToastMessage {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export const toastStore = atom<ToastMessage | null>(null);

export function showToast(toast: ToastMessage) {
  toastStore.set(toast);
  
  if (toast.duration !== 0) {
    setTimeout(() => {
      toastStore.set(null);
    }, toast.duration || 3000);
  }
}

export function hideToast() {
  toastStore.set(null);
} 