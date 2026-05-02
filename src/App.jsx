import React, { useEffect, useMemo, useState } from "react";

const GRADES = ["Grade 3", "Grade 4", "Grade 5"];
const ENROLLERS = ["Mahesha Dilhani", "Prasad Sir", "Kasun", "Nimal", "Tharindu"];
const OWNER_WHATSAPP_NUMBER = "94752027980";
const DEFAULT_CLASS_FEE = "1000";
const DEFAULT_ENROLLER = "Mahesha Dilhani";
const STORAGE_KEY = "prasad-sir-paid-student-records-v2";
const NEWLINE = String.fromCharCode(10);

const initialStudents = [
  { id: 1, name: "Nethmi Perera", grade: "Grade 3", phone: "94771234567", month: "May 2026", amount: 1000, slip: "Uploaded", joined: "2026-05-03", enrolledBy: "Mahesha Dilhani", notes: "First month paid" },
  { id: 2, name: "Kavindu Silva", grade: "Grade 4", phone: "94775678901", month: "May 2026", amount: 1000, slip: "Uploaded", joined: "2026-05-03", enrolledBy: "Mahesha Dilhani", notes: "Slip checked" },
  { id: 3, name: "Tharushi Fernando", grade: "Grade 5", phone: "94772345678", month: "May 2026", amount: 1000, slip: "Uploaded", joined: "2026-05-03", enrolledBy: "Mahesha Dilhani", notes: "Slip checked" },
  { id: 4, name: "Dineth Jayawardana", grade: "Grade 3", phone: "94770111222", month: "May 2026", amount: 1000, slip: "Uploaded", joined: "2026-05-03", enrolledBy: "Mahesha Dilhani", notes: "Added from WhatsApp" },
  { id: 5, name: "Sahan Madusanka", grade: "Grade 5", phone: "94779876543", month: "May 2026", amount: 1000, slip: "Uploaded", joined: "2026-05-03", enrolledBy: "Mahesha Dilhani", notes: "New enrollment" },
  { id: 6, name: "Imasha Gamage", grade: "Grade 4", phone: "94771239876", month: "May 2026", amount: 1000, slip: "Uploaded", joined: "2026-05-02", enrolledBy: "Mahesha Dilhani", notes: "Previous day enrollment" },
];

function getTodayDate() { return new Date().toISOString().slice(0, 10); }
function canUseLocalStorage() { return typeof window !== "undefined" && typeof window.localStorage !== "undefined"; }
function isValidStudentRecord(student) {
  return student && typeof student.name === "string" && typeof student.phone === "string" && typeof student.grade === "string" && typeof student.joined === "string" && typeof student.enrolledBy === "string" && Number.isFinite(Number(student.amount));
}
function normalizeStudentRecord(student) {
  return { id: student.id || Date.now() + Math.random(), name: student.name || "Unknown Student", grade: GRADES.includes(student.grade) ? student.grade : "Grade 3", phone: student.phone || "", month: student.month || "May 2026", amount: Number(student.amount || DEFAULT_CLASS_FEE), slip: student.slip || "Uploaded", joined: student.joined || getTodayDate(), enrolledBy: student.enrolledBy || DEFAULT_ENROLLER, notes: student.notes || "Paid enrollment" };
}
function loadStudentsFromStorage() {
  if (!canUseLocalStorage()) return initialStudents;
  try {
    const savedValue = window.localStorage.getItem(STORAGE_KEY);
    if (!savedValue) return initialStudents;
    const parsedValue = JSON.parse(savedValue);
    if (!Array.isArray(parsedValue)) return initialStudents;
    const validStudents = parsedValue.filter(isValidStudentRecord).map(normalizeStudentRecord);
    return validStudents.length > 0 ? validStudents : initialStudents;
  } catch (error) { console.warn("Could not load student records from localStorage:", error); return initialStudents; }
}
function saveStudentsToStorage(students) {
  if (!canUseLocalStorage()) return false;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(students)); return true; } catch (error) { console.warn("Could not save student records to localStorage:", error); return false; }
}
function formatMoney(value) { return `Rs. ${Number(value || 0).toLocaleString()}`; }
function getCommissionRate(studentCount) { if (studentCount <= 0) return 0; return studentCount >= 5 ? 200 : 100; }
function calculateCommission(studentCount) { return studentCount * getCommissionRate(studentCount); }
function calculateCommissionSummary(students) {
  const grouped = new Map();
  students.forEach((student) => {
    const key = `${student.joined}|${student.enrolledBy}`;
    const current = grouped.get(key) || { date: student.joined, enrolledBy: student.enrolledBy, studentCount: 0 };
    grouped.set(key, { ...current, studentCount: current.studentCount + 1 });
  });
  return Array.from(grouped.values()).map((row) => ({ ...row, rate: getCommissionRate(row.studentCount), commission: calculateCommission(row.studentCount) })).sort((a, b) => b.date.localeCompare(a.date) || b.commission - a.commission);
}
function calculateStats(students) {
  const totalIncome = students.reduce((sum, student) => sum + Number(student.amount || 0), 0);
  const slipUploadedStudents = students.filter((student) => student.slip === "Uploaded");
  const gradeCounts = GRADES.map((grade) => ({ grade, count: students.filter((student) => student.grade === grade).length }));
  const commissionSummary = calculateCommissionSummary(students);
  const totalCommission = commissionSummary.reduce((sum, row) => sum + row.commission, 0);
  const netIncome = totalIncome - totalCommission;
  return { paidCount: students.length, slipUploadedCount: slipUploadedStudents.length, totalIncome, totalCommission, netIncome, gradeCounts, totalStudents: students.length };
}
function filterStudents(students, query, gradeFilter) {
  const cleanQuery = query.trim().toLowerCase();
  return students.filter((student) => {
    const notes = student.notes || "";
    const matchesSearch = cleanQuery.length === 0 || student.name.toLowerCase().includes(cleanQuery) || student.phone.includes(cleanQuery) || student.enrolledBy.toLowerCase().includes(cleanQuery) || notes.toLowerCase().includes(cleanQuery);
    const matchesGrade = gradeFilter === "All" || student.grade === gradeFilter;
    return matchesSearch && matchesGrade;
  });
}
function buildDailyMessage(students, dateLabel = getTodayDate()) {
  const stats = calculateStats(students);
  const grade3 = stats.gradeCounts.find((item) => item.grade === "Grade 3")?.count || 0;
  const grade4 = stats.gradeCounts.find((item) => item.grade === "Grade 4")?.count || 0;
  const grade5 = stats.gradeCounts.find((item) => item.grade === "Grade 5")?.count || 0;
  return ["Prasad Sir Class - Paid Enrollment Daily Report", "", `Date: ${dateLabel}`, `Grade 3: ${grade3} students`, `Grade 4: ${grade4} students`, `Grade 5: ${grade5} students`, "", `Total Paid Students: ${stats.totalStudents}`, `Slip Uploaded: ${stats.slipUploadedCount}`, `Class Fee Income: ${formatMoney(stats.totalIncome)}`, `Enrollment Pay: ${formatMoney(stats.totalCommission)}`, `Net Balance: ${formatMoney(stats.netIncome)}`].join(NEWLINE);
}
function escapeCsvValue(value) {
  const stringValue = String(value ?? "");
  if (stringValue.includes(",") || stringValue.includes(NEWLINE) || stringValue.includes('"')) return `"${stringValue.split('"').join('""')}"`;
  return stringValue;
}
function buildMonthlyCsvReport(students) {
  const stats = calculateStats(students);
  const commissionSummary = calculateCommissionSummary(students);
  const summaryRows = [["Report Type", "Prasad Sir Class - Paid Monthly Report"], ["Generated Date", getTodayDate()], ["Total Paid Students", stats.totalStudents], ["Slip Records", stats.slipUploadedCount], ["Class Fee Income", stats.totalIncome], ["Enrollment Pay", stats.totalCommission], ["Net Balance", stats.netIncome], [], ["Grade Summary"], ["Grade", "Paid Students"], ...stats.gradeCounts.map((row) => [row.grade, row.count]), [], ["Enrollment Person Earnings"], ["Date", "Enrolled By", "Paid Students", "Rate", "Earned"], ...commissionSummary.map((row) => [row.date, row.enrolledBy, row.studentCount, row.rate, row.commission]), [], ["Paid Student Records"], ["Student Name", "Grade", "Parent WhatsApp", "Month", "Class Fee", "Payment Date", "Enrolled By", "Slip", "Notes"], ...students.map((student) => [student.name, student.grade, student.phone, student.month, student.amount, student.joined, student.enrolledBy, student.slip, student.notes])];
  return summaryRows.map((row) => row.map(escapeCsvValue).join(",")).join(NEWLINE);
}
function downloadTextFile(filename, content, mimeType = "text/csv;charset=utf-8") {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  try { const blob = new Blob([content], { type: mimeType }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.style.display = "none"; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); return true; } catch (error) { console.warn("Could not download file:", error); return false; }
}
function openWhatsAppReport(message) {
  if (typeof window === "undefined") return false;
  try { const url = `https://wa.me/${OWNER_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`; window.open(url, "_blank", "noopener,noreferrer"); return true; } catch (error) { console.warn("Could not open WhatsApp:", error); return false; }
}
function IconBadge({ children, className = "" }) { return <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xl ${className}`} aria-hidden="true">{children}</span>; }
function Card({ children, className = "" }) { return <div className={`rounded-3xl border border-slate-100 bg-white shadow-sm ${className}`}>{children}</div>; }
function Button({ children, onClick, className = "", type = "button", disabled = false }) { return <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}>{children}</button>; }
function StatCard({ icon, label, value, note }) { return <Card className="rounded-2xl"><div className="p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-sm text-slate-500">{label}</p><h3 className="mt-1 text-2xl font-bold text-slate-900">{value}</h3><p className="mt-1 text-xs text-slate-400">{note}</p></div><IconBadge>{icon}</IconBadge></div></div></Card>; }
function FieldLabel({ children }) { return <label className="text-sm font-medium text-slate-600">{children}</label>; }

export default function App() {
  const [students, setStudents] = useState(() => loadStudentsFromStorage());
  const [query, setQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("All");
  const [notice, setNotice] = useState("");
  const [calculatorCount, setCalculatorCount] = useState("5");
  const [form, setForm] = useState({ name: "", phone: "", grade: "Grade 3", month: "May 2026", amount: DEFAULT_CLASS_FEE, joined: getTodayDate(), enrolledBy: DEFAULT_ENROLLER, notes: "" });
  const filtered = useMemo(() => filterStudents(students, query, gradeFilter), [students, query, gradeFilter]);
  const stats = useMemo(() => calculateStats(students), [students]);
  const commissionSummary = useMemo(() => calculateCommissionSummary(students), [students]);
  const dailyMessage = useMemo(() => buildDailyMessage(students), [students]);
  const calculatorNumber = Number(calculatorCount) || 0;
  const calculatorRate = getCommissionRate(calculatorNumber);
  const calculatorTotal = calculateCommission(calculatorNumber);
  useEffect(() => { saveStudentsToStorage(students); }, [students]);
  function updateForm(field, value) { setForm((current) => ({ ...current, [field]: value })); }
  function sendDailyReport() { const opened = openWhatsAppReport(dailyMessage); setNotice(opened ? "WhatsApp report එක open වුණා. Message එක check කරලා Send button එක ඔබන්න." : "WhatsApp open කරන්න බැරි වුණා. Browser popup permission check කරන්න."); }
  function downloadMonthlyReport() { const downloaded = downloadTextFile(`prasad-sir-paid-monthly-report-${getTodayDate()}.csv`, buildMonthlyCsvReport(students)); setNotice(downloaded ? "Monthly report CSV file එක download වුණා. ඒක Excel / Google Sheets වල open කරන්න පුළුවන්." : "Download කරන්න බැරි වුණා. Browser download permission check කරන්න."); }
  function resetSavedRecords() { const confirmed = window.confirm("Saved student records delete කරලා demo records වලට reset කරන්නද?"); if (!confirmed) return; setStudents(initialStudents); saveStudentsToStorage(initialStudents); setNotice("Saved records reset වුණා. දැන් demo records නැවත load වුණා."); }
  function addStudent() {
    const cleanName = form.name.trim(); const cleanPhone = form.phone.trim(); const amountNumber = Number(form.amount); const cleanEnrolledBy = form.enrolledBy.trim(); const cleanJoined = form.joined.trim(); const cleanNotes = form.notes.trim();
    if (!cleanName || !cleanPhone) { setNotice("Student name සහ WhatsApp number දෙකම දාන්න."); return; }
    if (!cleanEnrolledBy) { setNotice("Enroll කරපු කෙනාගේ නම දාන්න."); return; }
    if (!cleanJoined) { setNotice("Enrollment date එක දාන්න."); return; }
    if (!Number.isFinite(amountNumber) || amountNumber < 0) { setNotice("Class fee එක valid number එකක් වෙන්න ඕන."); return; }
    const newStudent = { id: Date.now(), name: cleanName, phone: cleanPhone, grade: form.grade, month: form.month.trim() || "May 2026", amount: amountNumber, slip: "Uploaded", joined: cleanJoined, enrolledBy: cleanEnrolledBy, notes: cleanNotes || "Paid enrollment" };
    setStudents((current) => [newStudent, ...current]);
    setForm({ name: "", phone: "", grade: "Grade 3", month: "May 2026", amount: DEFAULT_CLASS_FEE, joined: getTodayDate(), enrolledBy: cleanEnrolledBy, notes: "" });
    setNotice("Paid student record එක save වුණා. Mahesha Dilhaniගේ enrollment pay එක auto calculate වෙනවා.");
  }
  return <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 p-4 text-slate-900 md:p-8"><div className="mx-auto max-w-7xl"><header className="mb-6 overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-lg md:p-8"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-center"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-slate-200"><span aria-hidden="true">🎓</span><span>Paid Student Enrollment Manager</span></div><h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">Prasad Sir Class</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">Mahesha Dilhaniට හදන paid-only class enrollment app. Payment කරපු students විතරක් add කරන්න, Rs.1000 class fee track කරන්න, daily enrollment pay calculate කරන්න, WhatsApp report යවන්න.</p></div><div className="rounded-2xl bg-white/10 p-4 text-sm text-slate-200"><p className="font-semibold text-white">WhatsApp Report Number</p><p>075 202 7980</p><p className="mt-3 font-semibold text-white">Commission Rule</p><p>1–4 paid students: Rs.100 each</p><p className="mt-1">5+ paid students: Rs.200 each</p></div></div></header><section className="mb-6 grid gap-6 lg:grid-cols-3"><Card className="border-slate-300 ring-2 ring-slate-900/5 lg:col-span-2"><div className="p-6"><div className="mb-5 flex items-center gap-3"><IconBadge>➕</IconBadge><div><h2 className="text-xl font-bold">Add Paid Student</h2><p className="mt-1 text-sm text-slate-500">Payment කරපු students විතරක් මෙතන add කරනවා. Default class fee Rs.1000, enrolled by Mahesha Dilhani.</p></div></div><div className="grid gap-4 md:grid-cols-2"><div><FieldLabel>Student Name</FieldLabel><input className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-500" placeholder="Student name" value={form.name} onChange={(event) => updateForm("name", event.target.value)} /></div><div><FieldLabel>Parent WhatsApp Number</FieldLabel><input className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-500" placeholder="9477XXXXXXX" value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} /></div><div><FieldLabel>Grade</FieldLabel><select className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none" value={form.grade} onChange={(event) => updateForm("grade", event.target.value)}>{GRADES.map((grade) => <option key={grade}>{grade}</option>)}</select></div><div><FieldLabel>Month</FieldLabel><input className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none" value={form.month} onChange={(event) => updateForm("month", event.target.value)} /></div><div><FieldLabel>Class Fee</FieldLabel><input className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none" inputMode="numeric" value={form.amount} onChange={(event) => updateForm("amount", event.target.value)} /></div><div><FieldLabel>Payment / Enrollment Date</FieldLabel><input type="date" className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none" value={form.joined} onChange={(event) => updateForm("joined", event.target.value)} /></div><div className="md:col-span-2"><FieldLabel>Enrolled By</FieldLabel><input className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none" list="enroller-list" placeholder="Name" value={form.enrolledBy} onChange={(event) => updateForm("enrolledBy", event.target.value)} /><datalist id="enroller-list">{ENROLLERS.map((name) => <option key={name} value={name} />)}</datalist></div><div className="md:col-span-2"><FieldLabel>Notes</FieldLabel><textarea className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-500" placeholder="Example: slip checked, parent called, new paid student, etc." value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} /></div></div><div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center"><div className="text-3xl" aria-hidden="true">📤</div><p className="mt-2 text-sm font-medium">Payment Slip Upload</p><p className="mt-1 text-xs text-slate-500">Paid students විතරක් add කරන නිසා slip upload එක default Uploaded විදිහට track වෙනවා.</p></div>{notice && <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{notice}</p>}<div className="mt-4 grid gap-3 md:grid-cols-2"><Button onClick={addStudent} className="w-full bg-slate-950 text-white hover:bg-slate-800">Save Paid Student Record</Button><Button onClick={resetSavedRecords} className="w-full bg-slate-100 text-slate-800 hover:bg-slate-200">Reset Saved Records</Button></div><p className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-800">✅ localStorage save active: මේ phone/browser එකේ records refresh කළත් save වෙලා තියෙනවා.</p><div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4"><p className="mb-3 text-sm font-semibold text-slate-700">Quick Actions</p><div className="grid gap-3 md:grid-cols-2"><Button onClick={sendDailyReport} className="w-full bg-emerald-600 text-white hover:bg-emerald-700"><span className="mr-2" aria-hidden="true">💬</span>Send Daily Report</Button><Button onClick={downloadMonthlyReport} className="w-full bg-blue-700 text-white hover:bg-blue-800"><span className="mr-2" aria-hidden="true">⬇️</span>Download Monthly Report</Button></div><p className="mt-3 text-xs leading-5 text-slate-500">WhatsApp button එක message එක auto-fill කරලා open කරනවා. Send button එක WhatsApp තුළ manually ඔබන්න ඕන.</p></div></div></Card><Card><div className="p-6"><div className="mb-5 flex items-center gap-3"><IconBadge>🧮</IconBadge><div><h2 className="text-xl font-bold">Quick Pay Calculator</h2><p className="mt-1 text-sm text-slate-500">දවසට paid students count එක දාලා enrollment pay බලන්න.</p></div></div><FieldLabel>Today paid enrollments</FieldLabel><input className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-500" inputMode="numeric" value={calculatorCount} onChange={(event) => setCalculatorCount(event.target.value)} /><div className="mt-5 rounded-2xl bg-slate-950 p-5 text-white"><p className="text-sm text-slate-300">Rate</p><p className="mt-1 text-2xl font-bold">{formatMoney(calculatorRate)} each</p><p className="mt-4 text-sm text-slate-300">Total Pay</p><p className="mt-1 text-4xl font-extrabold">{formatMoney(calculatorTotal)}</p></div><div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800"><p className="font-semibold">Example</p><p>5 paid students = Rs.1,000</p><p>6 paid students = Rs.1,200</p><p>10 paid students = Rs.2,000</p></div></div></Card></section><section className="grid gap-4 md:grid-cols-5" aria-label="Class summary"><StatCard icon="👥" label="Paid Students" value={stats.totalStudents} note="Only paid records are saved" /><StatCard icon="📤" label="Slip Records" value={stats.slipUploadedCount} note="Uploaded / recorded slips" /><StatCard icon="💳" label="Class Fee Income" value={formatMoney(stats.totalIncome)} note="Paid records total" /><StatCard icon="🤝" label="Enrollment Pay" value={formatMoney(stats.totalCommission)} note="Mahesha / enroller pay" /><StatCard icon="📊" label="Net Balance" value={formatMoney(stats.netIncome)} note="Income minus enrollment pay" /></section><main className="mt-6 grid gap-6 lg:grid-cols-3"><section className="space-y-6 lg:col-span-2"><Card><div className="p-6"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><div className="flex items-center gap-3"><IconBadge>📅</IconBadge><h2 className="text-xl font-bold">Paid Monthly Summary</h2></div><p className="mt-2 text-sm text-slate-500">May 2026 paid students, income, and enrollment commission overview</p></div><div className="flex flex-col gap-2 sm:flex-row"><Button onClick={sendDailyReport} className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"><span className="mr-2" aria-hidden="true">💬</span>Send Daily Report</Button><Button onClick={downloadMonthlyReport} className="w-full bg-slate-950 text-white hover:bg-slate-800 sm:w-auto"><span className="mr-2" aria-hidden="true">⬇️</span>Download Monthly Report</Button></div></div><div className="mt-5 grid gap-3 md:grid-cols-3">{stats.gradeCounts.map((item) => <div key={item.grade} className="rounded-2xl bg-slate-100 p-4"><p className="text-sm text-slate-500">{item.grade}</p><p className="mt-1 text-2xl font-bold">{item.count}</p><p className="text-xs text-slate-400">paid students enrolled</p></div>)}</div><div className="mt-5 rounded-2xl bg-slate-950 p-4 text-sm text-slate-100"><p className="font-semibold">WhatsApp daily report preview</p><pre className="mt-3 whitespace-pre-wrap font-sans text-xs leading-5 text-slate-300">{dailyMessage}</pre></div></div></Card><Card><div className="p-6"><div className="mb-5 flex items-center gap-3"><IconBadge>🤝</IconBadge><div><h2 className="text-xl font-bold">Enrollment Person Earnings</h2><p className="mt-1 text-sm text-slate-500">Daily paid enrollment count අනුව auto commission calculation</p></div></div><div className="overflow-hidden rounded-2xl border border-slate-100"><div className="hidden grid-cols-5 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600 md:grid"><span>Date</span><span>Enrolled By</span><span>Paid Students</span><span>Rate</span><span>Earned</span></div>{commissionSummary.map((row) => <div key={`${row.date}-${row.enrolledBy}`} className="grid gap-2 border-t border-slate-100 px-4 py-4 text-sm md:grid-cols-5 md:items-center"><span className="font-semibold text-slate-900">{row.date}</span><span>{row.enrolledBy}</span><span>{row.studentCount}</span><span>{formatMoney(row.rate)} each</span><span className="font-bold text-emerald-700">{formatMoney(row.commission)}</span></div>)}</div></div></Card></section><section className="space-y-6"><Card><div className="p-6"><div className="mb-5 flex items-center gap-3"><IconBadge>✅</IconBadge><div><h2 className="text-xl font-bold">Paid-only System</h2><p className="mt-1 text-sm text-slate-500">මේ app එකේ unpaid records save නොකරන logic එක.</p></div></div><div className="space-y-3 text-sm text-slate-700"><p className="rounded-2xl bg-slate-50 p-3">✅ Student add කරන්නේ payment කළාට පස්සේ විතරයි</p><p className="rounded-2xl bg-slate-50 p-3">💳 Every saved record = paid income</p><p className="rounded-2xl bg-slate-50 p-3">📤 Slip record auto marked as uploaded/recorded</p><p className="rounded-2xl bg-slate-50 p-3">🤝 Commission calculate වෙන්නේ paid enrollments වලින් විතරයි</p></div></div></Card><Card><div className="p-6"><div className="mb-5 flex items-center gap-3"><IconBadge>🚀</IconBadge><div><h2 className="text-xl font-bold">Expert Additions</h2><p className="mt-1 text-sm text-slate-500">Future version එකේ add කරන්න හොඳ දේවල්.</p></div></div><div className="space-y-3 text-sm text-slate-700"><p className="rounded-2xl bg-slate-50 p-3">🔐 Admin PIN login</p><p className="rounded-2xl bg-slate-50 p-3">📷 Real slip photo upload</p><p className="rounded-2xl bg-slate-50 p-3">📤 Monthly CSV export active</p><p className="rounded-2xl bg-slate-50 p-3">💾 localStorage auto-save active</p><p className="rounded-2xl bg-slate-50 p-3">☁️ Firebase backup for multi-device sync</p><p className="rounded-2xl bg-slate-50 p-3">🔎 Duplicate student/phone warning</p></div></div></Card></section></main><Card className="mt-6"><div className="p-6"><div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center"><div className="flex items-center gap-3"><IconBadge>🧾</IconBadge><h2 className="text-xl font-bold">Paid Student Records</h2></div><div className="flex flex-col gap-3 md:flex-row"><div className="relative"><span className="absolute left-3 top-2.5 text-slate-400" aria-hidden="true">🔎</span><input className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 outline-none focus:border-slate-500 md:w-72" placeholder="Search name, phone, enroller, note" value={query} onChange={(event) => setQuery(event.target.value)} /></div><select className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none" value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value)}><option>All</option>{GRADES.map((grade) => <option key={grade}>{grade}</option>)}</select></div></div><div className="overflow-hidden rounded-2xl border border-slate-100"><div className="hidden grid-cols-7 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600 md:grid"><span>Name</span><span>Grade</span><span>Phone</span><span>Fee</span><span>Date</span><span>Enrolled By</span><span>Note</span></div>{filtered.length === 0 ? <div className="px-4 py-8 text-center text-sm text-slate-500">No paid student records found.</div> : filtered.map((student) => <div key={student.id} className="grid gap-2 border-t border-slate-100 px-4 py-4 text-sm md:grid-cols-7 md:items-center"><span className="font-semibold text-slate-900">{student.name}</span><span>{student.grade}</span><span className="text-slate-500">{student.phone}</span><span>{formatMoney(student.amount)}</span><span className="text-slate-500">{student.joined}</span><span className="font-medium">{student.enrolledBy}</span><span className="text-slate-500">{student.notes}</span></div>)}</div></div></Card></div></div>;
}
