import { db } from '@/db';
import { models, bulletins, serviceReports, parts, sessions } from '@/db/schema';
import { count, eq, desc } from 'drizzle-orm';
import Link from 'next/link';
import {
  Wrench,
  Cpu,
  Package,
  AlertTriangle,
  FileText,
  Phone,
  Lightbulb,
  Clock,
  ChevronRight,
  BarChart3,
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900">HVAC Field Intel</h1>
        </div>
        <p className="text-xs text-slate-400">{today}</p>
      </div>

      {/* Primary CTA — Start Service Call */}
      <Link
        href="/session"
        className="block rounded-xl bg-blue-600 p-5 text-white shadow-lg active:bg-blue-700 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <Phone className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold">Start Service Call</p>
            <p className="text-sm text-blue-200 mt-0.5">
              Identify equipment, check bulletins, document work
            </p>
          </div>
        </div>
      </Link>
      {activeSessions.length > 0 && (
        <p className="text-xs text-slate-400 text-center -mt-3">
          or continue an active session below
        </p>
      )}

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <section>
          <h2 className="section-header flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-blue-500" />
            Active Sessions
          </h2>
          <div className="space-y-2">
            {activeSessions.map((s) => {
              const started = new Date(s.createdAt);
              const elapsed = Math.round((Date.now() - started.getTime()) / 60000);
              const elapsedLabel =
                elapsed < 60
                  ? `${elapsed}m ago`
                  : `${Math.floor(elapsed / 60)}h ${elapsed % 60}m ago`;

              return (
                <Link
                  key={s.id}
                  href={`/session/${s.id}`}
                  className="card-padded flex items-center justify-between gap-3 active:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {s.customerName || s.technicianName}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {s.serialNumber ? `S/N ${s.serialNumber}` : 'No equipment yet'}
                      {' \u00b7 '}
                      {elapsedLabel}
                    </p>
                  </div>
                  <span className="badge-blue text-xs flex-shrink-0">Active</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Quick Access */}
      <div className="grid grid-cols-3 gap-3">
        <Link
          href="/equipment"
          className="card flex flex-col items-center justify-center gap-2 p-4 active:bg-slate-50 transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <Cpu className="w-6 h-6 text-blue-600" />
          </div>
          <span className="text-xs font-medium text-slate-700 text-center">Equipment Lookup</span>
        </Link>
        <Link
          href="/parts"
          className="card flex flex-col items-center justify-center gap-2 p-4 active:bg-slate-50 transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
            <Package className="w-6 h-6 text-emerald-600" />
          </div>
          <span className="text-xs font-medium text-slate-700 text-center">Parts Search</span>
        </Link>
        <Link
          href="/bulletins"
          className="card flex flex-col items-center justify-center gap-2 p-4 active:bg-slate-50 transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <span className="text-xs font-medium text-slate-700 text-center">Bulletins</span>
        </Link>
      </div>

      {/* Demo Data Banner */}
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900">Demo Mode</p>
            <p className="text-xs text-amber-700 mt-1">
              Try these model numbers:{' '}
              <Link href="/equipment?q=24ANB636A003" className="font-mono underline">Carrier 24ANB636A003</Link>,{' '}
              <Link href="/equipment?q=4TTR6036J1000A" className="font-mono underline">Trane 4TTR6036J1000A</Link>,{' '}
              <Link href="/equipment?q=XC16-036-230" className="font-mono underline">Lennox XC16-036-230</Link>
            </p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-2">
        <div className="card-padded text-center">
          <Cpu className="w-4 h-4 text-slate-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-slate-900">{equipmentCount.value}</p>
          <p className="text-[10px] text-slate-500">Models</p>
        </div>
        <div className="card-padded text-center">
          <AlertTriangle className="w-4 h-4 text-slate-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-slate-900">{bulletinCount.value}</p>
          <p className="text-[10px] text-slate-500">Bulletins</p>
        </div>
        <div className="card-padded text-center">
          <FileText className="w-4 h-4 text-slate-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-slate-900">{reportCount.value}</p>
          <p className="text-[10px] text-slate-500">Reports</p>
        </div>
        <div className="card-padded text-center">
          <Wrench className="w-4 h-4 text-slate-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-slate-900">{partCount.value}</p>
          <p className="text-[10px] text-slate-500">Parts</p>
        </div>
      </div>

      {/* Recent Activity */}
      {recentCompleted.length > 0 && (
        <section>
          <h2 className="section-header flex items-center gap-2 mb-3">
            <BarChart3 className="w-5 h-5 text-slate-400" />
            Recent Activity
          </h2>
          <div className="space-y-2">
            {recentCompleted.map((s) => (
              <Link
                key={s.id}
                href={`/session/${s.id}`}
                className="card-padded flex items-center justify-between gap-3 active:bg-slate-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {s.customerName || s.technicianName}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {s.completedAt || s.createdAt}
                    {s.serialNumber ? ` \u00b7 S/N ${s.serialNumber}` : ''}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                  Completed
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
