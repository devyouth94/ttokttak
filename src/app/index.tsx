import { StyleSheet, Text, View } from "react-native";

export default function IndexScreen() {
  return (
    <View style={styles.container}>
      <Text>index</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
