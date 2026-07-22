import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "~/database.types";

import "react-native-url-polyfill/auto";

const authStorage = {
  getItem(key: string) {
    return getItemAsync(key);
  },
  setItem(key: string, value: string) {
    return setItemAsync(key, value);
  },
  removeItem(key: string) {
    return deleteItemAsync(key);
  },
};

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
