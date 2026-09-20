import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Check, Trash2 } from 'lucide-react';
import type { Checkpoint } from '@pandago/shared';
import { api } from '../api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog } from '../components/ui/dialog';
import { Input, Field } from '../components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';

function PointsCell({ cp, onSaved }: { cp: Checkpoint; onSaved: () => void }) {
  const [value, setValue] = useState(String(cp.points));
  const [busy, setBusy] = useState(false);
  const dirty = value !== String(cp.points);

  const save = async () => {
    if (!dirty || busy) return;
    setBusy(true);
    try {
      await api.updateCheckpoint(cp.id, { points: Number(value) });
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
        className="h-8 w-20 text-right"
        aria-label={`Punkty za ${cp.name}`}
      />
      {dirty && (
        <Button
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={save}
          disabled={busy || value === ''}
          aria-label="Zapisz punkty"
        >
          <Check className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export function CheckpointsPage() {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setCheckpoints(await api.getCheckpoints());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się wczytać punktów kontrolnych');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function remove(cp: Checkpoint) {
    if (!window.confirm(`Usunąć punkt kontrolny „${cp.name}”?`)) return;
    try {
      await api.deleteCheckpoint(cp.id);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się usunąć');
    }
  }

  // ---- create dialog ----
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', lat: '', lng: '', points: '100', orderIndex: '0',
  });
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setDialogError(null);
    setBusy(true);
    try {
      await api.createCheckpoint({
        name: form.name,
        lat: Number(form.lat),
        lng: Number(form.lng),
        points: Number(form.points) || undefined,
        orderIndex: Number(form.orderIndex) || undefined,
      });
      setOpen(false);
      setForm({ name: '', lat: '', lng: '', points: '100', orderIndex: '0' });
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
        <h1 className="text-lg font-medium tracking-tight">Punkty kontrolne</h1>
        <Button onClick={() => setOpen(true)}>Nowy punkt kontrolny</Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Wszystkie punkty kontrolne</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">#</TableHead>
                <TableHead>Nazwa</TableHead>
                <TableHead>Kod</TableHead>
                <TableHead className="text-right">Punkty</TableHead>
                <TableHead>Współrzędne</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {checkpoints.map((cp) => (
                <TableRow key={cp.id}>
                  <TableCell className="text-muted-foreground">{cp.orderIndex}</TableCell>
                  <TableCell className="font-medium">{cp.name}</TableCell>
                  <TableCell className="font-mono text-xs">{cp.code}</TableCell>
                  <TableCell className="text-right">
                    <PointsCell cp={cp} onSaved={refresh} />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {cp.lat.toFixed(5)}, {cp.lng.toFixed(5)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive"
                      onClick={() => remove(cp)}
                      aria-label={`Usuń ${cp.name}`}
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

      <Dialog open={open} onClose={() => setOpen(false)} title="Nowy punkt kontrolny">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nazwa">
            <Input value={form.name} onChange={set('name')} placeholder="Fontanna na Rynku" required />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Szerokość geograficzna">
              <Input type="number" step="any" value={form.lat} onChange={set('lat')} placeholder="50.0616" required />
            </Field>
            <Field label="Długość geograficzna">
              <Input type="number" step="any" value={form.lng} onChange={set('lng')} placeholder="19.9373" required />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Punkty">
              <Input type="number" value={form.points} onChange={set('points')} />
            </Field>
            <Field label="Kolejność">
              <Input type="number" value={form.orderIndex} onChange={set('orderIndex')} />
            </Field>
          </div>
          {dialogError && <p className="text-sm text-destructive">{dialogError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Tworzenie…' : 'Utwórz'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
