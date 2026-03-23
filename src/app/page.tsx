import { db } from '@/db';
import { models, bulletins, serviceReports, parts, sessions } from '@/db/schema';
import { count, eq, desc } from 'drizzle-orm';
import Link from 'next/link';
import {
  Wrench,
  Cpu,
  AlertTriangle,
  FileText,
  Lightbulb,
  Clock,
  ChevronRight,
  BarChart3,
  Thermometer,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const [
    activeSessions,
    recentCompleted,
    [equipmentCount],
    [bulletinCount],
    [reportCount],
    [partCount],
  ] = await Promise.all([
    db
      .select()
      .from(sessions)
      .where(eq(sessions.status, 'active'))
      .orderBy(desc(sessions.createdAt))
      .limit(5),
    db
      .select()
      .from(sessions)
      .where(eq(sessions.status, 'completed'))
      .orderBy(desc(sessions.completedAt))
      .limit(3),
    db.select({ value: count() }).from(models),
    db.select({ value: count() }).from(bulletins).where(eq(bulletins.status, 'active')),
    db.select({ value: count() }).from(serviceReports),
    db.select({ value: count() }).from(parts),
  ]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="px-4 py-5 space-y-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-field-accent/10 border border-field-accent/20">
            <Thermometer className="w-5 h-5 text-field-accent" />
          </div>
          <div>
            <h1 className="font-bc text-xl font-bold uppercase tracking-wide text-field-text leading-none">
              HVAC Field Intel
            </h1>
            <p className="text-[11px] text-field-muted mt-0.5">{today}</p>
          </div>
        </div>
      </div>

      {/* Primary CTA — Start Service Call */}
      <Link href="/session" className="group block active:scale-[0.985] transition-transform">
        <div className="relative overflow-hidden rounded-2xl shadow-lg shadow-field-accent/15">
          {/* gradient base */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-field-accent to-orange-700" />
          {/* diagonal line texture */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)',
              backgroundSize: '8px 8px',
            }}
          />
          {/* top highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-white/25" />
          <div className="relative flex items-center gap-4 px-5 py-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-black/20 border border-white/10">
              <Wrench className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bc text-[22px] font-bold uppercase tracking-wider text-white leading-tight">
                Start Service Call
              </p>
              <p className="text-[13px] text-orange-100/75 mt-0.5 truncate">
                Identify equipment · Check bulletins · Document
              </p>
            </div>
            <ChevronRight className="h-6 w-6 text-white/50 shrink-0 group-active:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </Link>

      {activeSessions.length > 0 && (
        <p className="text-xs text-field-muted text-center -mt-2">
          or continue an active session below
        </p>
      )}

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-[11px] font-semibold text-field-muted uppercase tracking-wider mb-3 px-0.5">
            <Clock className="w-3.5 h-3.5 text-field-green" />
            Active Sessions
          </h2>
          <div className="space-y-2">
            {activeSessions.map((s) => {
              const started = new Date(s.createdAt);
              const elapsed = Math.round((Date.now() - started.getTime()) / 60000);
              const elapsedLabel =
                elapsed < 60
                  ? `${elapsed}m`
                  : `${Math.floor(elapsed / 60)}h ${elapsed % 60}m`;

              return (
                <Link
                  key={s.id}
                  href={`/session/${s.id}`}
                  className="flex overflow-hidden rounded-xl border border-field-green/20 bg-field-surface active:opacity-75 transition-opacity"
                >
                  <div className="w-1.5 bg-field-green/70 shrink-0 rounded-l-xl" />
                  <div className="flex flex-1 items-center justify-between gap-3 px-4 py-3.5 min-w-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-field-text truncate">
                        {s.customerName || s.technicianName}
                      </p>
                      <p className="text-xs text-field-muted mt-0.5">
                        {s.serialNumber ? `S/N ${s.serialNumber}` : 'No equipment yet'}
                        {' · '}
                        {elapsedLabel} ago
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center gap-1 rounded-full bg-field-green/10 px-2 py-0.5 text-[11px] font-semibold text-field-green">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-field-green opacity-75" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-field-green" />
                        </span>
                        Live
                      </span>
                      <ChevronRight className="w-4 h-4 text-field-muted" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Demo Data Banner */}
      <div className="rounded-xl border border-field-amber/20 bg-field-amber/5 p-4">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-4 h-4 text-field-amber flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-field-amber">Demo Mode</p>
            <p className="text-xs text-field-muted mt-1 leading-relaxed">
              Start a session and try typing:{' '}
              <span className="font-mono text-field-muted-bright">Carrier 24ANB636A003</span>,{' '}
              <span className="font-mono text-field-muted-bright">Trane 4TTR6036J1000A</span>,{' '}
              <span className="font-mono text-field-muted-bright">Heatcraft BEH030A6K</span>
            </p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: Cpu, label: 'Models', value: equipmentCount.value },
          { icon: AlertTriangle, label: 'Bulletins', value: bulletinCount.value },
          { icon: FileText, label: 'Reports', value: reportCount.value },
          { icon: Wrench, label: 'Parts', value: partCount.value },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-xl border border-field-border bg-field-surface p-3 text-center">
            <Icon className="w-3.5 h-3.5 text-field-muted mx-auto mb-1.5" />
            <p className="text-lg font-bold text-field-text font-bc">{value}</p>
            <p className="text-[10px] text-field-muted uppercase tracking-wide mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      {recentCompleted.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-[11px] font-semibold text-field-muted uppercase tracking-wider mb-3 px-0.5">
            <BarChart3 className="w-3.5 h-3.5" />
            Recent Activity
          </h2>
          <div className="space-y-2">
            {recentCompleted.map((s) => (
              <Link
                key={s.id}
                href={`/session/${s.id}`}
                className="flex overflow-hidden rounded-xl border border-field-border bg-field-surface active:opacity-75 transition-opacity"
              >
                <div className="w-1.5 bg-field-blue/50 shrink-0 rounded-l-xl" />
                <div className="flex flex-1 items-center justify-between gap-3 px-4 py-3.5 min-w-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-field-text truncate">
                      {s.customerName || s.technicianName}
                    </p>
                    <p className="text-xs text-field-muted mt-0.5">
                      {s.completedAt
                        ? new Date(s.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : '—'}
                      {s.serialNumber ? ` · S/N ${s.serialNumber}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="rounded-full bg-field-blue/10 px-2 py-0.5 text-[11px] font-semibold text-field-blue">
                      Done
                    </span>
                    <ChevronRight className="w-4 h-4 text-field-muted" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
