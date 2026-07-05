import { create } from 'zustand';

interface KBState {
  activeKBId: string | null;
  setActiveKB: (id: string | null) => void;
}

export const useKBStore = create<KBState>(set => ({
  activeKBId: null,
  setActiveKB: id => set({ activeKBId: id }),
}));
