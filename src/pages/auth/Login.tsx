import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signIn, session, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (session && !loading && profile) {
      const target = profile.role === 'supplier' ? '/supplier' : '/buyer';
      navigate(target, { replace: true });
    }
  }, [session, loading, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast({ title: 'Ошибка входа', description: error.message, variant: 'destructive' });
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-bold text-foreground">EcaMarket</h1>
          <p className="mt-1 text-xs text-muted-foreground">Вход в личный кабинет</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.ru" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs">Пароль</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full text-xs h-9" disabled={submitting}>
            {submitting ? 'Вход...' : 'Войти'}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Нет аккаунта?{' '}
          <Link to="/signup" className="font-medium text-primary hover:underline">Регистрация</Link>
        </p>
      </div>
    </div>
  );
}
