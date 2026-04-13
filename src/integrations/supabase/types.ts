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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          actual_address: string | null
          bank_account: string | null
          bank_name: string | null
          bik: string | null
          correspondent_account: string | null
          created_at: string
          email: string | null
          id: string
          inn: string | null
          kpp: string | null
          legal_address: string | null
          legal_name: string | null
          name: string
          ogrn: string | null
          phone: string | null
          tax_system: string | null
          type: Database["public"]["Enums"]["company_type"]
          updated_at: string
          vat_mode: string | null
          website: string | null
        }
        Insert: {
          actual_address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          bik?: string | null
          correspondent_account?: string | null
          created_at?: string
          email?: string | null
          id?: string
          inn?: string | null
          kpp?: string | null
          legal_address?: string | null
          legal_name?: string | null
          name: string
          ogrn?: string | null
          phone?: string | null
          tax_system?: string | null
          type?: Database["public"]["Enums"]["company_type"]
          updated_at?: string
          vat_mode?: string | null
          website?: string | null
        }
        Update: {
          actual_address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          bik?: string | null
          correspondent_account?: string | null
          created_at?: string
          email?: string | null
          id?: string
          inn?: string | null
          kpp?: string | null
          legal_address?: string | null
          legal_name?: string | null
          name?: string
          ogrn?: string | null
          phone?: string | null
          tax_system?: string | null
          type?: Database["public"]["Enums"]["company_type"]
          updated_at?: string
          vat_mode?: string | null
          website?: string | null
        }
        Relationships: []
      }
      material_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string | null
        }
        Relationships: []
      }
      materials: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          sku: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sku?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sku?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "material_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          line_total: number
          material_id: string | null
          material_name: string
          order_id: string
          price: number
          quantity: number
          supplier_offer_id: string | null
          unit: string
          vat_rate: number
        }
        Insert: {
          created_at?: string
          id?: string
          line_total?: number
          material_id?: string | null
          material_name: string
          order_id: string
          price: number
          quantity: number
          supplier_offer_id?: string | null
          unit?: string
          vat_rate?: number
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number
          material_id?: string | null
          material_name?: string
          order_id?: string
          price?: number
          quantity?: number
          supplier_offer_id?: string | null
          unit?: string
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_supplier_offer_id_fkey"
            columns: ["supplier_offer_id"]
            isOneToOne: false
            referencedRelation: "supplier_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_without_vat: number
          buyer_company_id: string
          comment: string | null
          created_at: string
          created_by: string | null
          delivery_address: string | null
          delivery_cost: number
          id: string
          order_number: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          quote_id: string | null
          rfq_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          supplier_company_id: string
          total_amount: number
          updated_at: string
          vat_amount: number
        }
        Insert: {
          amount_without_vat?: number
          buyer_company_id: string
          comment?: string | null
          created_at?: string
          created_by?: string | null
          delivery_address?: string | null
          delivery_cost?: number
          id?: string
          order_number?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          quote_id?: string | null
          rfq_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          supplier_company_id: string
          total_amount?: number
          updated_at?: string
          vat_amount?: number
        }
        Update: {
          amount_without_vat?: number
          buyer_company_id?: string
          comment?: string | null
          created_at?: string
          created_by?: string | null
          delivery_address?: string | null
          delivery_cost?: number
          id?: string
          order_number?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          quote_id?: string | null
          rfq_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          supplier_company_id?: string
          total_amount?: number
          updated_at?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_company_id_fkey"
            columns: ["buyer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_supplier_company_id_fkey"
            columns: ["supplier_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          lead_time_days: number | null
          line_total: number
          material_id: string | null
          material_name: string | null
          price: number
          quantity: number
          quote_id: string
          rfq_item_id: string | null
          unit: string
          vat_rate: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          lead_time_days?: number | null
          line_total?: number
          material_id?: string | null
          material_name?: string | null
          price: number
          quantity: number
          quote_id: string
          rfq_item_id?: string | null
          unit?: string
          vat_rate?: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          lead_time_days?: number | null
          line_total?: number
          material_id?: string | null
          material_name?: string | null
          price?: number
          quantity?: number
          quote_id?: string
          rfq_item_id?: string | null
          unit?: string
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_rfq_item_id_fkey"
            columns: ["rfq_item_id"]
            isOneToOne: false
            referencedRelation: "rfq_items"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          created_at: string
          created_by: string | null
          delivery_cost: number | null
          id: string
          note: string | null
          rfq_id: string
          status: Database["public"]["Enums"]["quote_status"]
          supplier_company_id: string
          total_amount: number | null
          total_without_vat: number | null
          updated_at: string
          valid_until: string | null
          vat_amount: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delivery_cost?: number | null
          id?: string
          note?: string | null
          rfq_id: string
          status?: Database["public"]["Enums"]["quote_status"]
          supplier_company_id: string
          total_amount?: number | null
          total_without_vat?: number | null
          updated_at?: string
          valid_until?: string | null
          vat_amount?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delivery_cost?: number | null
          id?: string
          note?: string | null
          rfq_id?: string
          status?: Database["public"]["Enums"]["quote_status"]
          supplier_company_id?: string
          total_amount?: number | null
          total_without_vat?: number | null
          updated_at?: string
          valid_until?: string | null
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_supplier_company_id_fkey"
            columns: ["supplier_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_items: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          material_id: string | null
          material_name: string | null
          quantity: number
          rfq_id: string
          unit: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          material_id?: string | null
          material_name?: string | null
          quantity: number
          rfq_id: string
          unit?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          material_id?: string | null
          material_name?: string | null
          quantity?: number
          rfq_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_items_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_suppliers: {
        Row: {
          created_at: string
          id: string
          rfq_id: string
          supplier_company_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rfq_id: string
          supplier_company_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rfq_id?: string
          supplier_company_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_suppliers_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_suppliers_supplier_company_id_fkey"
            columns: ["supplier_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      rfqs: {
        Row: {
          buyer_company_id: string
          comment: string | null
          created_at: string
          created_by: string | null
          delivery_address: string | null
          description: string | null
          id: string
          needed_by: string | null
          status: Database["public"]["Enums"]["rfq_status"]
          title: string
          updated_at: string
        }
        Insert: {
          buyer_company_id: string
          comment?: string | null
          created_at?: string
          created_by?: string | null
          delivery_address?: string | null
          description?: string | null
          id?: string
          needed_by?: string | null
          status?: Database["public"]["Enums"]["rfq_status"]
          title: string
          updated_at?: string
        }
        Update: {
          buyer_company_id?: string
          comment?: string | null
          created_at?: string
          created_by?: string | null
          delivery_address?: string | null
          description?: string | null
          id?: string
          needed_by?: string | null
          status?: Database["public"]["Enums"]["rfq_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfqs_buyer_company_id_fkey"
            columns: ["buyer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_items: {
        Row: {
          created_at: string
          id: string
          order_item_id: string | null
          quantity: number
          shipment_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_item_id?: string | null
          quantity: number
          shipment_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_item_id?: string | null
          quantity?: number
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_items_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          created_at: string
          delivered_at: string | null
          driver_name: string | null
          driver_phone: string | null
          id: string
          order_id: string
          planned_date: string | null
          route_note: string | null
          shipment_number: string | null
          shipped_at: string | null
          status: Database["public"]["Enums"]["shipment_status"]
          supplier_company_id: string
          tracking_number: string | null
          updated_at: string
          vehicle_info: string | null
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          order_id: string
          planned_date?: string | null
          route_note?: string | null
          shipment_number?: string | null
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          supplier_company_id: string
          tracking_number?: string | null
          updated_at?: string
          vehicle_info?: string | null
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          order_id?: string
          planned_date?: string | null
          route_note?: string | null
          shipment_number?: string | null
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          supplier_company_id?: string
          tracking_number?: string | null
          updated_at?: string
          vehicle_info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_supplier_company_id_fkey"
            columns: ["supplier_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_offers: {
        Row: {
          article: string | null
          created_at: string
          currency: string
          delivery_cost: number | null
          id: string
          is_active: boolean
          lead_time_days: number | null
          material_id: string
          min_volume: number | null
          price: number
          stock: number | null
          supplier_company_id: string
          updated_at: string
          vat_rate: number
        }
        Insert: {
          article?: string | null
          created_at?: string
          currency?: string
          delivery_cost?: number | null
          id?: string
          is_active?: boolean
          lead_time_days?: number | null
          material_id: string
          min_volume?: number | null
          price: number
          stock?: number | null
          supplier_company_id: string
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          article?: string | null
          created_at?: string
          currency?: string
          delivery_cost?: number | null
          id?: string
          is_active?: boolean
          lead_time_days?: number | null
          material_id?: string
          min_volume?: number | null
          price?: number
          stock?: number | null
          supplier_company_id?: string
          updated_at?: string
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_offers_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_offers_supplier_company_id_fkey"
            columns: ["supplier_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_order: { Args: { _order_id: string }; Returns: boolean }
      can_access_quote: { Args: { _quote_id: string }; Returns: boolean }
      can_access_rfq: { Args: { _rfq_id: string }; Returns: boolean }
      get_my_company_id: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "buyer" | "supplier" | "manager" | "admin"
      company_type: "buyer" | "supplier" | "both"
      notification_type: "rfq" | "quote" | "order" | "shipment" | "system"
      order_status:
        | "draft"
        | "confirmed"
        | "in_progress"
        | "shipped"
        | "received"
        | "closed"
        | "cancelled"
      payment_status:
        | "pending"
        | "invoiced"
        | "partially_paid"
        | "paid"
        | "overdue"
      quote_status: "draft" | "sent" | "accepted" | "rejected" | "expired"
      rfq_status: "draft" | "published" | "quoted" | "closed" | "cancelled"
      shipment_status:
        | "planned"
        | "ready"
        | "in_transit"
        | "delivered"
        | "failed"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["buyer", "supplier", "manager", "admin"],
      company_type: ["buyer", "supplier", "both"],
      notification_type: ["rfq", "quote", "order", "shipment", "system"],
      order_status: [
        "draft",
        "confirmed",
        "in_progress",
        "shipped",
        "received",
        "closed",
        "cancelled",
      ],
      payment_status: [
        "pending",
        "invoiced",
        "partially_paid",
        "paid",
        "overdue",
      ],
      quote_status: ["draft", "sent", "accepted", "rejected", "expired"],
      rfq_status: ["draft", "published", "quoted", "closed", "cancelled"],
      shipment_status: [
        "planned",
        "ready",
        "in_transit",
        "delivered",
        "failed",
      ],
    },
  },
} as const
