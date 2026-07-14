import { create } from "zustand";

export interface Toast {
  id: string;
  message: string;
  variant?: "default" | "success" | "warning" | "danger";
}

interface UIState {
  toasts: Toast[];
  activeModal: string | null;
  showToast: (toast: Toast) => void;
  dismissToast: (id: string) => void;
  openModal: (id: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  activeModal: null,
  showToast: (toast) => set((s) => ({ toasts: [...s.toasts, toast] })),
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
}));
