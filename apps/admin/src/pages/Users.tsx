import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import type { Organizer } from '@pandago/shared';
import { api } from '../api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Dialog } from '../components/ui/dialog';
import { Input, Field } from '../components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';

export function UsersPage() {
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setOrganizers(await api.getOrganizers());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się wczytać organizatorów');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function remove(o: Organizer) {
    if (!window.confirm(`Usunąć organizatora „${o.name}”?`)) return;
    try {
      await api.deleteOrganizer(o.id);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się usunąć');
    }
  }

  // ---- create dialog ----
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setDialogError(null);
    setBusy(true);
    try {
      await api.createOrganizer({ name, code: code || undefined });
      setOpen(false);
      setName('');
      setCode('');
      refresh();
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Operacja nie powiodła się');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium tracking-tight">Użytkownicy</h1>
        <Button onClick={() => setOpen(true)}>Dodaj organizatora</Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Organizatorzy</CardTitle>
          <CardDescription>
            Organizatorzy logują się w aplikacji mobilnej swoim kodem (np. ORG-001) i mogą
            przyznawać punkty drużynom.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imię / nazwa</TableHead>
                <TableHead>Kod dostępu</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizers.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell className="font-mono text-xs">{o.code}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive"
                      onClick={() => remove(o)}
                      aria-label={`Usuń ${o.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} title="Dodaj organizatora">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Imię / nazwa">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Kasia z biura" required />
          </Field>
          <Field label="Kod dostępu (opcjonalnie — zostanie wygenerowany)">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ORG-003"
              autoCapitalize="characters"
            />
          </Field>
          {dialogError && <p className="text-sm text-destructive">{dialogError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy ? 'Tworzenie…' : 'Utwórz'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
