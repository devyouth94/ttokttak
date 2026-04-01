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
      recurring_items: {
        Row: {
          anchor_type: string;
          category: string | null;
          created_at: string;
          description: string | null;
          id: string;
          interval_value: number | null;
          is_archived: boolean;
          notifications_enabled: boolean;
          recurrence_type: string;
          reminder_time_local: string;
          start_date_local: string;
          title: string;
          updated_at: string;
          user_id: string;
          weekday_mask: number[] | null;
        };
        Insert: {
          anchor_type?: string;
          category?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          interval_value?: number | null;
          is_archived?: boolean;
          notifications_enabled?: boolean;
          recurrence_type: string;
          reminder_time_local: string;
          start_date_local: string;
          title: string;
          updated_at?: string;
          user_id: string;
          weekday_mask?: number[] | null;
        };
        Update: {
          anchor_type?: string;
          category?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          interval_value?: number | null;
          is_archived?: boolean;
          notifications_enabled?: boolean;
          recurrence_type?: string;
          reminder_time_local?: string;
          start_date_local?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
          weekday_mask?: number[] | null;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type CompletionLogInsert =
  Database["public"]["Tables"]["completion_logs"]["Insert"];
export type CompletionLogRow =
  Database["public"]["Tables"]["completion_logs"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type RecurringItemInsert =
  Database["public"]["Tables"]["recurring_items"]["Insert"];
export type RecurringItemRow =
  Database["public"]["Tables"]["recurring_items"]["Row"];
export type RecurringItemUpdate =
  Database["public"]["Tables"]["recurring_items"]["Update"];
