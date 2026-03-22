import { db } from "@/db";
import { models, productLines, manufacturers, serialRanges } from "@/db/schema";
import { like, or } from "drizzle-orm";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Cpu, Search, PackageOpen } from "lucide-react";
import { categoryLabel } from "@/lib/utils";

export const metadata = {
  title: "Equipment Lookup – HVAC Field Intel",
};

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  let results: Array<{
    model: typeof models.$inferSelect;
    productLine: typeof productLines.$inferSelect;
    manufacturer: typeof manufacturers.$inferSelect;
  }> = [];

  let serialHits: Array<{
    serialRange: typeof serialRanges.$inferSelect;
    model: typeof models.$inferSelect;
    productLine: typeof productLines.$inferSelect;
    manufacturer: typeof manufacturers.$inferSelect;
  }> = [];

  if (query.length > 0) {
    const pattern = `%${query}%`;

    // Search models by model number
    results = await db
      .select({
        model: models,
        productLine: productLines,
        manufacturer: manufacturers,
      })
      .from(models)
      .innerJoin(productLines, eq(models.productLineId, productLines.id))
      .innerJoin(manufacturers, eq(productLines.manufacturerId, manufacturers.id))
      .where(
        or(
          like(models.modelNumber, pattern),
          like(models.modelNumberNormalized, pattern)
        )
      )
      .limit(25);

    // Also search serial ranges by prefix
    if (results.length === 0) {
      serialHits = await db
        .select({
          serialRange: serialRanges,
          model: models,
          productLine: productLines,
          manufacturer: manufacturers,
        })
        .from(serialRanges)
        .innerJoin(models, eq(serialRanges.modelId, models.id))
        .innerJoin(productLines, eq(models.productLineId, productLines.id))
        .innerJoin(manufacturers, eq(productLines.manufacturerId, manufacturers.id))
        .where(like(serialRanges.serialPrefix, pattern))
        .limit(25);
    }
  }

  const hasQuery = query.length > 0;
  const noResults = hasQuery && results.length === 0 && serialHits.length === 0;

  // Merge serial hits into results format (deduplicate by model id)
  const seenModelIds = new Set(results.map((r) => r.model.id));
  for (const hit of serialHits) {
    if (!seenModelIds.has(hit.model.id)) {
      seenModelIds.add(hit.model.id);
      results.push({
        model: hit.model,
        productLine: hit.productLine,
        manufacturer: hit.manufacturer,
      });
    }
  }

  return (
    <div className="px-4 pt-6 pb-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Equipment Lookup</h1>
        <p className="text-sm text-slate-500 mt-1">
          Identify equipment by model or serial number
        </p>
      </div>

      {/* Search Form */}
      <form method="GET" className="mb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Model number or serial number..."
            autoFocus
            className="input-field pl-10 py-3 text-base"
          />
        </div>
      </form>
      <p className="text-xs text-slate-400 mb-2">Search by model number or serial number prefix</p>

      {/* Demo Hints */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-xs text-slate-400">Try these:</span>
        <Link href="/equipment?q=24ANB636A003" className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-mono text-blue-700 hover:bg-blue-100 transition-colors">
          24ANB636A003
        </Link>
        <Link href="/equipment?q=4TTR6036J1000A" className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-mono text-blue-700 hover:bg-blue-100 transition-colors">
          4TTR6036J1000A
        </Link>
        <Link href="/equipment?q=XC16-036-230" className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-mono text-blue-700 hover:bg-blue-100 transition-colors">
          XC16-036-230
        </Link>
      </div>

      {/* Empty State */}
      {!hasQuery && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Cpu className="h-16 w-16 text-slate-300 mb-4" />
          <p className="text-slate-500 text-base">
            Enter a model or serial number above to identify equipment
          </p>
          <p className="text-slate-400 text-sm mt-2">
            In the full version, you can also scan a nameplate image.
          </p>
        </div>
      )}

      {/* No Results */}
      {noResults && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <PackageOpen className="h-14 w-14 text-slate-300 mb-3" />
          <p className="text-slate-600 font-medium">No equipment found</p>
          <p className="text-slate-400 text-sm mt-1">
            Try a different model or serial number
          </p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            {results.length} result{results.length !== 1 && "s"} for &ldquo;{query}&rdquo;
          </p>
          {results.map(({ model, productLine, manufacturer }) => (
            <Link
              key={model.id}
              href={`/equipment/${model.id}`}
              className="card block p-4 active:bg-slate-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                    {manufacturer.name}
                  </p>
                  <p className="text-base font-semibold text-slate-900 mt-0.5 truncate">
                    {model.modelNumber}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5 truncate">
                    {productLine.name}
                    {model.description && ` — ${model.description}`}
                  </p>
                </div>
                {productLine.category && (
                  <span className="badge-blue shrink-0 mt-1">
                    {categoryLabel(productLine.category)}
                  </span>
                )}
              </div>
              {(model.productionStart || model.productionEnd) && (
                <p className="text-xs text-slate-400 mt-2">
                  Production: {model.productionStart ?? "?"} – {model.productionEnd ?? "present"}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
