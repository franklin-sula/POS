import { supabase } from "../lib/supabase";
import { storageService } from "./storageService";
import NetInfo from "@react-native-community/netinfo";

export const authService = {
  signIn: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Save session for offline access
      await storageService.saveSession(data.session);
      return data;
    } catch (error) {
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        // Try to get stored session when offline
        const storedSession = await storageService.getSession();
        if (storedSession) {
          return { session: storedSession };
        }
      }
      throw error;
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    await storageService.clearSession();
  },

  getSession: async () => {
    try {
      // Try to get online session first
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (session) {
        await storageService.saveSession(session);
        return { session };
      }
      if (error) throw error;

      // If no online session, try stored session
      const storedSession = await storageService.getSession();
      return storedSession ? { session: storedSession } : null;
    } catch (error) {
      // If offline, use stored session
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        const storedSession = await storageService.getSession();
        return storedSession ? { session: storedSession } : null;
      }
      throw error;
    }
  },

  refreshSession: async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();
      if (error) throw error;
      if (session) {
        await storageService.saveSession(session);
      }
      return { session };
    } catch (error) {
      const storedSession = await storageService.getSession();
      return storedSession ? { session: storedSession } : null;
    }
  },
};
