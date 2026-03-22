import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, 'hvac.db');
const client = createClient({ url: `file:${dbPath}` });
const db = drizzle(client, { schema });

function uid() {
  return crypto.randomUUID();
}

// ── Manufacturers ──────────────────────────────────────────
const carrier = { id: uid(), name: 'Carrier', slug: 'carrier', country: 'US', createdAt: new Date().toISOString() };
const trane = { id: uid(), name: 'Trane', slug: 'trane', country: 'US', createdAt: new Date().toISOString() };
const lennox = { id: uid(), name: 'Lennox', slug: 'lennox', country: 'US', createdAt: new Date().toISOString() };

// ── Product Lines ──────────────────────────────────────────
const carrierInfinity = { id: uid(), manufacturerId: carrier.id, name: 'Infinity Series', slug: 'infinity', category: 'ac' };
const carrierPerformance = { id: uid(), manufacturerId: carrier.id, name: 'Performance Series', slug: 'performance', category: 'furnace' };
const traneXR = { id: uid(), manufacturerId: trane.id, name: 'XR Series', slug: 'xr', category: 'ac' };
const traneS9 = { id: uid(), manufacturerId: trane.id, name: 'S9 Series', slug: 's9', category: 'furnace' };
const lennoxXC = { id: uid(), manufacturerId: lennox.id, name: 'XC Series', slug: 'xc', category: 'ac' };
const lennoxSL = { id: uid(), manufacturerId: lennox.id, name: 'SL Series', slug: 'sl', category: 'heat_pump' };

// ── Models ─────────────────────────────────────────────────
const modelData = [
  { id: uid(), productLineId: carrierInfinity.id, modelNumber: '24ANB636A003', modelNumberNormalized: '24ANB636A003', description: 'Infinity 16 Central AC - 3 Ton', refrigerantType: 'R-410A', voltage: '208/230V', btuRating: 36000, seerRating: 16.0, region: '["US"]', productionStart: '2019-01', productionEnd: null },
  { id: uid(), productLineId: carrierInfinity.id, modelNumber: '24ANB648A003', modelNumberNormalized: '24ANB648A003', description: 'Infinity 16 Central AC - 4 Ton', refrigerantType: 'R-410A', voltage: '208/230V', btuRating: 48000, seerRating: 16.0, region: '["US"]', productionStart: '2019-01', productionEnd: null },
  { id: uid(), productLineId: carrierPerformance.id, modelNumber: '59TP6B080V17-16', modelNumberNormalized: '59TP6B080V1716', description: 'Performance 96 Gas Furnace - 80K BTU', refrigerantType: null, voltage: '120V', btuRating: 80000, seerRating: null, region: '["US"]', productionStart: '2020-03', productionEnd: null },
  { id: uid(), productLineId: traneXR.id, modelNumber: '4TTR6036J1000A', modelNumberNormalized: '4TTR6036J1000A', description: 'XR16 AC - 3 Ton', refrigerantType: 'R-410A', voltage: '208/230V', btuRating: 36000, seerRating: 16.0, region: '["US"]', productionStart: '2018-06', productionEnd: null },
  { id: uid(), productLineId: traneXR.id, modelNumber: '4TTR6048J1000A', modelNumberNormalized: '4TTR6048J1000A', description: 'XR16 AC - 4 Ton', refrigerantType: 'R-410A', voltage: '208/230V', btuRating: 48000, seerRating: 16.0, region: '["US"]', productionStart: '2018-06', productionEnd: null },
  { id: uid(), productLineId: traneS9.id, modelNumber: 'S9V2B080U4PSB', modelNumberNormalized: 'S9V2B080U4PSB', description: 'S9V2 Gas Furnace - 80K BTU 2-Stage', refrigerantType: null, voltage: '120V', btuRating: 80000, seerRating: null, region: '["US"]', productionStart: '2019-09', productionEnd: null },
  { id: uid(), productLineId: lennoxXC.id, modelNumber: 'XC16-036-230', modelNumberNormalized: 'XC16036230', description: 'XC16 AC - 3 Ton', refrigerantType: 'R-410A', voltage: '208/230V', btuRating: 36000, seerRating: 16.0, region: '["US"]', productionStart: '2020-01', productionEnd: null },
  { id: uid(), productLineId: lennoxXC.id, modelNumber: 'XC16-048-230', modelNumberNormalized: 'XC16048230', description: 'XC16 AC - 4 Ton', refrigerantType: 'R-410A', voltage: '208/230V', btuRating: 48000, seerRating: 16.0, region: '["US"]', productionStart: '2020-01', productionEnd: null },
  { id: uid(), productLineId: lennoxSL.id, modelNumber: 'SL18XP1-036-230', modelNumberNormalized: 'SL18XP1036230', description: 'SL18XP Heat Pump - 3 Ton', refrigerantType: 'R-410A', voltage: '208/230V', btuRating: 36000, seerRating: 18.0, region: '["US"]', productionStart: '2021-04', productionEnd: null },
];

// ── Serial Ranges ──────────────────────────────────────────
const serialRangeData = [
  { id: uid(), modelId: modelData[0].id, serialPrefix: '2119E', serialStart: '2119E00001', serialEnd: '2119E50000', productionDateStart: '2019-01', productionDateEnd: '2019-12', factoryCode: 'IND', variant: 'Standard', region: 'US' },
  { id: uid(), modelId: modelData[0].id, serialPrefix: '2219E', serialStart: '2219E00001', serialEnd: '2219E50000', productionDateStart: '2020-01', productionDateEnd: '2020-12', factoryCode: 'IND', variant: 'Standard', region: 'US' },
  { id: uid(), modelId: modelData[1].id, serialPrefix: '2119F', serialStart: '2119F00001', serialEnd: '2119F50000', productionDateStart: '2019-01', productionDateEnd: '2019-12', factoryCode: 'IND', variant: 'Standard', region: 'US' },
  { id: uid(), modelId: modelData[3].id, serialPrefix: '18261', serialStart: '1826100001', serialEnd: '1826199999', productionDateStart: '2018-06', productionDateEnd: '2019-06', factoryCode: 'TYL', variant: 'Standard', region: 'US' },
  { id: uid(), modelId: modelData[4].id, serialPrefix: '18262', serialStart: '1826200001', serialEnd: '1826299999', productionDateStart: '2018-06', productionDateEnd: '2019-06', factoryCode: 'TYL', variant: 'Standard', region: 'US' },
  { id: uid(), modelId: modelData[6].id, serialPrefix: '5920A', serialStart: '5920A00001', serialEnd: '5920A99999', productionDateStart: '2020-01', productionDateEnd: '2020-12', factoryCode: 'STU', variant: 'Standard', region: 'US' },
  { id: uid(), modelId: modelData[8].id, serialPrefix: '5921B', serialStart: '5921B00001', serialEnd: '5921B99999', productionDateStart: '2021-04', productionDateEnd: '2022-03', factoryCode: 'STU', variant: 'Standard', region: 'US' },
];

// ── Parts ──────────────────────────────────────────────────
const partsData = [
  // Carrier parts
  { id: uid(), manufacturerId: carrier.id, partNumber: 'P461-3503', partNumberNormalized: 'P4613503', description: 'Dual Run Capacitor 45/5 MFD 440V', category: 'capacitor', status: 'superseded' },
  { id: uid(), manufacturerId: carrier.id, partNumber: 'P461-3504', partNumberNormalized: 'P4613504', description: 'Dual Run Capacitor 45/5 MFD 440V (Rev B)', category: 'capacitor', status: 'superseded' },
  { id: uid(), manufacturerId: carrier.id, partNumber: 'P461-3508', partNumberNormalized: 'P4613508', description: 'Dual Run Capacitor 45/5 MFD 440V (Current)', category: 'capacitor', status: 'active' },
  { id: uid(), manufacturerId: carrier.id, partNumber: 'HC37GE210A', partNumberNormalized: 'HC37GE210A', description: 'Condenser Fan Motor 1/5 HP', category: 'fan_motor', status: 'superseded' },
  { id: uid(), manufacturerId: carrier.id, partNumber: 'HC37GE219A', partNumberNormalized: 'HC37GE219A', description: 'Condenser Fan Motor 1/5 HP (Current)', category: 'fan_motor', status: 'active' },
  { id: uid(), manufacturerId: carrier.id, partNumber: 'HN67KC075', partNumberNormalized: 'HN67KC075', description: 'Single Pole Contactor 30A 24V', category: 'contactor', status: 'active' },
  { id: uid(), manufacturerId: carrier.id, partNumber: 'HH18HA281', partNumberNormalized: 'HH18HA281', description: 'Flame Sensor', category: 'sensor', status: 'active' },
  { id: uid(), manufacturerId: carrier.id, partNumber: 'LH33WZ512A', partNumberNormalized: 'LH33WZ512A', description: 'Control Board - Furnace', category: 'control_board', status: 'active' },

  // Trane parts
  { id: uid(), manufacturerId: trane.id, partNumber: 'CPT00660', partNumberNormalized: 'CPT00660', description: 'Dual Run Capacitor 45/5 MFD 370V', category: 'capacitor', status: 'superseded' },
  { id: uid(), manufacturerId: trane.id, partNumber: 'CPT01860', partNumberNormalized: 'CPT01860', description: 'Dual Run Capacitor 45/5 MFD 440V (Current)', category: 'capacitor', status: 'active' },
  { id: uid(), manufacturerId: trane.id, partNumber: 'MOT09231', partNumberNormalized: 'MOT09231', description: 'Condenser Fan Motor 1/4 HP', category: 'fan_motor', status: 'active' },
  { id: uid(), manufacturerId: trane.id, partNumber: 'CTR02573', partNumberNormalized: 'CTR02573', description: 'Single Pole Contactor 30A', category: 'contactor', status: 'active' },
  { id: uid(), manufacturerId: trane.id, partNumber: 'SEN01114', partNumberNormalized: 'SEN01114', description: 'Flame Sensor Rod', category: 'sensor', status: 'active' },
  { id: uid(), manufacturerId: trane.id, partNumber: 'CNT07839', partNumberNormalized: 'CNT07839', description: 'Integrated Furnace Control Board', category: 'control_board', status: 'active' },

  // Lennox parts
  { id: uid(), manufacturerId: lennox.id, partNumber: '89M77', partNumberNormalized: '89M77', description: 'Dual Run Capacitor 45/5 MFD 440V', category: 'capacitor', status: 'superseded' },
  { id: uid(), manufacturerId: lennox.id, partNumber: '89M81', partNumberNormalized: '89M81', description: 'Dual Run Capacitor 45/5 MFD 440V (Current)', category: 'capacitor', status: 'active' },
  { id: uid(), manufacturerId: lennox.id, partNumber: '72L04', partNumberNormalized: '72L04', description: 'Condenser Fan Motor 1/4 HP', category: 'fan_motor', status: 'active' },
  { id: uid(), manufacturerId: lennox.id, partNumber: '10F73', partNumberNormalized: '10F73', description: 'Compressor Contactor 1-Pole 30A', category: 'contactor', status: 'active' },
  { id: uid(), manufacturerId: lennox.id, partNumber: '69W43', partNumberNormalized: '69W43', description: 'Flame Sensor', category: 'sensor', status: 'active' },
  { id: uid(), manufacturerId: lennox.id, partNumber: '83M00', partNumberNormalized: '83M00', description: 'SureLight Ignition Control Board', category: 'control_board', status: 'active' },
];

// ── Part Supersessions ─────────────────────────────────────
const supersessionData = [
  // Carrier capacitor chain: P461-3503 → P461-3504 → P461-3508
  { id: uid(), oldPartId: partsData[0].id, newPartId: partsData[1].id, supersessionDate: '2021-03', installationNotes: 'Direct replacement. Same form factor.', sourceBulletinId: null },
  { id: uid(), oldPartId: partsData[1].id, newPartId: partsData[2].id, supersessionDate: '2023-06', installationNotes: 'Updated terminal configuration. Verify wiring diagram.', sourceBulletinId: null },
  // Carrier fan motor: HC37GE210A → HC37GE219A
  { id: uid(), oldPartId: partsData[3].id, newPartId: partsData[4].id, supersessionDate: '2022-09', installationNotes: 'New motor has plug connector instead of ring terminals. Adapter harness included.', sourceBulletinId: null },
  // Trane capacitor: CPT00660 → CPT01860
  { id: uid(), oldPartId: partsData[8].id, newPartId: partsData[9].id, supersessionDate: '2022-01', installationNotes: 'Upgraded voltage rating from 370V to 440V. Direct drop-in.', sourceBulletinId: null },
  // Lennox capacitor: 89M77 → 89M81
  { id: uid(), oldPartId: partsData[14].id, newPartId: partsData[15].id, supersessionDate: '2023-02', installationNotes: 'Updated dielectric. Same mounting.', sourceBulletinId: null },
];

// ── Model-Part relationships ───────────────────────────────
const modelPartsData = [
  // Carrier Infinity 3-ton AC parts
  { id: uid(), modelId: modelData[0].id, partId: partsData[2].id, quantity: 1, positionCode: 'C1', isFieldReplaceable: true },
  { id: uid(), modelId: modelData[0].id, partId: partsData[4].id, quantity: 1, positionCode: 'FM1', isFieldReplaceable: true },
  { id: uid(), modelId: modelData[0].id, partId: partsData[5].id, quantity: 1, positionCode: 'K1', isFieldReplaceable: true },
  // Carrier Infinity 4-ton AC
  { id: uid(), modelId: modelData[1].id, partId: partsData[2].id, quantity: 1, positionCode: 'C1', isFieldReplaceable: true },
  { id: uid(), modelId: modelData[1].id, partId: partsData[4].id, quantity: 1, positionCode: 'FM1', isFieldReplaceable: true },
  { id: uid(), modelId: modelData[1].id, partId: partsData[5].id, quantity: 1, positionCode: 'K1', isFieldReplaceable: true },
  // Carrier furnace
  { id: uid(), modelId: modelData[2].id, partId: partsData[6].id, quantity: 1, positionCode: 'FS1', isFieldReplaceable: true },
  { id: uid(), modelId: modelData[2].id, partId: partsData[7].id, quantity: 1, positionCode: 'CB1', isFieldReplaceable: true },
  // Trane XR16 3-ton
  { id: uid(), modelId: modelData[3].id, partId: partsData[9].id, quantity: 1, positionCode: 'C1', isFieldReplaceable: true },
  { id: uid(), modelId: modelData[3].id, partId: partsData[10].id, quantity: 1, positionCode: 'FM1', isFieldReplaceable: true },
  { id: uid(), modelId: modelData[3].id, partId: partsData[11].id, quantity: 1, positionCode: 'K1', isFieldReplaceable: true },
  // Trane XR16 4-ton
  { id: uid(), modelId: modelData[4].id, partId: partsData[9].id, quantity: 1, positionCode: 'C1', isFieldReplaceable: true },
  { id: uid(), modelId: modelData[4].id, partId: partsData[10].id, quantity: 1, positionCode: 'FM1', isFieldReplaceable: true },
  { id: uid(), modelId: modelData[4].id, partId: partsData[11].id, quantity: 1, positionCode: 'K1', isFieldReplaceable: true },
  // Trane furnace
  { id: uid(), modelId: modelData[5].id, partId: partsData[12].id, quantity: 1, positionCode: 'FS1', isFieldReplaceable: true },
  { id: uid(), modelId: modelData[5].id, partId: partsData[13].id, quantity: 1, positionCode: 'CB1', isFieldReplaceable: true },
  // Lennox XC16 3-ton
  { id: uid(), modelId: modelData[6].id, partId: partsData[15].id, quantity: 1, positionCode: 'C1', isFieldReplaceable: true },
  { id: uid(), modelId: modelData[6].id, partId: partsData[16].id, quantity: 1, positionCode: 'FM1', isFieldReplaceable: true },
  { id: uid(), modelId: modelData[6].id, partId: partsData[17].id, quantity: 1, positionCode: 'K1', isFieldReplaceable: true },
  // Lennox XC16 4-ton
  { id: uid(), modelId: modelData[7].id, partId: partsData[15].id, quantity: 1, positionCode: 'C1', isFieldReplaceable: true },
  { id: uid(), modelId: modelData[7].id, partId: partsData[16].id, quantity: 1, positionCode: 'FM1', isFieldReplaceable: true },
  { id: uid(), modelId: modelData[7].id, partId: partsData[17].id, quantity: 1, positionCode: 'K1', isFieldReplaceable: true },
  // Lennox heat pump
  { id: uid(), modelId: modelData[8].id, partId: partsData[15].id, quantity: 1, positionCode: 'C1', isFieldReplaceable: true },
  { id: uid(), modelId: modelData[8].id, partId: partsData[16].id, quantity: 1, positionCode: 'FM1', isFieldReplaceable: true },
  { id: uid(), modelId: modelData[8].id, partId: partsData[18].id, quantity: 1, positionCode: 'FS1', isFieldReplaceable: true },
];

// ── Bulletins ──────────────────────────────────────────────
const bulletinData = [
  { id: uid(), manufacturerId: carrier.id, bulletinNumber: 'CB-2023-041', title: 'Contactor Welding Issue - Infinity 16 Series', publicationDate: '2023-08-15', severity: 'safety_critical', status: 'active', supersededById: null, contentSummary: 'Certain contactors in Infinity 16 units manufactured between Jan 2019 and Dec 2020 may weld closed under high ambient conditions. Inspect and replace contactor HN67KC075 if showing signs of pitting. Safety shutdown may not engage.' },
  { id: uid(), manufacturerId: carrier.id, bulletinNumber: 'CB-2024-012', title: 'Capacitor Supersession Notice - P461 Series', publicationDate: '2024-01-20', severity: 'informational', status: 'active', supersededById: null, contentSummary: 'P461-3503 and P461-3504 capacitors have been superseded by P461-3508. Previous part numbers are no longer available. P461-3508 is a direct replacement with updated terminal layout.' },
  { id: uid(), manufacturerId: trane.id, bulletinNumber: 'TB-2023-108', title: 'Flame Sensor Cleaning Interval Update', publicationDate: '2023-11-01', severity: 'warranty', status: 'active', supersededById: null, contentSummary: 'S9V2 furnaces with serial numbers starting 19261 through 20261 require flame sensor cleaning every 12 months instead of 24 months. Failure to maintain may void warranty on ignition system components.' },
  { id: uid(), manufacturerId: trane.id, bulletinNumber: 'TB-2024-022', title: 'XR16 Refrigerant Charge Verification', publicationDate: '2024-03-10', severity: 'informational', status: 'active', supersededById: null, contentSummary: 'Updated superheat/subcooling targets for XR16 units operating with TXV. Superheat target: 8-12F (was 10-15F). Subcooling target: 10-14F (unchanged). Applies to all XR16 models with TXV metering.' },
  { id: uid(), manufacturerId: lennox.id, bulletinNumber: 'LB-2023-076', title: 'SL18XP Defrost Board Update', publicationDate: '2023-09-22', severity: 'warranty', status: 'active', supersededById: null, contentSummary: 'SL18XP heat pumps manufactured before March 2022 may experience premature defrost cycling in mild ambient conditions (35-45F). Updated defrost control board 83M00 Rev C resolves timing issue. Warranty replacement authorized.' },
  { id: uid(), manufacturerId: lennox.id, bulletinNumber: 'LB-2024-005', title: 'XC16 Condenser Coil Cleaning Advisory', publicationDate: '2024-02-01', severity: 'informational', status: 'active', supersededById: null, contentSummary: 'XC16 units installed in high-pollen or cottonwood areas require condenser coil cleaning every 90 days during peak season. Standard 6-month interval insufficient. Use approved coil cleaner only - no acid-based cleaners on aluminum fin stock.' },
  // Superseded bulletin example
  { id: uid(), manufacturerId: carrier.id, bulletinNumber: 'CB-2022-089', title: 'Capacitor Replacement Notice (Superseded)', publicationDate: '2022-05-10', severity: 'informational', status: 'superseded', supersededById: null, contentSummary: 'Original notice for P461-3503 replacement with P461-3504. This bulletin has been superseded by CB-2024-012.' },
];

// Link superseded bulletin
(bulletinData[6] as { supersededById: string | null }).supersededById = bulletinData[1].id;

// ── Bulletin Applicability ─────────────────────────────────
const bulletinApplicabilityData = [
  { id: uid(), bulletinId: bulletinData[0].id, modelId: modelData[0].id, serialRangeId: serialRangeData[0].id, appliesToAllSerials: false, notes: '2019 production run' },
  { id: uid(), bulletinId: bulletinData[0].id, modelId: modelData[1].id, serialRangeId: serialRangeData[2].id, appliesToAllSerials: false, notes: '2019 production run' },
  { id: uid(), bulletinId: bulletinData[1].id, modelId: modelData[0].id, serialRangeId: null, appliesToAllSerials: true, notes: null },
  { id: uid(), bulletinId: bulletinData[1].id, modelId: modelData[1].id, serialRangeId: null, appliesToAllSerials: true, notes: null },
  { id: uid(), bulletinId: bulletinData[2].id, modelId: modelData[5].id, serialRangeId: null, appliesToAllSerials: true, notes: null },
  { id: uid(), bulletinId: bulletinData[3].id, modelId: modelData[3].id, serialRangeId: null, appliesToAllSerials: true, notes: null },
  { id: uid(), bulletinId: bulletinData[3].id, modelId: modelData[4].id, serialRangeId: null, appliesToAllSerials: true, notes: null },
  { id: uid(), bulletinId: bulletinData[4].id, modelId: modelData[8].id, serialRangeId: serialRangeData[6].id, appliesToAllSerials: false, notes: 'Pre-March 2022 production' },
  { id: uid(), bulletinId: bulletinData[5].id, modelId: modelData[6].id, serialRangeId: null, appliesToAllSerials: true, notes: null },
  { id: uid(), bulletinId: bulletinData[5].id, modelId: modelData[7].id, serialRangeId: null, appliesToAllSerials: true, notes: null },
];

// ── Manuals ────────────────────────────────────────────────
const manualsData = [
  { id: uid(), modelId: modelData[0].id, title: 'Infinity 16 AC Installation Manual', manualType: 'installation', sourceRef: 'CARRIER-INF16-INST' },
  { id: uid(), modelId: modelData[0].id, title: 'Infinity 16 AC Service Manual', manualType: 'service', sourceRef: 'CARRIER-INF16-SVC' },
  { id: uid(), modelId: modelData[2].id, title: 'Performance 96 Furnace Installation Manual', manualType: 'installation', sourceRef: 'CARRIER-P96-INST' },
  { id: uid(), modelId: modelData[3].id, title: 'XR16 AC Installation & Service Manual', manualType: 'service', sourceRef: 'TRANE-XR16-SVC' },
  { id: uid(), modelId: modelData[5].id, title: 'S9V2 Furnace Service Manual', manualType: 'service', sourceRef: 'TRANE-S9V2-SVC' },
  { id: uid(), modelId: modelData[6].id, title: 'XC16 AC Installation Guide', manualType: 'installation', sourceRef: 'LENNOX-XC16-INST' },
  { id: uid(), modelId: modelData[8].id, title: 'SL18XP Heat Pump Service Manual', manualType: 'service', sourceRef: 'LENNOX-SL18XP-SVC' },
];

const manualRevisionsData = [
  { id: uid(), manualId: manualsData[0].id, revisionCode: 'Rev A', publicationDate: '2019-01', isCurrent: false, changesSummary: 'Initial release' },
  { id: uid(), manualId: manualsData[0].id, revisionCode: 'Rev B', publicationDate: '2021-06', isCurrent: false, changesSummary: 'Updated wiring diagrams for R-410A charge tables' },
  { id: uid(), manualId: manualsData[0].id, revisionCode: 'Rev C', publicationDate: '2023-09', isCurrent: true, changesSummary: 'Added contactor inspection procedure per CB-2023-041. Updated superheat charts.' },
  { id: uid(), manualId: manualsData[1].id, revisionCode: 'Rev A', publicationDate: '2019-01', isCurrent: false, changesSummary: 'Initial release' },
  { id: uid(), manualId: manualsData[1].id, revisionCode: 'Rev B', publicationDate: '2023-10', isCurrent: true, changesSummary: 'Added contactor welding inspection per CB-2023-041. Revised capacitor part numbers.' },
  { id: uid(), manualId: manualsData[2].id, revisionCode: 'Rev A', publicationDate: '2020-03', isCurrent: true, changesSummary: 'Initial release' },
  { id: uid(), manualId: manualsData[3].id, revisionCode: 'Rev A', publicationDate: '2018-06', isCurrent: false, changesSummary: 'Initial release' },
  { id: uid(), manualId: manualsData[3].id, revisionCode: 'Rev B', publicationDate: '2024-03', isCurrent: true, changesSummary: 'Updated superheat/subcooling targets per TB-2024-022' },
  { id: uid(), manualId: manualsData[4].id, revisionCode: 'Rev A', publicationDate: '2019-09', isCurrent: true, changesSummary: 'Initial release' },
  { id: uid(), manualId: manualsData[5].id, revisionCode: 'Rev A', publicationDate: '2020-01', isCurrent: true, changesSummary: 'Initial release' },
  { id: uid(), manualId: manualsData[6].id, revisionCode: 'Rev A', publicationDate: '2021-04', isCurrent: false, changesSummary: 'Initial release' },
  { id: uid(), manualId: manualsData[6].id, revisionCode: 'Rev B', publicationDate: '2023-10', isCurrent: true, changesSummary: 'Updated defrost control procedures per LB-2023-076' },
];

// ── Suppliers ──────────────────────────────────────────────
const suppliersData = [
  { id: uid(), name: 'Ferguson?"HVAC', type: 'distributor', city: 'Dallas', state: 'TX', phone: '(214) 555-0101', lat: 32.7767, lng: -96.7970 },
  { id: uid(), name: 'Johnstone Supply - Metroplex', type: 'wholesaler', city: 'Fort Worth', state: 'TX', phone: '(817) 555-0202', lat: 32.7555, lng: -97.3308 },
  { id: uid(), name: 'Carrier Enterprise South', type: 'oem_direct', city: 'Houston', state: 'TX', phone: '(713) 555-0303', lat: 29.7604, lng: -95.3698 },
  { id: uid(), name: 'Trane Supply - DFW', type: 'oem_direct', city: 'Irving', state: 'TX', phone: '(972) 555-0404', lat: 32.8140, lng: -96.9489 },
  { id: uid(), name: 'RE Michel Company', type: 'distributor', city: 'Arlington', state: 'TX', phone: '(817) 555-0505', lat: 32.7357, lng: -97.1081 },
];

// Fix the supplier name typo
suppliersData[0].name = 'Ferguson HVAC';

// ── Supplier Inventory ─────────────────────────────────────
const now = new Date().toISOString();
const supplierInventoryData = [
  // Ferguson has Carrier parts
  { id: uid(), supplierId: suppliersData[0].id, partId: partsData[2].id, stockQuantity: 12, priceCents: 2495, leadTimeDays: 0, lastCheckedAt: now },
  { id: uid(), supplierId: suppliersData[0].id, partId: partsData[4].id, stockQuantity: 3, priceCents: 18900, leadTimeDays: 0, lastCheckedAt: now },
  { id: uid(), supplierId: suppliersData[0].id, partId: partsData[5].id, stockQuantity: 8, priceCents: 4250, leadTimeDays: 0, lastCheckedAt: now },
  { id: uid(), supplierId: suppliersData[0].id, partId: partsData[9].id, stockQuantity: 5, priceCents: 2750, leadTimeDays: 0, lastCheckedAt: now },
  // Johnstone has broad inventory
  { id: uid(), supplierId: suppliersData[1].id, partId: partsData[2].id, stockQuantity: 20, priceCents: 2350, leadTimeDays: 0, lastCheckedAt: now },
  { id: uid(), supplierId: suppliersData[1].id, partId: partsData[9].id, stockQuantity: 15, priceCents: 2600, leadTimeDays: 0, lastCheckedAt: now },
  { id: uid(), supplierId: suppliersData[1].id, partId: partsData[15].id, stockQuantity: 10, priceCents: 2800, leadTimeDays: 0, lastCheckedAt: now },
  { id: uid(), supplierId: suppliersData[1].id, partId: partsData[10].id, stockQuantity: 4, priceCents: 17500, leadTimeDays: 0, lastCheckedAt: now },
  { id: uid(), supplierId: suppliersData[1].id, partId: partsData[16].id, stockQuantity: 6, priceCents: 16800, leadTimeDays: 0, lastCheckedAt: now },
  // Carrier Enterprise - OEM parts
  { id: uid(), supplierId: suppliersData[2].id, partId: partsData[2].id, stockQuantity: 50, priceCents: 2895, leadTimeDays: 1, lastCheckedAt: now },
  { id: uid(), supplierId: suppliersData[2].id, partId: partsData[4].id, stockQuantity: 15, priceCents: 21500, leadTimeDays: 1, lastCheckedAt: now },
  { id: uid(), supplierId: suppliersData[2].id, partId: partsData[5].id, stockQuantity: 25, priceCents: 4800, leadTimeDays: 1, lastCheckedAt: now },
  { id: uid(), supplierId: suppliersData[2].id, partId: partsData[6].id, stockQuantity: 10, priceCents: 1250, leadTimeDays: 1, lastCheckedAt: now },
  { id: uid(), supplierId: suppliersData[2].id, partId: partsData[7].id, stockQuantity: 8, priceCents: 28500, leadTimeDays: 1, lastCheckedAt: now },
  // Trane Supply
  { id: uid(), supplierId: suppliersData[3].id, partId: partsData[9].id, stockQuantity: 30, priceCents: 3100, leadTimeDays: 0, lastCheckedAt: now },
  { id: uid(), supplierId: suppliersData[3].id, partId: partsData[10].id, stockQuantity: 10, priceCents: 19200, leadTimeDays: 0, lastCheckedAt: now },
  { id: uid(), supplierId: suppliersData[3].id, partId: partsData[11].id, stockQuantity: 20, priceCents: 4500, leadTimeDays: 0, lastCheckedAt: now },
  { id: uid(), supplierId: suppliersData[3].id, partId: partsData[12].id, stockQuantity: 12, priceCents: 1450, leadTimeDays: 0, lastCheckedAt: now },
  { id: uid(), supplierId: suppliersData[3].id, partId: partsData[13].id, stockQuantity: 5, priceCents: 32000, leadTimeDays: 2, lastCheckedAt: now },
  // RE Michel - aftermarket
  { id: uid(), supplierId: suppliersData[4].id, partId: partsData[2].id, stockQuantity: 0, priceCents: 2200, leadTimeDays: 3, lastCheckedAt: now },
  { id: uid(), supplierId: suppliersData[4].id, partId: partsData[15].id, stockQuantity: 8, priceCents: 2500, leadTimeDays: 0, lastCheckedAt: now },
  { id: uid(), supplierId: suppliersData[4].id, partId: partsData[16].id, stockQuantity: 3, priceCents: 15500, leadTimeDays: 0, lastCheckedAt: now },
  { id: uid(), supplierId: suppliersData[4].id, partId: partsData[17].id, stockQuantity: 12, priceCents: 3800, leadTimeDays: 0, lastCheckedAt: now },
];

// ── Sample Service Reports ─────────────────────────────────
const reportsData = [
  {
    id: uid(),
    technicianName: 'Mike Rodriguez',
    modelId: modelData[0].id,
    serialNumber: '2119E12345',
    status: 'submitted',
    arrivalCondition: JSON.stringify({ systemOperating: false, errorCodes: [], ambientTempF: 98, supplyTempF: 85, returnTempF: 78, notes: 'Unit not cooling. Compressor humming but not starting.' }),
    diagnosis: JSON.stringify({ rootCause: 'capacitor_failure', contributingFactors: ['age', 'high_ambient'], applicableBulletins: ['CB-2024-012'] }),
    workPerformed: JSON.stringify([{ action: 'replaced', partNumber: 'P461-3508', description: 'Dual Run Capacitor 45/5 MFD 440V', position: 'C1', notes: 'Old capacitor P461-3503 bulging on top. Replaced with current supersession P461-3508.' }]),
    measurementsPost: JSON.stringify({ supplyTempF: 58, returnTempF: 76, deltaT: 18, suctionPsi: 68, dischargePsi: 235, superheatF: 10, subcoolingF: 12 }),
    technicianNotes: 'Inspected contactor per CB-2023-041 - no pitting observed. Customer advised on annual maintenance.',
    createdAt: '2024-07-15T14:30:00Z',
    submittedAt: '2024-07-15T16:45:00Z',
  },
  {
    id: uid(),
    technicianName: 'Sarah Chen',
    modelId: modelData[8].id,
    serialNumber: '5921B05678',
    status: 'submitted',
    arrivalCondition: JSON.stringify({ systemOperating: true, errorCodes: [], ambientTempF: 42, notes: 'Customer reports unit running defrost cycle every 30 minutes. Excessive ice buildup on outdoor coil.' }),
    diagnosis: JSON.stringify({ rootCause: 'defrost_board_timing', contributingFactors: ['firmware_bug'], applicableBulletins: ['LB-2023-076'] }),
    workPerformed: JSON.stringify([{ action: 'replaced', partNumber: '83M00', description: 'SureLight Ignition Control Board - Rev C', position: 'CB1', notes: 'Replaced defrost control board per LB-2023-076. Warranty replacement authorized.' }]),
    measurementsPost: JSON.stringify({ supplyTempF: 92, returnTempF: 70, deltaT: 22, suctionPsi: 118, dischargePsi: 280 }),
    technicianNotes: 'Defrost board replaced under warranty per LB-2023-076. Monitored two defrost cycles - normal timing restored. 35-min intervals at 42F ambient.',
    createdAt: '2024-02-20T09:15:00Z',
    submittedAt: '2024-02-20T11:30:00Z',
  },
];

// ── Analytics Events ───────────────────────────────────────
const analyticsData = [
  { id: uid(), eventType: 'first_call_resolution', metadata: JSON.stringify({ jobId: 'J-2024-1501', modelNumber: '24ANB636A003' }), createdAt: '2024-07-15T16:45:00Z' },
  { id: uid(), eventType: 'first_call_resolution', metadata: JSON.stringify({ jobId: 'J-2024-0892', modelNumber: 'SL18XP1-036-230' }), createdAt: '2024-02-20T11:30:00Z' },
  { id: uid(), eventType: 'job_completed', metadata: JSON.stringify({ jobId: 'J-2024-1501', timeSavedMinutes: 25 }), createdAt: '2024-07-15T16:45:00Z' },
  { id: uid(), eventType: 'job_completed', metadata: JSON.stringify({ jobId: 'J-2024-0892', timeSavedMinutes: 40 }), createdAt: '2024-02-20T11:30:00Z' },
  { id: uid(), eventType: 'warranty_claim_submitted', metadata: JSON.stringify({ jobId: 'J-2024-0892', bulletinRef: 'LB-2023-076' }), createdAt: '2024-02-21T09:00:00Z' },
];

// ── Service Sessions ─────────────────────────────────────
const sessionsData = [
  {
    id: uid(),
    technicianName: 'Mike Rodriguez',
    status: 'active',
    equipmentModelId: modelData[0].id,
    serialNumber: '2119E12345',
    siteAddress: '4521 Oak Lane, Dallas, TX',
    customerName: 'Johnson Residence',
    reportId: null,
    createdAt: '2024-07-15T14:00:00Z',
    completedAt: null,
  },
  {
    id: uid(),
    technicianName: 'Sarah Chen',
    status: 'completed',
    equipmentModelId: modelData[8].id,
    serialNumber: '5921B05678',
    siteAddress: '782 Elm St, Plano, TX',
    customerName: 'Davis Family',
    reportId: reportsData[1].id,
    createdAt: '2024-02-20T09:00:00Z',
    completedAt: '2024-02-20T11:30:00Z',
  },
];

const sessionMessagesData = [
  // Mike Rodriguez active session
  {
    id: uid(),
    sessionId: sessionsData[0].id,
    role: 'system',
    messageType: 'text',
    content: 'Session started. What equipment are you working on?',
    metadata: null,
    createdAt: '2024-07-15T14:00:00Z',
  },
  {
    id: uid(),
    sessionId: sessionsData[0].id,
    role: 'user',
    messageType: 'text',
    content: 'Carrier 24ANB636A003 serial 2119E12345',
    metadata: null,
    createdAt: '2024-07-15T14:01:00Z',
  },
  {
    id: uid(),
    sessionId: sessionsData[0].id,
    role: 'system',
    messageType: 'equipment_identified',
    content: 'Equipment identified: Carrier Infinity 16 Central AC - 3 Ton (24ANB636A003)',
    metadata: JSON.stringify({
      modelNumber: '24ANB636A003',
      description: 'Infinity 16 Central AC - 3 Ton',
      manufacturer: 'Carrier',
      productLine: 'Infinity Series',
      refrigerantType: 'R-410A',
      voltage: '208/230V',
      btuRating: 36000,
      seerRating: 16.0,
      serialNumber: '2119E12345',
      productionYear: '2019',
      applicableBulletins: ['CB-2023-041', 'CB-2024-012'],
    }),
    createdAt: '2024-07-15T14:01:05Z',
  },
  {
    id: uid(),
    sessionId: sessionsData[0].id,
    role: 'system',
    messageType: 'bulletin_alert',
    content: '\u26a0\ufe0f Safety Bulletin CB-2023-041 applies to this unit. Contactor Welding Issue - Infinity 16 Series. Certain contactors may weld closed under high ambient conditions. Inspect and replace contactor HN67KC075 if showing signs of pitting.',
    metadata: JSON.stringify({
      bulletinNumber: 'CB-2023-041',
      title: 'Contactor Welding Issue - Infinity 16 Series',
      severity: 'safety_critical',
      publicationDate: '2023-08-15',
      affectedSerialRange: '2119E00001-2119E50000',
      action: 'Inspect and replace contactor HN67KC075 if showing signs of pitting. Safety shutdown may not engage.',
    }),
    createdAt: '2024-07-15T14:01:10Z',
  },
  {
    id: uid(),
    sessionId: sessionsData[0].id,
    role: 'user',
    messageType: 'text',
    content: "What's the current capacitor part number?",
    metadata: null,
    createdAt: '2024-07-15T14:05:00Z',
  },
  {
    id: uid(),
    sessionId: sessionsData[0].id,
    role: 'system',
    messageType: 'parts_info',
    content: 'Current capacitor: P461-3508 - Dual Run Capacitor 45/5 MFD 440V. This part supersedes P461-3504, which superseded P461-3503.',
    metadata: JSON.stringify({
      currentPart: {
        partNumber: 'P461-3508',
        description: 'Dual Run Capacitor 45/5 MFD 440V (Current)',
        category: 'capacitor',
        status: 'active',
      },
      supersessionChain: [
        { partNumber: 'P461-3503', status: 'superseded', supersededDate: '2021-03', notes: 'Direct replacement. Same form factor.' },
        { partNumber: 'P461-3504', status: 'superseded', supersededDate: '2023-06', notes: 'Updated terminal configuration. Verify wiring diagram.' },
        { partNumber: 'P461-3508', status: 'active', supersededDate: null, notes: null },
      ],
      positionCode: 'C1',
    }),
    createdAt: '2024-07-15T14:05:05Z',
  },
  {
    id: uid(),
    sessionId: sessionsData[0].id,
    role: 'user',
    messageType: 'text',
    content: "Unit not cooling, compressor humming but won't start",
    metadata: null,
    createdAt: '2024-07-15T14:10:00Z',
  },
  {
    id: uid(),
    sessionId: sessionsData[0].id,
    role: 'system',
    messageType: 'suggestion',
    content: 'Based on symptoms (compressor humming, not starting), consider checking the following components in order: 1) Run capacitor - check for bulging or leaking, test capacitance. 2) Contactor - check for pitting or welded contacts (see bulletin CB-2023-041). 3) Compressor - check winding resistance and meg-ohm readings if capacitor and contactor are good.',
    metadata: JSON.stringify({
      symptoms: ['compressor humming', 'not starting', 'no cooling'],
      suggestedChecks: [
        { component: 'capacitor', priority: 1, reason: 'Most common cause of humming compressor. Check for bulging, leaking, or low capacitance.', partNumber: 'P461-3508' },
        { component: 'contactor', priority: 2, reason: 'Bulletin CB-2023-041 - check for pitting or welded contacts.', partNumber: 'HN67KC075' },
        { component: 'compressor', priority: 3, reason: 'If capacitor and contactor are good, check winding resistance and insulation resistance.', partNumber: null },
      ],
    }),
    createdAt: '2024-07-15T14:10:05Z',
  },
  {
    id: uid(),
    sessionId: sessionsData[0].id,
    role: 'user',
    messageType: 'measurement',
    content: 'Capacitor is bulging, replacing it',
    metadata: null,
    createdAt: '2024-07-15T14:20:00Z',
  },
  {
    id: uid(),
    sessionId: sessionsData[0].id,
    role: 'system',
    messageType: 'report_generated',
    content: 'Noted. Updated service report draft with capacitor replacement. Old part P461-3503 (bulging) replaced with P461-3508. Diagnosis: capacitor failure due to age and high ambient temperature.',
    metadata: null,
    createdAt: '2024-07-15T14:20:05Z',
  },
  // Sarah Chen completed session
  {
    id: uid(),
    sessionId: sessionsData[1].id,
    role: 'system',
    messageType: 'text',
    content: 'Session started. What equipment are you working on?',
    metadata: null,
    createdAt: '2024-02-20T09:00:00Z',
  },
  {
    id: uid(),
    sessionId: sessionsData[1].id,
    role: 'user',
    messageType: 'text',
    content: 'Lennox SL18XP1-036-230 serial 5921B05678',
    metadata: null,
    createdAt: '2024-02-20T09:01:00Z',
  },
  {
    id: uid(),
    sessionId: sessionsData[1].id,
    role: 'system',
    messageType: 'equipment_identified',
    content: 'Equipment identified: Lennox SL18XP Heat Pump - 3 Ton (SL18XP1-036-230)',
    metadata: JSON.stringify({
      modelNumber: 'SL18XP1-036-230',
      description: 'SL18XP Heat Pump - 3 Ton',
      manufacturer: 'Lennox',
      productLine: 'SL Series',
      refrigerantType: 'R-410A',
      voltage: '208/230V',
      btuRating: 36000,
      seerRating: 18.0,
      serialNumber: '5921B05678',
      productionYear: '2021',
      applicableBulletins: ['LB-2023-076'],
    }),
    createdAt: '2024-02-20T09:01:05Z',
  },
];

// ── Seed Execution ─────────────────────────────────────────
async function seed() {
  console.log('Seeding database...');

  // Clear existing data (order matters for FK constraints)
  const tables = ['session_messages', 'sessions', 'analytics_events', 'service_reports', 'supplier_inventory', 'suppliers', 'bulletin_applicability', 'bulletins', 'manual_revisions', 'manuals', 'model_parts', 'part_supersessions', 'parts', 'serial_ranges', 'models', 'product_lines', 'manufacturers'];
  for (const table of tables) {
    await client.execute(`DELETE FROM ${table}`);
  }

  await db.insert(schema.manufacturers).values([carrier, trane, lennox]);
  console.log('  ✓ Manufacturers');

  await db.insert(schema.productLines).values([carrierInfinity, carrierPerformance, traneXR, traneS9, lennoxXC, lennoxSL]);
  console.log('  ✓ Product Lines');

  await db.insert(schema.models).values(modelData);
  console.log('  ✓ Models');

  await db.insert(schema.serialRanges).values(serialRangeData);
  console.log('  ✓ Serial Ranges');

  await db.insert(schema.parts).values(partsData);
  console.log('  ✓ Parts');

  await db.insert(schema.partSupersessions).values(supersessionData);
  console.log('  ✓ Part Supersessions');

  await db.insert(schema.modelParts).values(modelPartsData);
  console.log('  ✓ Model-Part Relationships');

  await db.insert(schema.bulletins).values(bulletinData);
  console.log('  ✓ Bulletins');

  await db.insert(schema.bulletinApplicability).values(bulletinApplicabilityData);
  console.log('  ✓ Bulletin Applicability');

  await db.insert(schema.manuals).values(manualsData);
  console.log('  ✓ Manuals');

  await db.insert(schema.manualRevisions).values(manualRevisionsData);
  console.log('  ✓ Manual Revisions');

  await db.insert(schema.suppliers).values(suppliersData);
  console.log('  ✓ Suppliers');

  await db.insert(schema.supplierInventory).values(supplierInventoryData);
  console.log('  ✓ Supplier Inventory');

  await db.insert(schema.serviceReports).values(reportsData);
  console.log('  ✓ Service Reports');

  await db.insert(schema.analyticsEvents).values(analyticsData);
  console.log('  ✓ Analytics Events');

  await db.insert(schema.sessions).values(sessionsData);
  console.log('  ✓ Sessions');

  await db.insert(schema.sessionMessages).values(sessionMessagesData);
  console.log('  ✓ Session Messages');

  console.log('\nDone! Database seeded successfully.');
}

seed().catch(console.error);
