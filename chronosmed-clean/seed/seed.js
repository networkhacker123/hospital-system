require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Room = require('../models/Room');
const Alert = require('../models/Alert');
const Settings = require('../models/Settings');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chronosmed';

// ─── All hardcoded rooms from the original dashboard ─────────

const medCatalog = [
  { name: 'Lisinopril',        dose: '10 mg PO',          drugClass: 'ACE Inhibitor' },
  { name: 'Metoprolol',        dose: '25 mg PO',          drugClass: 'Beta Blocker' },
  { name: 'Furosemide',        dose: '40 mg IV',          drugClass: 'Loop Diuretic' },
  { name: 'Warfarin',          dose: '5 mg PO',           drugClass: 'Anticoagulant' },
  { name: 'Heparin',           dose: '5000 U SC',         drugClass: 'Anticoagulant' },
  { name: 'Amiodarone',        dose: '200 mg IV',         drugClass: 'Antiarrhythmic' },
  { name: 'Aspirin',           dose: '81 mg PO',          drugClass: 'Antiplatelet' },
  { name: 'Atorvastatin',      dose: '40 mg PO',          drugClass: 'Statin' },
  { name: 'Insulin Regular',   dose: '6 U SC',            drugClass: 'Hormone' },
  { name: 'Vancomycin',        dose: '1 g IV',            drugClass: 'Antibiotic' },
  { name: 'Piperacillin/Tazo', dose: '4.5 g IV',          drugClass: 'Antibiotic' },
  { name: 'Morphine',          dose: '4 mg IV',           drugClass: 'Opioid' },
  { name: 'Acetaminophen',     dose: '650 mg PO',         drugClass: 'Analgesic' },
  { name: 'Pantoprazole',      dose: '40 mg IV',          drugClass: 'PPI' },
  { name: 'Norepinephrine',    dose: '8 mcg/min',         drugClass: 'Vasopressor' },
  { name: 'Propofol',          dose: '30 mcg/kg/min',     drugClass: 'Sedative' },
  { name: 'Levothyroxine',     dose: '75 mcg PO',         drugClass: 'Hormone' },
  { name: 'Ondansetron',       dose: '4 mg IV',           drugClass: 'Antiemetic' },
];

const nurses = ['J. Carter', 'M. Reyes', 'T. Liu', 'S. Patel', 'K. Osei', 'D. Nguyen', 'A. Park', 'L. Brooks'];
const statuses = ['Administered', 'Pending', 'Hold', 'Scheduled', 'Scheduled'];

function randMeds(count = 3, critical = false) {
  const meds = [];
  for (let i = 0; i < count; i++) {
    const m = medCatalog[Math.floor(Math.random() * medCatalog.length)];
    const statusPool = critical ? ['Hold', 'Pending', 'Administered'] : statuses;
    meds.push({
      name: m.name,
      dose: m.dose,
      drugClass: m.drugClass,
      prescriber: 'Dr. Evelyn Reed',
      status: statusPool[Math.floor(Math.random() * statusPool.length)],
      scheduledTimes: ['08:00', '14:00', '20:00'].slice(0, 1 + Math.floor(Math.random() * 3)),
      administeredBy: nurses[Math.floor(Math.random() * nurses.length)],
      administeredAt: new Date()
    });
  }
  return meds;
}

function randLabs() {
  const labNames = ['CBC', 'BMP', 'Troponin', 'Lactate', 'Coagulation Panel', 'LFTs', 'Blood Culture', 'ABG', 'HbA1c', 'Lipid Panel'];
  const count = 1 + Math.floor(Math.random() * 3);
  const labs = [];
  for (let i = 0; i < count; i++) {
    labs.push({
      name: labNames[Math.floor(Math.random() * labNames.length)],
      ordered: `${8 + Math.floor(Math.random() * 8)}:${['00','15','30','45'][Math.floor(Math.random()*4)]}`,
      tat: `${30 + Math.floor(Math.random() * 90)} min`,
      stage: Math.floor(Math.random() * 5),
      status: ['ok', 'progress', 'delayed'][Math.floor(Math.random() * 3)],
      delay: Math.random() > 0.6 ? `+${10 + Math.floor(Math.random() * 30)} min` : null
    });
  }
  return labs;
}

function randTasks(critical = false) {
  const pool = [
    { title: 'Review medication reconciliation', subtitle: 'Check for interactions', priority: 'high' },
    { title: 'Follow-up on lab results', subtitle: 'Results pending', priority: 'high' },
    { title: 'Patient vitals check', subtitle: 'Q2H monitoring', priority: 'medium' },
    { title: 'Discharge planning', subtitle: 'Social work consult', priority: 'low' },
    { title: 'Pain assessment', subtitle: 'NRS scale', priority: 'medium' },
    { title: 'IV line check', subtitle: 'Inspect for infiltration', priority: critical ? 'high' : 'medium' },
    { title: 'Wound dressing change', subtitle: 'Sterile technique', priority: 'medium' },
    { title: 'Family update', subtitle: 'Call or in-person', priority: 'low' }
  ];
  const shuffled = pool.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 2 + Math.floor(Math.random() * 3));
}

// ─── Floor 1 — Emergency Triage ──────────────────────────────
const floor1Rooms = [
  { roomNumber:1,  patientName:'Ahmed R.',   age:34, diag:'Chest Pain',           status:'critical', mrn:'MRN-0101' },
  { roomNumber:2,  patientName:'Priya S.',   age:28, diag:'Anaphylaxis',          status:'critical', mrn:'MRN-0102' },
  { roomNumber:3,  patientName:'Tom W.',     age:51, diag:'Fracture — R. Arm',    status:'amber',    mrn:'MRN-0103' },
  { roomNumber:4,  patientName:'Nina K.',    age:42, diag:'Laceration',           status:'ok',       mrn:'MRN-0104' },
  { roomNumber:5,  patientName:'George B.',  age:67, diag:'Stroke Suspect',       status:'critical', mrn:'MRN-0105', alert:'CT Pending', alertType:'red' },
  { roomNumber:6,  patientName:'Sarah L.',   age:22, diag:'Appendicitis',         status:'amber',    mrn:'MRN-0106' },
  { roomNumber:7,  patientName:'Raj P.',     age:55, diag:'MI Suspect',           status:'critical', mrn:'MRN-0107', alert:'Troponin Rising', alertType:'red' },
  { roomNumber:8,  patientName:'Maria C.',   age:38, diag:'Overdose',             status:'critical', mrn:'MRN-0108' },
  { roomNumber:9,  patientName:'James H.',   age:74, diag:'Fall Injury',          status:'amber',    mrn:'MRN-0109' },
  { roomNumber:10, patientName:'Emily T.',   age:31, diag:'Obs — Migraine',       status:'ok',       mrn:'MRN-0110' },
  { roomNumber:11, patientName:'Carlos M.',  age:46, diag:'Asthma Attack',        status:'amber',    mrn:'MRN-0111' },
  { roomNumber:12, patientName:'Linda F.',   age:60, diag:'Hypertensive Crisis',  status:'critical', mrn:'MRN-0112', alert:'BP 210/130', alertType:'red', hvacTemp:25.3 },
  { roomNumber:13, patientName:'Derek O.',   age:29, diag:'Obs — Syncope',        status:'ok',       mrn:'MRN-0113' },
  { roomNumber:14, patientName:'Susan N.',   age:52, diag:'Allergic Reaction',    status:'ok',       mrn:'MRN-0114' },
  { roomNumber:15, patientName:'Brian Y.',   age:43, diag:'Chest Trauma',         status:'amber',    mrn:'MRN-0115' },
  { roomNumber:16, patientName:'Anna Z.',    age:35, diag:'DVT',                  status:'critical', mrn:'MRN-0116' },
  { roomNumber:17, patientName:'Kevin G.',   age:58, diag:'Sepsis — Early',       status:'critical', mrn:'MRN-0117', alert:'Lactate 3.2', alertType:'red' },
  { roomNumber:18, patientName:'Helen V.',   age:70, diag:'Obs — Dizziness',      status:'ok',       mrn:'MRN-0118' },
  { roomNumber:19, patientName:'Patrick D.', age:47, diag:'GI Bleed',             status:'amber',    mrn:'MRN-0119' },
  { roomNumber:20, patientName:'Rose I.',    age:39, diag:'Seizure',              status:'critical', mrn:'MRN-0120' },
];

// ─── Floor 2 — Emergency Trauma ──────────────────────────────
const floor2Rooms = [
  { roomNumber:21, patientName:'Oliver A.',  age:50, diag:'Post-Op Knee',          status:'ok',       mrn:'MRN-2101' },
  { roomNumber:22, patientName:'Clara B.',   age:63, diag:'Type 2 Diabetes Mgmt.', status:'amber',    mrn:'MRN-2202' },
  { roomNumber:23, patientName:'Frank C.',   age:55, diag:'Hypertension',          status:'ok',       mrn:'MRN-2303' },
  { roomNumber:24, patientName:'Grace D.',   age:78, diag:'Osteoporosis Obs.',      status:'amber',    mrn:'MRN-2404' },
  { roomNumber:25, patientName:'Henry E.',   age:40, diag:'Colitis',               status:'ok',       mrn:'MRN-2505' },
  { roomNumber:26, patientName:'Iris F.',    age:67, diag:'Pneumonia',             status:'critical', mrn:'MRN-2606', alert:'O2 Sat 88%', alertType:'red' },
  { roomNumber:27, patientName:'Jack G.',    age:34, diag:'Appendectomy Recovery', status:'ok',       mrn:'MRN-2707' },
  { roomNumber:28, patientName:'Kate H.',    age:72, diag:'CHF — Stable',          status:'amber',    mrn:'MRN-2808' },
  { roomNumber:29, patientName:'Liam I.',    age:45, diag:'Kidney Stones',         status:'ok',       mrn:'MRN-2909' },
  { roomNumber:30, patientName:'Mary J.',    age:59, diag:'Gallbladder Obs.',       status:'amber',    mrn:'MRN-3010' },
  { roomNumber:31, patientName:'Nora K.',    age:36, diag:'Appendicitis Obs.',      status:'ok',       mrn:'MRN-3111' },
  { roomNumber:32, patientName:'Owen L.',    age:80, diag:'COPD',                  status:'critical', mrn:'MRN-3212', alert:'PEF dropping', alertType:'red' },
  { roomNumber:33, patientName:'Paula M.',   age:48, diag:'Migraine Protocol',     status:'ok',       mrn:'MRN-3313' },
  { roomNumber:34, patientName:'Quinn N.',   age:65, diag:'Post-Op Hernia',        status:'ok',       mrn:'MRN-3414' },
  { roomNumber:35, patientName:'Rita O.',    age:52, diag:'Anemia',                status:'amber',    mrn:'MRN-3515' },
  { roomNumber:36, patientName:'Sam P.',     age:44, diag:'Cellulitis',            status:'ok',       mrn:'MRN-3616' },
  { roomNumber:37, patientName:'Tina Q.',    age:70, diag:'Fracture Obs.',          status:'amber',    mrn:'MRN-3717' },
  { roomNumber:38, patientName:'Uma R.',     age:33, diag:'Viral Infection',        status:'ok',       mrn:'MRN-3818' },
  { roomNumber:39, patientName:'Victor S.',  age:61, diag:'Post-Op Cataract',      status:'ok',       mrn:'MRN-3919' },
  { roomNumber:40, patientName:'Wendy T.',   age:54, diag:'Thyroid Obs.',           status:'amber',    mrn:'MRN-4020' },
];

// ─── Floor 3 — Medical ICU ────────────────────────────────────
const floor3Rooms = [
  { roomNumber:41, patientName:'James K.',    age:68, diag:'Post-CABG',         status:'ok',       mrn:'MRN-4102' },
  { roomNumber:42, patientName:'Patricia H.', age:74, diag:'AKI Recovery',      status:'critical', mrn:'MRN-4223', alert:'Forgotten Hold: Lisinopril', alertType:'red' },
  { roomNumber:43, patientName:'Robert F.',   age:55, diag:'Sepsis Protocol',   status:'ok',       mrn:'MRN-4301' },
  { roomNumber:44, patientName:'Linda M.',    age:81, diag:'CHF Exacerb.',      status:'amber',    mrn:'MRN-4411' },
  { roomNumber:45, patientName:'William T.',  age:62, diag:'DKA Mgmt.',         status:'ok',       mrn:'MRN-4518' },
  { roomNumber:46, patientName:'Barbara N.',  age:77, diag:'Resp. Failure',     status:'critical', mrn:'MRN-4602', alert:'Hold: Warfarin', alertType:'red' },
  { roomNumber:47, patientName:'David O.',    age:58, diag:'Post-Op Hip',       status:'ok',       mrn:'MRN-4704' },
  { roomNumber:48, patientName:'Susan P.',    age:45, diag:'Neurology Obs.',    status:'amber',    mrn:'MRN-4801' },
  { roomNumber:49, patientName:'Richard Q.',  age:70, diag:'Pneumonia',         status:'ok',       mrn:'MRN-4912' },
  { roomNumber:50, patientName:'Jessica R.',  age:66, diag:'Arrhythmia',        status:'critical', mrn:'MRN-5003', alert:'Hold: Amiodarone', alertType:'red' },
  { roomNumber:51, patientName:'Thomas S.',   age:53, diag:'GI Bleed',          status:'ok',       mrn:'MRN-5110' },
  { roomNumber:52, patientName:'Karen T.',    age:79, diag:'CVA Rehab.',        status:'amber',    mrn:'MRN-5208' },
  { roomNumber:53, patientName:'Charles U.',  age:60, diag:'ARDS',              status:'ok',       mrn:'MRN-5311' },
  { roomNumber:54, patientName:'Lisa V.',     age:48, diag:'Pancreatitis',      status:'ok',       mrn:'MRN-5409' },
  { roomNumber:55, patientName:'Daniel W.',   age:72, diag:'Renal Failure',     status:'critical', mrn:'MRN-5502', alert:'Furosemide Due', alertType:'red' },
  { roomNumber:56, patientName:'Nancy X.',    age:85, diag:'Hip Fracture',      status:'ok',       mrn:'MRN-5617' },
  { roomNumber:57, patientName:'Mark Y.',     age:57, diag:'Liver Cirrhosis',   status:'amber',    mrn:'MRN-5703' },
  { roomNumber:58, patientName:'Betty Z.',    age:63, diag:'Endocarditis',      status:'ok',       mrn:'MRN-5801' },
  { roomNumber:59, patientName:'Paul A.',     age:44, diag:'Trauma Recovery',   status:'ok',       mrn:'MRN-5914' },
  { roomNumber:60, patientName:'Dorothy B.',  age:76, diag:'Pulm. Embolism',    status:'amber',    mrn:'MRN-6005' },
];

// Floors 4–7 — procedurally generated
const floorMeta = {
  4: { ward:'icu',      prefix:'Surgical ICU',   diags:['Post-Op CABG','Trauma — Splenic','Post-Op Craniotomy','Burn — 2nd°','Vent Wean','Post-Op Whipple','Tracheostomy','Spinal Stab.'] },
  5: { ward:'icu',      prefix:'Cardiac ICU',    diags:['STEMI','NSTEMI','CHF Decomp.','Arrhythmia','Post-PCI','Aortic Dissect.','Endocarditis','Cardiogenic Shock'] },
  6: { ward:'general',  prefix:'Internal Med',   diags:['Pneumonia','UTI','Cellulitis','Anemia','Diabetes Mgmt.','Hypertension','GERD','Hypothyroid'] },
  7: { ward:'general',  prefix:'Cardiology',     diags:['Stable Angina','A-Fib','Post-Stent','HTN Mgmt.','Pericarditis','Mitral Reg.','Syncope w/u','Hyperlipidemia'] },
};

const firstNames = ['Alex','Jordan','Sam','Riley','Casey','Morgan','Taylor','Jamie','Drew','Skyler','Avery','Cameron','Quinn','Reese','Hayden','Logan','Parker','Rowan','Sage','Blake'];
const lastInits = ['A.','B.','C.','D.','E.','F.','G.','H.','I.','J.','K.','L.','M.','N.','O.','P.','Q.','R.','S.','T.'];

function genFloorRooms(f) {
  const meta = floorMeta[f];
  const startNum = (f-1)*20 + 1;
  const rooms = [];
  for (let i = 0; i < 20; i++) {
    const num = startNum + i;
    const r = (num * 7) % 100 / 100;
    const status = f >= 6 ? (r < 0.85 ? 'ok' : 'amber') : (r < 0.15 ? 'critical' : r < 0.45 ? 'amber' : 'ok');
    rooms.push({
      roomNumber: num,
      patientName: firstNames[(num*7) % firstNames.length] + ' ' + lastInits[(num*3) % lastInits.length],
      age: 22 + ((num*13) % 65),
      diag: meta.diags[i % meta.diags.length],
      status,
      mrn: 'MRN-' + String(f).padStart(2,'0') + String(num).padStart(4,'0'),
    });
  }
  return rooms;
}

function wardForFloor(f) {
  if (f <= 2) return 'emergency';
  if (f <= 5) return 'icu';
  return 'general';
}

async function seed() {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  console.log('✅ Connected to MongoDB');

  // Clear existing data
  const counts = await Promise.all([Room.countDocuments(), Alert.countDocuments(), Settings.countDocuments()]);
  if (counts.some(Boolean) && !process.argv.includes('--reset-demo-data')) {
    throw new Error('Database contains data. Seed aborted. Use --reset-demo-data only if you intend to replace it.');
  }
  if (process.argv.includes('--reset-demo-data')) {
    await Room.deleteMany({});
    await Alert.deleteMany({});
    await Settings.deleteMany({});
  }
  console.log('🗑  Cleared existing data');

  // Build all room records
  const allRoomData = [
    ...floor1Rooms.map(r => ({ ...r, floor: 1, ward: 'emergency' })),
    ...floor2Rooms.map(r => ({ ...r, floor: 2, ward: 'emergency' })),
    ...floor3Rooms.map(r => ({ ...r, floor: 3, ward: 'icu' })),
    ...genFloorRooms(4).map(r => ({ ...r, floor: 4, ward: 'icu' })),
    ...genFloorRooms(5).map(r => ({ ...r, floor: 5, ward: 'icu' })),
    ...genFloorRooms(6).map(r => ({ ...r, floor: 6, ward: 'general' })),
    ...genFloorRooms(7).map(r => ({ ...r, floor: 7, ward: 'general' })),
  ];

  const roomDocs = allRoomData.map(r => ({
    roomNumber: r.roomNumber,
    floor: r.floor,
    ward: r.ward,
    patientName: r.patientName,
    age: r.age,
    mrn: r.mrn,
    diagnosis: r.diag,
    status: r.status,
    alert: r.alert || null,
    alertType: r.alertType || null,
    hvacTemp: r.hvacTemp || (20 + Math.random() * 3),
    hvacHumidity: 45 + Math.floor(Math.random() * 20),
    lastCleaned: new Date(Date.now() - Math.random() * 4 * 60 * 60 * 1000),
    evsTech: nurses[Math.floor(Math.random() * nurses.length)],
    oxygenSupply: true,
    bedAlarm: Math.random() > 0.2,
    callLight: Math.random() > 0.7,
    medications: randMeds(2 + Math.floor(Math.random() * 3), r.status === 'critical'),
    labs: randLabs(),
    tasks: randTasks(r.status === 'critical'),
    isOccupied: true,
  }));

  await Room.insertMany(roomDocs);
  console.log(`🏥 Inserted ${roomDocs.length} rooms`);

  // Seed alerts
  const alertData = [
    { type:'discharge',  icon:'🏠', color:'#34C759', message:'Room 47 — David O. discharged. Bed cleared for EVS.',                severity:'info',     roomNumber:47, patientName:'David O.' },
    { type:'shift',      icon:'🔄', color:'#00D4FF', message:'Room 52 — Karen T. transferred to Rehab Wing, Floor 2.',            severity:'info',     roomNumber:52, patientName:'Karen T.' },
    { type:'critical',   icon:'🚨', color:'#FF3B30', message:'Room 42 — Patricia H. vitals deteriorating. Nurse alerted.',        severity:'critical', roomNumber:42, patientName:'Patricia H.' },
    { type:'admission',  icon:'🛏',  color:'#FF9500', message:'Room 15 — New admission: Brian Y., Chest Trauma.',                  severity:'warning',  roomNumber:15, patientName:'Brian Y.' },
    { type:'medication', icon:'💊', color:'#9B59B6', message:'Room 46 — Warfarin hold acknowledged by Dr. Reed.',                severity:'warning',  roomNumber:46, patientName:'Barbara N.' },
    { type:'critical',   icon:'🚨', color:'#FF3B30', message:'Room 50 — Amiodarone hold escalated to attending.',                severity:'critical', roomNumber:50, patientName:'Jessica R.' },
    { type:'medication', icon:'💊', color:'#9B59B6', message:'Room 55 — Furosemide administered. Next dose 20:00.',              severity:'warning',  roomNumber:55, patientName:'Daniel W.' },
    { type:'critical',   icon:'🚨', color:'#FF3B30', message:'Room 17 — Kevin G. lactate rising. Sepsis protocol active.',       severity:'critical', roomNumber:17, patientName:'Kevin G.' },
    { type:'admission',  icon:'🛏',  color:'#FF9500', message:'Room 32 — Owen L. COPD exacerbation. BiPAP initiated.',            severity:'warning',  roomNumber:32, patientName:'Owen L.' },
    { type:'medication', icon:'💊', color:'#9B59B6', message:'Room 44 — Linda M. diuretics adjusted. Fluid balance reviewed.',  severity:'info',     roomNumber:44, patientName:'Linda M.' },
  ];

  await Alert.insertMany(alertData);
  console.log(`🔔 Inserted ${alertData.length} alerts`);

  // Seed settings
  await Settings.create({
    key: 'global',
    hospitalName: 'ChronosMed Hospital',
    doctorName: 'Dr. Evelyn Reed',
    ward: 'ICU / Acute',
    alertsEnabled: true,
    autoRefresh: true,
    refreshIntervalSeconds: 12,
    soundAlerts: false,
    darkSidebar: true,
    emergencyEscalation: true,
    defaultFloor: 3,
    alertSeverityThreshold: 'amber',
    showVitals: true,
    shiftHandoffMode: false,
  });
  console.log('⚙️  Inserted settings');

  console.log('\n✅ Seed complete!');
  console.log('\n📋 Summary:');
  console.log(`   Rooms:    ${roomDocs.length} (7 floors)`);
  console.log(`   Alerts:   ${alertData.length}`);
  console.log(`   Settings: 1 global config`);
  mongoose.connection.close();
}

seed().catch(err => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
