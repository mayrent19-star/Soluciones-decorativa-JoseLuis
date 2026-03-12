import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, LayoutDashboard, Users, Briefcase, UserCheck, Package, Wallet, FileBarChart, Settings, FileText, TrendingUp, Truck, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const allNavItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, ownerOnly: false },
  { path: '/clientes', label: 'Clientes', icon: Users, ownerOnly: false },
  { path: '/trabajos', label: 'Trabajos', icon: Briefcase, ownerOnly: false },
  { path: '/cotizaciones', label: 'Cotizaciones', icon: FileText, ownerOnly: false },
  { path: '/empleados', label: 'Empleados', icon: UserCheck, ownerOnly: false },
  { path: '/inventario', label: 'Inventario', icon: Package, ownerOnly: false },
  { path: '/proveedores', label: 'Proveedores', icon: Truck, ownerOnly: true },
  { path: '/caja', label: 'Caja Chica', icon: Wallet, ownerOnly: true },
  { path: '/kpis', label: 'KPIs', icon: TrendingUp, ownerOnly: true },
  { path: '/reportes', label: 'Reportes', icon: FileBarChart, ownerOnly: true },
  { path: '/configuracion', label: 'Configuración', icon: Settings, ownerOnly: true },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { isOwner, signOut } = useAuth();

  const navItems = allNavItems.filter(item => !item.ownerOnly || isOwner);

  const NavItems = () => (
    <nav className="flex flex-col gap-1">
      {navItems.map(item => (
        <Link key={item.path} to={item.path} onClick={() => setOpen(false)}
          className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            pathname.startsWith(item.path) ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-secondary hover:text-foreground"
          )}>
          <item.icon className="h-5 w-5 shrink-0" /><span>{item.label}</span>
        </Link>
      ))}
      <button onClick={() => { signOut(); setOpen(false); }}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive/70 hover:bg-destructive/10 hover:text-destructive mt-4 transition-colors">
        <LogOut className="h-5 w-5 shrink-0" /><span>Cerrar Sesión</span>
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
      <aside className="hidden lg:flex w-64 flex-col fixed h-full border-r border-border bg-card z-40">
        <BrandBlock />
        <div className="flex-1 overflow-y-auto p-3"><NavItems /></div>
      </aside>
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 border-b border-border bg-card flex items-center px-4 gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild><Button variant="ghost" size="icon" className="shrink-0"><Menu className="h-5 w-5" /></Button></SheetTrigger>
          <SheetContent side="left" className="w-64 p-0"><BrandBlock /><div className="p-3"><NavItems /></div></SheetContent>
        </Sheet>
        <h1 className="text-sm font-bold text-primary truncate">Soluciones Decorativas JL</h1>
      </header>
      <main className="flex-1 lg:ml-64 mt-14 lg:mt-0 p-4 lg:p-8 max-w-full overflow-x-hidden">
        <div className="animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
