// Generat cu `npm run db:types` din schema locală. Nu edita de mână.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      agent_settings: {
        Row: {
          address_form: Database["public"]["Enums"]["address_form"];
          agent_name: string;
          created_at: string;
          extra_instructions: string | null;
          forbidden: string | null;
          greeting: string | null;
          handoff_phone: string | null;
          handoff_rules: string | null;
          tenant_id: string;
          tone: Database["public"]["Enums"]["agent_tone"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          address_form?: Database["public"]["Enums"]["address_form"];
          agent_name?: string;
          created_at?: string;
          extra_instructions?: string | null;
          forbidden?: string | null;
          greeting?: string | null;
          handoff_phone?: string | null;
          handoff_rules?: string | null;
          tenant_id: string;
          tone?: Database["public"]["Enums"]["agent_tone"];
          updated_at?: string;
        };
        Update: {
          address_form?: Database["public"]["Enums"]["address_form"];
          agent_name?: string;
          created_at?: string;
          extra_instructions?: string | null;
          forbidden?: string | null;
          greeting?: string | null;
          handoff_phone?: string | null;
          handoff_rules?: string | null;
          tenant_id?: string;
          tone?: Database["public"]["Enums"]["agent_tone"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agent_settings_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: true;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      availability_exceptions: {
        Row: {
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["availability_exception_kind"];
          note: string | null;
          period: unknown;
          resource_id: string | null;
          tenant_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["availability_exception_kind"];
          note?: string | null;
          period: unknown;
          resource_id?: string | null;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["availability_exception_kind"];
          note?: string | null;
          period?: unknown;
          resource_id?: string | null;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "availability_exceptions_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "availability_exceptions_tenant_id_resource_id_fkey";
            columns: ["tenant_id", "resource_id"];
            isOneToOne: false;
            referencedRelation: "resources";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      availability_rules: {
        Row: {
          created_at: string;
          ends_at: string;
          id: string;
          resource_id: string;
          starts_at: string;
          tenant_id: string;
          updated_at: string;
          weekday: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          ends_at: string;
          id?: string;
          resource_id: string;
          starts_at: string;
          tenant_id: string;
          updated_at?: string;
          weekday: number;
        };
        Update: {
          created_at?: string;
          ends_at?: string;
          id?: string;
          resource_id?: string;
          starts_at?: string;
          tenant_id?: string;
          updated_at?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "availability_rules_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "availability_rules_tenant_id_resource_id_fkey";
            columns: ["tenant_id", "resource_id"];
            isOneToOne: false;
            referencedRelation: "resources";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      booking_rules: {
        Row: {
          cancellation_notice_hours: number;
          cancellation_policy: string | null;
          confirmation_mode: Database["public"]["Enums"]["confirmation_mode"];
          created_at: string;
          max_advance_days: number;
          min_notice_min: number;
          required_fields: NonNullable<Json>;
          tenant_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          cancellation_notice_hours?: number;
          cancellation_policy?: string | null;
          confirmation_mode?: Database["public"]["Enums"]["confirmation_mode"];
          created_at?: string;
          max_advance_days?: number;
          min_notice_min?: number;
          required_fields?: NonNullable<Json>;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          cancellation_notice_hours?: number;
          cancellation_policy?: string | null;
          confirmation_mode?: Database["public"]["Enums"]["confirmation_mode"];
          created_at?: string;
          max_advance_days?: number;
          min_notice_min?: number;
          required_fields?: NonNullable<Json>;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_rules_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: true;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          channel: Database["public"]["Enums"]["channel_type"] | null;
          conversation_id: string | null;
          created_at: string;
          customer_id: string | null;
          deposit_amount: number;
          exclusive: boolean;
          hold_expires_at: string | null;
          id: string;
          notes: string | null;
          payment_ref: string | null;
          payment_status: Database["public"]["Enums"]["payment_status"];
          period: unknown;
          resource_id: string;
          seats: number;
          service_id: string;
          status: Database["public"]["Enums"]["booking_status"];
          tenant_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          channel?: Database["public"]["Enums"]["channel_type"] | null;
          conversation_id?: string | null;
          created_at?: string;
          customer_id?: string | null;
          deposit_amount?: number;
          exclusive?: boolean;
          hold_expires_at?: string | null;
          id?: string;
          notes?: string | null;
          payment_ref?: string | null;
          payment_status?: Database["public"]["Enums"]["payment_status"];
          period: unknown;
          resource_id: string;
          seats?: number;
          service_id: string;
          status?: Database["public"]["Enums"]["booking_status"];
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          channel?: Database["public"]["Enums"]["channel_type"] | null;
          conversation_id?: string | null;
          created_at?: string;
          customer_id?: string | null;
          deposit_amount?: number;
          exclusive?: boolean;
          hold_expires_at?: string | null;
          id?: string;
          notes?: string | null;
          payment_ref?: string | null;
          payment_status?: Database["public"]["Enums"]["payment_status"];
          period?: unknown;
          resource_id?: string;
          seats?: number;
          service_id?: string;
          status?: Database["public"]["Enums"]["booking_status"];
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_tenant_id_conversation_id_fkey";
            columns: ["tenant_id", "conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "bookings_tenant_id_customer_id_fkey";
            columns: ["tenant_id", "customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "bookings_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_tenant_id_resource_id_fkey";
            columns: ["tenant_id", "resource_id"];
            isOneToOne: false;
            referencedRelation: "resources";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "bookings_tenant_id_service_id_fkey";
            columns: ["tenant_id", "service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      channels: {
        Row: {
          address: string;
          created_at: string;
          external_ids: NonNullable<Json>;
          id: string;
          status: Database["public"]["Enums"]["channel_status"];
          tenant_id: string;
          type: Database["public"]["Enums"]["channel_type"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          address: string;
          created_at?: string;
          external_ids?: NonNullable<Json>;
          id?: string;
          status?: Database["public"]["Enums"]["channel_status"];
          tenant_id: string;
          type: Database["public"]["Enums"]["channel_type"];
          updated_at?: string;
        };
        Update: {
          address?: string;
          created_at?: string;
          external_ids?: NonNullable<Json>;
          id?: string;
          status?: Database["public"]["Enums"]["channel_status"];
          tenant_id?: string;
          type?: Database["public"]["Enums"]["channel_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "channels_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          channel: Database["public"]["Enums"]["channel_type"];
          channel_id: string | null;
          created_at: string;
          customer_id: string | null;
          ended_at: string | null;
          external_ref: string | null;
          id: string;
          outcome: Database["public"]["Enums"]["conversation_outcome"] | null;
          started_at: string;
          status: Database["public"]["Enums"]["conversation_status"];
          summary: string | null;
          tenant_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          channel: Database["public"]["Enums"]["channel_type"];
          channel_id?: string | null;
          created_at?: string;
          customer_id?: string | null;
          ended_at?: string | null;
          external_ref?: string | null;
          id?: string;
          outcome?: Database["public"]["Enums"]["conversation_outcome"] | null;
          started_at?: string;
          status?: Database["public"]["Enums"]["conversation_status"];
          summary?: string | null;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          channel?: Database["public"]["Enums"]["channel_type"];
          channel_id?: string | null;
          created_at?: string;
          customer_id?: string | null;
          ended_at?: string | null;
          external_ref?: string | null;
          id?: string;
          outcome?: Database["public"]["Enums"]["conversation_outcome"] | null;
          started_at?: string;
          status?: Database["public"]["Enums"]["conversation_status"];
          summary?: string | null;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_tenant_id_channel_id_fkey";
            columns: ["tenant_id", "channel_id"];
            isOneToOne: false;
            referencedRelation: "channels";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "conversations_tenant_id_customer_id_fkey";
            columns: ["tenant_id", "customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "conversations_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          name: string | null;
          notes: string | null;
          phone: string | null;
          tenant_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string | null;
          notes?: string | null;
          phone?: string | null;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string | null;
          notes?: string | null;
          phone?: string | null;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      faq_items: {
        Row: {
          active: boolean;
          answer: string | null;
          created_at: string;
          id: string;
          question: string;
          sort_order: number;
          tenant_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          answer?: string | null;
          created_at?: string;
          id?: string;
          question: string;
          sort_order?: number;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          answer?: string | null;
          created_at?: string;
          id?: string;
          question?: string;
          sort_order?: number;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "faq_items_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      handoffs: {
        Row: {
          claimed_at: string | null;
          claimed_by: string | null;
          conversation_id: string | null;
          created_at: string;
          id: string;
          priority: Database["public"]["Enums"]["handoff_priority"];
          reason: string;
          resolved_at: string | null;
          status: Database["public"]["Enums"]["handoff_status"];
          tenant_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          claimed_at?: string | null;
          claimed_by?: string | null;
          conversation_id?: string | null;
          created_at?: string;
          id?: string;
          priority?: Database["public"]["Enums"]["handoff_priority"];
          reason: string;
          resolved_at?: string | null;
          status?: Database["public"]["Enums"]["handoff_status"];
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          claimed_at?: string | null;
          claimed_by?: string | null;
          conversation_id?: string | null;
          created_at?: string;
          id?: string;
          priority?: Database["public"]["Enums"]["handoff_priority"];
          reason?: string;
          resolved_at?: string | null;
          status?: Database["public"]["Enums"]["handoff_status"];
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "handoffs_tenant_id_claimed_by_fkey";
            columns: ["tenant_id", "claimed_by"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["tenant_id", "user_id"];
          },
          {
            foreignKeyName: "handoffs_tenant_id_conversation_id_fkey";
            columns: ["tenant_id", "conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "handoffs_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      members: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["member_role"];
          tenant_id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["member_role"];
          tenant_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["member_role"];
          tenant_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "members_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          content: string | null;
          conversation_id: string;
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["message_role"];
          tenant_id: string;
          tool_input: Json | null;
          tool_name: string | null;
          tool_output: Json | null;
        };
        ComputedFields: never;
        Insert: {
          content?: string | null;
          conversation_id: string;
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["message_role"];
          tenant_id: string;
          tool_input?: Json | null;
          tool_name?: string | null;
          tool_output?: Json | null;
        };
        Update: {
          content?: string | null;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["message_role"];
          tenant_id?: string;
          tool_input?: Json | null;
          tool_name?: string | null;
          tool_output?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_tenant_id_conversation_id_fkey";
            columns: ["tenant_id", "conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "messages_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      resources: {
        Row: {
          active: boolean;
          booking_mode: Database["public"]["Enums"]["booking_mode"];
          capacity: number;
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["resource_kind"];
          name: string;
          sort_order: number;
          tenant_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          booking_mode?: Database["public"]["Enums"]["booking_mode"];
          capacity?: number;
          created_at?: string;
          id?: string;
          kind: Database["public"]["Enums"]["resource_kind"];
          name: string;
          sort_order?: number;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          booking_mode?: Database["public"]["Enums"]["booking_mode"];
          capacity?: number;
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["resource_kind"];
          name?: string;
          sort_order?: number;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "resources_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      service_resources: {
        Row: {
          created_at: string;
          resource_id: string;
          service_id: string;
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          resource_id: string;
          service_id: string;
          tenant_id: string;
        };
        Update: {
          created_at?: string;
          resource_id?: string;
          service_id?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_resources_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_resources_tenant_id_resource_id_fkey";
            columns: ["tenant_id", "resource_id"];
            isOneToOne: false;
            referencedRelation: "resources";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "service_resources_tenant_id_service_id_fkey";
            columns: ["tenant_id", "service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      services: {
        Row: {
          active: boolean;
          buffer_after_min: number;
          created_at: string;
          currency: string;
          deposit: number;
          description: string | null;
          duration_min: number;
          id: string;
          name: string;
          price: number | null;
          price_type: Database["public"]["Enums"]["price_type"];
          sort_order: number;
          tenant_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          buffer_after_min?: number;
          created_at?: string;
          currency?: string;
          deposit?: number;
          description?: string | null;
          duration_min: number;
          id?: string;
          name: string;
          price?: number | null;
          price_type?: Database["public"]["Enums"]["price_type"];
          sort_order?: number;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          buffer_after_min?: number;
          created_at?: string;
          currency?: string;
          deposit?: number;
          description?: string | null;
          duration_min?: number;
          id?: string;
          name?: string;
          price?: number | null;
          price_type?: Database["public"]["Enums"]["price_type"];
          sort_order?: number;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "services_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      tenants: {
        Row: {
          address: string | null;
          created_at: string;
          cui: string | null;
          id: string;
          locale: string;
          name: string;
          plan: string;
          slug: string | null;
          timezone: string;
          updated_at: string;
          vertical: string | null;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          created_at?: string;
          cui?: string | null;
          id?: string;
          locale?: string;
          name: string;
          plan?: string;
          slug?: string | null;
          timezone?: string;
          updated_at?: string;
          vertical?: string | null;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          cui?: string | null;
          id?: string;
          locale?: string;
          name?: string;
          plan?: string;
          slug?: string | null;
          timezone?: string;
          updated_at?: string;
          vertical?: string | null;
        };
        Relationships: [];
      };
      usage_events: {
        Row: {
          conversation_id: string | null;
          id: string;
          kind: Database["public"]["Enums"]["usage_kind"];
          metadata: NonNullable<Json>;
          occurred_at: string;
          quantity: number;
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          conversation_id?: string | null;
          id?: string;
          kind: Database["public"]["Enums"]["usage_kind"];
          metadata?: NonNullable<Json>;
          occurred_at?: string;
          quantity: number;
          tenant_id: string;
        };
        Update: {
          conversation_id?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["usage_kind"];
          metadata?: NonNullable<Json>;
          occurred_at?: string;
          quantity?: number;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "usage_events_tenant_id_conversation_id_fkey";
            columns: ["tenant_id", "conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "usage_events_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_tenant: {
        Args: { p_name: string; p_vertical?: string };
        Returns: {
          address: string | null;
          created_at: string;
          cui: string | null;
          id: string;
          locale: string;
          name: string;
          plan: string;
          slug: string | null;
          timezone: string;
          updated_at: string;
          vertical: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "tenants";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      submit_pilot_request: {
        Args: { p_business_name: string; p_phone: string; p_vertical: string };
        Returns: string;
      };
    };
    Enums: {
      address_form: "tu" | "dumneavoastra";
      agent_tone: "formal" | "friendly";
      availability_exception_kind: "closed" | "open";
      booking_mode: "exclusive" | "shared";
      booking_status: "hold" | "pending" | "confirmed" | "cancelled" | "no_show" | "expired";
      channel_status: "pending" | "active" | "paused" | "error";
      channel_type: "phone" | "whatsapp" | "email";
      confirmation_mode: "auto" | "manual";
      conversation_outcome:
        | "booked"
        | "rescheduled"
        | "cancelled"
        | "answered"
        | "handoff"
        | "abandoned"
        | "spam";
      conversation_status: "open" | "closed";
      handoff_priority: "low" | "normal" | "high" | "urgent";
      handoff_status: "open" | "claimed" | "resolved";
      member_role: "owner" | "staff";
      message_role: "customer" | "agent" | "staff" | "tool" | "system";
      payment_status: "none" | "pending" | "paid" | "refunded";
      price_type: "fixed" | "from" | "on_request";
      resource_kind: "staff" | "room" | "table" | "vehicle" | "equipment";
      usage_kind:
        | "voice_minutes"
        | "whatsapp_message"
        | "sms"
        | "ai_input_tokens"
        | "ai_output_tokens";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      address_form: ["tu", "dumneavoastra"],
      agent_tone: ["formal", "friendly"],
      availability_exception_kind: ["closed", "open"],
      booking_mode: ["exclusive", "shared"],
      booking_status: ["hold", "pending", "confirmed", "cancelled", "no_show", "expired"],
      channel_status: ["pending", "active", "paused", "error"],
      channel_type: ["phone", "whatsapp", "email"],
      confirmation_mode: ["auto", "manual"],
      conversation_outcome: [
        "booked",
        "rescheduled",
        "cancelled",
        "answered",
        "handoff",
        "abandoned",
        "spam",
      ],
      conversation_status: ["open", "closed"],
      handoff_priority: ["low", "normal", "high", "urgent"],
      handoff_status: ["open", "claimed", "resolved"],
      member_role: ["owner", "staff"],
      message_role: ["customer", "agent", "staff", "tool", "system"],
      payment_status: ["none", "pending", "paid", "refunded"],
      price_type: ["fixed", "from", "on_request"],
      resource_kind: ["staff", "room", "table", "vehicle", "equipment"],
      usage_kind: [
        "voice_minutes",
        "whatsapp_message",
        "sms",
        "ai_input_tokens",
        "ai_output_tokens",
      ],
    },
  },
} as const;
