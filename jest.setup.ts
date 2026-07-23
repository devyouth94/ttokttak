process.env.EXPO_PUBLIC_SUPABASE_URL ??= "http://localhost:54321";
process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= "test-key";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock"
  )
);
