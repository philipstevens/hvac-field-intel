"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  AlertTriangle,
  XCircle,
  Loader2,
  Plus,
  Trash2,
  Info,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
  Save,
} from "lucide-react";
import clsx from "clsx";

// ── Types ────────────────────────────────────────────────────

interface PartEntry {
  partNumber: string;
  description: string;
  position: string;
  action: string;
}

interface BulletinRef {
  bulletinNumber: string;
  title: string;
}

interface ReportFormData {
  equipment: {
    manufacturer: string;
    modelNumber: string;
    serialNumber: string;
    customerName: string;
    siteAddress: string;
  };
  arrivalCondition: {
    systemOperating: boolean | null;
    errorCodes: string;
    ambientTemp: number | null;
    initialSymptoms: string;
  };
  diagnosis: {
    rootCause: string;
    contributingFactors: string[];
    diagnosisNotes: string;
    applicableBulletins: BulletinRef[];
  };
  workPerformed: {
    partsReplaced: PartEntry[];
    workDescription: string;
  };
  measurements: {
    supplyTemp: number | null;
    returnTemp: number | null;
    suctionPsi: number | null;
    dischargePsi: number | null;
    superheat: number | null;
    subcooling: number | null;
  };
  technicianNotes: string;
  aiSuggestion: string;
}

interface FieldStatus {
  field: string;
  status: "filled" | "review" | "missing";
  source?: string;
}

// ── Constants ────────────────────────────────────────────────

const ROOT_CAUSE_OPTIONS = [
  { value: "", label: "Select root cause..." },
  { value: "capacitor_failure", label: "Capacitor Failure" },
  { value: "fan_motor_failure", label: "Fan Motor Failure" },
  { value: "contactor_failure", label: "Contactor Failure" },
  { value: "refrigerant_leak", label: "Refrigerant Leak" },
  { value: "control_board_failure", label: "Control Board Failure" },
  { value: "sensor_failure", label: "Sensor Failure" },
  { value: "defrost_issue", label: "Defrost Issue" },
  { value: "airflow_restriction", label: "Airflow Restriction" },
  { value: "other", label: "Other" },
];

const CONTRIBUTING_FACTORS = [
  { value: "age", label: "Age / End of Life" },
  { value: "high_ambient", label: "High Ambient Temp" },
  { value: "power_surge", label: "Power Surge" },
  { value: "lack_maintenance", label: "Lack of Maintenance" },
  { value: "manufacturing_defect", label: "Manufacturing Defect" },
  { value: "normal_wear", label: "Normal Wear" },
];

const PART_ACTIONS = [
  { value: "replaced", label: "Replaced" },
  { value: "cleaned", label: "Cleaned" },
  { value: "adjusted", label: "Adjusted" },
  { value: "repaired", label: "Repaired" },
];

const FIELD_HELP: Record<string, string> = {
  manufacturer: "Equipment manufacturer identified from model number lookup.",
  modelNumber: "Model number as identified during the session.",
  serialNumber: "Serial number for this specific unit. Important for warranty tracking.",
  customerName: "Customer or site name entered when session was created.",
  siteAddress: "Physical location of the equipment.",
  systemOperating: "Was the system running or attempting to run when you arrived?",
  errorCodes: "Any fault codes displayed on the control board or thermostat.",
  ambientTemp: "Outdoor ambient temperature at time of service.",
  initialSymptoms: "What the customer reported or what you observed on arrival.",
  rootCause: "Primary failure mode. Required for warranty claims.",
  contributingFactors: "Environmental or situational factors that contributed to the failure.",
  diagnosisNotes: "Detailed diagnostic findings and reasoning.",
  partsReplaced: "Parts that were replaced, cleaned, adjusted, or repaired.",
  workDescription: "Summary of all work performed during this service call.",
  supplyTemp: "Air temperature at the supply register closest to the unit.",
  returnTemp: "Air temperature at the return air grille.",
  suctionPsi: "Suction (low side) pressure in PSI.",
  dischargePsi: "Discharge (high side) pressure in PSI.",
  superheat: "Superheat reading in degrees Fahrenheit.",
  subcooling: "Subcooling reading in degrees Fahrenheit.",
  technicianNotes: "Additional notes, observations, or follow-up recommendations.",
};

const MISSING_INFO_PROMPTS: Record<string, string> = {
  rootCause: "Root cause diagnosis is required for warranty claims",
  initialSymptoms: "Initial symptoms help document the service call context",
  supplyTemp: "Post-service measurements help document system performance",
  returnTemp: "Return temperature is needed to calculate Delta T",
  serialNumber: "Serial number is important for warranty and service history",
  workDescription: "Work description summarizes what was done for the record",
};

// ── Component ────────────────────────────────────────────────

export default function ReportReviewPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [fieldStatuses, setFieldStatuses] = useState<FieldStatus[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["equipment", "arrivalCondition", "diagnosis", "workPerformed", "measurements", "technicianNotes"])
  );
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [form, setForm] = useState<ReportFormData>({
    equipment: { manufacturer: "", modelNumber: "", serialNumber: "", customerName: "", siteAddress: "" },
    arrivalCondition: { systemOperating: null, errorCodes: "", ambientTemp: null, initialSymptoms: "" },
    diagnosis: { rootCause: "", contributingFactors: [], diagnosisNotes: "", applicableBulletins: [] },
    workPerformed: { partsReplaced: [], workDescription: "" },
    measurements: { supplyTemp: null, returnTemp: null, suctionPsi: null, dischargePsi: null, superheat: null, subcooling: null },
    technicianNotes: "",
    aiSuggestion: "",
  });

  // Fetch auto-filled data
  useEffect(() => {
    async function loadReport() {
      try {
        const res = await fetch(`/api/session/${sessionId}/report`);
        if (res.ok) {
          const data = await res.json();
          setForm(data.autoFilled);
          setFieldStatuses(data.fieldStatuses || []);
          setConfidence(data.confidence || 0);
        }
      } catch (err) {
        console.error("Failed to load report data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, [sessionId]);

  // Helpers
  const getFieldStatus = useCallback(
    (field: string): "filled" | "review" | "missing" => {
      const fs = fieldStatuses.find((f) => f.field === field);
      return fs?.status || "missing";
    },
    [fieldStatuses]
  );

  const fieldBorderClass = (field: string) => {
    const status = getFieldStatus(field);
    if (status === "filled") return "border-green-300 bg-green-50/30";
    if (status === "review") return "border-amber-300 bg-amber-50/30";
    return "border-red-300 bg-red-50/30";
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const deltaT =
    form.measurements.supplyTemp != null && form.measurements.returnTemp != null
      ? Math.abs(form.measurements.returnTemp - form.measurements.supplyTemp)
      : null;

  const missingCritical = fieldStatuses
    .filter((f) => f.status === "missing" && MISSING_INFO_PROMPTS[f.field])
    .map((f) => f.field);

  // Update field statuses when form changes
  const updateFieldStatus = (field: string, value: unknown) => {
    setFieldStatuses((prev) => {
      const others = prev.filter((f) => f.field !== field);
      const hasValue = value !== null && value !== undefined && value !== "" && !(Array.isArray(value) && value.length === 0);
      return [...others, { field, status: hasValue ? "filled" : "missing" }];
    });
  };

  // Form updaters
  const updateEquipment = (field: keyof ReportFormData["equipment"], value: string) => {
    setForm((prev) => ({ ...prev, equipment: { ...prev.equipment, [field]: value } }));
    updateFieldStatus(field, value);
  };

  const updateArrival = (field: keyof ReportFormData["arrivalCondition"], value: unknown) => {
    setForm((prev) => ({ ...prev, arrivalCondition: { ...prev.arrivalCondition, [field]: value } }));
    updateFieldStatus(field, value);
  };

  const updateDiagnosis = (field: keyof ReportFormData["diagnosis"], value: unknown) => {
    setForm((prev) => ({ ...prev, diagnosis: { ...prev.diagnosis, [field]: value } }));
    updateFieldStatus(field, value);
  };

  const updateMeasurements = (field: keyof ReportFormData["measurements"], value: number | null) => {
    setForm((prev) => ({ ...prev, measurements: { ...prev.measurements, [field]: value } }));
    updateFieldStatus(field, value);
  };

  const toggleContributingFactor = (factor: string) => {
    setForm((prev) => {
      const factors = prev.diagnosis.contributingFactors.includes(factor)
        ? prev.diagnosis.contributingFactors.filter((f) => f !== factor)
        : [...prev.diagnosis.contributingFactors, factor];
      return { ...prev, diagnosis: { ...prev.diagnosis, contributingFactors: factors } };
    });
  };

  const addPart = () => {
    setForm((prev) => ({
      ...prev,
      workPerformed: {
        ...prev.workPerformed,
        partsReplaced: [...prev.workPerformed.partsReplaced, { partNumber: "", description: "", position: "", action: "replaced" }],
      },
    }));
  };

  const removePart = (index: number) => {
    setForm((prev) => ({
      ...prev,
      workPerformed: {
        ...prev.workPerformed,
        partsReplaced: prev.workPerformed.partsReplaced.filter((_, i) => i !== index),
      },
    }));
  };

  const updatePart = (index: number, field: keyof PartEntry, value: string) => {
    setForm((prev) => {
      const parts = [...prev.workPerformed.partsReplaced];
      parts[index] = { ...parts[index], [field]: value };
      return { ...prev, workPerformed: { ...prev.workPerformed, partsReplaced: parts } };
    });
  };

  // Submit
  const handleSubmit = async (draft: boolean) => {
    if (draft) setSavingDraft(true);
    else setSubmitting(true);

    try {
      const res = await fetch(`/api/session/${sessionId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, draft }),
      });

      if (res.ok) {
        if (draft) {
          setSavingDraft(false);
          // Brief success feedback — stay on page
          setSubmitSuccess(true);
          setTimeout(() => setSubmitSuccess(false), 2000);
        } else {
          setSubmitSuccess(true);
          setTimeout(() => router.push("/session"), 1200);
        }
      }
    } catch (err) {
      console.error("Failed to submit report:", err);
    } finally {
      setSubmitting(false);
      setSavingDraft(false);
    }
  };

  // ── Render ──

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm text-slate-500">Analyzing conversation and building report...</p>
      </div>
    );
  }

  if (submitSuccess && !savingDraft) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <p className="text-lg font-semibold text-slate-800">Report Submitted</p>
        <p className="text-sm text-slate-500">Session closed. Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto max-w-3xl flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.push(`/session/${sessionId}`)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition-colors -ml-1"
            aria-label="Back to session"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              Service Report Review
            </h1>
            <p className="text-xs text-slate-500">
              {confidence}% auto-filled from conversation
            </p>
          </div>
          {/* Confidence badge */}
          <div
            className={clsx(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
              confidence >= 70
                ? "bg-green-100 text-green-700"
                : confidence >= 40
                ? "bg-amber-100 text-amber-700"
                : "bg-red-100 text-red-700"
            )}
          >
            {confidence >= 70 ? (
              <Check className="h-3.5 w-3.5" />
            ) : confidence >= 40 ? (
              <AlertTriangle className="h-3.5 w-3.5" />
            ) : (
              <XCircle className="h-3.5 w-3.5" />
            )}
            {confidence}%
          </div>
        </div>
      </div>

      {/* Form Body */}
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-5 pb-40 space-y-4">
        {/* ── A. Equipment Information ── */}
        <ReportSection
          id="equipment"
          title="Equipment Information"
          icon={<StatusIcon statuses={fieldStatuses} fields={["manufacturer", "modelNumber", "serialNumber", "customerName", "siteAddress"]} />}
          expanded={expandedSections.has("equipment")}
          onToggle={() => toggleSection("equipment")}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldGroup label="Manufacturer" field="manufacturer" help={FIELD_HELP.manufacturer} showTooltip={showTooltip} setShowTooltip={setShowTooltip}>
              <input
                type="text"
                value={form.equipment.manufacturer}
                readOnly={!!form.equipment.manufacturer}
                onChange={(e) => updateEquipment("manufacturer", e.target.value)}
                className={clsx("field-input", fieldBorderClass("manufacturer"), form.equipment.manufacturer && "bg-green-50/50 text-slate-600")}
                placeholder="Manufacturer"
              />
            </FieldGroup>

            <FieldGroup label="Model Number" field="modelNumber" help={FIELD_HELP.modelNumber} showTooltip={showTooltip} setShowTooltip={setShowTooltip}>
              <input
                type="text"
                value={form.equipment.modelNumber}
                readOnly={!!form.equipment.modelNumber}
                onChange={(e) => updateEquipment("modelNumber", e.target.value)}
                className={clsx("field-input", fieldBorderClass("modelNumber"), form.equipment.modelNumber && "bg-green-50/50 text-slate-600")}
                placeholder="Model number"
              />
            </FieldGroup>

            <FieldGroup label="Serial Number" field="serialNumber" help={FIELD_HELP.serialNumber} showTooltip={showTooltip} setShowTooltip={setShowTooltip}>
              <input
                type="text"
                value={form.equipment.serialNumber}
                onChange={(e) => updateEquipment("serialNumber", e.target.value)}
                className={clsx("field-input", fieldBorderClass("serialNumber"))}
                placeholder="Enter serial number"
              />
            </FieldGroup>

            <FieldGroup label="Customer Name" field="customerName" help={FIELD_HELP.customerName} showTooltip={showTooltip} setShowTooltip={setShowTooltip}>
              <input
                type="text"
                value={form.equipment.customerName}
                onChange={(e) => updateEquipment("customerName", e.target.value)}
                className={clsx("field-input", fieldBorderClass("customerName"))}
                placeholder="Customer name"
              />
            </FieldGroup>
          </div>

          <FieldGroup label="Site Address" field="siteAddress" help={FIELD_HELP.siteAddress} showTooltip={showTooltip} setShowTooltip={setShowTooltip} className="mt-4">
            <input
              type="text"
              value={form.equipment.siteAddress}
              onChange={(e) => updateEquipment("siteAddress", e.target.value)}
              className={clsx("field-input", fieldBorderClass("siteAddress"))}
              placeholder="Service location address"
            />
          </FieldGroup>
        </ReportSection>

        {/* ── B. Arrival Condition ── */}
        <ReportSection
          id="arrivalCondition"
          title="Arrival Condition"
          icon={<StatusIcon statuses={fieldStatuses} fields={["systemOperating", "errorCodes", "ambientTemp", "initialSymptoms"]} />}
          expanded={expandedSections.has("arrivalCondition")}
          onToggle={() => toggleSection("arrivalCondition")}
        >
          <FieldGroup label="System operating on arrival?" field="systemOperating" help={FIELD_HELP.systemOperating} showTooltip={showTooltip} setShowTooltip={setShowTooltip}>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => updateArrival("systemOperating", true)}
                className={clsx(
                  "flex-1 rounded-xl border-2 py-3 text-sm font-semibold transition-all",
                  form.arrivalCondition.systemOperating === true
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                )}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => updateArrival("systemOperating", false)}
                className={clsx(
                  "flex-1 rounded-xl border-2 py-3 text-sm font-semibold transition-all",
                  form.arrivalCondition.systemOperating === false
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                )}
              >
                No
              </button>
            </div>
          </FieldGroup>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <FieldGroup label="Error Codes" field="errorCodes" help={FIELD_HELP.errorCodes} showTooltip={showTooltip} setShowTooltip={setShowTooltip}>
              <input
                type="text"
                value={form.arrivalCondition.errorCodes}
                onChange={(e) => updateArrival("errorCodes", e.target.value)}
                className={clsx("field-input", fieldBorderClass("errorCodes"))}
                placeholder="e.g., E1, F3"
              />
            </FieldGroup>

            <FieldGroup label="Ambient Temp (F)" field="ambientTemp" help={FIELD_HELP.ambientTemp} showTooltip={showTooltip} setShowTooltip={setShowTooltip}>
              <input
                type="number"
                value={form.arrivalCondition.ambientTemp ?? ""}
                onChange={(e) => updateArrival("ambientTemp", e.target.value ? parseFloat(e.target.value) : null)}
                className={clsx("field-input", fieldBorderClass("ambientTemp"))}
                placeholder="Outdoor temp"
              />
            </FieldGroup>
          </div>

          <FieldGroup label="Initial Symptoms" field="initialSymptoms" help={FIELD_HELP.initialSymptoms} showTooltip={showTooltip} setShowTooltip={setShowTooltip} className="mt-4">
            <textarea
              value={form.arrivalCondition.initialSymptoms}
              onChange={(e) => updateArrival("initialSymptoms", e.target.value)}
              className={clsx("field-input min-h-[80px] resize-y", fieldBorderClass("initialSymptoms"))}
              placeholder="Customer complaint or observed issues on arrival"
              rows={3}
            />
          </FieldGroup>
        </ReportSection>

        {/* ── C. Diagnosis ── */}
        <ReportSection
          id="diagnosis"
          title="Diagnosis"
          icon={<StatusIcon statuses={fieldStatuses} fields={["rootCause", "diagnosisNotes"]} />}
          expanded={expandedSections.has("diagnosis")}
          onToggle={() => toggleSection("diagnosis")}
        >
          <FieldGroup label="Root Cause" field="rootCause" help={FIELD_HELP.rootCause} showTooltip={showTooltip} setShowTooltip={setShowTooltip}>
            <select
              value={form.diagnosis.rootCause}
              onChange={(e) => updateDiagnosis("rootCause", e.target.value)}
              className={clsx("field-input", fieldBorderClass("rootCause"))}
            >
              {ROOT_CAUSE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </FieldGroup>

          <FieldGroup label="Contributing Factors" field="contributingFactors" help={FIELD_HELP.contributingFactors} showTooltip={showTooltip} setShowTooltip={setShowTooltip} className="mt-4">
            <div className="flex flex-wrap gap-2">
              {CONTRIBUTING_FACTORS.map((factor) => (
                <button
                  key={factor.value}
                  type="button"
                  onClick={() => toggleContributingFactor(factor.value)}
                  className={clsx(
                    "rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                    form.diagnosis.contributingFactors.includes(factor.value)
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  )}
                >
                  {factor.label}
                </button>
              ))}
            </div>
          </FieldGroup>

          <FieldGroup label="Diagnosis Notes" field="diagnosisNotes" help={FIELD_HELP.diagnosisNotes} showTooltip={showTooltip} setShowTooltip={setShowTooltip} className="mt-4">
            <textarea
              value={form.diagnosis.diagnosisNotes}
              onChange={(e) => updateDiagnosis("diagnosisNotes", e.target.value)}
              className={clsx("field-input min-h-[100px] resize-y", fieldBorderClass("diagnosisNotes"))}
              placeholder="Detailed diagnostic findings..."
              rows={4}
            />
          </FieldGroup>

          {/* Applicable Bulletins */}
          {form.diagnosis.applicableBulletins.length > 0 && (
            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-600 mb-2">Applicable Bulletins</label>
              <div className="flex flex-wrap gap-2">
                {form.diagnosis.applicableBulletins.map((b) => (
                  <span
                    key={b.bulletinNumber}
                    className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {b.bulletinNumber}
                    {b.title && <span className="text-amber-600 ml-1">- {b.title}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </ReportSection>

        {/* ── D. Work Performed ── */}
        <ReportSection
          id="workPerformed"
          title="Work Performed"
          icon={<StatusIcon statuses={fieldStatuses} fields={["partsReplaced", "workDescription"]} />}
          expanded={expandedSections.has("workPerformed")}
          onToggle={() => toggleSection("workPerformed")}
        >
          <div className="space-y-3">
            <label className="block text-xs font-medium text-slate-600">Parts Replaced / Serviced</label>

            {form.workPerformed.partsReplaced.map((part, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase">Part #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => removePart(idx)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    aria-label="Remove part"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={part.partNumber}
                    onChange={(e) => updatePart(idx, "partNumber", e.target.value)}
                    className="field-input text-xs"
                    placeholder="Part number"
                  />
                  <select
                    value={part.action}
                    onChange={(e) => updatePart(idx, "action", e.target.value)}
                    className="field-input text-xs"
                  >
                    {PART_ACTIONS.map((a) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={part.description}
                  onChange={(e) => updatePart(idx, "description", e.target.value)}
                  className="field-input text-xs"
                  placeholder="Description"
                />
                <input
                  type="text"
                  value={part.position}
                  onChange={(e) => updatePart(idx, "position", e.target.value)}
                  className="field-input text-xs"
                  placeholder="Position (e.g., outdoor unit, compressor)"
                />
              </div>
            ))}

            <button
              type="button"
              onClick={addPart}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Part
            </button>
          </div>

          <FieldGroup label="Work Description" field="workDescription" help={FIELD_HELP.workDescription} showTooltip={showTooltip} setShowTooltip={setShowTooltip} className="mt-4">
            <textarea
              value={form.workPerformed.workDescription}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  workPerformed: { ...prev.workPerformed, workDescription: e.target.value },
                }))
              }
              className={clsx("field-input min-h-[80px] resize-y", fieldBorderClass("workDescription"))}
              placeholder="Summary of work performed..."
              rows={3}
            />
          </FieldGroup>
        </ReportSection>

        {/* ── E. Post-Service Measurements ── */}
        <ReportSection
          id="measurements"
          title="Post-Service Measurements"
          icon={<StatusIcon statuses={fieldStatuses} fields={["supplyTemp", "returnTemp", "suctionPsi", "dischargePsi", "superheat", "subcooling"]} />}
          expanded={expandedSections.has("measurements")}
          onToggle={() => toggleSection("measurements")}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <FieldGroup label="Supply Temp (F)" field="supplyTemp" help={FIELD_HELP.supplyTemp} showTooltip={showTooltip} setShowTooltip={setShowTooltip}>
              <input
                type="number"
                value={form.measurements.supplyTemp ?? ""}
                onChange={(e) => updateMeasurements("supplyTemp", e.target.value ? parseFloat(e.target.value) : null)}
                className={clsx("field-input", fieldBorderClass("supplyTemp"))}
                placeholder="--"
              />
            </FieldGroup>

            <FieldGroup label="Return Temp (F)" field="returnTemp" help={FIELD_HELP.returnTemp} showTooltip={showTooltip} setShowTooltip={setShowTooltip}>
              <input
                type="number"
                value={form.measurements.returnTemp ?? ""}
                onChange={(e) => updateMeasurements("returnTemp", e.target.value ? parseFloat(e.target.value) : null)}
                className={clsx("field-input", fieldBorderClass("returnTemp"))}
                placeholder="--"
              />
            </FieldGroup>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Delta T (F)</label>
              <div className="flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-sm font-bold text-slate-700">
                {deltaT != null ? `${deltaT.toFixed(1)}` : "--"}
              </div>
            </div>

            <FieldGroup label="Suction (PSI)" field="suctionPsi" help={FIELD_HELP.suctionPsi} showTooltip={showTooltip} setShowTooltip={setShowTooltip}>
              <input
                type="number"
                value={form.measurements.suctionPsi ?? ""}
                onChange={(e) => updateMeasurements("suctionPsi", e.target.value ? parseFloat(e.target.value) : null)}
                className={clsx("field-input", fieldBorderClass("suctionPsi"))}
                placeholder="--"
              />
            </FieldGroup>

            <FieldGroup label="Discharge (PSI)" field="dischargePsi" help={FIELD_HELP.dischargePsi} showTooltip={showTooltip} setShowTooltip={setShowTooltip}>
              <input
                type="number"
                value={form.measurements.dischargePsi ?? ""}
                onChange={(e) => updateMeasurements("dischargePsi", e.target.value ? parseFloat(e.target.value) : null)}
                className={clsx("field-input", fieldBorderClass("dischargePsi"))}
                placeholder="--"
              />
            </FieldGroup>

            <div /> {/* spacer for grid alignment */}

            <FieldGroup label="Superheat (F)" field="superheat" help={FIELD_HELP.superheat} showTooltip={showTooltip} setShowTooltip={setShowTooltip}>
              <input
                type="number"
                value={form.measurements.superheat ?? ""}
                onChange={(e) => updateMeasurements("superheat", e.target.value ? parseFloat(e.target.value) : null)}
                className={clsx("field-input", fieldBorderClass("superheat"))}
                placeholder="--"
              />
            </FieldGroup>

            <FieldGroup label="Subcooling (F)" field="subcooling" help={FIELD_HELP.subcooling} showTooltip={showTooltip} setShowTooltip={setShowTooltip}>
              <input
                type="number"
                value={form.measurements.subcooling ?? ""}
                onChange={(e) => updateMeasurements("subcooling", e.target.value ? parseFloat(e.target.value) : null)}
                className={clsx("field-input", fieldBorderClass("subcooling"))}
                placeholder="--"
              />
            </FieldGroup>
          </div>
        </ReportSection>

        {/* ── F. Technician Notes ── */}
        <ReportSection
          id="technicianNotes"
          title="Technician Notes"
          icon={<StatusIcon statuses={fieldStatuses} fields={["technicianNotes"]} />}
          expanded={expandedSections.has("technicianNotes")}
          onToggle={() => toggleSection("technicianNotes")}
        >
          <textarea
            value={form.technicianNotes}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, technicianNotes: e.target.value }));
              updateFieldStatus("technicianNotes", e.target.value);
            }}
            className="field-input min-h-[100px] resize-y"
            placeholder="Additional notes, follow-up recommendations..."
            rows={4}
          />

          {/* AI Suggestion */}
          {form.aiSuggestion && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/60 p-3.5">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-blue-800 mb-1">AI Suggestion</p>
                  <p className="text-xs text-blue-700 leading-relaxed">{form.aiSuggestion}</p>
                </div>
              </div>
            </div>
          )}
        </ReportSection>

        {/* ── Missing Information Alert ── */}
        {missingCritical.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">Missing Information</span>
            </div>
            <ul className="space-y-2">
              {missingCritical.map((field) => (
                <li key={field} className="flex items-start gap-2 text-xs text-amber-700">
                  <XCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                  {MISSING_INFO_PROMPTS[field]}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Sticky Bottom Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-sm shadow-[0_-4px_20px_rgba(0,0,0,0.08)] safe-bottom">
        <div className="mx-auto max-w-3xl flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={savingDraft || submitting}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-all disabled:opacity-50"
          >
            {savingDraft ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : submitSuccess ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Draft
          </button>

          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={submitting || savingDraft}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-700 active:bg-blue-800 transition-all disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Submit Report &amp; Close Session
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-Components ───────────────────────────────────────────

function ReportSection({
  id,
  title,
  icon,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors"
      >
        {icon}
        <span className="flex-1 text-sm font-semibold text-slate-800">{title}</span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>
      {expanded && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}

function FieldGroup({
  label,
  field,
  help,
  showTooltip,
  setShowTooltip,
  className,
  children,
}: {
  label: string;
  field: string;
  help?: string;
  showTooltip: string | null;
  setShowTooltip: (v: string | null) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="block text-xs font-medium text-slate-600">{label}</label>
        {help && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTooltip(showTooltip === field ? null : field)}
              className="flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              aria-label={`Help for ${label}`}
            >
              <Info className="h-3 w-3" />
            </button>
            {showTooltip === field && (
              <div className="absolute left-0 top-6 z-20 w-56 rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-600 shadow-lg">
                {help}
                <button
                  type="button"
                  onClick={() => setShowTooltip(null)}
                  className="mt-1 block text-blue-500 text-[10px] font-medium"
                >
                  Got it
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function StatusIcon({
  statuses,
  fields,
}: {
  statuses: FieldStatus[];
  fields: string[];
}) {
  const relevant = statuses.filter((s) => fields.includes(s.field));
  const hasMissing = relevant.some((s) => s.status === "missing");
  const hasReview = relevant.some((s) => s.status === "review");

  if (hasMissing) {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100">
        <XCircle className="h-3.5 w-3.5 text-red-500" />
      </div>
    );
  }
  if (hasReview) {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
      </div>
    );
  }
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
      <Check className="h-3.5 w-3.5 text-green-600" />
    </div>
  );
}
