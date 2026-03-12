import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Trabajos from "./pages/Trabajos";
import TrabajoDetalle from "./pages/TrabajoDetalle";
import Empleados from "./pages/Empleados";
import Inventario from "./pages/Inventario";
import CajaChica from "./pages/CajaChica";
import Cotizaciones from "./pages/Cotizaciones";
import Proveedores from "./pages/Proveedores";
import KPIs from "./pages/KPIs";
import Reportes from "./pages/Reportes";
import Configuracion from "./pages/Configuracion";
import NotFound from "./pages/NotFound";

// ✅ FIX 1: QueryClient con configuración correcta
// staleTime evita re-fetches innecesarios al cambiar de pestaña
// refetchOnWindowFocus: false es el fix principal del freeze
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:           1000 * 60 * 5,  // datos frescos por 5 minutos
      gcTime:              1000 * 60 * 10, // caché vive 10 minutos
      retry:               2,              // reintenta 2 veces si falla
      refetchOnWindowFocus: false,         // ← FIX PRINCIPAL del freeze
      refetchOnReconnect:  true,           // re-fetcha si se recupera conexión
    },
    mutations: {
      retry: 1,
    },
  },
});

const P = ({
  children,
  ownerOnly = false,
}: {
  children: React.ReactNode;
  ownerOnly?: boolean;
}) => (
  <ProtectedRoute ownerOnly={ownerOnly}>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    {/* ✅ FIX 2: AuthProvider FUERA del BrowserRouter
        Así la sesión no se reinicia en cada navegación entre rutas */}
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/"              element={<Index />} />
            <Route path="/auth"          element={<Auth />} />
            <Route path="/dashboard"     element={<P><Dashboard /></P>} />
            <Route path="/clientes"      element={<P><Clientes /></P>} />
            <Route path="/trabajos"      element={<P><Trabajos /></P>} />
            <Route path="/trabajos/:id"  element={<P><TrabajoDetalle /></P>} />
            <Route path="/empleados"     element={<P><Empleados /></P>} />
            <Route path="/inventario"    element={<P><Inventario /></P>} />
            <Route path="/caja"          element={<P ownerOnly><CajaChica /></P>} />
            <Route path="/cotizaciones"  element={<P><Cotizaciones /></P>} />
            <Route path="/proveedores"   element={<P ownerOnly><Proveedores /></P>} />
            <Route path="/kpis"          element={<P ownerOnly><KPIs /></P>} />
            <Route path="/reportes"      element={<P ownerOnly><Reportes /></P>} />
            <Route path="/configuracion" element={<P ownerOnly><Configuracion /></P>} />
            <Route path="*"              element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;