import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, ApiError } from '../api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input, Label } from '../components/ui/input';

export function LoginPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(code);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Logowanie nie powiodło się');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <img src="/panda-logo.png" alt="PandaGo" className="mb-2 h-14 w-14 rounded-2xl object-cover" />
          <CardTitle className="text-lg">PandaGo Admin</CardTitle>
          <CardDescription>Wpisz kod dostępu, aby kontynuować</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="code">Kod dostępu</Label>
              <Input
                id="code"
                autoFocus
                placeholder="ADMIN-001"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy || !code.trim()}>
              {busy ? 'Logowanie…' : 'Zaloguj się'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
