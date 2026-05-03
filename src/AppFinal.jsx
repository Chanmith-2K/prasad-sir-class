import React, { useEffect, useMemo, useState } from "react";

const GRADES = ["Grade 3", "Grade 4", "Grade 5"];
const ENROLLERS = ["Mahesha Dilhani", "Prasad Sir", "Kasun", "Nimal", "Tharindu"];
const OWNER_WHATSAPP_NUMBER = "94752027980";
const DEFAULT_CLASS_FEE = 1000;
const DEFAULT_ENROLLER = "Mahesha Dilhani";
const STORAGE_KEY = "prasad-sir-paid-student-records-v9";
const NEWLINE = String.fromCharCode(10);

const initialStudents = [];

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString()}`;
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeStudent(student) {
  return {
    id: student.id || Date.now() + Math.random(),
    name: String(student.name || "Unknown Student"),
    grade: GRADES.includes(student.grade) ? student.grade : "Grade 3",
    month: String(student.month || "May 2026"),
    amount: Number(student.amount || DEFAULT_CLASS_FEE),
    joined: String(student.joined || getTodayDate()),
    enrolledBy: String(student.enrolledBy || DEFAULT_ENROLLER),
    notes: String(student.notes || "Paid enrollment"),
    slipImage: String(student.slipImage || ""),
  };
}

function isValidStudent(student) {
  return Boolean(
    student &&
      typeof student.name === "string" &&
      typeof student.grade === "string" &&
      Number.isFinite(Number(student.amount)) &&
      typeof student.joined === "string" &&
      typeof student.enrolledBy === "string"
  );
}

function loadStudents() {
  if (!canUseLocalStorage()) return initialStudents;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialStudents;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return initialStudents;
    const valid = parsed.filter(isValidStudent).map(normalizeStudent);
    return valid.length ? valid : initialStudents;
  } catch (error) {
    console.warn("Failed to load records", error);
    return initialStudents;
  }
}

function saveStudents(students) {
  if (!canUseLocalStorage()) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
    return true;
  } catch (error) {
    console.warn("Failed to save records", error);
    return false;
  }
}

function getCommissionRate(count) {
  if (count <= 0) return 0;
  return count >= 5 ? 200 : 100;
}

function calculateCommission(count) {
  return count * getCommissionRate(count);
}

function calculateCommissionRows(students) {
  const grouped = new Map();
  students.forEach((student) => {
    const key = `${student.joined}|${student.enrolledBy}`;
    const existing = grouped.get(key) || { date: student.joined, enrolledBy: student.enrolledBy, count: 0 };
    grouped.set(key, { ...existing, count: existing.count + 1 });
  });
  return Array.from(grouped.values())
    .map((row) => ({ ...row, rate: getCommissionRate(row.count), earned: calculateCommission(row.count) }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function calculateStats(students) {
  const totalIncome = students.reduce((sum, student) => sum + Number(student.amount || 0), 0);
  const commissionRows = calculateCommissionRows(students);
  const totalCommission = commissionRows.reduce((sum, row) => sum + row.earned, 0);
  const gradeCounts = GRADES.map((grade) => ({ grade, count: students.filter((student) => student.grade === grade).length }));
  return {
    totalStudents: students.length,
    slipCount: students.filter((student) => Boolean(student.slipImage)).length,
    totalIncome,
    totalCommission,
    netBalance: totalIncome - totalCommission,
    gradeCounts,
  };
}

function getDateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days + 1);
  return date.toISOString().slice(0, 10);
}

function filterByDateRange(students, range) {
  if (range === "all") return students;
  const days = Number(range);
  if (!Number.isFinite(days)) return students;
  const startDate = getDateDaysAgo(days);
  return students.filter((student) => student.joined >= startDate);
}

function filterStudents(students, query, grade, range = "all") {
  const cleanQuery = query.trim().toLowerCase();
  const dateFiltered = filterByDateRange(students, range);
  return dateFiltered.filter((student) => {
    const matchesQuery =
      !cleanQuery ||
      student.name.toLowerCase().includes(cleanQuery) ||
      student.enrolledBy.toLowerCase().includes(cleanQuery) ||
      student.notes.toLowerCase().includes(cleanQuery);
    const matchesGrade = grade === "All" || student.grade === grade;
    return matchesQuery && matchesGrade;
  });
}

function buildDailyMessage(students) {
  const stats = calculateStats(students);
  return [
    "Prasad Sir Class - Paid Enrollment Daily Report",
    "",
    `Date: ${getTodayDate()}`,
    ...stats.gradeCounts.map((row) => `${row.grade}: ${row.count} students`),
    "",
    `Total Paid Students: ${stats.totalStudents}`,
    `Slip Photos Saved: ${stats.slipCount}`,
    `Class Fee Income: ${formatMoney(stats.totalIncome)}`,
    `Enrollment Pay: ${formatMoney(stats.totalCommission)}`,
    `Net Balance: ${formatMoney(stats.netBalance)}`,
    "",
    "Slip photos cannot be auto-attached by WhatsApp Web. Download the Slip Photo Report and attach it manually.",
  ].join(NEWLINE);
}

function escapeCsv(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"') || text.includes(NEWLINE)) {
    return `"${text.split('"').join('""')}"`;
  }
  return text;
}

function buildCsvReport(students, rangeLabel = "All Records") {
  const rows = [["Report", `Prasad Sir Class Export - ${rangeLabel}`], ["Generated", getTodayDate()], [], ["Name", "Class", "Date"], ...students.map((student) => [student.name, student.grade, student.joined])];
  return rows.map((row) => row.map(escapeCsv).join(",")).join(NEWLINE);
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function buildSlipHtmlReport(students) {
  const stats = calculateStats(students);
  const recordsHtml = students
    .map((student, index) => {
      const imageHtml = student.slipImage
        ? `<img src="${student.slipImage}" alt="Payment slip" style="max-width:280px;border:1px solid #ddd;border-radius:12px;margin-top:8px;" />`
        : `<p style="color:#777;">No slip photo saved</p>`;
      return `<section style="border:1px solid #ddd;border-radius:16px;padding:16px;margin:12px 0;page-break-inside:avoid;">
<h3>${index + 1}. ${escapeHtml(student.name)}</h3>
<p><strong>Grade:</strong> ${escapeHtml(student.grade)}</p>
<p><strong>Month:</strong> ${escapeHtml(student.month)}</p>
<p><strong>Class Fee:</strong> ${formatMoney(student.amount)}</p>
<p><strong>Date:</strong> ${escapeHtml(student.joined)}</p>
<p><strong>Enrolled By:</strong> ${escapeHtml(student.enrolledBy)}</p>
<p><strong>Notes:</strong> ${escapeHtml(student.notes)}</p>
${imageHtml}
</section>`;
    })
    .join(NEWLINE);
  return `<!doctype html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Prasad Sir Class Slip Report</title></head>
<body style="font-family:Arial,sans-serif;padding:20px;line-height:1.5;color:#111;">
<h1>Prasad Sir Class - Slip Report</h1>
<p><strong>Generated:</strong> ${getTodayDate()}</p>
<p><strong>Total Paid Students:</strong> ${stats.totalStudents}</p>
<p><strong>Class Fee Income:</strong> ${formatMoney(stats.totalIncome)}</p>
<p><strong>Enrollment Pay:</strong> ${formatMoney(stats.totalCommission)}</p>
<p><strong>Net Balance:</strong> ${formatMoney(stats.netBalance)}</p>
<hr />
${recordsHtml}
</body>
</html>`;
}

function downloadFile(filename, content, mimeType) {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.warn("Download failed", error);
    return false;
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function openWhatsApp(message) {
  if (typeof window === "undefined") return false;
  try {
    const url = `https://wa.me/${OWNER_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    return true;
  } catch (error) {
    console.warn("WhatsApp open failed", error);
    return false;
  }
}

function runSelfTests() {
  const stats = calculateStats(initialStudents);
  const multiline = `A${NEWLINE}B`;
  const csv = buildCsvReport(initialStudents);
  console.assert(stats.totalStudents === 0, "Expected empty initial student list");
  console.assert(stats.totalIncome === 0, "Expected empty initial income");
  console.assert(calculateCommission(4) === 400, "4 students should pay 400");
  console.assert(calculateCommission(5) === 1000, "5 students should pay 1000");
  console.assert(filterStudents([{ name: "Test Student", grade: "Grade 3", amount: 1000, joined: getTodayDate(), enrolledBy: "Mahesha Dilhani", notes: "Paid", slipImage: "" }], "Mahesha", "All").length === 1, "Search should work");
  console.assert(buildDailyMessage(initialStudents).includes("Total Paid Students"), "Daily message should build");
  console.assert(csv.includes("Name,Class,Date"), "CSV should export Name, Class, Date headers");
  console.assert(buildSlipHtmlReport(initialStudents).includes("Slip Report"), "HTML report should build");
  console.assert(escapeCsv("A,B") === '"A,B"', "CSV comma escape should work");
  console.assert(escapeCsv(multiline) === `"${multiline}"`, "CSV newline escape should work");
  console.assert(escapeCsv('A"B') === '"A""B"', "CSV quote escape should work");
}

runSelfTests();

function Card({ children, className = "" }) {
  return <div className={`rounded-3xl border border-slate-100 bg-white shadow-sm ${className}`}>{children}</div>;
}

function Button({ children, onClick, className = "", disabled = false }) {
  return <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}>{children}</button>;
}

function FieldLabel({ children }) {
  return <label className="text-sm font-medium text-slate-600">{children}</label>;
}

function StatCard({ icon, label, value, note }) {
  return <Card className="rounded-2xl"><div className="p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-sm text-slate-500">{label}</p><h3 className="mt-1 text-2xl font-bold text-slate-900">{value}</h3><p className="mt-1 text-xs text-slate-400">{note}</p></div><span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xl" aria-hidden="true">{icon}</span></div></div></Card>;
}

export default function PrasadSirClassAppPreview() {
  const [students, setStudents] = useState(() => loadStudents());
  const [query, setQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("All");
  const [dateRange, setDateRange] = useState("all");
  const [activeSlip, setActiveSlip] = useState(null);
  const [notice, setNotice] = useState("");
  const [calculatorCount, setCalculatorCount] = useState("5");
  const [form, setForm] = useState({ name: "", grade: "Grade 3", month: "May 2026", amount: String(DEFAULT_CLASS_FEE), joined: getTodayDate(), enrolledBy: DEFAULT_ENROLLER, notes: "", slipImage: "" });

  const filteredStudents = useMemo(() => filterStudents(students, query, gradeFilter, dateRange), [students, query, gradeFilter, dateRange]);
  const visibleSlipStudents = useMemo(() => filteredStudents.filter((student) => Boolean(student.slipImage)), [filteredStudents]);
  const stats = useMemo(() => calculateStats(students), [students]);
  const commissionRows = useMemo(() => calculateCommissionRows(students), [students]);
  const dailyMessage = useMemo(() => buildDailyMessage(students), [students]);
  const calculatorStudents = Number(calculatorCount) || 0;
  const calculatorRate = getCommissionRate(calculatorStudents);
  const calculatorTotal = calculateCommission(calculatorStudents);

  useEffect(() => { saveStudents(students); }, [students]);

  function updateForm(field, value) { setForm((current) => ({ ...current, [field]: value })); }

  async function handleSlipUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setNotice("Payment slip එක image file එකක් වෙන්න ඕන."); return; }
    if (file.size > 900 * 1024) { setNotice("Image එක ලොකුයි. 900KB ට අඩු screenshot/photo එකක් upload කරන්න."); return; }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      updateForm("slipImage", dataUrl);
      setNotice("Payment slip photo එක upload වුණා.");
    } catch (error) {
      console.warn(error);
      setNotice("Slip image එක read කරන්න බැරි වුණා.");
    }
  }

  function addStudent() {
    const amount = Number(form.amount);
    if (!form.name.trim()) { setNotice("Student name එක දාන්න."); return; }
    if (!form.slipImage) { setNotice("Payment slip photo එක upload කරන්න. Slip එක නැතුව record save කරන්න බැහැ."); return; }
    if (!form.enrolledBy.trim()) { setNotice("Enrolled By නම දාන්න."); return; }
    if (!Number.isFinite(amount) || amount < 0) { setNotice("Class fee එක valid number එකක් වෙන්න ඕන."); return; }
    const newStudent = normalizeStudent({ id: Date.now(), name: form.name.trim(), grade: form.grade, month: form.month.trim() || "May 2026", amount, joined: form.joined || getTodayDate(), enrolledBy: form.enrolledBy.trim(), notes: form.notes.trim() || "Paid enrollment", slipImage: form.slipImage });
    setStudents((current) => [newStudent, ...current]);
    setForm({ name: "", grade: "Grade 3", month: "May 2026", amount: String(DEFAULT_CLASS_FEE), joined: getTodayDate(), enrolledBy: newStudent.enrolledBy, notes: "", slipImage: "" });
    setNotice("Paid student record එක save වුණා.");
  }

  function resetRecords() {
    const ok = window.confirm("Saved student records සියල්ල delete කරන්නද?");
    if (!ok) return;
    setStudents(initialStudents);
    saveStudents(initialStudents);
    setNotice("Student records සියල්ල clear වුණා.");
  }

  function sendDailyReport() {
    const opened = openWhatsApp(dailyMessage);
    setNotice(opened ? "WhatsApp report එක open වුණා. Send button එක manually ඔබන්න." : "WhatsApp open කරන්න බැරි වුණා.");
  }

  function getRangeLabel() {
    if (dateRange === "7") return "Last 7 Days";
    if (dateRange === "14") return "Last 14 Days";
    if (dateRange === "30") return "Last 30 Days";
    return "All Records";
  }

  function downloadCsvReport() {
    const exportRows = filterByDateRange(students, dateRange);
    const fileRange = dateRange === "all" ? "all" : `last-${dateRange}-days`;
    const ok = downloadFile(`prasad-sir-${fileRange}-${getTodayDate()}.csv`, buildCsvReport(exportRows, getRangeLabel()), "text/csv;charset=utf-8");
    setNotice(ok ? `${getRangeLabel()} CSV report එක download වුණා. Name, Class, Date විතරයි export වෙන්නේ.` : "CSV download කරන්න බැරි වුණා.");
  }

  function downloadSlipReport() {
    const ok = downloadFile(`prasad-sir-slip-report-${getTodayDate()}.html`, buildSlipHtmlReport(students), "text/html;charset=utf-8");
    setNotice(ok ? "Slip Photo Report එක download වුණා. ඒ file එක WhatsApp එකට manually attach කරන්න." : "Slip report download කරන්න බැරි වුණා.");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-3xl bg-slate-950 p-6 text-white shadow-lg md:p-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-slate-200">🎓 Paid Student Enrollment Manager</div>
              <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">Prasad Sir Class</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">Payment කරපු students විතරක් add කරන්න. WhatsApp number අවශ්‍ය නැහැ. Payment slip photo එක upload කරලා report එක download කරන්න පුළුවන්.</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 text-sm text-slate-200"><p className="font-semibold text-white">WhatsApp Report Number</p><p>075 202 7980</p><p className="mt-3 font-semibold text-white">Commission Rule</p><p>1–4 paid students: Rs.100 each</p><p>5+ paid students: Rs.200 each</p></div>
          </div>
        </header>

        <section className="mb-6 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="p-6">
              <h2 className="text-xl font-bold">Add Paid Student</h2>
              <p className="mt-1 text-sm text-slate-500">Student name + slip photo + payment details save කරන්න.</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div><FieldLabel>Student Name</FieldLabel><input className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-500" value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="Student name" /></div>
                <div><FieldLabel>Grade</FieldLabel><select className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none" value={form.grade} onChange={(event) => updateForm("grade", event.target.value)}>{GRADES.map((grade) => <option key={grade}>{grade}</option>)}</select></div>
                <div><FieldLabel>Month</FieldLabel><input className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none" value={form.month} onChange={(event) => updateForm("month", event.target.value)} /></div>
                <div><FieldLabel>Class Fee</FieldLabel><input className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none" inputMode="numeric" value={form.amount} onChange={(event) => updateForm("amount", event.target.value)} /></div>
                <div><FieldLabel>Payment / Enrollment Date</FieldLabel><input type="date" className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none" value={form.joined} onChange={(event) => updateForm("joined", event.target.value)} /></div>
                <div><FieldLabel>Enrolled By</FieldLabel><input className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none" list="enroller-list" value={form.enrolledBy} onChange={(event) => updateForm("enrolledBy", event.target.value)} /><datalist id="enroller-list">{ENROLLERS.map((name) => <option key={name} value={name} />)}</datalist></div>
                <div className="md:col-span-2"><FieldLabel>Notes</FieldLabel><textarea className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-500" value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} placeholder="Example: slip checked, parent called" /></div>
              </div>
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center"><div className="text-3xl">📤</div><p className="mt-2 text-sm font-medium">Payment Slip Upload</p><p className="mt-1 text-xs text-slate-500">900KB ට අඩු screenshot/photo එකක් upload කරන්න.</p><input type="file" accept="image/*" onChange={handleSlipUpload} className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm" />{form.slipImage ? <img src={form.slipImage} alt="Uploaded payment slip preview" className="mx-auto mt-4 max-h-48 rounded-2xl border border-slate-200 object-contain" /> : null}</div>
              {notice ? <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{notice}</p> : null}
              <div className="mt-4 grid gap-3 md:grid-cols-2"><Button onClick={addStudent} className="w-full bg-slate-950 text-white hover:bg-slate-800">Save Paid Student Record</Button><Button onClick={resetRecords} className="w-full bg-red-50 text-red-700 hover:bg-red-100">Clear Student Records</Button></div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4"><p className="mb-3 text-sm font-semibold text-slate-700">Quick Actions</p><div className="mb-3 grid gap-3 md:grid-cols-3"><Button onClick={() => setDateRange("7")} className={`w-full ${dateRange === "7" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-800"}`}>Last 7 Days</Button><Button onClick={() => setDateRange("14")} className={`w-full ${dateRange === "14" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-800"}`}>Last 14 Days</Button><Button onClick={() => setDateRange("30")} className={`w-full ${dateRange === "30" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-800"}`}>Last 30 Days</Button></div><div className="grid gap-3 md:grid-cols-2"><Button onClick={() => setDateRange("all")} className="w-full bg-slate-100 text-slate-800 hover:bg-slate-200">Show All</Button><Button onClick={sendDailyReport} className="w-full bg-emerald-600 text-white hover:bg-emerald-700">💬 Send Daily Report</Button><Button onClick={downloadCsvReport} className="w-full bg-blue-700 text-white hover:bg-blue-800">⬇️ Export Name/Class/Date CSV</Button><Button onClick={downloadSlipReport} className="w-full bg-purple-700 text-white hover:bg-purple-800">🖼️ Download Slip Photo Report</Button></div><p className="mt-3 text-xs leading-5 text-slate-500">CSV export එකට name, class, date විතරයි යනවා. Slip photos app එක ඇතුළේ Gallery එකෙන් බලන්න පුළුවන්.</p></div>
            </div>
          </Card>
          <Card><div className="p-6"><h2 className="text-xl font-bold">Quick Pay Calculator</h2><p className="mt-1 text-sm text-slate-500">දවසට paid students count එක දාන්න.</p><FieldLabel>Today paid enrollments</FieldLabel><input className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-500" inputMode="numeric" value={calculatorCount} onChange={(event) => setCalculatorCount(event.target.value)} /><div className="mt-5 rounded-2xl bg-slate-950 p-5 text-white"><p className="text-sm text-slate-300">Rate</p><p className="mt-1 text-2xl font-bold">{formatMoney(calculatorRate)} each</p><p className="mt-4 text-sm text-slate-300">Total Pay</p><p className="mt-1 text-4xl font-extrabold">{formatMoney(calculatorTotal)}</p></div></div></Card>
        </section>
        <section className="grid gap-4 md:grid-cols-5"><StatCard icon="👥" label="Paid Students" value={stats.totalStudents} note="Only paid records" /><StatCard icon="📤" label="Slip Photos" value={stats.slipCount} note="Saved photos" /><StatCard icon="💳" label="Class Fee Income" value={formatMoney(stats.totalIncome)} note="Paid total" /><StatCard icon="🤝" label="Enrollment Pay" value={formatMoney(stats.totalCommission)} note="Enroller pay" /><StatCard icon="📊" label="Net Balance" value={formatMoney(stats.netBalance)} note="Income minus pay" /></section>
        <main className="mt-6 grid gap-6 lg:grid-cols-3"><section className="space-y-6 lg:col-span-2"><Card><div className="p-6"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><h2 className="text-xl font-bold">Paid Monthly Summary</h2><p className="mt-2 text-sm text-slate-500">Paid students, income, and commission overview.</p></div><div className="flex flex-col gap-2 sm:flex-row"><Button onClick={sendDailyReport} className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto">💬 Send Daily Report</Button><Button onClick={downloadCsvReport} className="w-full bg-slate-950 text-white hover:bg-slate-800 sm:w-auto">⬇️ Download CSV</Button></div></div><div className="mt-5 grid gap-3 md:grid-cols-3">{stats.gradeCounts.map((item) => <div key={item.grade} className="rounded-2xl bg-slate-100 p-4"><p className="text-sm text-slate-500">{item.grade}</p><p className="mt-1 text-2xl font-bold">{item.count}</p><p className="text-xs text-slate-400">paid students</p></div>)}</div><div className="mt-5 rounded-2xl bg-slate-950 p-4 text-sm text-slate-100"><p className="font-semibold">WhatsApp daily report preview</p><pre className="mt-3 whitespace-pre-wrap font-sans text-xs leading-5 text-slate-300">{dailyMessage}</pre></div></div></Card><Card><div className="p-6"><h2 className="text-xl font-bold">Enrollment Person Earnings</h2><p className="mt-1 text-sm text-slate-500">Daily paid enrollment count අනුව auto calculation.</p><div className="mt-5 overflow-hidden rounded-2xl border border-slate-100"><div className="hidden grid-cols-5 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600 md:grid"><span>Date</span><span>Enrolled By</span><span>Students</span><span>Rate</span><span>Earned</span></div>{commissionRows.map((row) => <div key={`${row.date}-${row.enrolledBy}`} className="grid gap-2 border-t border-slate-100 px-4 py-4 text-sm md:grid-cols-5 md:items-center"><span className="font-semibold text-slate-900">{row.date}</span><span>{row.enrolledBy}</span><span>{row.count}</span><span>{formatMoney(row.rate)} each</span><span className="font-bold text-emerald-700">{formatMoney(row.earned)}</span></div>)}</div></div></Card></section><section className="space-y-6"><Card><div className="p-6"><h2 className="text-xl font-bold">Slip Gallery</h2><p className="mt-1 text-sm text-slate-500">App එක ඇතුළේම uploaded slips බලන්න. Current filter: {getRangeLabel()}</p><div className="mt-4 grid gap-3">{visibleSlipStudents.length === 0 ? <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">මෙම filter එකට slip photos නැහැ.</p> : visibleSlipStudents.map((student) => <button key={`slip-${student.id}`} type="button" onClick={() => setActiveSlip(student)} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 text-left hover:bg-slate-100"><img src={student.slipImage} alt={`${student.name} slip thumbnail`} className="h-16 w-16 rounded-xl border object-cover" /><div><p className="font-semibold text-slate-900">{student.name}</p><p className="text-sm text-slate-500">{student.grade} • {student.joined}</p></div></button>)}</div></div></Card><Card><div className="p-6"><h2 className="text-xl font-bold">Paid-only System</h2><div className="mt-4 space-y-3 text-sm text-slate-700"><p className="rounded-2xl bg-slate-50 p-3">✅ Payment කළාට පස්සේ විතරයි add කරන්නේ</p><p className="rounded-2xl bg-slate-50 p-3">📷 Slip photo upload required</p><p className="rounded-2xl bg-slate-50 p-3">💾 localStorage auto-save active</p><p className="rounded-2xl bg-slate-50 p-3">📅 Last 7 / 14 / 30 days export</p></div></div></Card></section></main>
        <Card className="mt-6"><div className="p-6"><div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><h2 className="text-xl font-bold">Paid Student Records</h2><p className="mt-1 text-sm text-slate-500">Saved paid records and slip photo thumbnails.</p></div><div className="flex flex-col gap-3 md:flex-row"><input className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-slate-500 md:w-72" placeholder="Search name, enroller, note" value={query} onChange={(event) => setQuery(event.target.value)} /><select className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none" value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value)}><option>All</option>{GRADES.map((grade) => <option key={grade}>{grade}</option>)}</select><select className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none" value={dateRange} onChange={(event) => setDateRange(event.target.value)}><option value="all">All Dates</option><option value="7">Last 7 Days</option><option value="14">Last 14 Days</option><option value="30">Last 30 Days</option></select></div></div><div className="overflow-hidden rounded-2xl border border-slate-100"><div className="hidden grid-cols-7 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600 md:grid"><span>Name</span><span>Grade</span><span>Fee</span><span>Date</span><span>Enrolled By</span><span>Note</span><span>Slip</span></div>{filteredStudents.length === 0 ? <div className="px-4 py-8 text-center text-sm text-slate-500">No paid student records found.</div> : filteredStudents.map((student) => <div key={student.id} className="grid gap-2 border-t border-slate-100 px-4 py-4 text-sm md:grid-cols-7 md:items-center"><span className="font-semibold text-slate-900">{student.name}</span><span>{student.grade}</span><span>{formatMoney(student.amount)}</span><span className="text-slate-500">{student.joined}</span><span className="font-medium">{student.enrolledBy}</span><span className="text-slate-500">{student.notes}</span><span>{student.slipImage ? <img src={student.slipImage} alt={`${student.name} payment slip`} className="h-14 w-14 rounded-lg border object-cover" /> : <span className="text-slate-400">No photo</span>}</span></div>)}</div></div></Card>
      </div>
      {activeSlip ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setActiveSlip(null)}><div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-3xl bg-white p-5" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-900">{activeSlip.name}</h2><p className="text-sm text-slate-500">{activeSlip.grade} • {activeSlip.joined}</p></div><Button onClick={() => setActiveSlip(null)} className="bg-slate-100 text-slate-800 hover:bg-slate-200">Close</Button></div><img src={activeSlip.slipImage} alt={`${activeSlip.name} payment slip full view`} className="mx-auto max-h-[70vh] rounded-2xl border object-contain" /></div></div> : null}
    </div>
  );
}
