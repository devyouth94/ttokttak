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
      device_notification_reservations: {
        Row: {
          created_at: string;
          device_id: string;
          id: string;
          item_id: string;
          local_notification_id: string;
          scheduled_at_utc: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          device_id: string;
          id?: string;
          item_id: string;
          local_notification_id: string;
          scheduled_at_utc: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          device_id?: string;
          id?: string;
          item_id?: string;
          local_notification_id?: string;
          scheduled_at_utc?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            columns: ["device_id"];
            foreignKeyName: "device_notification_reservations_device_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "devices";
          },
          {
            columns: ["item_id"];
            foreignKeyName: "device_notification_reservations_item_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "recurring_items";
          },
          {
            columns: ["user_id"];
            foreignKeyName: "device_notification_reservations_user_id_fkey";
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
export type DeviceNotificationReservationInsert =
  Database["public"]["Tables"]["device_notification_reservations"]["Insert"];
export type DeviceNotificationReservationRow =
  Database["public"]["Tables"]["device_notification_reservations"]["Row"];
export type DeviceNotificationReservationUpdate =
  Database["public"]["Tables"]["device_notification_reservations"]["Update"];
export type DevicePushTokenInsert =
  Database["public"]["Tables"]["device_push_tokens"]["Insert"];
export type DevicePushTokenRow =
  Database["public"]["Tables"]["device_push_tokens"]["Row"];
export type DevicePushTokenUpdate =
  Database["public"]["Tables"]["device_push_tokens"]["Update"];
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
