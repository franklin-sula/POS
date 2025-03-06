import React, { createContext, useContext, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";
import { authService } from "../services/auth";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();

  // Monitor network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        // Refresh session when coming back online
        queryClient.invalidateQueries(["auth"]);
        authService.refreshSession();
      }
    });

    return () => unsubscribe();
  }, []);

  const { data: sessionData, isLoading } = useQuery({
    queryKey: ["auth"],
    queryFn: () => authService.getSession(),
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  const signInMutation = useMutation({
    mutationFn: ({ email, password }) => authService.signIn(email, password),
    onSuccess: (data) => {
      queryClient.setQueryData(["auth"], data);
    },
  });

  const signOutMutation = useMutation({
    mutationFn: () => authService.signOut(),
    onSuccess: () => {
      queryClient.setQueryData(["auth"], null);
    },
  });

  const value = {
    user: sessionData?.session?.user ?? null,
    isLoading,
    signIn: (email, password) =>
      signInMutation.mutateAsync({ email, password }),
    signOut: () => signOutMutation.mutateAsync(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
