import { create } from 'zustand';
import { getStorage } from '@/platform/storage';

export type TutorialStatus = 'never' | 'skipped' | 'completed';

const STATUS_KEY = 'tutorial.status';
const STEP_KEY = 'tutorial.lastStep';

interface TutorialState {
  status: TutorialStatus;
  lastStep: number;
  loaded: boolean;
  load(): Promise<void>;
  setStatus(status: TutorialStatus): Promise<void>;
  setLastStep(step: number): Promise<void>;
  reset(): Promise<void>;
}

export const useTutorialStore = create<TutorialState>((set) => ({
  status: 'never',
  lastStep: 0,
  loaded: false,

  async load() {
    const storage = getStorage();
    const status = (await storage.getSetting<TutorialStatus>(STATUS_KEY)) ?? 'never';
    const lastStep = (await storage.getSetting<number>(STEP_KEY)) ?? 0;
    set({ status, lastStep, loaded: true });
  },

  async setStatus(status) {
    await getStorage().setSetting(STATUS_KEY, status);
    set({ status });
  },

  async setLastStep(lastStep) {
    await getStorage().setSetting(STEP_KEY, lastStep);
    set({ lastStep });
  },

  async reset() {
    await getStorage().setSetting(STATUS_KEY, 'never');
    await getStorage().setSetting(STEP_KEY, 0);
    set({ status: 'never', lastStep: 0 });
  },
}));
