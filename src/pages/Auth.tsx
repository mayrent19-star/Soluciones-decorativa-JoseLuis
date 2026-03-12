import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

const db = supabase as any;

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/dashboard');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { nombre } }
        });
        if (error) throw error;
        if (data.user) {
          const { data: existingRoles } = await db.from('user_roles').select('id').limit(1);
          const role = (!existingRoles || existingRoles.length === 0) ? 'owner' : 'employee';
          await db.from('user_roles').insert({ user_id: data.user.id, role });
        }
        toast({ title: 'Cuenta creada. Iniciando sesión...' });
        navigate('/dashboard');
      }
    } catch (err: any) {
      toast({ title: err.message || 'Error de autenticación', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-1">
          <img src="/logo-joseluis.jpg" alt="Logo" className="w-16 h-16 rounded-xl mx-auto object-cover" />
          <CardTitle className="text-xl text-primary">Soluciones Decorativas JL</CardTitle>
          <p className="text-xs text-muted-foreground">Tapicería & Ebanistería</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="grid gap-1.5"><Label className="text-xs">Nombre</Label><Input value={nombre} onChange={e => setNombre(e.target.value)} required /></div>
            )}
            <div className="grid gap-1.5"><Label className="text-xs">Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Contraseña</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} /></div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Cargando...' : isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
              <button type="button" className="text-primary font-medium" onClick={() => setIsLogin(!isLogin)}>
                {isLogin ? 'Regístrate' : 'Inicia sesión'}
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
