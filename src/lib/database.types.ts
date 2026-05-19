export type Database = {
  public: {
    Tables: {
      content_key_recovery_audit_events: {
        Row: {
          action: string;
          created_at: string;
          id: string;
          key_version: number | null;
          result: string;
          user_id: string;
        };
        Insert: {
          action: string;
          created_at?: string;
          id?: string;
          key_version?: number | null;
          result: string;
          user_id: string;
        };
        Update: {
          action?: string;
          created_at?: string;
          id?: string;
          key_version?: number | null;
          result?: string;
          user_id?: string;
        };
        Relationships: [
          {
            columns: ["user_id"];
            foreignKeyName: "content_key_recovery_audit_events_user_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "profiles";
          },
        ];
      };
      completion_logs: {
        Row: {
          acted_at_utc: string;
          action: string;
          created_at: string;
          id: string;
          item_id: string;
          scheduled_at_utc: string;
          user_id: string;
        };
        Insert: {
          acted_at_utc?: string;
          action: string;
          created_at?: string;
          id?: string;
          item_id: string;
          scheduled_at_utc: string;
          user_id: string;
        };
        Update: {
          acted_at_utc?: string;
          action?: string;
          created_at?: string;
          id?: string;
          item_id?: string;
          scheduled_at_utc?: string;
          user_id?: string;
        };
        Relationships: [
          {
            columns: ["item_id"];
            foreignKeyName: "completion_logs_item_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "recurring_items";
          },
          {
            columns: ["user_id"];
            foreignKeyName: "completion_logs_user_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "profiles";
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_content_encryption_keys: {
        Row: {
          created_at: string;
          key_version: number;
          updated_at: string;
          user_id: string;
          wrap_algorithm: string;
          wrap_metadata: Record<string, unknown>;
          wrapped_key: string;
        };
        Insert: {
          created_at?: string;
          key_version?: number;
          updated_at?: string;
          user_id: string;
          wrap_algorithm: string;
          wrap_metadata?: Record<string, unknown>;
          wrapped_key: string;
        };
        Update: {
          created_at?: string;
          key_version?: number;
          updated_at?: string;
          user_id?: string;
          wrap_algorithm?: string;
          wrap_metadata?: Record<string, unknown>;
          wrapped_key?: string;
        };
        Relationships: [
          {
            columns: ["user_id"];
            foreignKeyName: "user_content_encryption_keys_user_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "profiles";
          },
        ];
      };
      recurring_items: {
        Row: {
          color_key: string;
          content_encryption_metadata: Record<string, unknown>;
          content_key_version: number;
          created_at: string;
          description_ciphertext: string | null;
          id: string;
          is_archived: boolean;
          start_date_local: string;
          title_ciphertext: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          color_key?: string;
          content_encryption_metadata?: Record<string, unknown>;
          content_key_version?: number;
          created_at?: string;
          description_ciphertext?: string | null;
          id?: string;
          is_archived?: boolean;
          start_date_local: string;
          title_ciphertext: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          color_key?: string;
          content_encryption_metadata?: Record<string, unknown>;
          content_key_version?: number;
          created_at?: string;
          description_ciphertext?: string | null;
          id?: string;
          is_archived?: boolean;
          start_date_local?: string;
          title_ciphertext?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            columns: ["user_id"];
            foreignKeyName: "recurring_items_user_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "profiles";
          },
        ];
      };
      recurring_item_schedule_versions: {
        Row: {
          anchor_type: string;
          created_at: string;
          effective_from_utc: string;
          end_date_local: string | null;
          id: string;
          interval_value: number | null;
          item_id: string;
          notifications_enabled: boolean;
          recurrence_type: string;
          reminder_time_local: string;
          seed_start_date_local: string;
          user_id: string;
          weekday_mask: number[] | null;
        };
        Insert: {
          anchor_type?: string;
          created_at?: string;
          effective_from_utc: string;
          end_date_local?: string | null;
          id?: string;
          interval_value?: number | null;
          item_id: string;
          notifications_enabled?: boolean;
          recurrence_type: string;
          reminder_time_local: string;
          seed_start_date_local: string;
          user_id: string;
          weekday_mask?: number[] | null;
        };
        Update: {
          anchor_type?: string;
          created_at?: string;
          effective_from_utc?: string;
          end_date_local?: string | null;
          id?: string;
          interval_value?: number | null;
          item_id?: string;
          notifications_enabled?: boolean;
          recurrence_type?: string;
          reminder_time_local?: string;
          seed_start_date_local?: string;
          user_id?: string;
          weekday_mask?: number[] | null;
        };
        Relationships: [
          {
            columns: ["item_id"];
            foreignKeyName: "recurring_item_schedule_versions_item_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "recurring_items";
          },
          {
            columns: ["user_id"];
            foreignKeyName: "recurring_item_schedule_versions_user_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "profiles";
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      archive_recurring_item: {
        Args: {
          p_item_id: string;
        };
        Returns: undefined;
      };
      create_recurring_item_with_initial_version: {
        Args: {
          p_anchor_type: string;
          p_color_key?: string | null;
          p_content_encryption_metadata: Record<string, unknown>;
          p_content_key_version: number;
          p_description_ciphertext: string | null;
          p_effective_from_utc: string;
          p_end_date_local?: string | null;
          p_interval_value: number | null;
          p_is_archived: boolean;
          p_notifications_enabled: boolean;
          p_recurrence_type: string;
          p_reminder_time_local: string;
          p_seed_start_date_local: string;
          p_start_date_local: string;
          p_title_ciphertext: string;
          p_user_id: string;
          p_weekday_mask: number[] | null;
        };
        Returns: string;
      };
      update_recurring_item_with_edit_policy: {
        Args: {
          p_anchor_type?: string | null;
          p_color_key?: string | null;
          p_content_encryption_metadata: Record<string, unknown>;
          p_content_key_version: number;
          p_description_ciphertext: string | null;
          p_effective_from_utc?: string | null;
          p_end_date_local?: string | null;
          p_has_rule_changes: boolean;
          p_interval_value?: number | null;
          p_is_archived: boolean;
          p_item_id: string;
          p_notifications_enabled?: boolean | null;
          p_recurrence_type?: string | null;
          p_reminder_time_local?: string | null;
          p_seed_start_date_local?: string | null;
          p_title_ciphertext: string;
          p_user_id: string;
          p_weekday_mask?: number[] | null;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type CompletionLogInsert =
  Database["public"]["Tables"]["completion_logs"]["Insert"];
export type CompletionLogRow =
  Database["public"]["Tables"]["completion_logs"]["Row"];
export type ContentKeyRecoveryAuditEventInsert =
  Database["public"]["Tables"]["content_key_recovery_audit_events"]["Insert"];
export type ContentKeyRecoveryAuditEventRow =
  Database["public"]["Tables"]["content_key_recovery_audit_events"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type RecurringItemInsert =
  Database["public"]["Tables"]["recurring_items"]["Insert"];
export type RecurringItemRow =
  Database["public"]["Tables"]["recurring_items"]["Row"];
export type RecurringItemUpdate =
  Database["public"]["Tables"]["recurring_items"]["Update"];
export type RecurringItemScheduleVersionInsert =
  Database["public"]["Tables"]["recurring_item_schedule_versions"]["Insert"];
export type RecurringItemScheduleVersionRow =
  Database["public"]["Tables"]["recurring_item_schedule_versions"]["Row"];
export type UserContentEncryptionKeyInsert =
  Database["public"]["Tables"]["user_content_encryption_keys"]["Insert"];
export type UserContentEncryptionKeyRow =
  Database["public"]["Tables"]["user_content_encryption_keys"]["Row"];
