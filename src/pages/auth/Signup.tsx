import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'buyer' | 'supplier'>('buyer');
  const [submitting, setSubmitting] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signUp(email, password, fullName, role);
    if (error) {
      toast({ title: 'Ошибка регистрации', description: error.message, variant: 'destructive' });
      setSubmitting(false);
      return;
    }
    toast({ title: 'Регистрация успешна', description: 'Проверьте почту для подтверждения аккаунта.' });
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-bold text-foreground">EcaMarket</h1>
          <p className="mt-1 text-xs text-muted-foreground">Создание аккаунта</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-xs">ФИО</Label>
            <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Иванов Алексей Владимирович" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.ru" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs">Пароль</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Минимум 6 символов" minLength={6} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Роль</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRole('buyer')}
                className={`flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${role === 'buyer' ? 'border-primary bg-primary/8 text-primary' : 'border-input text-muted-foreground hover:bg-accent'}`}
              >
                Покупатель
              </button>
              <button
                type="button"
                onClick={() => setRole('supplier')}
                className={`flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${role === 'supplier' ? 'border-primary bg-primary/8 text-primary' : 'border-input text-muted-foreground hover:bg-accent'}`}
              >
                Поставщик
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full text-xs h-9" disabled={submitting}>
            {submitting ? 'Регистрация...' : 'Зарегистрироваться'}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">Войти</Link>
        </p>
      </div>
    </div>
  );
}
