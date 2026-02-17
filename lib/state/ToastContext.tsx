"use client";

import type { Toast } from "@/lib/interfaces/interfaces";
import { toast } from "sonner";

type ToastContextValue = {
  setToast: (toastData: Toast) => void;
};

export const useToast = (): ToastContextValue => {
  const setToast = (toastData: Toast) => {
    const { type, message, duration } = toastData;

    switch (type) {
      case "success":
        toast.success(message, { duration });
        break;

      case "error":
        toast.error(message, { duration });
        break;

      case "info":
        toast(message, { duration });
        break;

      default:
        toast(message, { duration });
    }
  };

  return { setToast };
};