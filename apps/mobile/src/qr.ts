// QR payload format shared between the team screen (encoder) and the
// organizer scanner (decoder).
const PREFIX = 'pandago:team:';

export function teamQrPayload(teamId: string): string {
  return PREFIX + teamId;
}

/** Returns the team id when the scanned value is a PandaGo team QR. */
export function parseTeamQr(value: string): string | null {
  return value.startsWith(PREFIX) ? value.slice(PREFIX.length) : null;
}
