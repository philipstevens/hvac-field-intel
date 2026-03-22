import { db } from '@/db';
import { serviceReports, models, productLines, manufacturers } from '@/db/schema';
import { desc, count, eq } from 'drizzle-orm';
import Link from 'next/link';
import { ClipboardPlus, ChevronRight, FileText } from 'lucide-react';

export const dynamic = 'force-dynamic';

function statusBadge(status: string) {
  switch (status) {
    case 'approved':
      return 'badge-green';
    case 'submitted':
      return 'badge-blue';
    default:
      return 'badge bg-slate-100 text-slate-600';
  }
}

export default async function ReportsPage() {
  const reports = await db
    .select({
      id: serviceReports.id,
      technicianName: serviceReports.technicianName,
      serialNumber: serviceReports.serialNumber,
      status: serviceReports.status,
      diagnosis: serviceReports.diagnosis,
      createdAt: serviceReports.createdAt,
      modelNumber: models.modelNumber,
      modelDescription: models.description,
    })
    .from(serviceReports)
    .leftJoin(models, eq(serviceReports.modelId, models.id))
    .orderBy(desc(serviceReports.createdAt));

  const [totalResult] = await db.select({ value: count() }).from(serviceReports);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Service Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {totalResult.value} report{totalResult.value !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/reports/new" className="btn-primary gap-2">
          <ClipboardPlus className="w-4 h-4" />
          New Report
        </Link>
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="card-padded text-center py-12">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500 mb-4">No service reports yet</p>
          <Link href="/reports/new" className="btn-primary">
            Create First Report
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => {
            let rootCause = '';
            try {
              const diag = r.diagnosis ? JSON.parse(r.diagnosis) : null;
              rootCause = diag?.rootCause?.replace(/_/g, ' ') || '';
            } catch {
              // ignore
            }

            return (
              <Link
                key={r.id}
                href={`/reports/${r.id}`}
                className="card-padded block active:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={statusBadge(r.status || 'draft')}>
                        {r.status || 'draft'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {r.createdAt}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-slate-900">
                      {r.technicianName}
                    </p>

                    {r.modelNumber && (
                      <p className="text-sm text-slate-600 mt-0.5">
                        {r.modelNumber}
                        {r.modelDescription ? ` - ${r.modelDescription}` : ''}
                      </p>
                    )}

                    {r.serialNumber && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        S/N: {r.serialNumber}
                      </p>
                    )}

                    {rootCause && (
                      <p className="text-xs text-slate-500 mt-1 capitalize">
                        Diagnosis: {rootCause}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-2" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
