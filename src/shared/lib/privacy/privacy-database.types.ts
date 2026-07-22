import type { Database } from "~/database.types";

export type UserContentEncryptionKeyInsert =
  Database["public"]["Tables"]["user_content_encryption_keys"]["Insert"];
export type UserContentEncryptionKeyRow =
  Database["public"]["Tables"]["user_content_encryption_keys"]["Row"];
