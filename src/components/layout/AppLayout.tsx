import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, LayoutDashboard, Users, Briefcase, UserCheck, Package, Wallet, FileBarChart, Settings, FileText, TrendingUp, Truck, LogOut, Megaphone, Calendar, Bell, X, Download, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { usePermisos } from '@/hooks/usePermisos';
import { useNotificaciones } from '@/hooks/useNotificaciones';
import { usePWAInstall } from '@/hooks/usePWAInstall';

const allNavItems = [
  { path: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard, ownerOnly: false, modulo: null },
  { path: '/clientes',      label: 'Clientes',      icon: Users,           ownerOnly: false, modulo: 'clientes' },
  { path: '/trabajos',      label: 'Trabajos',      icon: Briefcase,       ownerOnly: false, modulo: 'trabajos' },
  { path: '/cotizaciones',  label: 'Cotizaciones',  icon: FileText,        ownerOnly: false, modulo: 'cotizaciones' },
  { path: '/empleados',     label: 'Empleados',     icon: UserCheck,       ownerOnly: false, modulo: 'empleados' },
  { path: '/inventario',    label: 'Inventario',    icon: Package,         ownerOnly: false, modulo: 'inventario' },
  { path: '/proveedores',   label: 'Proveedores',   icon: Truck,           ownerOnly: true,  modulo: 'proveedores' },
  { path: '/caja',          label: 'Caja Chica',    icon: Wallet,          ownerOnly: true,  modulo: 'caja' },
  { path: '/kpis',          label: 'KPIs',          icon: TrendingUp,      ownerOnly: true,  modulo: 'kpis' },
  { path: '/reportes',      label: 'Reportes',      icon: FileBarChart,    ownerOnly: true,  modulo: 'reportes' },
  { path: '/calendario',    label: 'Calendario',    icon: Calendar,        ownerOnly: false, modulo: 'calendario' },
  { path: '/ofertas',       label: 'Ofertas',       icon: Megaphone,       ownerOnly: true,  modulo: 'ofertas' },
  { path: '/auditoria',     label: 'Auditoría',     icon: Shield,          ownerOnly: true,  modulo: null },
  { path: '/configuracion', label: 'Configuración', icon: Settings,        ownerOnly: true,  modulo: null },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [campanOpen, setCampanOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isOwner, signOut } = useAuth();
  const { tieneAcceso, loading: permisosLoading } = usePermisos();
  const { notifs, noLeidas, marcarLeida, marcarTodasLeidas } = useNotificaciones();
  const { puedeInstalar, instalar } = usePWAInstall();

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

  const CampanaBtn = () => (
    <button
      onClick={() => setCampanOpen(o => !o)}
      className="relative p-2 rounded-lg hover:bg-secondary transition-colors"
      title="Notificaciones"
    >
      <Bell className="h-5 w-5 text-foreground/70" />
      {noLeidas > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-destructive text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
          {noLeidas > 9 ? '9+' : noLeidas}
        </span>
      )}
    </button>
  );


  return (
    <div className="flex min-h-screen bg-background">
      {/* Overlay para cerrar campana al hacer clic fuera */}
      {campanOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setCampanOpen(false)} />
      )}

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-64 flex-col fixed h-full border-r border-border bg-card z-40">
        <BrandBlock />
        <div className="flex-1 overflow-y-auto p-3"><NavItems /></div>
        {/* Campana en sidebar desktop */}
        <div className="p-3 border-t relative z-50">
          <div className="flex items-center gap-2">
            <CampanaBtn />
            <span className="text-xs text-muted-foreground">
              {noLeidas > 0 ? `${noLeidas} sin leer` : 'Todo al día'}
            </span>
          </div>
          {campanOpen && (
            <div className="absolute left-0 bottom-full mb-2 w-80 bg-card border rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <span className="text-sm font-semibold">Notificaciones</span>
                <div className="flex items-center gap-2">
                  {noLeidas > 0 && (
                    <button onClick={marcarTodasLeidas} className="text-xs text-muted-foreground hover:text-foreground">
                      Marcar todas
                    </button>
                  )}
                  <button onClick={() => setCampanOpen(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
                </div>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {notifs.length === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground">Sin notificaciones pendientes</div>
                )}
                {notifs.map(n => (
                  <div key={n.id}
                    onClick={() => { marcarLeida(n.id); setCampanOpen(false); if (n.link) navigate(n.link); }}
                    className={`flex gap-3 px-4 py-3 border-b cursor-pointer hover:bg-secondary/50 transition-colors ${n.leida ? 'opacity-50' : ''}`}>
                    <div className={`w-1.5 rounded-full shrink-0 mt-1 self-stretch ${n.prioridad === 'alta' ? 'bg-destructive' : n.prioridad === 'media' ? 'bg-amber-500' : 'bg-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold">{n.titulo}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.descripcion}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{n.fecha}</p>
                    </div>
                    {!n.leida && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* Botón instalar PWA */}
        {puedeInstalar && (
          <div className="px-3 pb-3">
            <button onClick={instalar}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-primary text-xs font-medium">
              <Download className="h-4 w-4 shrink-0" />
              Instalar como app
            </button>
          </div>
        )}
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
            {puedeInstalar && (
              <div className="px-3 pb-3">
                <button onClick={instalar}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-primary text-xs font-medium">
                  <Download className="h-4 w-4 shrink-0" />
                  Instalar como app
                </button>
              </div>
            )}
          </SheetContent>
        </Sheet>
        <h1 className="text-sm font-bold text-primary truncate flex-1">Soluciones Decorativas JL</h1>
        {/* Campana móvil */}
        <div className="relative shrink-0">
          <CampanaBtn />
          {campanOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-card border rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <span className="text-sm font-semibold">Notificaciones</span>
                <div className="flex items-center gap-2">
                  {noLeidas > 0 && (
                    <button onClick={marcarTodasLeidas} className="text-xs text-muted-foreground hover:text-foreground">
                      Marcar todas
                    </button>
                  )}
                  <button onClick={() => setCampanOpen(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
                </div>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {notifs.length === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground">Sin notificaciones pendientes</div>
                )}
                {notifs.map(n => (
                  <div key={n.id}
                    onClick={() => { marcarLeida(n.id); setCampanOpen(false); if (n.link) navigate(n.link); }}
                    className={`flex gap-3 px-4 py-3 border-b cursor-pointer hover:bg-secondary/50 transition-colors ${n.leida ? 'opacity-50' : ''}`}>
                    <div className={`w-1.5 rounded-full shrink-0 mt-1 self-stretch ${n.prioridad === 'alta' ? 'bg-destructive' : n.prioridad === 'media' ? 'bg-amber-500' : 'bg-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold">{n.titulo}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.descripcion}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{n.fecha}</p>
                    </div>
                    {!n.leida && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 lg:ml-64 mt-14 lg:mt-0 p-4 lg:p-8 max-w-full overflow-x-hidden">
        <div className="animate-fade-in">{children}</div>
      </main>
    </div>
  );
}