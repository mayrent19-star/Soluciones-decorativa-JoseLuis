import { useState, useRef, useEffect } from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Cliente {
  id: string;
  nombre_completo: string;
  telefono?: string;
  rnc?: string;
}

interface Props {
  clientes: Cliente[];
  value: string;                          // id del cliente seleccionado
  onChange: (id: string) => void;
  // Para cliente sin registrar
  nombreLibre?: string;
  rncLibre?: string;
  onNombreLibre?: (v: string) => void;
  onRncLibre?: (v: string) => void;
}

export default function ClienteSelector({
  clientes, value, onChange,
  nombreLibre = '', rncLibre = '',
  onNombreLibre, onRncLibre,
}: Props) {
  const [busqueda,      setBusqueda]      = useState('');
  const [abierto,       setAbierto]       = useState(false);
  const [sinRegistrar,  setSinRegistrar]  = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const clienteSeleccionado = clientes.find(c => c.id === value);

  const filtrados = clientes.filter(c =>
    c.nombre_completo?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.telefono?.includes(busqueda) ||
    c.rnc?.includes(busqueda)
  ).slice(0, 8); // máximo 8 resultados

  const limpiar = () => {
    onChange('');
    setBusqueda('');
    setAbierto(false);
  };

  const toggleSinRegistrar = () => {
    setSinRegistrar(prev => {
      if (!prev) { onChange(''); setBusqueda(''); }
      else { onNombreLibre?.(''); onRncLibre?.(''); }
      return !prev;
    });
  };

  return (
    <div className="space-y-2">
      {/* Toggle sin registrar */}
      <div className="flex items-center justify-between">
        <Label className="text-xs">Cliente *</Label>
        <button
          type="button"
          onClick={toggleSinRegistrar}
          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${
            sinRegistrar
              ? 'bg-amber-100 border-amber-400 text-amber-700'
              : 'border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          <UserPlus className="h-3 w-3" />
          {sinRegistrar ? 'Registrado' : 'Sin registrar'}
        </button>
      </div>

      {sinRegistrar ? (
        /* Cliente sin registrar — campos libres */
        <div className="space-y-2 p-3 rounded-lg border border-amber-200 bg-amber-50/50">
          <p className="text-xs text-amber-700">Cliente no registrado en el sistema</p>
          <Input
            placeholder="Nombre del cliente *"
            value={nombreLibre}
            onChange={e => onNombreLibre?.(e.target.value)}
            className="h-9 text-sm"
          />
          <Input
            placeholder="RNC (opcional)"
            value={rncLibre}
            onChange={e => onRncLibre?.(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
      ) : (
        /* Selector con búsqueda */
        <div ref={ref} className="relative">
          {clienteSeleccionado ? (
            /* Cliente ya seleccionado */
            <div className="flex items-center justify-between px-3 py-2 rounded-md border bg-background text-sm">
              <div className="min-w-0">
                <p className="font-medium truncate">{clienteSeleccionado.nombre_completo}</p>
                {clienteSeleccionado.telefono && (
                  <p className="text-xs text-muted-foreground">{clienteSeleccionado.telefono}</p>
                )}
              </div>
              <button onClick={limpiar} className="shrink-0 ml-2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            /* Buscador */
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente por nombre, teléfono o RNC..."
                  value={busqueda}
                  onChange={e => { setBusqueda(e.target.value); setAbierto(true); }}
                  onFocus={() => setAbierto(true)}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              {/* Dropdown de resultados */}
              {abierto && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg overflow-hidden">
                  {filtrados.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-center text-muted-foreground">
                      {busqueda ? `Sin resultados para "${busqueda}"` : 'Escribe para buscar un cliente'}
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto">
                      {filtrados.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { onChange(c.id); setBusqueda(''); setAbierto(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary text-left transition-colors"
                        >
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary">
                              {c.nombre_completo.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{c.nombre_completo}</p>
                            {(c.telefono || c.rnc) && (
                              <p className="text-xs text-muted-foreground">
                                {[c.telefono, c.rnc ? `RNC: ${c.rnc}` : ''].filter(Boolean).join(' · ')}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
