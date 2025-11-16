import { Link } from "expo-router";
import { StyleSheet } from "react-native";
import { UserRole, UserStatus } from "@surf-iscool/types";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function ModalScreen() {
  console.log("UserRole.Student =", UserRole.Student);
  console.log("UserStatus.Active =", UserStatus.Active);

  const role: UserRole = UserRole.Student;
  const status: UserStatus = UserStatus.Active;

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Role: {role}</ThemedText>
      <Link href="/" dismissTo style={styles.link}>
        <ThemedText type="link">Status {status}</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
