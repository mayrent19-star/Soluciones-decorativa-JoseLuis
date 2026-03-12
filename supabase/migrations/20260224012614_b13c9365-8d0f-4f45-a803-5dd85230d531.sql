
-- Drop any partial enums from failed migration
DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.estado_trabajo CASCADE;
DROP TYPE IF EXISTS public.categoria_trabajo CASCADE;
DROP TYPE IF EXISTS public.tipo_empleado CASCADE;
DROP TYPE IF EXISTS public.tipo_movimiento_inv CASCADE;
DROP TYPE IF EXISTS public.tipo_movimiento_caja CASCADE;
DROP TYPE IF EXISTS public.estado_cotizacion CASCADE;
DROP FUNCTION IF EXISTS public.has_role CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS public.generate_cotizacion_number CASCADE;

-- ============================================
-- ENUM TYPES
-- ============================================
CREATE TYPE public.app_role AS ENUM ('owner', 'employee');
CREATE TYPE public.estado_trabajo AS ENUM ('Pendiente', 'En proceso', 'Finalizado', 'Entregado', 'Cancelado');
CREATE TYPE public.categoria_trabajo AS ENUM ('Tapicería', 'Ebanistería', 'Mixto');
CREATE TYPE public.tipo_empleado AS ENUM ('Fijo', 'Ajuste');
CREATE TYPE public.tipo_movimiento_inv AS ENUM ('Entrada', 'Salida', 'Ajuste');
CREATE TYPE public.tipo_movimiento_caja AS ENUM ('Entrada', 'Salida');
CREATE TYPE public.estado_cotizacion AS ENUM ('Borrador', 'Enviada', 'Aprobada', 'Rechazada', 'Vencida');

-- ============================================
-- TABLES (ordered to avoid forward references)
-- ============================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nombre TEXT NOT NULL DEFAULT '',
  email TEXT,
  telefono TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.configuracion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave TEXT NOT NULL UNIQUE,
  valor TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo TEXT NOT NULL,
  empresa TEXT,
  telefono TEXT NOT NULL DEFAULT '',
  direccion TEXT NOT NULL DEFAULT '',
  email TEXT,
  rnc TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.empleados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  cedula TEXT,
  fecha_ingreso DATE,
  direccion TEXT,
  email TEXT,
  tipo tipo_empleado NOT NULL DEFAULT 'Fijo',
  telefono TEXT,
  pago_fijo_mensual NUMERIC(12,2) DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.empleados ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.trabajos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  descripcion_trabajo TEXT NOT NULL,
  categoria categoria_trabajo NOT NULL DEFAULT 'Tapicería',
  estado estado_trabajo NOT NULL DEFAULT 'Pendiente',
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_entrega_estimada DATE,
  fecha_finalizado DATE,
  monto_cotizado NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_final NUMERIC(12,2),
  abono NUMERIC(12,2) DEFAULT 0,
  notas TEXT,
  fotos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trabajos ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.trabajo_empleados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_trabajo UUID REFERENCES public.trabajos(id) ON DELETE CASCADE NOT NULL,
  id_empleado UUID REFERENCES public.empleados(id) ON DELETE CASCADE NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  horas NUMERIC(8,2),
  monto_pagar NUMERIC(12,2) NOT NULL DEFAULT 0,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trabajo_empleados ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_item TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT '',
  unidad TEXT NOT NULL DEFAULT 'und',
  stock_actual NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_minimo NUMERIC(12,2) NOT NULL DEFAULT 0,
  costo_unitario NUMERIC(12,2),
  ubicacion TEXT,
  foto TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inventario ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.inventario_movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_item UUID REFERENCES public.inventario(id) ON DELETE CASCADE NOT NULL,
  tipo_movimiento tipo_movimiento_inv NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  cantidad NUMERIC(12,2) NOT NULL,
  motivo TEXT NOT NULL DEFAULT '',
  id_trabajo UUID REFERENCES public.trabajos(id) ON DELETE SET NULL,
  id_empleado UUID REFERENCES public.empleados(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inventario_movimientos ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.trabajo_materiales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_trabajo UUID REFERENCES public.trabajos(id) ON DELETE CASCADE NOT NULL,
  id_item UUID REFERENCES public.inventario(id) ON DELETE SET NULL NOT NULL,
  cantidad NUMERIC(12,2) NOT NULL DEFAULT 1,
  costo_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  costo_total NUMERIC(12,2) GENERATED ALWAYS AS (cantidad * costo_unitario) STORED,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trabajo_materiales ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.caja_movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo tipo_movimiento_caja NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  monto NUMERIC(12,2) NOT NULL,
  detalle TEXT NOT NULL DEFAULT '',
  categoria_gasto TEXT,
  id_trabajo UUID REFERENCES public.trabajos(id) ON DELETE SET NULL,
  id_empleado UUID REFERENCES public.empleados(id) ON DELETE SET NULL,
  foto_factura TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.caja_movimientos ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.cotizaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_cotizacion TEXT NOT NULL DEFAULT '',
  id_cliente UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  id_trabajo UUID REFERENCES public.trabajos(id) ON DELETE SET NULL,
  estado estado_cotizacion NOT NULL DEFAULT 'Borrador',
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  itbis NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  rnc_empresa TEXT,
  rnc_cliente TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.cotizacion_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cotizacion UUID REFERENCES public.cotizaciones(id) ON DELETE CASCADE NOT NULL,
  descripcion TEXT NOT NULL,
  cantidad NUMERIC(12,2) NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cotizacion_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  contacto TEXT,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  rnc TEXT,
  productos TEXT,
  notas TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_proveedor UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  numero_factura TEXT,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  itbis NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notas TEXT,
  foto_factura TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.compra_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_compra UUID REFERENCES public.compras(id) ON DELETE CASCADE NOT NULL,
  id_item UUID REFERENCES public.inventario(id) ON DELETE SET NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  cantidad NUMERIC(12,2) NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.compra_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SECURITY DEFINER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1 $$;

-- ============================================
-- RLS POLICIES (all tables exist now)
-- ============================================

-- profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_roles
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- configuracion
CREATE POLICY "Auth can read config" ON public.configuracion FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner can manage config" ON public.configuracion FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- clientes
CREATE POLICY "Auth can read clientes" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner can manage clientes" ON public.clientes FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- empleados
CREATE POLICY "Auth can read empleados" ON public.empleados FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner can manage empleados" ON public.empleados FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- trabajos
CREATE POLICY "Auth can read trabajos" ON public.trabajos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner can manage trabajos" ON public.trabajos FOR ALL USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Employee sees assigned trabajos" ON public.trabajos FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.trabajo_empleados te JOIN public.empleados e ON te.id_empleado = e.id WHERE te.id_trabajo = trabajos.id AND e.user_id = auth.uid())
);

-- trabajo_empleados
CREATE POLICY "Auth can read te" ON public.trabajo_empleados FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner can manage te" ON public.trabajo_empleados FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- inventario
CREATE POLICY "Auth can read inv" ON public.inventario FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner can manage inv" ON public.inventario FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- inventario_movimientos
CREATE POLICY "Auth can read inv_mov" ON public.inventario_movimientos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner can manage inv_mov" ON public.inventario_movimientos FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- trabajo_materiales
CREATE POLICY "Auth can read tm" ON public.trabajo_materiales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner can manage tm" ON public.trabajo_materiales FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- caja_movimientos
CREATE POLICY "Auth can read caja" ON public.caja_movimientos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner can manage caja" ON public.caja_movimientos FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- cotizaciones
CREATE POLICY "Auth can read cot" ON public.cotizaciones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner can manage cot" ON public.cotizaciones FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- cotizacion_items
CREATE POLICY "Auth can read cot_items" ON public.cotizacion_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner can manage cot_items" ON public.cotizacion_items FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- proveedores
CREATE POLICY "Auth can read prov" ON public.proveedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner can manage prov" ON public.proveedores FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- compras
CREATE POLICY "Auth can read compras" ON public.compras FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner can manage compras" ON public.compras FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- compra_items
CREATE POLICY "Auth can read ci" ON public.compra_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner can manage ci" ON public.compra_items FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nombre, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre', ''), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER tr_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tr_clientes BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tr_empleados BEFORE UPDATE ON public.empleados FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tr_trabajos BEFORE UPDATE ON public.trabajos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tr_trabajo_empleados BEFORE UPDATE ON public.trabajo_empleados FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tr_inventario BEFORE UPDATE ON public.inventario FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tr_inv_mov BEFORE UPDATE ON public.inventario_movimientos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tr_caja BEFORE UPDATE ON public.caja_movimientos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tr_cotizaciones BEFORE UPDATE ON public.cotizaciones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tr_proveedores BEFORE UPDATE ON public.proveedores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tr_compras BEFORE UPDATE ON public.compras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tr_configuracion BEFORE UPDATE ON public.configuracion FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default config
INSERT INTO public.configuracion (clave, valor) VALUES
  ('empresa_nombre', 'Soluciones Decorativas JL'),
  ('empresa_rnc', ''),
  ('empresa_telefono', ''),
  ('empresa_direccion', ''),
  ('empresa_email', ''),
  ('garantia_texto', 'Garantía de 6 meses en mano de obra y materiales a partir de la fecha de entrega. No cubre daños por mal uso.'),
  ('whatsapp_alertas', '');

-- Storage
INSERT INTO storage.buckets (id, name, public) VALUES ('fotos', 'fotos', true);
CREATE POLICY "Auth can upload fotos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'fotos');
CREATE POLICY "Public can view fotos" ON storage.objects FOR SELECT USING (bucket_id = 'fotos');
CREATE POLICY "Auth can delete fotos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'fotos');

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventario;

-- Auto cotizacion number
CREATE OR REPLACE FUNCTION public.generate_cotizacion_number()
RETURNS TRIGGER AS $$
DECLARE next_num INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_cotizacion FROM 'COT-(\d+)') AS INT)), 0) + 1 INTO next_num FROM public.cotizaciones;
  NEW.numero_cotizacion := 'COT-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_cotizacion_number BEFORE INSERT ON public.cotizaciones
  FOR EACH ROW WHEN (NEW.numero_cotizacion = '' OR NEW.numero_cotizacion IS NULL)
  EXECUTE FUNCTION public.generate_cotizacion_number();
