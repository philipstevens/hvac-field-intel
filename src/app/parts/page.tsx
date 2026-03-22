import { db } from '@/db';
import { parts, manufacturers } from '@/db/schema';
import { like, or, eq } from 'drizzle-orm';
import { Search } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  superseded: 'bg-amber-100 text-amber-800',
  discontinued: 'bg-red-100 text-red-800',
};

export default async function PartsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';

  let results: Array<{
    part: typeof parts.$inferSelect;
    manufacturer: typeof manufacturers.$inferSelect | null;
  }> = [];

  if (query) {
    const pattern = `%${query}%`;
    results = await db
      .select({
        part: parts,
        manufacturer: manufacturers,
      })
      .from(parts)
      .leftJoin(manufacturers, eq(parts.manufacturerId, manufacturers.id))
      .where(
        or(
          like(parts.partNumber, pattern),
          like(parts.partNumberNormalized, pattern)
        )
      );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Header */}
        <h1 className="text-2xl font-bold text-gray-900">Parts Search</h1>
        <p className="mt-1 text-sm text-gray-500">
          Find part numbers, availability, and supersession info
        </p>

        {/* Search Form */}
        <form action="/parts" method="GET" className="mt-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Enter part number..."
              className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              autoFocus
            />
          </div>
        </form>
        <p className="mt-1.5 text-xs text-gray-400">Search by OEM part number</p>

        {/* Demo Hints */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400">Try these:</span>
          <Link href="/parts?q=P461-3508" className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-mono text-blue-700 hover:bg-blue-100 transition-colors">
            P461-3508
          </Link>
          <Link href="/parts?q=HC37GE219A" className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-mono text-blue-700 hover:bg-blue-100 transition-colors">
            HC37GE219A
          </Link>
          <Link href="/parts?q=CPT01860" className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-mono text-blue-700 hover:bg-blue-100 transition-colors">
            CPT01860
          </Link>
          <Link href="/parts?q=89M81" className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-mono text-blue-700 hover:bg-blue-100 transition-colors">
            89M81
          </Link>
        </div>

        {/* Results */}
        {!query ? (
          <div className="mt-12 text-center">
            <Search className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-gray-500">
              Look up any part to see supersession chains, compatibility, and local supplier stock.
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              {results.length} result{results.length !== 1 ? 's' : ''} for{' '}
              <span className="font-medium text-gray-700">&quot;{query}&quot;</span>
            </p>

            {results.length === 0 ? (
              <div className="mt-8 text-center">
                <p className="text-gray-500">
                  No parts found matching that number.
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {results.map(({ part, manufacturer }) => (
                  <Link
                    key={part.id}
                    href={`/parts/${part.id}`}
                    className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md active:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-lg font-bold text-gray-900">
                          {part.partNumber}
                        </p>
                        <p className="mt-0.5 text-sm text-gray-600">
                          {part.description}
                        </p>
                        {manufacturer && (
                          <p className="mt-1 text-xs text-gray-400">
                            {manufacturer.name}
                          </p>
                        )}
                      </div>
                      <div className="ml-3 flex flex-col items-end gap-1.5">
                        {part.category && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                            {part.category.replace(/_/g, ' ')}
                          </span>
                        )}
                        {part.status && (
                          <span
                            className={clsx(
                              'rounded-full px-2 py-0.5 text-xs font-medium',
                              statusColors[part.status] ?? 'bg-gray-100 text-gray-700'
                            )}
                          >
                            {part.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
