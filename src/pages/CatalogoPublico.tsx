import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

function formatCurrency(val: number) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 0 }).format(val);
}

export default function CatalogoPublico() {
  const [muebles,    setMuebles]    = useState<any[]>([]);
  const [telefono,   setTelefono]   = useState('');
  const [nombre,     setNombre]     = useState('Soluciones Decorativas JL');
  const [direccion,  setDireccion]  = useState('Av. México, No. 160, Buenos Aires de Herrera. Sto Dgo Oeste');
  const [horario,    setHorario]    = useState('Lun–Sáb 8:00 AM – 7:30 PM');
  const [search,     setSearch]     = useState('');
  const [selected,   setSelected]   = useState<any>(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: muebs } = await db
        .from('catalogo_muebles')
        .select('*')
        .eq('disponible', true)
        .gt('stock', 0)
        .order('nombre');
      setMuebles(muebs || []);

      const { data: cfg } = await db
        .from('configuracion')
        .select('clave, valor')
        .in('clave', ['empresa_telefono', 'empresa_nombre', 'empresa_direccion']);
      if (cfg) {
        cfg.forEach((c: any) => {
          if (c.clave === 'empresa_telefono') {
            // Limpiar número — quitar todo excepto dígitos, asegurar código de país
            const limpio = c.valor?.replace(/\D/g, '') || '';
            setTelefono(limpio.startsWith('1') ? limpio : `1${limpio}`);
          }
          if (c.clave === 'empresa_nombre')    setNombre(c.valor || 'Soluciones Decorativas JL');
          if (c.clave === 'empresa_direccion') setDireccion(c.valor || direccion);
        });
      }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = muebles.filter(m =>
    m.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    m.descripcion?.toLowerCase().includes(search.toLowerCase())
  );

  const abrirWhatsApp = (mueble: any) => {
    const msg = encodeURIComponent(
      `Hola! Vi su catálogo en línea y me interesa:\n\n*${mueble.nombre}*\n${mueble.precio ? `💰 Precio: ${formatCurrency(mueble.precio)}` : ''}\n${mueble.descripcion ? `\n${mueble.descripcion}` : ''}\n\n¿Está disponible?`
    );
    const num = telefono || '18095372374';
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
  };

  const abrirMapa = () => {
    window.open('https://www.google.com/maps/place/Soluciones+Decorativas+Jose+Luis/@18.4686814,-69.9814906,662m/data=!3m1!1e3!4m15!1m8!3m7!1s0x8ea56197037973af:0xb2a1d724c1897254!2sSoluciones+Decorativas+Jose+Luis!8m2!3d18.4686814!4d-69.9814906!10e1!16s%2Fg%2F11fjyw2l5s!3m5!1s0x8ea56197037973af:0xb2a1d724c1897254!8m2!3d18.4686814!4d-69.9814906!16s%2Fg%2F11fjyw2l5s', '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#185FA5] text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col items-center text-center">
          <img
            src="/icons/icon-128.png"
            alt="logo"
            className="w-16 h-16 object-contain rounded-2xl mb-3 bg-white/10 p-1.5"
            onError={e => (e.currentTarget.style.display = 'none')}
          />
          <h1 className="text-2xl font-bold">{nombre}</h1>
          <p className="text-blue-100 text-sm mt-1">Tapicería &amp; Ebanistería</p>

          {/* Info rápida */}
          <div className="flex flex-wrap justify-center gap-3 mt-4 text-xs text-blue-100">
            <span className="flex items-center gap-1">📍 {direccion}</span>
            <span className="flex items-center gap-1">🕐 {horario}</span>
          </div>

          {/* Botones contacto */}
          <div className="flex gap-3 mt-4 flex-wrap justify-center">
            <a href={`https://wa.me/${telefono || '18095372374'}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full text-xs font-semibold transition-colors shadow">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
            <button onClick={abrirMapa}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full text-xs font-semibold transition-colors">
              📍 Cómo llegar
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Búsqueda */}
        <input
          type="text"
          placeholder="🔍 Buscar producto..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5]/40"
        />

        {loading && (
          <div className="text-center py-20 text-gray-400">
            <div className="animate-spin text-4xl mb-3">⏳</div>
            <p className="text-sm">Cargando catálogo...</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-3">🛋️</p>
            <p className="font-medium text-gray-500">No hay productos disponibles en este momento</p>
            <p className="text-sm mt-1">Vuelve pronto o contáctanos directamente</p>
            <a href={`https://wa.me/${telefono || '18095372374'}`} target="_blank" rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-full text-sm font-medium transition-colors shadow">
              💬 Contactar por WhatsApp
            </a>
          </div>
        )}

        {/* Grid productos */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(m => (
            <div key={m.id}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => setSelected(m)}
            >
              {m.foto_url
                ? <img src={m.foto_url} alt={m.nombre} className="w-full h-40 object-cover group-hover:opacity-95 transition-opacity" />
                : <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-4xl">🛋️</div>
              }
              <div className="p-2.5">
                <p className="font-semibold text-sm truncate text-gray-800">{m.nombre}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-bold text-[#185FA5]">{m.precio ? formatCurrency(m.precio) : '—'}</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{m.stock} disp.</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="text-center pt-4 pb-8 space-y-1">
            <p className="text-xs text-gray-400">{nombre} · Todos los precios en RD$</p>
            <p className="text-xs text-gray-400">📍 {direccion}</p>
            <p className="text-xs text-gray-400">🕐 {horario} · Domingo cerrado</p>
          </div>
        )}
      </div>

      {/* Modal detalle producto */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}>
            {selected.foto_url && (
              <img src={selected.foto_url} alt={selected.nombre} className="w-full h-56 object-cover" />
            )}
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-bold text-gray-800 leading-tight">{selected.nombre}</h2>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium shrink-0">
                  {selected.stock} disp.
                </span>
              </div>
              {selected.precio > 0 && (
                <p className="text-2xl font-bold text-[#185FA5]">{formatCurrency(selected.precio)}</p>
              )}
              {selected.descripcion && (
                <p className="text-sm text-gray-600 leading-relaxed">{selected.descripcion}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={() => abrirWhatsApp(selected)}
                  className="flex-1 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Me interesa
                </button>
                <button onClick={() => setSelected(null)}
                  className="px-4 py-3 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-medium transition-colors">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}