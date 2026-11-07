/**
 * Tipurile bazei de date. Scrise de mână pentru migrația inițială; după ce
 * proiectul e legat (`supabase link`), se regenerează cu:
 *
 *   npm run db:types
 *
 * Nu edita manual după prima generare.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string | null
          vertical: string | null
          cui: string | null
          address: string | null
          timezone: string
          locale: string
          plan: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug?: string | null
          vertical?: string | null
          cui?: string | null
          address?: string | null
          timezone?: string
          locale?: string
          plan?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string | null
          vertical?: string | null
          cui?: string | null
          address?: string | null
          timezone?: string
          locale?: string
          plan?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          role: Database["public"]["Enums"]["member_role"]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          role?: Database["public"]["Enums"]["member_role"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      submit_pilot_request: {
        Args: { p_business_name: string; p_vertical: string; p_phone: string }
        Returns: string
      }
      create_tenant: {
        Args: { p_name: string; p_vertical?: string | null }
        Returns: Database["public"]["Tables"]["tenants"]["Row"]
      }
    }
    Enums: {
      member_role: "owner" | "staff"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
