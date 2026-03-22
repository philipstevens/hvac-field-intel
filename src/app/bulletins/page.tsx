import { db } from '@/db';
import {
  bulletins,
  manufacturers,
  bulletinApplicability,
  models,
} from '@/db/schema';
import { eq, like, or, and, desc, count } from 'drizzle-orm';
import { Search, AlertTriangle, Shield, Info, Bell } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';

const severityConfig: Record<string, { label: string; color: string; icon: typeof AlertTriangle }> = {
  safety_critical: { label: 'Safety Critical', color: 'bg-red-100 text-red-800 border-red-300', icon: AlertTriangle },
  recall: { label: 'Recall', color: 'bg-red-100 text-red-800 border-red-300', icon: AlertTriangle },
  warranty: { label: 'Warranty', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Shield },
  informational: { label: 'Informational', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Info },
};

const filterTabs = [
  { key: '', label: 'All' },
  { key: 'safety_critical', label: 'Safety Critical' },
  { key: 'warranty', label: 'Warranty' },
  { key: 'informational', label: 'Informational' },
];

export default async function BulletinsPage({
  searchParams,
}: {
  searchParams: Promise<{ severity?: string; q?: string }>;
}) {
  const { severity, q } = await searchParams;
  const query = q?.trim() ?? '';
  const severityFilter = severity ?? '';

  // Build conditions
  const conditions = [];
  if (severityFilter) {
    conditions.push(eq(bulletins.severity, severityFilter));
  }
  if (query) {
    const pattern = `%${query}%`;
    conditions.push(
      or(
        like(bulletins.bulletinNumber, pattern),
        like(bulletins.title, pattern)
      )!
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Get counts by severity for tab badges
  const severityCounts = await db
    .select({
      severity: bulletins.severity,
      count: count(),
    })
    .from(bulletins)
    .groupBy(bulletins.severity);

  const countMap: Record<string, number> = {};
  let totalCount = 0;
  for (const row of severityCounts) {
    countMap[row.severity] = row.count;
    totalCount += row.count;
  }
  countMap[''] = totalCount;

  const results = await db
    .select({
      bulletin: bulletins,
      manufacturer: manufacturers,
    })
    .from(bulletins)
    .leftJoin(manufacturers, eq(bulletins.manufacturerId, manufacturers.id))
    .where(where)
    .orderBy(desc(bulletins.publicationDate));

  // Fetch applicable models for each bulletin
  const bulletinIds = results.map((r) => r.bulletin.id);
  let applicabilityMap = new Map<
    string,
    Array<{ modelId: string; modelNumber: string; description: string | null }>
  >();

  if (bulletinIds.length > 0) {
    const applicability = await db
      .select({
        bulletinId: bulletinApplicability.bulletinId,
        modelId: models.id,
        modelNumber: models.modelNumber,
        description: models.description,
      })
      .from(bulletinApplicability)
      .leftJoin(models, eq(bulletinApplicability.modelId, models.id))
      .where(
        or(...bulletinIds.map((bid) => eq(bulletinApplicability.bulletinId, bid)))
      );

    for (const a of applicability) {
      if (!a.modelId || !a.modelNumber) continue;
      const existing = applicabilityMap.get(a.bulletinId) ?? [];
      existing.push({
        modelId: a.modelId,
        modelNumber: a.modelNumber,
        description: a.description,
      });
      applicabilityMap.set(a.bulletinId, existing);
    }
  }

  function buildFilterUrl(sev: string) {
    const params = new URLSearchParams();
    if (sev) params.set('severity', sev);
    if (query) params.set('q', query);
    const qs = params.toString();
    return `/bulletins${qs ? `?${qs}` : ''}`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Header */}
        <h1 className="text-2xl font-bold text-gray-900">Service Bulletins</h1>
        <p className="mt-1 text-sm text-gray-500">
          Showing bulletins for Carrier, Trane, and Lennox equipment
        </p>

        {/* Filter Tabs */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {filterTabs.map((tab) => {
            const tabCount = countMap[tab.key] ?? 0;
            return (
              <Link
                key={tab.key}
                href={buildFilterUrl(tab.key)}
                className={clsx(
                  'whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors inline-flex items-center gap-1.5',
                  severityFilter === tab.key
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
                )}
              >
                {tab.label}
                <span
                  className={clsx(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold min-w-[18px] text-center',
                    severityFilter === tab.key
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 text-gray-500'
                  )}
                >
                  {tabCount}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Search */}
        <form action="/bulletins" method="GET" className="mt-4">
          {severityFilter && (
            <input type="hidden" name="severity" value={severityFilter} />
          )}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search bulletin number or title..."
              className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </form>

        {/* Results */}
        <p className="mt-4 text-sm text-gray-500">
          {results.length} bulletin{results.length !== 1 ? 's' : ''}
        </p>

        {results.length === 0 ? (
          <div className="mt-8 text-center">
            <Bell className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-gray-500">No bulletins found.</p>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {results.map(({ bulletin, manufacturer }) => {
              const sev = severityConfig[bulletin.severity] ?? {
                label: bulletin.severity,
                color: 'bg-gray-100 text-gray-700 border-gray-300',
                icon: Info,
              };
              const SevIcon = sev.icon;
              const isSuperseded = bulletin.status === 'superseded';
              const applicableModels = applicabilityMap.get(bulletin.id) ?? [];

              return (
                <details
                  key={bulletin.id}
                  className={clsx(
                    'group rounded-lg border bg-white shadow-sm',
                    isSuperseded ? 'border-gray-200 opacity-60' : 'border-gray-200'
                  )}
                >
                  <summary className="cursor-pointer list-none px-4 py-4 [&::-webkit-details-marker]:hidden">
                    <div className="flex items-start gap-3">
                      <SevIcon
                        className={clsx(
                          'mt-0.5 h-5 w-5 flex-shrink-0',
                          bulletin.severity === 'safety_critical' || bulletin.severity === 'recall'
                            ? 'text-red-500'
                            : bulletin.severity === 'warranty'
                              ? 'text-amber-500'
                              : 'text-blue-500'
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={clsx(
                              'rounded-full border px-2 py-0.5 text-xs font-medium',
                              sev.color
                            )}
                          >
                            {sev.label}
                          </span>
                          <span
                            className={clsx(
                              'font-mono text-sm font-medium',
                              isSuperseded ? 'text-gray-400 line-through' : 'text-gray-700'
                            )}
                          >
                            {bulletin.bulletinNumber}
                          </span>
                          {isSuperseded && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                              Superseded
                            </span>
                          )}
                        </div>
                        <p
                          className={clsx(
                            'mt-1 text-sm',
                            isSuperseded ? 'text-gray-400 line-through' : 'text-gray-900'
                          )}
                        >
                          {bulletin.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                          {manufacturer && <span>{manufacturer.name}</span>}
                          <span>{bulletin.publicationDate}</span>
                          <span
                            className={clsx(
                              'rounded-full px-1.5 py-0.5',
                              bulletin.status === 'active'
                                ? 'bg-green-50 text-green-700'
                                : bulletin.status === 'superseded'
                                  ? 'bg-gray-100 text-gray-500'
                                  : 'bg-red-50 text-red-600'
                            )}
                          >
                            {bulletin.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </summary>

                  {/* Expanded content */}
                  <div className="border-t border-gray-100 px-4 py-3">
                    {bulletin.contentSummary && (
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {bulletin.contentSummary}
                      </p>
                    )}

                    {applicableModels.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Applicable Models
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {applicableModels.map((m) => (
                            <Link
                              key={m.modelId}
                              href={`/equipment/${m.modelId}`}
                              className="rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-700 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                            >
                              {m.modelNumber}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
