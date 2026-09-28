import { create } from 'zustand';

/** In-memory session gate before the main app (local sign-in, not cloud). */
interface AuthSessionState {
  signedIn: boolean;
  signIn(): void;
  signOut(): void;
}

export const useAuthSessionStore = create<AuthSessionState>((set) => ({
  signedIn: false,
  signIn: () => set({ signedIn: true }),
  signOut: () => set({ signedIn: false }),
}));
