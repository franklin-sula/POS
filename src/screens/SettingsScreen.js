import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAuth } from "../contexts/AuthContext";

const SettingsScreen = () => {
  const { signOut } = useAuth();

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  signOutButton: {
    marginRight: 10,
    padding: 8,
  },
  signOutText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "medium",
  },
});

export default SettingsScreen;
