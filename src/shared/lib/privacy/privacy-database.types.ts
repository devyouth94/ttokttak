import type { Database } from "~/shared/api/database.types";

export type ContentKeyRecoveryAuditEventInsert =
  Database["public"]["Tables"]["content_key_recovery_audit_events"]["Insert"];
export type ContentKeyRecoveryAuditEventRow =
  Database["public"]["Tables"]["content_key_recovery_audit_events"]["Row"];
export type UserContentEncryptionKeyInsert =
  Database["public"]["Tables"]["user_content_encryption_keys"]["Insert"];
export type UserContentEncryptionKeyRow =
  Database["public"]["Tables"]["user_content_encryption_keys"]["Row"];
