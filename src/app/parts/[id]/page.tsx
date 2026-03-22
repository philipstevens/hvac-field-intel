import { db } from '@/db';
import {
  parts,
  manufacturers,
  partSupersessions,
  supplierInventory,
  suppliers,
  modelParts,
  models,
  productLines,
} from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import { ArrowLeft, AlertTriangle, Package, Truck, Wrench } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SupersessionChain, type ChainNode } from '@/components/supersession-chain';

// ── Supersession chain resolver ───────────────────────────
async function resolveSupersessionChain(partId: string): Promise<ChainNode[]> {
  // Fetch all supersession records that involve this part (directly or transitively)
  // We walk backwards (find older parts) and forwards (find newer parts)

  const allSupersessions = await db
    .select({
      id: partSupersessions.id,
      oldPartId: partSupersessions.oldPartId,
      newPartId: partSupersessions.newPartId,
      supersessionDate: partSupersessions.supersessionDate,
      installationNotes: partSupersessions.installationNotes,
    })
    .from(partSupersessions);

  // Build adjacency maps
  const forwardMap = new Map<string, { newPartId: string; date: string | null; notes: string | null }>();
  const backwardMap = new Map<string, { oldPartId: string; date: string | null; notes: string | null }>();

  for (const s of allSupersessions) {
    forwardMap.set(s.oldPartId, {
      newPartId: s.newPartId,
      date: s.supersessionDate,
      notes: s.installationNotes,
    });
    backwardMap.set(s.newPartId, {
      oldPartId: s.oldPartId,
      date: s.supersessionDate,
      notes: s.installationNotes,
    });
  }

  // Walk backwards to find the chain start
  const chainPartIds: string[] = [partId];
  const metadataMap = new Map<string, { date: string | null; notes: string | null }>();

  let current = partId;
  const visited = new Set<string>([partId]);
  while (backwardMap.has(current)) {
    const prev = backwardMap.get(current)!;
    if (visited.has(prev.oldPartId)) break;
    visited.add(prev.oldPartId);
    chainPartIds.unshift(prev.oldPartId);
    // Store metadata on the "new" side (the transition TO this part)
    metadataMap.set(current, { date: prev.date, notes: prev.notes });
    current = prev.oldPartId;
  }

  // Walk forwards to find the chain end
  current = partId;
  while (forwardMap.has(current)) {
    const next = forwardMap.get(current)!;
    if (visited.has(next.newPartId)) break;
    visited.add(next.newPartId);
    chainPartIds.push(next.newPartId);
    metadataMap.set(next.newPartId, { date: next.date, notes: next.notes });
    current = next.newPartId;
  }

  if (chainPartIds.length <= 1) return [];

  // Fetch part details for all parts in the chain
  const chainParts = await db
    .select()
    .from(parts)
    .where(
      or(...chainPartIds.map((pid) => eq(parts.id, pid)))
    );

  const partMap = new Map(chainParts.map((p) => [p.id, p]));

  // The last part in the chain is the current one
  const currentPartId = chainPartIds[chainPartIds.length - 1];

  return chainPartIds.map((pid) => {
    const p = partMap.get(pid);
    const meta = metadataMap.get(pid);
    return {
      id: pid,
      partNumber: p?.partNumber ?? 'Unknown',
      description: p?.description ?? null,
      date: meta?.date ?? null,
      installationNotes: meta?.notes ?? null,
      isCurrent: pid === currentPartId,
    };
  });
}

// ── Status helpers ────────────────────────────────────────
const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 border-green-300',
  superseded: 'bg-amber-100 text-amber-800 border-amber-300',
  discontinued: 'bg-red-100 text-red-800 border-red-300',
};

function stockColor(qty: number | null) {
  if (qty === null || qty === 0) return 'text-red-600';
  if (qty < 5) return 'text-amber-600';
  return 'text-green-600';
}

function stockBg(qty: number | null) {
  if (qty === null || qty === 0) return 'bg-red-50 border-red-200';
  if (qty < 5) return 'bg-amber-50 border-amber-200';
  return 'bg-green-50 border-green-200';
}

function stockLabel(qty: number | null) {
  if (qty === null || qty === 0) return 'Out of stock';
  if (qty < 5) return 'Low stock';
  return 'In stock';
}

// ── Page Component ────────────────────────────────────────
export default async function PartDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch part with manufacturer
  const result = await db
    .select({
      part: parts,
      manufacturer: manufacturers,
    })
    .from(parts)
    .leftJoin(manufacturers, eq(parts.manufacturerId, manufacturers.id))
    .where(eq(parts.id, id));

  if (result.length === 0) notFound();

  const { part, manufacturer } = result[0];

  // Resolve supersession chain
  const chain = await resolveSupersessionChain(id);
  const currentReplacementId = chain.length > 0 ? chain[chain.length - 1].id : null;
  const isSuperseded = part.status === 'superseded' && currentReplacementId && currentReplacementId !== id;

  // Fetch supplier inventory for this part
  const inventory = await db
    .select({
      inventory: supplierInventory,
      supplier: suppliers,
    })
    .from(supplierInventory)
    .leftJoin(suppliers, eq(supplierInventory.supplierId, suppliers.id))
    .where(eq(supplierInventory.partId, id));

  // If superseded, also fetch inventory for the current replacement
  let replacementInventory: typeof inventory = [];
  let replacementPart: typeof parts.$inferSelect | null = null;
  if (isSuperseded && currentReplacementId) {
    replacementInventory = await db
      .select({
        inventory: supplierInventory,
        supplier: suppliers,
      })
      .from(supplierInventory)
      .leftJoin(suppliers, eq(supplierInventory.supplierId, suppliers.id))
      .where(eq(supplierInventory.partId, currentReplacementId));

    const rp = await db.select().from(parts).where(eq(parts.id, currentReplacementId));
    if (rp.length > 0) replacementPart = rp[0];
  }

  // Fetch models that use this part
  const usedInModels = await db
    .select({
      modelPart: modelParts,
      model: models,
      productLine: productLines,
    })
    .from(modelParts)
    .leftJoin(models, eq(modelParts.modelId, models.id))
    .leftJoin(productLines, eq(models.productLineId, productLines.id))
    .where(eq(modelParts.partId, id));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Back button */}
        <Link
          href="/parts"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to search
        </Link>

        {/* Superseded banner */}
        {isSuperseded && currentReplacementId && (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800">
                This part has been superseded
              </p>
              <p className="mt-1 text-sm text-amber-700">
                The current replacement is{' '}
                <Link
                  href={`/parts/${currentReplacementId}`}
                  className="font-mono font-bold underline"
                >
                  {chain[chain.length - 1].partNumber}
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* Part header */}
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-mono text-2xl font-bold text-gray-900">
                {part.partNumber}
              </h1>
              <p className="mt-1 text-gray-600">{part.description}</p>
              {manufacturer && (
                <p className="mt-1 text-sm text-gray-400">{manufacturer.name}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {part.category && (
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                  {part.category.replace(/_/g, ' ')}
                </span>
              )}
              {part.status && (
                <span
                  className={clsx(
                    'rounded-full border px-2.5 py-0.5 text-xs font-medium',
                    statusColors[part.status] ?? 'bg-gray-100 text-gray-700'
                  )}
                >
                  {part.status}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Supersession Chain */}
        {chain.length > 1 && (
          <section className="mt-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Package className="h-5 w-5 text-gray-500" />
              Supersession Chain
            </h2>
            <div className="mt-3 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <SupersessionChain chain={chain} />
            </div>
          </section>
        )}

        {/* Supplier Availability */}
        <section className="mt-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Truck className="h-5 w-5 text-gray-500" />
            Supplier Availability
          </h2>

          {inventory.length === 0 ? (
            <div className="mt-3 rounded-lg border border-gray-200 bg-white p-5 text-center text-sm text-gray-500 shadow-sm">
              No supplier inventory data available for this part.
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {inventory.map(({ inventory: inv, supplier: sup }) => (
                <div
                  key={inv.id}
                  className={clsx(
                    'rounded-lg border bg-white p-4 shadow-sm',
                    stockBg(inv.stockQuantity)
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {sup?.name ?? 'Unknown Supplier'}
                      </p>
                      {(sup?.city || sup?.state) && (
                        <p className="text-sm text-gray-500">
                          {[sup?.city, sup?.state].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={clsx('text-sm font-semibold', stockColor(inv.stockQuantity))}>
                        {stockLabel(inv.stockQuantity)}
                        {inv.stockQuantity !== null && inv.stockQuantity > 0 && (
                          <span className="ml-1 text-gray-500">({inv.stockQuantity})</span>
                        )}
                      </p>
                      {inv.priceCents !== null && (
                        <p className="mt-0.5 text-sm text-gray-700">
                          ${(inv.priceCents / 100).toFixed(2)}
                        </p>
                      )}
                      {inv.leadTimeDays !== null && (
                        <p className="mt-0.5 text-xs text-gray-400">
                          {inv.leadTimeDays} day lead time
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Replacement part availability */}
          {isSuperseded && replacementPart && replacementInventory.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700">
                Availability for replacement:{' '}
                <Link
                  href={`/parts/${replacementPart.id}`}
                  className="font-mono text-blue-600 underline"
                >
                  {replacementPart.partNumber}
                </Link>
              </h3>
              <div className="mt-2 space-y-2">
                {replacementInventory.map(({ inventory: inv, supplier: sup }) => (
                  <div
                    key={inv.id}
                    className={clsx(
                      'rounded-lg border bg-white p-4 shadow-sm',
                      stockBg(inv.stockQuantity)
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {sup?.name ?? 'Unknown Supplier'}
                        </p>
                        {(sup?.city || sup?.state) && (
                          <p className="text-sm text-gray-500">
                            {[sup?.city, sup?.state].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={clsx('text-sm font-semibold', stockColor(inv.stockQuantity))}>
                          {stockLabel(inv.stockQuantity)}
                          {inv.stockQuantity !== null && inv.stockQuantity > 0 && (
                            <span className="ml-1 text-gray-500">({inv.stockQuantity})</span>
                          )}
                        </p>
                        {inv.priceCents !== null && (
                          <p className="mt-0.5 text-sm text-gray-700">
                            ${(inv.priceCents / 100).toFixed(2)}
                          </p>
                        )}
                        {inv.leadTimeDays !== null && (
                          <p className="mt-0.5 text-xs text-gray-400">
                            {inv.leadTimeDays} day lead time
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Used In Models */}
        {usedInModels.length > 0 && (
          <section className="mt-6 mb-8">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Wrench className="h-5 w-5 text-gray-500" />
              Used In
            </h2>
            <div className="mt-3 rounded-lg border border-gray-200 bg-white shadow-sm divide-y divide-gray-100">
              {usedInModels.map(({ modelPart: mp, model, productLine: pl }) => (
                <Link
                  key={mp.id}
                  href={`/equipment/${model?.id}`}
                  className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-gray-50"
                >
                  <div>
                    <p className="font-mono font-medium text-gray-900">
                      {model?.modelNumber ?? 'Unknown'}
                    </p>
                    {model?.description && (
                      <p className="text-sm text-gray-500">{model.description}</p>
                    )}
                    {pl?.name && (
                      <p className="text-xs text-gray-400">{pl.name}</p>
                    )}
                  </div>
                  {mp.quantity && mp.quantity > 1 && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      Qty: {mp.quantity}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
