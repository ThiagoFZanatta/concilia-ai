export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      bank_accounts: {
        Row: {
          agency: string
          balance: number
          bank_code: string
          bank_item_id: string
          client_id: string
          currency_code: string
          id: string
          name: string
          number: string
          organization_id: string
          pluggy_account_id: string
          subtype: string | null
          type: string
        }
        Insert: {
          agency?: string
          balance?: number
          bank_code?: string
          bank_item_id: string
          client_id: string
          currency_code?: string
          id?: string
          name: string
          number?: string
          organization_id: string
          pluggy_account_id: string
          subtype?: string | null
          type: string
        }
        Update: {
          agency?: string
          balance?: number
          bank_code?: string
          bank_item_id?: string
          client_id?: string
          currency_code?: string
          id?: string
          name?: string
          number?: string
          organization_id?: string
          pluggy_account_id?: string
          subtype?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_bank_item_id_organization_id_client_id_fkey"
            columns: ["bank_item_id", "organization_id", "client_id"]
            isOneToOne: false
            referencedRelation: "bank_items"
            referencedColumns: ["id", "organization_id", "client_id"]
          },
        ]
      }
      bank_items: {
        Row: {
          auto_sync_paused: boolean
          client_id: string
          connector_id: number
          connector_name: string
          deleted_at: string | null
          error_details: string | null
          id: string
          last_synced_at: string | null
          organization_id: string
          pluggy_item_id: string
          status: string
        }
        Insert: {
          auto_sync_paused?: boolean
          client_id: string
          connector_id: number
          connector_name: string
          deleted_at?: string | null
          error_details?: string | null
          id?: string
          last_synced_at?: string | null
          organization_id: string
          pluggy_item_id: string
          status?: string
        }
        Update: {
          auto_sync_paused?: boolean
          client_id?: string
          connector_id?: number
          connector_name?: string
          deleted_at?: string | null
          error_details?: string | null
          id?: string
          last_synced_at?: string | null
          organization_id?: string
          pluggy_item_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_items_client_id_organization_id_fkey"
            columns: ["client_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "bank_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_item_usage: {
        Row: {
          bank_item_id: string
          cycle: string
          first_synced_at: string
          organization_id: string
        }
        Insert: {
          bank_item_id: string
          cycle: string
          first_synced_at?: string
          organization_id: string
        }
        Update: {
          bank_item_id?: string
          cycle?: string
          first_synced_at?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_item_usage_bank_item_id_fkey"
            columns: ["bank_item_id"]
            isOneToOne: false
            referencedRelation: "bank_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_item_usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          cnpj_cpf: string
          contact_email: string
          contact_name: string
          contact_whatsapp: string
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          cnpj_cpf: string
          contact_email?: string
          contact_name?: string
          contact_whatsapp?: string
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          cnpj_cpf?: string
          contact_email?: string
          contact_name?: string
          contact_whatsapp?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_links: {
        Row: {
          bank_item_id: string | null
          client_id: string
          connect_issued_at: string | null
          created_at: string
          expires_at: string
          id: string
          organization_id: string
          pluggy_item_id: string | null
          status: string
          token: string
        }
        Insert: {
          bank_item_id?: string | null
          client_id: string
          connect_issued_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          organization_id: string
          pluggy_item_id?: string | null
          status?: string
          token?: string
        }
        Update: {
          bank_item_id?: string | null
          client_id?: string
          connect_issued_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          organization_id?: string
          pluggy_item_id?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_item_same_client"
            columns: ["bank_item_id", "organization_id", "client_id"]
            isOneToOne: false
            referencedRelation: "bank_items"
            referencedColumns: ["id", "organization_id", "client_id"]
          },
          {
            foreignKeyName: "invite_links_client_id_organization_id_fkey"
            columns: ["client_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "invite_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_outbox: {
        Row: {
          cycle: string
          id: string
          last_error: string | null
          organization_id: string
          sent_at: string | null
          status: string
          threshold: number
        }
        Insert: {
          cycle: string
          id?: string
          last_error?: string | null
          organization_id: string
          sent_at?: string | null
          status?: string
          threshold: number
        }
        Update: {
          cycle?: string
          id?: string
          last_error?: string | null
          organization_id?: string
          sent_at?: string | null
          status?: string
          threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string | null
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          role: string
          user_id: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          billing_email: string
          cnpj: string
          created_at: string
          id: string
          name: string
          past_due_since: string | null
          phone: string
          plan_id: string
          status: string
        }
        Insert: {
          billing_email?: string
          cnpj: string
          created_at?: string
          id?: string
          name: string
          past_due_since?: string | null
          phone?: string
          plan_id: string
          status?: string
        }
        Update: {
          billing_email?: string
          cnpj?: string
          created_at?: string
          id?: string
          name?: string
          past_due_since?: string | null
          phone?: string
          plan_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          extra_item_price: number
          id: string
          included_items: number
          is_active: boolean
          monthly_price: number
          name: string
        }
        Insert: {
          extra_item_price: number
          id?: string
          included_items: number
          is_active?: boolean
          monthly_price: number
          name: string
        }
        Update: {
          extra_item_price?: number
          id?: string
          included_items?: number
          is_active?: boolean
          monthly_price?: number
          name?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      transaction_categories: {
        Row: {
          name: string
        }
        Insert: {
          name: string
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          ai_category_suggested: string | null
          amount: number
          bank_account_id: string
          category: string | null
          client_id: string
          date: string
          description: string
          id: string
          organization_id: string
          pluggy_transaction_id: string
          raw_data: Json | null
          reconciliation_status: string
          type: string
        }
        Insert: {
          ai_category_suggested?: string | null
          amount: number
          bank_account_id: string
          category?: string | null
          client_id: string
          date: string
          description: string
          id?: string
          organization_id: string
          pluggy_transaction_id: string
          raw_data?: Json | null
          reconciliation_status?: string
          type: string
        }
        Update: {
          ai_category_suggested?: string | null
          amount?: number
          bank_account_id?: string
          category?: string | null
          client_id?: string
          date?: string
          description?: string
          id?: string
          organization_id?: string
          pluggy_transaction_id?: string
          raw_data?: Json | null
          reconciliation_status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_ai_category_suggested_fkey"
            columns: ["ai_category_suggested"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "transactions_bank_account_id_organization_id_client_id_fkey"
            columns: ["bank_account_id", "organization_id", "client_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id", "organization_id", "client_id"]
          },
          {
            foreignKeyName: "transactions_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["name"]
          },
        ]
      }
      webhook_events: {
        Row: {
          attempts: number
          created_at: string
          error: string | null
          event_id: string
          payload: Json
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error?: string | null
          event_id: string
          payload: Json
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error?: string | null
          event_id?: string
          payload?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_bank_event: {
        Args: { target_id: string }
        Returns: {
          attempts: number
          created_at: string
          error: string | null
          event_id: string
          payload: Json
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "webhook_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_bank_invite: {
        Args: { target_client: string; target_item?: string }
        Returns: string
      }
      review_transactions: {
        Args: { approved_category?: string; transaction_ids: string[] }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
