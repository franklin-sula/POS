import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useTheme } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import ProductScreen from "../screens/ProductScreen";
import OrdersScreen from "../screens/OrdersScreen";
import SettingsScreen from "../screens/SettingsScreen";
import TransactionScreen from "../screens/TransactionScreen";

const Tab = createBottomTabNavigator();

const BottomTabs = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.secondary,
      }}
    >
      <Tab.Screen
        name="Products"
        component={ProductScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="shopping" color={color} size={size} />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="receipt" color={color} size={size} />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Transaction"
        component={TransactionScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="receipt" color={color} size={size} />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="cog" color={color} size={size} />
          ),
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabs;
