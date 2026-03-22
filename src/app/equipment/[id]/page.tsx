import { db } from "@/db";
import {
  models,
  productLines,
  manufacturers,
  serialRanges,
  modelParts,
  parts,
  bulletinApplicability,
  bulletins,
  manuals,
  manualRevisions,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Factory,
  Zap,
  Thermometer,
  Gauge,
  Droplets,
  MapPin,
  Calendar,
  ChevronDown,
  Wrench,
  AlertTriangle,
  BookOpen,
  Hash,
} from "lucide-react";
import { cn, formatDate, severityColor, categoryLabel } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const model = await db.select().from(models).where(eq(models.id, id)).get();
  return {
    title: model
      ? `${model.modelNumber} – HVAC Field Intel`
      : "Equipment – HVAC Field Intel",
  };
}

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch model with product line and manufacturer
  const result = await db
    .select({
      model: models,
      productLine: productLines,
      manufacturer: manufacturers,
    })
    .from(models)
    .innerJoin(productLines, eq(models.productLineId, productLines.id))
    .innerJoin(manufacturers, eq(productLines.manufacturerId, manufacturers.id))
    .where(eq(models.id, id))
    .get();

  if (!result) {
    notFound();
  }

  const { model, productLine, manufacturer } = result;

  // Fetch all related data in parallel
  const [serialRangeRows, partRows, bulletinRows, manualRows] =
    await Promise.all([
      // Serial ranges
      db
        .select()
        .from(serialRanges)
        .where(eq(serialRanges.modelId, id)),

      // Parts
      db
        .select({
          modelPart: modelParts,
          part: parts,
        })
        .from(modelParts)
        .innerJoin(parts, eq(modelParts.partId, parts.id))
        .where(eq(modelParts.modelId, id)),

      // Bulletins
      db
        .select({
          applicability: bulletinApplicability,
          bulletin: bulletins,
        })
        .from(bulletinApplicability)
        .innerJoin(bulletins, eq(bulletinApplicability.bulletinId, bulletins.id))
        .where(eq(bulletinApplicability.modelId, id)),

      // Manuals with current revision
      db
        .select({
          manual: manuals,
          revision: manualRevisions,
        })
        .from(manuals)
        .leftJoin(
          manualRevisions,
          and(
            eq(manualRevisions.manualId, manuals.id),
            eq(manualRevisions.isCurrent, true)
          )
        )
        .where(eq(manuals.modelId, id)),
    ]);

  // Build info grid items
  const infoItems: Array<{
    icon: React.ReactNode;
    label: string;
    value: string;
  }> = [];

  if (model.voltage) {
    infoItems.push({
      icon: <Zap className="h-4 w-4" />,
      label: "Voltage",
      value: model.voltage,
    });
  }
  if (model.btuRating) {
    infoItems.push({
      icon: <Thermometer className="h-4 w-4" />,
      label: "BTU Rating",
      value: model.btuRating.toLocaleString(),
    });
  }
  if (model.seerRating) {
    infoItems.push({
      icon: <Gauge className="h-4 w-4" />,
      label: "SEER Rating",
      value: model.seerRating.toString(),
    });
  }
  if (model.refrigerantType) {
    infoItems.push({
      icon: <Droplets className="h-4 w-4" />,
      label: "Refrigerant",
      value: model.refrigerantType,
    });
  }
  if (model.productionStart || model.productionEnd) {
    infoItems.push({
      icon: <Calendar className="h-4 w-4" />,
      label: "Production",
      value: `${model.productionStart ?? "?"} – ${model.productionEnd ?? "present"}`,
    });
  }
  if (model.region) {
    infoItems.push({
      icon: <MapPin className="h-4 w-4" />,
      label: "Region",
      value: model.region,
    });
  }

  return (
    <div className="px-4 pt-4 pb-8 max-w-2xl mx-auto">
      {/* Back Button */}
      <Link
        href="/equipment"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4 py-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Equipment
      </Link>

      {/* Equipment Header */}
      <div className="card-padded mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Factory className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-medium text-blue-600">
            {manufacturer.name}
          </span>
          {productLine.category && (
            <span className="badge-blue ml-auto">
              {categoryLabel(productLine.category)}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {model.modelNumber}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {productLine.name}
          {model.description && ` — ${model.description}`}
        </p>
      </div>

      {/* Info Grid */}
      {infoItems.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {infoItems.map((item) => (
            <div key={item.label} className="card-padded flex items-start gap-3">
              <div className="text-slate-400 mt-0.5">{item.icon}</div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400 uppercase tracking-wide">
                  {item.label}
                </p>
                <p className="text-sm font-medium text-slate-900 truncate">
                  {item.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sections */}
      <div className="space-y-4">
        {/* Serial Ranges */}
        <details className="card group" open>
          <summary className="flex items-center justify-between p-4 cursor-pointer select-none">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-slate-400" />
              <span className="section-header text-base">Serial Ranges</span>
              <span className="text-xs text-slate-400 ml-1">
                ({serialRangeRows.length})
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-4 pb-4">
            {serialRangeRows.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">
                No serial range data available
              </p>
            ) : (
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-400 uppercase tracking-wide">
                      <th className="pb-2 pr-3 font-medium">Prefix</th>
                      <th className="pb-2 pr-3 font-medium">Range</th>
                      <th className="pb-2 pr-3 font-medium">Dates</th>
                      <th className="pb-2 font-medium">Factory</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {serialRangeRows.map((sr) => (
                      <tr key={sr.id} className="text-slate-700">
                        <td className="py-2 pr-3 font-mono text-xs font-medium">
                          {sr.serialPrefix ?? "—"}
                        </td>
                        <td className="py-2 pr-3 font-mono text-xs">
                          {sr.serialStart && sr.serialEnd
                            ? `${sr.serialStart} – ${sr.serialEnd}`
                            : sr.serialStart ?? sr.serialEnd ?? "—"}
                        </td>
                        <td className="py-2 pr-3 text-xs text-slate-500">
                          {sr.productionDateStart && sr.productionDateEnd
                            ? `${sr.productionDateStart} – ${sr.productionDateEnd}`
                            : sr.productionDateStart ?? sr.productionDateEnd ?? "—"}
                        </td>
                        <td className="py-2 text-xs text-slate-500">
                          {sr.factoryCode ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </details>

        {/* Parts */}
        <details className="card group" open>
          <summary className="flex items-center justify-between p-4 cursor-pointer select-none">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-slate-400" />
              <span className="section-header text-base">Parts</span>
              <span className="text-xs text-slate-400 ml-1">
                ({partRows.length})
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-4 pb-4">
            {partRows.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">
                No parts data available
              </p>
            ) : (
              <div className="space-y-2">
                {partRows.map(({ modelPart, part }) => (
                  <Link
                    key={modelPart.id}
                    href={`/parts/${part.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 font-mono">
                        {part.partNumber}
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {part.description}
                      </p>
                      {part.category && (
                        <span className="text-xs text-slate-400 mt-1 inline-block">
                          {categoryLabel(part.category)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {modelPart.quantity && modelPart.quantity > 1 && (
                        <span className="text-xs text-slate-400">
                          x{modelPart.quantity}
                        </span>
                      )}
                      <StatusBadge status={part.status ?? "active"} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </details>

        {/* Bulletins */}
        <details className="card group" open>
          <summary className="flex items-center justify-between p-4 cursor-pointer select-none">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-slate-400" />
              <span className="section-header text-base">Bulletins</span>
              <span className="text-xs text-slate-400 ml-1">
                ({bulletinRows.length})
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-4 pb-4">
            {bulletinRows.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">
                No bulletins for this equipment
              </p>
            ) : (
              <div className="space-y-2">
                {bulletinRows.map(({ bulletin }) => (
                  <div
                    key={bulletin.id}
                    className={cn(
                      "rounded-lg border p-3",
                      severityColor(bulletin.severity)
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              "badge border text-[11px]",
                              severityColor(bulletin.severity)
                            )}
                          >
                            {categoryLabel(bulletin.severity)}
                          </span>
                          <span className="text-xs font-mono opacity-70">
                            {bulletin.bulletinNumber}
                          </span>
                        </div>
                        <p className="text-sm font-medium mt-1.5">
                          {bulletin.title}
                        </p>
                        {bulletin.contentSummary && (
                          <p className="text-xs opacity-80 mt-1 line-clamp-2">
                            {bulletin.contentSummary}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs opacity-60 mt-2">
                      {formatDate(bulletin.publicationDate)}
                      {bulletin.status !== "active" && (
                        <span className="ml-2 uppercase font-medium">
                          {bulletin.status}
                        </span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>

        {/* Manuals */}
        <details className="card group" open>
          <summary className="flex items-center justify-between p-4 cursor-pointer select-none">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-slate-400" />
              <span className="section-header text-base">Manuals</span>
              <span className="text-xs text-slate-400 ml-1">
                ({manualRows.length})
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-4 pb-4">
            {manualRows.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">
                No manuals available
              </p>
            ) : (
              <div className="space-y-2">
                {manualRows.map(({ manual, revision }) => (
                  <div
                    key={manual.id}
                    className="rounded-lg border border-slate-100 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900">
                          {manual.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="badge-blue">
                            {categoryLabel(manual.manualType)}
                          </span>
                          {revision && (
                            <span className="text-xs text-slate-400">
                              Rev {revision.revisionCode}
                              {revision.publicationDate &&
                                ` — ${formatDate(revision.publicationDate)}`}
                            </span>
                          )}
                        </div>
                        {revision?.changesSummary && (
                          <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">
                            {revision.changesSummary}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}

/** Small status badge component for part status */
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    discontinued: "bg-red-100 text-red-700",
    superseded: "bg-amber-100 text-amber-700",
  };

  return (
    <span
      className={cn(
        "badge text-[11px]",
        styles[status] ?? "bg-slate-100 text-slate-600"
      )}
    >
      {categoryLabel(status)}
    </span>
  );
}
