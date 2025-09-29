"use client";

import React from "react";
import toast, { Renderable, type ToastPosition } from "react-hot-toast";

// Types for our wrapper options
export interface BasicToastOptions {
  message: string;
  icon?: Renderable | undefined;
  duration?: number;
  position?: ToastPosition;
  style?: React.CSSProperties;
  className?: string;
}

export interface PromiseToastOptions<T = Renderable | undefined> {
  promise: Promise<T>;
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: string | Error) => string);
  };
  icon?: {
    loading?: Renderable | undefined;
    success?: Renderable | undefined;
    error?: Renderable | undefined;
  };
  duration?: {
    loading?: number;
    success?: number;
    error?: number;
  };
  position?: ToastPosition;
  style?: React.CSSProperties;
  className?: string;
}

// Simple wrapper utility for basic toasts
export const ToastAlert = {
  // Basic toast (default behavior)
  show: (options: BasicToastOptions) => {
    const { message, icon, duration, position, style, className } = options;

    return toast(message, {
      icon,
      duration,
      position,
      style,
      className,
    });
  },

  // Success toast (keeps original success styling)
  success: (message: string, options?: Omit<BasicToastOptions, "message">) => {
    const { icon, duration, position, style, className } = options || {};

    return toast.success(message, {
      icon,
      duration,
      position,
      style,
      className,
    });
  },

  // Error toast (keeps original error styling)
  error: (message: string, options?: Omit<BasicToastOptions, "message">) => {
    const { icon, duration, position, style, className } = options || {};

    return toast.error(message, {
      icon,
      duration,
      position,
      style,
      className,
    });
  },

  // Loading toast (keeps original loading styling)
  loading: (message: string, options?: Omit<BasicToastOptions, "message">) => {
    const { icon, duration, position, style, className } = options || {};

    return toast.loading(message, {
      icon,
      duration,
      position,
      style,
      className,
    });
  },

  // Promise toast wrapper
  promise: <T = unknown,>(options: PromiseToastOptions<T>) => {
    const { promise, messages, icon, duration, position, style, className } =
      options;

    return toast.promise(promise, messages, {
      position,
      style,
      className,
      loading: {
        duration: duration?.loading,
        icon: icon?.loading,
      },
      success: {
        duration: duration?.success,
        icon: icon?.success,
      },
      error: {
        duration: duration?.error,
        icon: icon?.error,
      },
    });
  },

  // Utility methods (direct pass-through)
  dismiss: (toastId?: string) => toast.dismiss(toastId),
  remove: (toastId: string) => toast.remove(toastId),
  custom: (jsx: (t: unknown) => React.ReactElement, options?: object) =>
    toast.custom(jsx, options),
};

// Export for convenience
export const toastUtils = ToastAlert;
