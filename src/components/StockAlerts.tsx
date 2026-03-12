import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface LowStockItem {
  id: string;
  nombre_item: string;
  stock_actual: number;
  stock_minimo: number;
  unidad: string;
}

export default function StockAlerts() {
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [dismissed, setDismissed] = useState(false);

  const fetchLowStock = async () => {
    const { data } = await supabase.from('inventario').select('id, nombre_item, stock_actual, stock_minimo, unidad');
    if (data) {
      setItems(data.filter((i: any) => i.stock_actual <= i.stock_minimo));
    }
  };

  useEffect(() => {
    fetchLowStock();
    // Realtime subscription
    const channel = supabase.channel('stock-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventario' }, () => fetchLowStock())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (dismissed || items.length === 0) return null;

  return (
    <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-semibold text-destructive">⚠️ Stock Bajo ({items.length} artículos)</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDismissed(true)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.slice(0, 8).map(item => (
          <Badge key={item.id} variant="destructive" className="text-xs">
            {item.nombre_item}: {item.stock_actual}/{item.stock_minimo} {item.unidad}
          </Badge>
        ))}
      </div>
    </div>
  );
}
