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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      caja_movimientos: {
        Row: {
          categoria_gasto: string | null
          created_at: string
          detalle: string
          fecha: string
          foto_factura: string | null
          id: string
          id_empleado: string | null
          id_trabajo: string | null
          monto: number
          tipo: Database["public"]["Enums"]["tipo_movimiento_caja"]
          updated_at: string
        }
        Insert: {
          categoria_gasto?: string | null
          created_at?: string
          detalle?: string
          fecha?: string
          foto_factura?: string | null
          id?: string
          id_empleado?: string | null
          id_trabajo?: string | null
          monto: number
          tipo: Database["public"]["Enums"]["tipo_movimiento_caja"]
          updated_at?: string
        }
        Update: {
          categoria_gasto?: string | null
          created_at?: string
          detalle?: string
          fecha?: string
          foto_factura?: string | null
          id?: string
          id_empleado?: string | null
          id_trabajo?: string | null
          monto?: number
          tipo?: Database["public"]["Enums"]["tipo_movimiento_caja"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "caja_movimientos_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caja_movimientos_id_trabajo_fkey"
            columns: ["id_trabajo"]
            isOneToOne: false
            referencedRelation: "trabajos"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          created_at: string
          direccion: string
          email: string | null
          empresa: string | null
          id: string
          nombre_completo: string
          notas: string | null
          rnc: string | null
          telefono: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          direccion?: string
          email?: string | null
          empresa?: string | null
          id?: string
          nombre_completo: string
          notas?: string | null
          rnc?: string | null
          telefono?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          direccion?: string
          email?: string | null
          empresa?: string | null
          id?: string
          nombre_completo?: string
          notas?: string | null
          rnc?: string | null
          telefono?: string
          updated_at?: string
        }
        Relationships: []
      }
      compra_items: {
        Row: {
          cantidad: number
          created_at: string
          descripcion: string
          id: string
          id_compra: string
          id_item: string | null
          precio_unitario: number
          total: number | null
        }
        Insert: {
          cantidad?: number
          created_at?: string
          descripcion?: string
          id?: string
          id_compra: string
          id_item?: string | null
          precio_unitario?: number
          total?: number | null
        }
        Update: {
          cantidad?: number
          created_at?: string
          descripcion?: string
          id?: string
          id_compra?: string
          id_item?: string | null
          precio_unitario?: number
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compra_items_id_compra_fkey"
            columns: ["id_compra"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compra_items_id_item_fkey"
            columns: ["id_item"]
            isOneToOne: false
            referencedRelation: "inventario"
            referencedColumns: ["id"]
          },
        ]
      }
      compras: {
        Row: {
          created_at: string
          fecha: string
          foto_factura: string | null
          id: string
          id_proveedor: string | null
          itbis: number
          notas: string | null
          numero_factura: string | null
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          fecha?: string
          foto_factura?: string | null
          id?: string
          id_proveedor?: string | null
          itbis?: number
          notas?: string | null
          numero_factura?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          fecha?: string
          foto_factura?: string | null
          id?: string
          id_proveedor?: string | null
          itbis?: number
          notas?: string | null
          numero_factura?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_id_proveedor_fkey"
            columns: ["id_proveedor"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion: {
        Row: {
          clave: string
          id: string
          updated_at: string
          valor: string
        }
        Insert: {
          clave: string
          id?: string
          updated_at?: string
          valor?: string
        }
        Update: {
          clave?: string
          id?: string
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      cotizacion_items: {
        Row: {
          cantidad: number
          created_at: string
          descripcion: string
          id: string
          id_cotizacion: string
          precio_unitario: number
          total: number | null
        }
        Insert: {
          cantidad?: number
          created_at?: string
          descripcion: string
          id?: string
          id_cotizacion: string
          precio_unitario?: number
          total?: number | null
        }
        Update: {
          cantidad?: number
          created_at?: string
          descripcion?: string
          id?: string
          id_cotizacion?: string
          precio_unitario?: number
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cotizacion_items_id_cotizacion_fkey"
            columns: ["id_cotizacion"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizaciones: {
        Row: {
          created_at: string
          estado: Database["public"]["Enums"]["estado_cotizacion"]
          fecha: string
          fecha_vencimiento: string | null
          id: string
          id_cliente: string | null
          id_trabajo: string | null
          itbis: number
          notas: string | null
          numero_cotizacion: string
          rnc_cliente: string | null
          rnc_empresa: string | null
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_cotizacion"]
          fecha?: string
          fecha_vencimiento?: string | null
          id?: string
          id_cliente?: string | null
          id_trabajo?: string | null
          itbis?: number
          notas?: string | null
          numero_cotizacion?: string
          rnc_cliente?: string | null
          rnc_empresa?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_cotizacion"]
          fecha?: string
          fecha_vencimiento?: string | null
          id?: string
          id_cliente?: string | null
          id_trabajo?: string | null
          itbis?: number
          notas?: string | null
          numero_cotizacion?: string
          rnc_cliente?: string | null
          rnc_empresa?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotizaciones_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_id_trabajo_fkey"
            columns: ["id_trabajo"]
            isOneToOne: false
            referencedRelation: "trabajos"
            referencedColumns: ["id"]
          },
        ]
      }
      empleados: {
        Row: {
          activo: boolean
          cedula: string | null
          created_at: string
          direccion: string | null
          email: string | null
          fecha_ingreso: string | null
          id: string
          nombre: string
          pago_fijo_mensual: number | null
          telefono: string | null
          tipo: Database["public"]["Enums"]["tipo_empleado"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          activo?: boolean
          cedula?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          fecha_ingreso?: string | null
          id?: string
          nombre: string
          pago_fijo_mensual?: number | null
          telefono?: string | null
          tipo?: Database["public"]["Enums"]["tipo_empleado"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          activo?: boolean
          cedula?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          fecha_ingreso?: string | null
          id?: string
          nombre?: string
          pago_fijo_mensual?: number | null
          telefono?: string | null
          tipo?: Database["public"]["Enums"]["tipo_empleado"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      inventario: {
        Row: {
          categoria: string
          costo_unitario: number | null
          created_at: string
          foto: string | null
          id: string
          nombre_item: string
          stock_actual: number
          stock_minimo: number
          ubicacion: string | null
          unidad: string
          updated_at: string
        }
        Insert: {
          categoria?: string
          costo_unitario?: number | null
          created_at?: string
          foto?: string | null
          id?: string
          nombre_item: string
          stock_actual?: number
          stock_minimo?: number
          ubicacion?: string | null
          unidad?: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          costo_unitario?: number | null
          created_at?: string
          foto?: string | null
          id?: string
          nombre_item?: string
          stock_actual?: number
          stock_minimo?: number
          ubicacion?: string | null
          unidad?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventario_movimientos: {
        Row: {
          cantidad: number
          created_at: string
          fecha: string
          id: string
          id_empleado: string | null
          id_item: string
          id_trabajo: string | null
          motivo: string
          tipo_movimiento: Database["public"]["Enums"]["tipo_movimiento_inv"]
          updated_at: string
        }
        Insert: {
          cantidad: number
          created_at?: string
          fecha?: string
          id?: string
          id_empleado?: string | null
          id_item: string
          id_trabajo?: string | null
          motivo?: string
          tipo_movimiento: Database["public"]["Enums"]["tipo_movimiento_inv"]
          updated_at?: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          fecha?: string
          id?: string
          id_empleado?: string | null
          id_item?: string
          id_trabajo?: string | null
          motivo?: string
          tipo_movimiento?: Database["public"]["Enums"]["tipo_movimiento_inv"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventario_movimientos_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_id_item_fkey"
            columns: ["id_item"]
            isOneToOne: false
            referencedRelation: "inventario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_id_trabajo_fkey"
            columns: ["id_trabajo"]
            isOneToOne: false
            referencedRelation: "trabajos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          nombre: string
          telefono: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nombre?: string
          telefono?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nombre?: string
          telefono?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      proveedores: {
        Row: {
          activo: boolean
          contacto: string | null
          created_at: string
          direccion: string | null
          email: string | null
          id: string
          nombre: string
          notas: string | null
          productos: string | null
          rnc: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          contacto?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          id?: string
          nombre: string
          notas?: string | null
          productos?: string | null
          rnc?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          contacto?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          productos?: string | null
          rnc?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      trabajo_empleados: {
        Row: {
          created_at: string
          descripcion: string
          horas: number | null
          id: string
          id_empleado: string
          id_trabajo: string
          monto_pagar: number
          notas: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string
          horas?: number | null
          id?: string
          id_empleado: string
          id_trabajo: string
          monto_pagar?: number
          notas?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string
          horas?: number | null
          id?: string
          id_empleado?: string
          id_trabajo?: string
          monto_pagar?: number
          notas?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trabajo_empleados_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trabajo_empleados_id_trabajo_fkey"
            columns: ["id_trabajo"]
            isOneToOne: false
            referencedRelation: "trabajos"
            referencedColumns: ["id"]
          },
        ]
      }
      trabajo_materiales: {
        Row: {
          cantidad: number
          costo_total: number | null
          costo_unitario: number
          created_at: string
          id: string
          id_item: string
          id_trabajo: string
          notas: string | null
        }
        Insert: {
          cantidad?: number
          costo_total?: number | null
          costo_unitario?: number
          created_at?: string
          id?: string
          id_item: string
          id_trabajo: string
          notas?: string | null
        }
        Update: {
          cantidad?: number
          costo_total?: number | null
          costo_unitario?: number
          created_at?: string
          id?: string
          id_item?: string
          id_trabajo?: string
          notas?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trabajo_materiales_id_item_fkey"
            columns: ["id_item"]
            isOneToOne: false
            referencedRelation: "inventario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trabajo_materiales_id_trabajo_fkey"
            columns: ["id_trabajo"]
            isOneToOne: false
            referencedRelation: "trabajos"
            referencedColumns: ["id"]
          },
        ]
      }
      trabajos: {
        Row: {
          abono: number | null
          categoria: Database["public"]["Enums"]["categoria_trabajo"]
          created_at: string
          descripcion_trabajo: string
          estado: Database["public"]["Enums"]["estado_trabajo"]
          fecha_entrega_estimada: string | null
          fecha_finalizado: string | null
          fecha_inicio: string
          fotos: string[] | null
          id: string
          id_cliente: string | null
          monto_cotizado: number
          monto_final: number | null
          notas: string | null
          updated_at: string
        }
        Insert: {
          abono?: number | null
          categoria?: Database["public"]["Enums"]["categoria_trabajo"]
          created_at?: string
          descripcion_trabajo: string
          estado?: Database["public"]["Enums"]["estado_trabajo"]
          fecha_entrega_estimada?: string | null
          fecha_finalizado?: string | null
          fecha_inicio?: string
          fotos?: string[] | null
          id?: string
          id_cliente?: string | null
          monto_cotizado?: number
          monto_final?: number | null
          notas?: string | null
          updated_at?: string
        }
        Update: {
          abono?: number | null
          categoria?: Database["public"]["Enums"]["categoria_trabajo"]
          created_at?: string
          descripcion_trabajo?: string
          estado?: Database["public"]["Enums"]["estado_trabajo"]
          fecha_entrega_estimada?: string | null
          fecha_finalizado?: string | null
          fecha_inicio?: string
          fotos?: string[] | null
          id?: string
          id_cliente?: string | null
          monto_cotizado?: number
          monto_final?: number | null
          notas?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trabajos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "employee"
      categoria_trabajo: "Tapicería" | "Ebanistería" | "Mixto"
      estado_cotizacion:
        | "Borrador"
        | "Enviada"
        | "Aprobada"
        | "Rechazada"
        | "Vencida"
      estado_trabajo:
        | "Pendiente"
        | "En proceso"
        | "Finalizado"
        | "Entregado"
        | "Cancelado"
      tipo_empleado: "Fijo" | "Ajuste"
      tipo_movimiento_caja: "Entrada" | "Salida"
      tipo_movimiento_inv: "Entrada" | "Salida" | "Ajuste"
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
      app_role: ["owner", "employee"],
      categoria_trabajo: ["Tapicería", "Ebanistería", "Mixto"],
      estado_cotizacion: [
        "Borrador",
        "Enviada",
        "Aprobada",
        "Rechazada",
        "Vencida",
      ],
      estado_trabajo: [
        "Pendiente",
        "En proceso",
        "Finalizado",
        "Entregado",
        "Cancelado",
      ],
      tipo_empleado: ["Fijo", "Ajuste"],
      tipo_movimiento_caja: ["Entrada", "Salida"],
      tipo_movimiento_inv: ["Entrada", "Salida", "Ajuste"],
    },
  },
} as const
