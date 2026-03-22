'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Trash2,
  Thermometer,
  Gauge,
  Wrench,
  ClipboardCheck,
  Send,
  Cpu,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────

interface EquipmentResult {
  id: string;
  modelNumber: string;
  description: string | null;
  manufacturer: string | null;
  productLine: string | null;
}

interface PartReplaced {
  partNumber: string;
  description: string;
  position: string;
}

interface FormData {
  // Step 1
  modelId: string;
  modelNumber: string;
  serialNumber: string;
  technicianName: string;
  // Step 2
  systemOperating: boolean;
  errorCodes: string;
  ambientTemp: string;
  supplyTemp: string;
  returnTemp: string;
  arrivalNotes: string;
  // Step 3
  rootCause: string;
  contributingFactors: string[];
  diagnosisNotes: string;
  // Step 4
  partsReplaced: PartReplaced[];
  workNotes: string;
  // Step 5
  postSupplyTemp: string;
  postReturnTemp: string;
  suctionPsi: string;
  dischargePsi: string;
  superheat: string;
  subcooling: string;
}

const STEPS = [
  { label: 'Equipment', icon: Cpu },
  { label: 'Arrival', icon: Thermometer },
  { label: 'Diagnosis', icon: Search },
  { label: 'Work', icon: Wrench },
  { label: 'Measurements', icon: Gauge },
  { label: 'Review', icon: ClipboardCheck },
];

const ROOT_CAUSES = [
  { value: 'capacitor_failure', label: 'Capacitor Failure' },
  { value: 'fan_motor_failure', label: 'Fan Motor Failure' },
  { value: 'contactor_failure', label: 'Contactor Failure' },
  { value: 'refrigerant_leak', label: 'Refrigerant Leak' },
  { value: 'control_board_failure', label: 'Control Board Failure' },
  { value: 'sensor_failure', label: 'Sensor Failure' },
  { value: 'other', label: 'Other' },
];

const CONTRIBUTING_FACTORS = [
  { value: 'age', label: 'Equipment Age' },
  { value: 'high_ambient', label: 'High Ambient Temps' },
  { value: 'power_surge', label: 'Power Surge' },
  { value: 'lack_maintenance', label: 'Lack of Maintenance' },
  { value: 'manufacturing_defect', label: 'Manufacturing Defect' },
];

const initialForm: FormData = {
  modelId: '',
  modelNumber: '',
  serialNumber: '',
  technicianName: '',
  systemOperating: false,
  errorCodes: '',
  ambientTemp: '',
  supplyTemp: '',
  returnTemp: '',
  arrivalNotes: '',
  rootCause: '',
  contributingFactors: [],
  diagnosisNotes: '',
  partsReplaced: [],
  workNotes: '',
  postSupplyTemp: '',
  postReturnTemp: '',
  suctionPsi: '',
  dischargePsi: '',
  superheat: '',
  subcooling: '',
};

export default function NewReportPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(initialForm);
  const [submitting, setSubmitting] = useState(false);

  // Equipment search
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<EquipmentResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Part entry
  const [newPart, setNewPart] = useState<PartReplaced>({
    partNumber: '',
    description: '',
    position: '',
  });

  // Debounced equipment search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/equipment?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          setResults(await res.json());
        }
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const updateForm = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const toggleFactor = useCallback((factor: string) => {
    setForm((prev) => ({
      ...prev,
      contributingFactors: prev.contributingFactors.includes(factor)
        ? prev.contributingFactors.filter((f) => f !== factor)
        : [...prev.contributingFactors, factor],
    }));
  }, []);

  const addPart = useCallback(() => {
    if (!newPart.partNumber.trim()) return;
    setForm((prev) => ({
      ...prev,
      partsReplaced: [...prev.partsReplaced, { ...newPart }],
    }));
    setNewPart({ partNumber: '', description: '', position: '' });
  }, [newPart]);

  const removePart = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      partsReplaced: prev.partsReplaced.filter((_, i) => i !== index),
    }));
  }, []);

  const deltaT = (() => {
    const s = parseFloat(form.postSupplyTemp);
    const r = parseFloat(form.postReturnTemp);
    if (!isNaN(s) && !isNaN(r)) return Math.abs(r - s).toFixed(1);
    return '--';
  })();

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const body = {
        technicianName: form.technicianName,
        modelId: form.modelId || null,
        serialNumber: form.serialNumber || null,
        status: 'submitted',
        arrivalCondition: JSON.stringify({
          systemOperating: form.systemOperating,
          errorCodes: form.errorCodes
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          ambientTemp: form.ambientTemp ? parseFloat(form.ambientTemp) : null,
          supplyTemp: form.supplyTemp ? parseFloat(form.supplyTemp) : null,
          returnTemp: form.returnTemp ? parseFloat(form.returnTemp) : null,
          notes: form.arrivalNotes,
        }),
        diagnosis: JSON.stringify({
          rootCause: form.rootCause,
          contributingFactors: form.contributingFactors,
          notes: form.diagnosisNotes,
        }),
        workPerformed: JSON.stringify({
          partsReplaced: form.partsReplaced,
          notes: form.workNotes,
        }),
        measurementsPost: JSON.stringify({
          supplyTemp: form.postSupplyTemp ? parseFloat(form.postSupplyTemp) : null,
          returnTemp: form.postReturnTemp ? parseFloat(form.postReturnTemp) : null,
          deltaT: deltaT !== '--' ? parseFloat(deltaT) : null,
          suctionPsi: form.suctionPsi ? parseFloat(form.suctionPsi) : null,
          dischargePsi: form.dischargePsi ? parseFloat(form.dischargePsi) : null,
          superheat: form.superheat ? parseFloat(form.superheat) : null,
          subcooling: form.subcooling ? parseFloat(form.subcooling) : null,
        }),
        technicianNotes: form.workNotes,
      };

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        router.push('/reports');
      } else {
        alert('Failed to submit report. Please try again.');
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return form.technicianName.trim().length > 0;
    return true;
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <h1 className="text-xl font-bold text-slate-900">New Service Report</h1>

      {/* Step Indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isComplete = i < step;
          return (
            <button
              key={i}
              onClick={() => i < step && setStep(i)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : isComplete
                  ? 'text-emerald-600 cursor-pointer'
                  : 'text-slate-400'
              }`}
              disabled={i > step}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isComplete
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {isComplete ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className="hidden sm:block">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="card-padded">
        {/* Step 1: Equipment Identification */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Equipment Identification</h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Technician Name *
              </label>
              <input
                type="text"
                className="input-field text-base py-3"
                placeholder="Your name"
                value={form.technicianName}
                onChange={(e) => updateForm('technicianName', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Model Number
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  className="input-field text-base py-3 pl-10"
                  placeholder="Search model number..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    updateForm('modelNumber', e.target.value);
                  }}
                />
              </div>
              {searching && (
                <p className="text-xs text-slate-400 mt-1">Searching...</p>
              )}
              {results.length > 0 && (
                <div className="mt-2 border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {results.map((r) => (
                    <button
                      key={r.id}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                      onClick={() => {
                        updateForm('modelId', r.id);
                        updateForm('modelNumber', r.modelNumber);
                        setQuery(r.modelNumber);
                        setResults([]);
                      }}
                    >
                      <p className="text-sm font-medium text-slate-900">{r.modelNumber}</p>
                      <p className="text-xs text-slate-500">
                        {[r.manufacturer, r.productLine, r.description]
                          .filter(Boolean)
                          .join(' / ')}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Serial Number
              </label>
              <input
                type="text"
                className="input-field text-base py-3"
                placeholder="Unit serial number"
                value={form.serialNumber}
                onChange={(e) => updateForm('serialNumber', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 2: Arrival Condition */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Arrival Condition</h2>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">System Operating?</label>
              <button
                type="button"
                onClick={() => updateForm('systemOperating', !form.systemOperating)}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  form.systemOperating ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    form.systemOperating ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Error Codes (comma separated)
              </label>
              <input
                type="text"
                className="input-field text-base py-3"
                placeholder="E1, E4, F2..."
                value={form.errorCodes}
                onChange={(e) => updateForm('errorCodes', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Ambient °F
                </label>
                <input
                  type="number"
                  className="input-field text-base py-3 text-center"
                  placeholder="--"
                  value={form.ambientTemp}
                  onChange={(e) => updateForm('ambientTemp', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Supply °F
                </label>
                <input
                  type="number"
                  className="input-field text-base py-3 text-center"
                  placeholder="--"
                  value={form.supplyTemp}
                  onChange={(e) => updateForm('supplyTemp', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Return °F
                </label>
                <input
                  type="number"
                  className="input-field text-base py-3 text-center"
                  placeholder="--"
                  value={form.returnTemp}
                  onChange={(e) => updateForm('returnTemp', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                className="input-field text-base py-3 min-h-[100px]"
                placeholder="Describe what you found on arrival..."
                value={form.arrivalNotes}
                onChange={(e) => updateForm('arrivalNotes', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 3: Diagnosis */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Diagnosis</h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Root Cause</label>
              <select
                className="input-field text-base py-3"
                value={form.rootCause}
                onChange={(e) => updateForm('rootCause', e.target.value)}
              >
                <option value="">Select root cause...</option>
                {ROOT_CAUSES.map((rc) => (
                  <option key={rc.value} value={rc.value}>
                    {rc.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Contributing Factors
              </label>
              <div className="space-y-2">
                {CONTRIBUTING_FACTORS.map((cf) => (
                  <label
                    key={cf.value}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 active:bg-slate-50 cursor-pointer"
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        form.contributingFactors.includes(cf.value)
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-slate-300'
                      }`}
                    >
                      {form.contributingFactors.includes(cf.value) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span className="text-sm text-slate-700">{cf.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                className="input-field text-base py-3 min-h-[100px]"
                placeholder="Additional diagnosis details..."
                value={form.diagnosisNotes}
                onChange={(e) => updateForm('diagnosisNotes', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 4: Work Performed */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Work Performed</h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Parts Replaced
              </label>

              {form.partsReplaced.length > 0 && (
                <div className="space-y-2 mb-3">
                  {form.partsReplaced.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{p.partNumber}</p>
                        <p className="text-xs text-slate-500">
                          {p.description}
                          {p.position ? ` (${p.position})` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => removePart(i)}
                        className="p-2 text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2 p-3 border border-dashed border-slate-300 rounded-lg">
                <input
                  type="text"
                  className="input-field text-base py-3"
                  placeholder="Part number"
                  value={newPart.partNumber}
                  onChange={(e) =>
                    setNewPart((p) => ({ ...p, partNumber: e.target.value }))
                  }
                />
                <input
                  type="text"
                  className="input-field text-base py-3"
                  placeholder="Description"
                  value={newPart.description}
                  onChange={(e) =>
                    setNewPart((p) => ({ ...p, description: e.target.value }))
                  }
                />
                <input
                  type="text"
                  className="input-field text-base py-3"
                  placeholder="Position (optional)"
                  value={newPart.position}
                  onChange={(e) =>
                    setNewPart((p) => ({ ...p, position: e.target.value }))
                  }
                />
                <button
                  onClick={addPart}
                  disabled={!newPart.partNumber.trim()}
                  className="btn-secondary w-full gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Part
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Technician Notes
              </label>
              <textarea
                className="input-field text-base py-3 min-h-[120px]"
                placeholder="Describe work performed..."
                value={form.workNotes}
                onChange={(e) => updateForm('workNotes', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 5: Post-Service Measurements */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Post-Service Measurements</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Supply Temp °F
                </label>
                <input
                  type="number"
                  className="input-field text-base py-3 text-center"
                  placeholder="--"
                  value={form.postSupplyTemp}
                  onChange={(e) => updateForm('postSupplyTemp', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Return Temp °F
                </label>
                <input
                  type="number"
                  className="input-field text-base py-3 text-center"
                  placeholder="--"
                  value={form.postReturnTemp}
                  onChange={(e) => updateForm('postReturnTemp', e.target.value)}
                />
              </div>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <p className="text-xs text-blue-600 font-medium">Delta T</p>
              <p className="text-2xl font-bold text-blue-900">{deltaT}°F</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Suction PSI
                </label>
                <input
                  type="number"
                  className="input-field text-base py-3 text-center"
                  placeholder="--"
                  value={form.suctionPsi}
                  onChange={(e) => updateForm('suctionPsi', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Discharge PSI
                </label>
                <input
                  type="number"
                  className="input-field text-base py-3 text-center"
                  placeholder="--"
                  value={form.dischargePsi}
                  onChange={(e) => updateForm('dischargePsi', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Superheat °F
                </label>
                <input
                  type="number"
                  className="input-field text-base py-3 text-center"
                  placeholder="--"
                  value={form.superheat}
                  onChange={(e) => updateForm('superheat', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Subcooling °F
                </label>
                <input
                  type="number"
                  className="input-field text-base py-3 text-center"
                  placeholder="--"
                  value={form.subcooling}
                  onChange={(e) => updateForm('subcooling', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Review & Submit */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Review & Submit</h2>

            <div className="space-y-3">
              {/* Equipment */}
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                  Equipment
                </p>
                <p className="text-sm text-slate-900">
                  <span className="font-medium">Tech:</span> {form.technicianName}
                </p>
                {form.modelNumber && (
                  <p className="text-sm text-slate-900">
                    <span className="font-medium">Model:</span> {form.modelNumber}
                  </p>
                )}
                {form.serialNumber && (
                  <p className="text-sm text-slate-900">
                    <span className="font-medium">S/N:</span> {form.serialNumber}
                  </p>
                )}
              </div>

              {/* Arrival */}
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                  Arrival Condition
                </p>
                <p className="text-sm text-slate-900">
                  System {form.systemOperating ? 'Operating' : 'Not Operating'}
                </p>
                {form.errorCodes && (
                  <p className="text-sm text-slate-900">Codes: {form.errorCodes}</p>
                )}
                <p className="text-sm text-slate-600">
                  Temps: {form.ambientTemp || '--'}° amb / {form.supplyTemp || '--'}° supply /{' '}
                  {form.returnTemp || '--'}° return
                </p>
                {form.arrivalNotes && (
                  <p className="text-sm text-slate-600 mt-1">{form.arrivalNotes}</p>
                )}
              </div>

              {/* Diagnosis */}
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                  Diagnosis
                </p>
                {form.rootCause && (
                  <p className="text-sm text-slate-900 capitalize">
                    {form.rootCause.replace(/_/g, ' ')}
                  </p>
                )}
                {form.contributingFactors.length > 0 && (
                  <p className="text-sm text-slate-600">
                    Factors: {form.contributingFactors.map((f) => f.replace(/_/g, ' ')).join(', ')}
                  </p>
                )}
                {form.diagnosisNotes && (
                  <p className="text-sm text-slate-600 mt-1">{form.diagnosisNotes}</p>
                )}
              </div>

              {/* Work */}
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                  Work Performed
                </p>
                {form.partsReplaced.length > 0 ? (
                  <ul className="text-sm text-slate-900 space-y-0.5">
                    {form.partsReplaced.map((p, i) => (
                      <li key={i}>
                        {p.partNumber} - {p.description}
                        {p.position ? ` (${p.position})` : ''}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No parts replaced</p>
                )}
                {form.workNotes && (
                  <p className="text-sm text-slate-600 mt-1">{form.workNotes}</p>
                )}
              </div>

              {/* Post measurements */}
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                  Post-Service
                </p>
                <p className="text-sm text-slate-900">
                  Supply: {form.postSupplyTemp || '--'}°F / Return:{' '}
                  {form.postReturnTemp || '--'}°F / Delta T: {deltaT}°F
                </p>
                <p className="text-sm text-slate-900">
                  Suction: {form.suctionPsi || '--'} PSI / Discharge:{' '}
                  {form.dischargePsi || '--'} PSI
                </p>
                <p className="text-sm text-slate-900">
                  Superheat: {form.superheat || '--'}°F / Subcooling:{' '}
                  {form.subcooling || '--'}°F
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="btn-secondary flex-1 gap-2 py-3">
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        )}
        {step < 5 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="btn-primary flex-1 gap-2 py-3"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary flex-1 gap-2 py-3 text-base"
          >
            <Send className="w-5 h-5" />
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        )}
      </div>
    </div>
  );
}
