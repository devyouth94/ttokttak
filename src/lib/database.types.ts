export type Database = {
  public: {
    Tables: {
      completion_logs: {
        Row: {
          acted_at_utc: string;
          action: string;
          created_at: string;
          device_id: string | null;
          id: string;
          item_id: string;
          scheduled_at_utc: string;
          user_id: string;
        };
        Insert: {
          acted_at_utc?: string;
          action: string;
          created_at?: string;
          device_id?: string | null;
          id?: string;
          item_id: string;
          scheduled_at_utc: string;
          user_id: string;
        };
        Update: {
          acted_at_utc?: string;
          action?: string;
          created_at?: string;
          device_id?: string | null;
          id?: string;
          item_id?: string;
          scheduled_at_utc?: string;
          user_id?: string;
        };
        Relationships: [
          {
            columns: ["device_id"];
            foreignKeyName: "completion_logs_device_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "devices";
          },
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
      device_push_tokens: {
        Row: {
          created_at: string;
          deactivated_at: string | null;
          deactivation_reason: string | null;
          device_id: string;
          id: string;
          is_active: boolean;
          last_registered_at: string;
          permission_status: string;
          platform: string;
          push_provider: string;
          push_token: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          deactivated_at?: string | null;
          deactivation_reason?: string | null;
          device_id: string;
          id?: string;
          is_active?: boolean;
          last_registered_at?: string;
          permission_status?: string;
          platform: string;
          push_provider: string;
          push_token: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          deactivated_at?: string | null;
          deactivation_reason?: string | null;
          device_id?: string;
          id?: string;
          is_active?: boolean;
          last_registered_at?: string;
          permission_status?: string;
          platform?: string;
          push_provider?: string;
          push_token?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            columns: ["device_id"];
            foreignKeyName: "device_push_tokens_device_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "devices";
          },
          {
            columns: ["user_id"];
            foreignKeyName: "device_push_tokens_user_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "profiles";
          },
        ];
      };
      notification_delivery_attempts: {
        Row: {
          attempt_number: number;
          attempted_at: string;
          created_at: string;
          device_id: string | null;
          id: string;
          job_id: string;
          platform: string;
          provider_error_code: string | null;
          provider_error_message: string | null;
          provider_message_id: string | null;
          push_provider: string;
          push_token_ref: string;
          push_token_id: string | null;
          response_payload: Record<string, unknown>;
          status: string;
          user_id: string;
        };
        Insert: {
          attempt_number: number;
          attempted_at?: string;
          created_at?: string;
          device_id?: string | null;
          id?: string;
          job_id: string;
          platform: string;
          provider_error_code?: string | null;
          provider_error_message?: string | null;
          provider_message_id?: string | null;
          push_provider: string;
          push_token_ref: string;
          push_token_id?: string | null;
          response_payload?: Record<string, unknown>;
          status: string;
          user_id: string;
        };
        Update: {
          attempt_number?: number;
          attempted_at?: string;
          created_at?: string;
          device_id?: string | null;
          id?: string;
          job_id?: string;
          platform?: string;
          provider_error_code?: string | null;
          provider_error_message?: string | null;
          provider_message_id?: string | null;
          push_provider?: string;
          push_token_ref?: string;
          push_token_id?: string | null;
          response_payload?: Record<string, unknown>;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            columns: ["device_id"];
            foreignKeyName: "notification_delivery_attempts_device_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "devices";
          },
          {
            columns: ["job_id"];
            foreignKeyName: "notification_delivery_attempts_job_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "notification_delivery_jobs";
          },
          {
            columns: ["push_token_id"];
            foreignKeyName: "notification_delivery_attempts_push_token_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "device_push_tokens";
          },
          {
            columns: ["user_id"];
            foreignKeyName: "notification_delivery_attempts_user_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "profiles";
          },
        ];
      };
      notification_delivery_jobs: {
        Row: {
          body: string;
          cancel_reason: string | null;
          cancelled_at: string | null;
          completed_at: string | null;
          created_at: string;
          dedupe_key: string;
          deliver_at_utc: string;
          failure_count: number;
          id: string;
          item_id: string;
          item_scheduled_at_utc: string;
          last_attempted_at: string | null;
          next_retry_at: string | null;
          notification_kind: string;
          payload: Record<string, unknown>;
          retry_count: number;
          status: string;
          success_count: number;
          target_token_count: number;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          body: string;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          dedupe_key: string;
          deliver_at_utc: string;
          failure_count?: number;
          id?: string;
          item_id: string;
          item_scheduled_at_utc: string;
          last_attempted_at?: string | null;
          next_retry_at?: string | null;
          notification_kind?: string;
          payload?: Record<string, unknown>;
          retry_count?: number;
          status?: string;
          success_count?: number;
          target_token_count?: number;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          dedupe_key?: string;
          deliver_at_utc?: string;
          failure_count?: number;
          id?: string;
          item_id?: string;
          item_scheduled_at_utc?: string;
          last_attempted_at?: string | null;
          next_retry_at?: string | null;
          notification_kind?: string;
          payload?: Record<string, unknown>;
          retry_count?: number;
          status?: string;
          success_count?: number;
          target_token_count?: number;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            columns: ["item_id"];
            foreignKeyName: "notification_delivery_jobs_item_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "recurring_items";
          },
          {
            columns: ["user_id"];
            foreignKeyName: "notification_delivery_jobs_user_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "profiles";
          },
        ];
      };
      notification_inbox_items: {
        Row: {
          body: string;
          created_at: string;
          delivered_at_utc: string;
          hidden_at: string | null;
          id: string;
          item_id: string;
          item_scheduled_at_utc: string;
          notification_kind: string;
          payload: Record<string, unknown>;
          read_at: string | null;
          source_job_id: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          delivered_at_utc: string;
          hidden_at?: string | null;
          id?: string;
          item_id: string;
          item_scheduled_at_utc: string;
          notification_kind?: string;
          payload?: Record<string, unknown>;
          read_at?: string | null;
          source_job_id?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          delivered_at_utc?: string;
          hidden_at?: string | null;
          id?: string;
          item_id?: string;
          item_scheduled_at_utc?: string;
          notification_kind?: string;
          payload?: Record<string, unknown>;
          read_at?: string | null;
          source_job_id?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            columns: ["item_id"];
            foreignKeyName: "notification_inbox_items_item_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "recurring_items";
          },
          {
            columns: ["source_job_id"];
            foreignKeyName: "notification_inbox_items_source_job_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "notification_delivery_jobs";
          },
          {
            columns: ["user_id"];
            foreignKeyName: "notification_inbox_items_user_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "profiles";
          },
        ];
      };
      devices: {
        Row: {
          created_at: string;
          device_name: string | null;
          id: string;
          is_active: boolean;
          last_seen_at: string | null;
          platform: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          device_name?: string | null;
          id?: string;
          is_active?: boolean;
          last_seen_at?: string | null;
          platform: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          device_name?: string | null;
          id?: string;
          is_active?: boolean;
          last_seen_at?: string | null;
          platform?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            columns: ["user_id"];
            foreignKeyName: "devices_user_id_fkey";
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
      recurring_items: {
        Row: {
          category: string | null;
          created_at: string;
          description: string | null;
          id: string;
          is_archived: boolean;
          start_date_local: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_archived?: boolean;
          start_date_local: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_archived?: boolean;
          start_date_local?: string;
          title?: string;
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
      cancel_notification_delivery_jobs: {
        Args: {
          p_cancel_reason: string;
          p_job_ids: string[];
        };
        Returns: undefined;
      };
      create_recurring_item_with_initial_version: {
        Args: {
          p_anchor_type: string;
          p_category: string | null;
          p_description: string | null;
          p_effective_from_utc: string;
          p_interval_value: number | null;
          p_is_archived: boolean;
          p_notifications_enabled: boolean;
          p_recurrence_type: string;
          p_reminder_time_local: string;
          p_seed_start_date_local: string;
          p_start_date_local: string;
          p_title: string;
          p_user_id: string;
          p_weekday_mask: number[] | null;
        };
        Returns: string;
      };
      update_recurring_item_with_edit_policy: {
        Args: {
          p_anchor_type?: string | null;
          p_category: string | null;
          p_description: string | null;
          p_effective_from_utc?: string | null;
          p_has_rule_changes: boolean;
          p_interval_value?: number | null;
          p_is_archived: boolean;
          p_item_id: string;
          p_notifications_enabled?: boolean | null;
          p_recurrence_type?: string | null;
          p_reminder_time_local?: string | null;
          p_seed_start_date_local?: string | null;
          p_title: string;
          p_user_id: string;
          p_weekday_mask?: number[] | null;
        };
        Returns: string;
      };
      upsert_notification_delivery_jobs: {
        Args: {
          p_jobs: Database["public"]["Tables"]["notification_delivery_jobs"]["Insert"][];
        };
        Returns: Database["public"]["Tables"]["notification_delivery_jobs"]["Row"][];
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
export type DeviceInsert = Database["public"]["Tables"]["devices"]["Insert"];
export type DevicePushTokenInsert =
  Database["public"]["Tables"]["device_push_tokens"]["Insert"];
export type DevicePushTokenRow =
  Database["public"]["Tables"]["device_push_tokens"]["Row"];
export type DevicePushTokenUpdate =
  Database["public"]["Tables"]["device_push_tokens"]["Update"];
export type NotificationDeliveryAttemptInsert =
  Database["public"]["Tables"]["notification_delivery_attempts"]["Insert"];
export type NotificationDeliveryAttemptRow =
  Database["public"]["Tables"]["notification_delivery_attempts"]["Row"];
export type NotificationDeliveryAttemptUpdate =
  Database["public"]["Tables"]["notification_delivery_attempts"]["Update"];
export type NotificationDeliveryJobInsert =
  Database["public"]["Tables"]["notification_delivery_jobs"]["Insert"];
export type NotificationDeliveryJobRow =
  Database["public"]["Tables"]["notification_delivery_jobs"]["Row"];
export type NotificationDeliveryJobUpdate =
  Database["public"]["Tables"]["notification_delivery_jobs"]["Update"];
export type NotificationInboxItemRow =
  Database["public"]["Tables"]["notification_inbox_items"]["Row"];
export type NotificationInboxItemUpdate =
  Database["public"]["Tables"]["notification_inbox_items"]["Update"];
export type DeviceRow = Database["public"]["Tables"]["devices"]["Row"];
export type DeviceUpdate = Database["public"]["Tables"]["devices"]["Update"];
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
