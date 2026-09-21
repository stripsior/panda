import { Fragment, useCallback, useEffect, useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import type { ScoreEntry, Team } from '@pandago/shared';
import { api } from '../api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog } from '../components/ui/dialog';
import { Input, Field } from '../components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';

export function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [entries, setEntries] = useState<Record<string, ScoreEntry[]>>({});

  const refresh = useCallback(async () => {
    try {
      setTeams(await api.getTeams());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się wczytać drużyn');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function toggleExpanded(teamId: string) {
    const next = expandedId === teamId ? null : teamId;
    setExpandedId(next);
    if (next && !entries[teamId]) {
      const list = await api.getScoreEntries(teamId);
      setEntries((prev) => ({ ...prev, [teamId]: list }));
    }
  }

  // ---- award dialog ----
  const [awardTeam, setAwardTeam] = useState<Team | null>(null);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitAward(e: FormEvent) {
    e.preventDefault();
    if (!awardTeam) return;
    setDialogError(null);
    setBusy(true);
    try {
      await api.awardPoints(awardTeam.id, Number(delta), reason);
      setAwardTeam(null);
      setDelta('');
      setReason('');
      const list = await api.getScoreEntries(awardTeam.id);
      setEntries((prev) => ({ ...prev, [awardTeam.id]: list }));
      refresh();
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Operacja nie powiodła się');
    } finally {
      setBusy(false);
    }
  }

  async function remove(team: Team) {
    if (!window.confirm(`Usunąć drużynę „${team.name}"? Usunie to też jej historię punktów i meldunki.`)) return;
    try {
      await api.deleteTeam(team.id);
      setEntries((prev) => {
        const next = { ...prev };
        delete next[team.id];
        return next;
      });
      if (expandedId === team.id) setExpandedId(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się usunąć');
    }
  }

  async function reset(team: Team) {
    if (!window.confirm(`Zresetować postęp drużyny „${team.name}"? Wynik wróci do 0, a historia punktów i pozycje zostaną wyczyszczone.`)) return;
    try {
      await api.resetTeam(team.id);
      setEntries((prev) => ({ ...prev, [team.id]: [] }));
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zresetować');
    }
  }

  // ---- add team dialog ----
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  async function submitAdd(e: FormEvent) {
    e.preventDefault();
    setAddError(null);
    try {
      await api.createTeam(newName);
      setAddOpen(false);
      setNewName('');
      refresh();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Operacja nie powiodła się');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium tracking-tight">Drużyny</h1>
        <Button onClick={() => setAddOpen(true)}>Dodaj drużynę</Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Wszystkie drużyny</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Drużyna</TableHead>
                <TableHead>Kod dołączenia</TableHead>
                <TableHead className="text-right">Wynik</TableHead>
                <TableHead className="w-80 text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((team) => (
                <Fragment key={team.id}>
                  <TableRow>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {team.joinCode}
                    </TableCell>
                    <TableCell className="text-right">{team.score}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        onClick={() => toggleExpanded(team.id)}
                      >
                        {expandedId === team.id ? 'Ukryj' : 'Historia'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setAwardTeam(team);
                          setDialogError(null);
                        }}
                      >
                        Punkty
                      </Button>
                      <Button variant="outline" onClick={() => reset(team)}>
                        Reset
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive"
                        onClick={() => remove(team)}
                        aria-label={`Usuń ${team.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedId === team.id && (
                    <TableRow>
                      <TableCell colSpan={4} className="bg-muted/40">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Historia punktów
                        </p>
                        {(entries[team.id] ?? []).length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Brak historii punktów.
                          </p>
                        ) : (
                          <ul className="space-y-1">
                            {(entries[team.id] ?? []).map((entry) => (
                              <li key={entry.id} className="flex justify-between text-sm">
                                <span>{entry.reason}</span>
                                <span className="text-muted-foreground">
                                  {entry.delta > 0 ? '+' : ''}
                                  {entry.delta} · {entry.by} ·{' '}
                                  {new Date(entry.createdAt).toLocaleString()}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={awardTeam !== null}
        onClose={() => setAwardTeam(null)}
        title={awardTeam ? `Punkty — ${awardTeam.name}` : ''}
      >
        <form onSubmit={submitAward} className="space-y-4">
          <Field label="Zmiana punktów (niezerowa liczba całkowita, ujemna odejmuje)">
            <Input
              type="number"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="np. 50 lub -20"
              required
            />
          </Field>
          <Field label="Powód">
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Bonus za świetną współpracę"
              required
            />
          </Field>
          {dialogError && <p className="text-sm text-destructive">{dialogError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAwardTeam(null)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Zapisywanie…' : 'Zastosuj'}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Dodaj drużynę">
        <form onSubmit={submitAdd} className="space-y-4">
          <Field label="Nazwa drużyny">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Drużyna Echo"
              required
            />
          </Field>
          {addError && <p className="text-sm text-destructive">{addError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Anuluj
            </Button>
            <Button type="submit">Utwórz</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
