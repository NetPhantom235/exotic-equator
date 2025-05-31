/**
 * Declaraciones de tipos globales para toda la aplicación
 */

/// <reference types="astro/client" />

import type { AuthUser } from './lib/auth/authService';

declare namespace App {
  interface Locals {
    user?: {
      id: string;
      email: string;
      role: string;
    };
  }
}

declare namespace Astro {
  interface Locals {
    user?: {
      id: string;
      email: string;
      role: string;
      [key: string]: any;
    };
  }
}

declare interface Locals {
  user?: {
    id: string;
    email: string;
    role: string;
    [key: string]: any;
  };
}

interface ImportMetaEnv {
  readonly SITE_URL: string;
  readonly DATABASE_URL: string;
  readonly JWT_SECRET: string;
  readonly NODE_ENV: 'development' | 'production';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  toast?: {
    success: (message: string, title?: string, details?: string) => void;
    error: (message: string, title?: string, details?: string) => void;
    warning: (message: string, title?: string, details?: string) => void;
    info: (message: string, title?: string, details?: string) => void;
  };
  showGlobalLoader?: () => void;
  hideGlobalLoader?: () => void;
}

interface HTMLElement {
  showActionConfirmation?: (action: string) => void;
}