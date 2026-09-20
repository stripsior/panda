import { useCallback, useEffect, useState } from 'react';
import { Users, Flag, Clock, Trophy } from 'lucide-react';
import type { AdminOverview } from '@pandago/shared';
import { api } from '../api';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import { MapView } from '../components/MapView';

export function OverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setData(await api.getOverview());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się wczytać przeglądu');
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  async function validate(visitId: string, approve: boolean) {
    await api.validateVisit(visitId, approve);
    refresh();
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Ładowanie…</p>;

  const top = data.leaderboard[0];

  const stats: Array<{ label: string; value: string; icon: typeof Users }> = [
    { label: 'Drużyny', value: String(data.teams.length), icon: Users },
    { label: 'Punkty kontrolne', value: String(data.checkpoints.length), icon: Flag },
    { label: 'Oczekujące meldunki', value: String(data.pendingVisits.length), icon: Clock },
    { label: 'Najlepsza drużyna', value: top ? `${top.teamName} · ${top.score}` : '—', icon: Trophy },
  ];

  const teamName = (id: string) =>
    data.teams.find((t) => t.id === id)?.name ?? id;
  const checkpointName = (id: string) =>
    data.checkpoints.find((c) => c.id === id)?.name ?? id;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-medium tracking-tight">Przegląd</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-2xl font-semibold tracking-tight">
              {value}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mapa na żywo</CardTitle>
          <CardDescription>
            Niebieskie kropki to punkty kontrolne, zielone kwadraty to drużyny. Odświeża się co 5 s.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MapView checkpoints={data.checkpoints} positions={data.positions} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ranking</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Miejsce</TableHead>
                  <TableHead>Drużyna</TableHead>
                  <TableHead className="text-right">Wynik</TableHead>
                  <TableHead className="text-right">Punkty kontrolne</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.leaderboard.map((entry, i) => (
                  <TableRow key={entry.teamId}>
                    <TableCell>
                      {i === 0 ? <Badge variant="success">1.</Badge> : i + 1}
                    </TableCell>
                    <TableCell className="font-medium">{entry.teamName}</TableCell>
                    <TableCell className="text-right">{entry.score}</TableCell>
                    <TableCell className="text-right">{entry.checkpointsVisited}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Oczekujące meldunki</CardTitle>
            <CardDescription>Zatwierdź lub odrzuć meldunki w punktach kontrolnych.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.pendingVisits.length === 0 && (
              <p className="text-sm text-muted-foreground">Brak oczekujących meldunków.</p>
            )}
            {data.pendingVisits.map((visit) => (
              <div
                key={visit.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div>
                  <p className="font-medium">{teamName(visit.teamId)}</p>
                  <p className="text-xs text-muted-foreground">
                    {checkpointName(visit.checkpointId)} · {visit.points} pkt ·{' '}
                    {new Date(visit.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => validate(visit.id, true)}>
                    Zatwierdź
                  </Button>
                  <Button variant="destructive" onClick={() => validate(visit.id, false)}>
                    Odrzuć
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
