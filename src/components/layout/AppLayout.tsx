import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, LayoutDashboard, Users, Briefcase, UserCheck, Package, Wallet, FileBarChart, Settings, FileText, TrendingUp, Truck, LogOut, Megaphone, ShoppingBag, Calendar, Bell, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { usePermisos } from '@/hooks/usePermisos';
import { useNotificaciones } from '@/hooks/useNotificaciones';

const allNavItems = [
  { path: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard, ownerOnly: false, modulo: null },
  { path: '/clientes',      label: 'Clientes',      icon: Users,           ownerOnly: false, modulo: 'clientes' },
  { path: '/trabajos',      label: 'Trabajos',      icon: Briefcase,       ownerOnly: false, modulo: 'trabajos' },
  { path: '/ventas',        label: 'Ventas',        icon: ShoppingBag,     ownerOnly: true,  modulo: 'ventas' },
  { path: '/cotizaciones',  label: 'Cotizaciones',  icon: FileText,        ownerOnly: false, modulo: 'cotizaciones' },
  { path: '/empleados',     label: 'Empleados',     icon: UserCheck,       ownerOnly: false, modulo: 'empleados' },
  { path: '/inventario',    label: 'Inventario',    icon: Package,         ownerOnly: false, modulo: 'inventario' },
  { path: '/proveedores',   label: 'Proveedores',   icon: Truck,           ownerOnly: true,  modulo: 'proveedores' },
  { path: '/caja',          label: 'Caja Chica',    icon: Wallet,          ownerOnly: true,  modulo: 'caja' },
  { path: '/kpis',          label: 'KPIs',          icon: TrendingUp,      ownerOnly: true,  modulo: 'kpis' },
  { path: '/reportes',      label: 'Reportes',      icon: FileBarChart,    ownerOnly: true,  modulo: 'reportes' },
  { path: '/ofertas',       label: 'Ofertas',       icon: Megaphone,       ownerOnly: true,  modulo: 'ofertas' },
  { path: '/auditoria',     label: 'Auditoría',     icon: Shield,          ownerOnly: true,  modulo: null },
  { path: '/configuracion', label: 'Configuración', icon: Settings,        ownerOnly: true,  modulo: null },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { isOwner, signOut } = useAuth();
  const { tieneAcceso, loading: permisosLoading } = usePermisos();
  const { notificaciones = [], noLeidas = 0, marcarLeida, marcarTodasLeidas } = useNotificaciones() || {};
  const [campanaOpen, setCampanaOpen] = useState(false);

  const navItems = allNavItems.filter(item => {
    // Owner ve todo siempre
    if (isOwner) return true;
    // Módulos exclusivos del owner nunca aparecen para empleados
    if (item.ownerOnly) return false;
    // Dashboard siempre visible
    if (!item.modulo) return true;
    // Para el resto verificar permisos (no ocultar mientras carga)
    if (permisosLoading) return true;
    return tieneAcceso(item.modulo);
  });

  const NavItems = () => (
    <nav className="flex flex-col gap-1">
      {navItems.map(item => (
        <Link
          key={item.path}
          to={item.path}
          onClick={() => setOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            pathname.startsWith(item.path)
              ? "bg-primary text-primary-foreground"
              : "text-foreground/70 hover:bg-secondary hover:text-foreground"
          )}
        >
          <item.icon className="h-5 w-5 shrink-0" />
          <span>{item.label}</span>
        </Link>
      ))}
      <button
        onClick={() => { signOut(); setOpen(false); }}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive/70 hover:bg-destructive/10 hover:text-destructive mt-4 transition-colors"
      >
        <LogOut className="h-5 w-5 shrink-0" />
        <span>Cerrar Sesión</span>
      </button>
    </nav>
  );

  const BrandBlock = () => (
    <div className="px-3 py-5 border-b border-border">
      <h1 className="text-base font-extrabold text-primary leading-tight">Soluciones Decorativas</h1>
      <p className="text-xs text-muted-foreground font-medium">José Luis · Tapicería & Ebanistería</p>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-64 flex-col fixed h-full border-r border-border bg-card z-40" style={{position:"fixed"}}>
        <BrandBlock />
        <div className="flex-1 overflow-y-auto p-3">
          {/* Campana desktop */}
          <div className="mb-3 relative">
            <button onClick={() => setCampanaOpen(!campanaOpen)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground/70 hover:bg-secondary hover:text-foreground transition-colors">
              <div className="relative">
                <Bell className="h-5 w-5 shrink-0" />
                {noLeidas > 0 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-destructive text-white text-[9px] font-bold rounded-full flex items-center justify-center">{noLeidas > 9 ? '9+' : noLeidas}</span>}
              </div>
              <span>Notificaciones</span>
              {noLeidas > 0 && <span className="ml-auto text-xs font-bold text-destructive">{noLeidas}</span>}
            </button>
            {campanaOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setCampanaOpen(false)} />
                <div className="absolute left-0 top-full mt-1 w-72 bg-card border rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2.5 border-b">
                    <span className="font-semibold text-sm">Notificaciones</span>
                    {noLeidas > 0 && <button onClick={marcarTodasLeidas} className="text-xs text-primary hover:underline">Todas leídas</button>}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notificaciones.length === 0
                      ? <p className="text-center text-xs text-muted-foreground py-6">Sin notificaciones</p>
                      : notificaciones.map((n: any) => (
                          <div key={n.id} onClick={() => marcarLeida(n.id)}
                            className={`px-3 py-2.5 border-b last:border-0 cursor-pointer hover:bg-secondary/50 transition-colors ${n.leida ? 'opacity-60' : ''}`}>
                            <div className="flex items-start gap-2">
                              <span className="text-sm shrink-0">{n.icono || '🔔'}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold">{n.titulo}</p>
                                <p className="text-xs text-muted-foreground line-clamp-2">{n.mensaje}</p>
                              </div>
                              {!n.leida && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1" />}
                            </div>
                          </div>
                        ))
                    }
                  </div>
                </div>
              </>
            )}
          </div>
          <NavItems />
        </div>
      </aside>

      {/* Header móvil */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 border-b border-border bg-card flex items-center px-4 gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0"><Menu className="h-5 w-5" /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <BrandBlock />
            <div className="p-3"><NavItems /></div>
          </SheetContent>
        </Sheet>
        <h1 className="text-sm font-bold text-primary truncate flex-1">Soluciones Decorativas JL</h1>
        {/* Campana notificaciones */}
        <div className="relative shrink-0">
          <button onClick={() => setCampanaOpen(!campanaOpen)}
            className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
            <Bell className="h-5 w-5" />
            {noLeidas > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {noLeidas > 9 ? '9+' : noLeidas}
              </span>
            )}
          </button>
          {campanaOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setCampanaOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-80 bg-card border rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <span className="font-semibold text-sm">Notificaciones</span>
                  {noLeidas > 0 && <button onClick={marcarTodasLeidas} className="text-xs text-primary hover:underline">Marcar todas leídas</button>}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notificaciones.length === 0
                    ? <p className="text-center text-sm text-muted-foreground py-8">Sin notificaciones</p>
                    : notificaciones.map((n: any) => (
                        <div key={n.id} onClick={() => marcarLeida(n.id)}
                          className={`px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-secondary/50 transition-colors ${n.leida ? 'opacity-60' : ''}`}>
                          <div className="flex items-start gap-2">
                            <span className="text-base shrink-0">{n.icono || '🔔'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold">{n.titulo}</p>
                              <p className="text-xs text-muted-foreground">{n.mensaje}</p>
                            </div>
                            {!n.leida && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
                          </div>
                        </div>
                      ))
                  }
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 lg:ml-64 mt-14 lg:mt-0 p-4 lg:p-8 max-w-full overflow-x-hidden">
        <div className="animate-fade-in">{children}</div>
      </main>
    </div>
  );
}