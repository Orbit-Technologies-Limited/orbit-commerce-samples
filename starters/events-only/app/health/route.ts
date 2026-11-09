export const dynamic = 'force-dynamic';

// Orbit hosting asks this every few seconds; answer from memory and call nothing
// else (no database, no Orbit API), so a slow dependency never marks the plugin as down.
export function GET(): Response {
  return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
