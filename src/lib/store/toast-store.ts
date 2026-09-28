import { create } from "zustand";

// One sitewide toast at a time (design handoff → Toast): fixed bottom-centre,
// ink background, auto-hides. An optional action (e.g. "Geri al" after
// removing a bag line) keeps it up a little longer.
export type Toast = {
  id: number;
  text: string;
  action?: { label: string; onClick: () => void };
};

type ToastState = {
  toast: Toast | null;
  show: (text: string, action?: Toast["action"]) => void;
  hide: () => void;
};

let timer: ReturnType<typeof setTimeout> | undefined;
let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  show: (text, action) => {
    clearTimeout(timer);
    set({ toast: { id: nextId++, text, action } });
    timer = setTimeout(() => set({ toast: null }), action ? 4000 : 2400);
  },
  hide: () => {
    clearTimeout(timer);
    set({ toast: null });
  },
}));

export const showToast = (text: string, action?: Toast["action"]) =>
  useToastStore.getState().show(text, action);
