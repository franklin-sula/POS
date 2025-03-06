import React, { useState } from "react";
import {
  View,
  Button,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { TextInput as PaperInput } from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../contexts/AuthContext";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const LoginScreen = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, isLoading } = useAuth();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data) => {
    try {
      // Navigation will be handled by watching auth state
      await signIn(data.email, data.password);
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Login</Text>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <PaperInput
            label="Email"
            value={value}
            onChangeText={onChange}
            keyboardType="email-address"
            style={styles.input}
            error={!!errors.email}
          />
        )}
      />
      {errors.email && (
        <Text style={styles.errorText}>{errors.email.message}</Text>
      )}

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <PaperInput
            label="Password"
            value={value}
            onChangeText={onChange}
            secureTextEntry={!showPassword}
            style={styles.input}
            error={!!errors.password}
            right={
              <PaperInput.Icon
                icon={showPassword ? "eye-off" : "eye"}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />
        )}
      />
      {errors.password && (
        <Text style={styles.errorText}>{errors.password.message}</Text>
      )}

      <Button title="Login" onPress={handleSubmit(onSubmit)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    fontSize: 24,
    marginBottom: 20,
  },
  input: {
    width: "100%",
    marginBottom: 5,
  },
  errorText: {
    color: "red",
    marginBottom: 10,
    fontSize: 12,
    alignSelf: "flex-start",
  },
});

export default LoginScreen;
