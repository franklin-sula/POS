import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PaperProvider } from "react-native-paper";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";

import LoginScreen from "./src/screens/LoginScreen";
import BottomTabs from "./src/navigation/BottomTabs";

const Stack = createStackNavigator();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      cacheTime: Infinity,
      retry: 3,
      retryDelay: 3000,
    },
  },
});

const AppNavigator = () => {
  const { user } = useAuth();

  return (
    <Stack.Navigator>
      {user ? (
        <Stack.Screen
          name="MainApp"
          component={BottomTabs}
          options={{ headerShown: false }}
        />
      ) : (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider>
        <AuthProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
