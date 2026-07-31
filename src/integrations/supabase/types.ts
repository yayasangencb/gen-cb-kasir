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
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          barcode: string | null
          category_id: string | null
          cost_price: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_available: boolean
          minimum_stock: number
          name: string
          selling_price: number
          sku: string | null
          stock: number
          unit: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_available?: boolean
          minimum_stock?: number
          name: string
          selling_price?: number
          sku?: string | null
          stock?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_available?: boolean
          minimum_stock?: number
          name?: string
          selling_price?: number
          sku?: string | null
          stock?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      queues: {
        Row: {
          collected_at: string | null
          completed_at: string | null
          created_at: string
          customer_name: string | null
          id: string
          queue_date: string
          queue_number: number
          started_at: string | null
          status: string
          transaction_id: string
          updated_at: string
        }
        Insert: {
          collected_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          queue_date?: string
          queue_number: number
          started_at?: string | null
          status?: string
          transaction_id: string
          updated_at?: string
        }
        Update: {
          collected_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          queue_date?: string
          queue_number?: number
          started_at?: string | null
          status?: string
          transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "queues_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          pin: string
          role: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          pin: string
          role: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          pin?: string
          role?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          cost_price: number | null
          created_at: string
          created_by: string | null
          created_by_name: string | null
          id: string
          movement_type: string
          product_id: string
          quantity_after: number
          quantity_before: number
          quantity_change: number
          reason: string | null
          reference_id: string | null
          supplier: string | null
        }
        Insert: {
          cost_price?: number | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          movement_type: string
          product_id: string
          quantity_after: number
          quantity_before: number
          quantity_change: number
          reason?: string | null
          reference_id?: string | null
          supplier?: string | null
        }
        Update: {
          cost_price?: number | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          movement_type?: string
          product_id?: string
          quantity_after?: number
          quantity_before?: number
          quantity_change?: number
          reason?: string | null
          reference_id?: string | null
          supplier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          address: string | null
          completed_display_duration: number
          created_at: string
          display_footer: string
          display_header: string
          display_pin: string
          id: string
          logo_url: string | null
          max_display_items: number
          phone: string | null
          queue_reset_mode: string
          receipt_footer: string
          receipt_paper: string
          show_clock: boolean
          show_customer_name: boolean
          sound_enabled: boolean
          sound_volume: number
          store_name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          completed_display_duration?: number
          created_at?: string
          display_footer?: string
          display_header?: string
          display_pin?: string
          id?: string
          logo_url?: string | null
          max_display_items?: number
          phone?: string | null
          queue_reset_mode?: string
          receipt_footer?: string
          receipt_paper?: string
          show_clock?: boolean
          show_customer_name?: boolean
          sound_enabled?: boolean
          sound_volume?: number
          store_name?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          completed_display_duration?: number
          created_at?: string
          display_footer?: string
          display_header?: string
          display_pin?: string
          id?: string
          logo_url?: string | null
          max_display_items?: number
          phone?: string | null
          queue_reset_mode?: string
          receipt_footer?: string
          receipt_paper?: string
          show_clock?: boolean
          show_customer_name?: boolean
          sound_enabled?: boolean
          sound_volume?: number
          store_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      transaction_items: {
        Row: {
          id: string
          notes: string | null
          product_id: string | null
          product_name_snapshot: string
          product_price_snapshot: number
          quantity: number
          subtotal: number
          transaction_id: string
        }
        Insert: {
          id?: string
          notes?: string | null
          product_id?: string | null
          product_name_snapshot: string
          product_price_snapshot: number
          quantity: number
          subtotal: number
          transaction_id: string
        }
        Update: {
          id?: string
          notes?: string | null
          product_id?: string | null
          product_name_snapshot?: string
          product_price_snapshot?: number
          quantity?: number
          subtotal?: number
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_paid: number
          cashier_id: string | null
          cashier_name: string | null
          change_amount: number
          created_at: string
          customer_name: string | null
          discount: number
          grand_total: number
          id: string
          notes: string | null
          order_type: string
          payment_method: string
          payment_status: string
          refund_amount: number
          subtotal: number
          tax: number
          transaction_number: string
          transaction_status: string
        }
        Insert: {
          amount_paid?: number
          cashier_id?: string | null
          cashier_name?: string | null
          change_amount?: number
          created_at?: string
          customer_name?: string | null
          discount?: number
          grand_total?: number
          id?: string
          notes?: string | null
          order_type?: string
          payment_method?: string
          payment_status?: string
          refund_amount?: number
          subtotal?: number
          tax?: number
          transaction_number: string
          transaction_status?: string
        }
        Update: {
          amount_paid?: number
          cashier_id?: string | null
          cashier_name?: string | null
          change_amount?: number
          created_at?: string
          customer_name?: string | null
          discount?: number
          grand_total?: number
          id?: string
          notes?: string | null
          order_type?: string
          payment_method?: string
          payment_status?: string
          refund_amount?: number
          subtotal?: number
          tax?: number
          transaction_number?: string
          transaction_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_stock: {
        Args: {
          _absolute?: boolean
          _cost_price?: number
          _movement_type: string
          _product_id: string
          _quantity: number
          _reason: string
          _staff_id: string
          _supplier?: string
        }
        Returns: Json
      }
      create_pos_transaction: {
        Args: {
          _amount_paid: number
          _cashier_id: string
          _customer_name: string
          _discount: number
          _items: Json
          _notes: string
          _order_type: string
          _payment_method: string
        }
        Returns: Json
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
    Enums: {},
  },
} as const
