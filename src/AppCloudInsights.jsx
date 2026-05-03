import React, { useEffect, useMemo, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import { collection, getFirestore, onSnapshot, query } from "firebase/firestore";
import AppCloudMonthly from "./AppCloudMonthly.jsx";

const firebaseConfig = {
  apiKey: "AIzaSyBk_LfFJTK2wQw9YnnFXkfXkRinpTPLDss",
  authDomain: "prasad-sir-class.firebaseapp.com",
  projectId: "prasad-sir-class",
  storageBucket: "prasad-sir-class.firebasestorage.app",
  messagingSenderId: "533240391206",
  appId: "1:533240391206:web:d7934425143bece87da8e7",
  measurementId: "G-DJSGWRF598",
};

const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const studentsCollection = collection(db, "students");
const NEWLINE = String.fromCharCode(10);

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getDateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days + 1);
  return date.toISOString().slice(0, 10);
}

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString()}`;
}

function getCommissionRate(count) {
  if (count <= 0) return 0;
  return count >= 5 ? 200 : 100;
}

function calculateCommission(count) {
  return count * getCommissionRate(count);
}

function normalizeStudent(id, data) {
  return {
    id,
    name: String(data.name || "Unknown Student"),
    grade: String(data.grade || "Grade 3"),
    joined: String(data.joined || getTodayDate()),
    enrolledBy: String(data.enrolledBy || "Unknown"),
    amount: Number(data.amount || 0),
  };
}

function getRangeStudents(students, days) {
  const startDate = getDateDaysAgo(days);
  return students.filter((student) => student.joined >= startDate);
}

function groupByDateAndEnroller(students) {
  const grouped = new Map();

  students.forEach((student) => {
    const key = `${student.joined}|${student.enrolledBy}`;
    const current = grouped.get(key) || {
      date: student.joined,
      enrolledBy: student.enrolledBy,
      count: 0,
      income: 0,
    };

    grouped.set(key, {
      ...current,
      count: current.count + 1,
      income: current.income + Number(student.amount || 0),
    });
  });

  return Array.from(grouped.values())
    .map((row) => ({
      ...row,
      rate: getCommissionRate(row.count),
      pay: calculateCommission(row.count),
    }))
    .sort((a, b) => b.date.localeCompare(a.date) || a.enrolledBy.localeCompare(b.enrolledBy));
}

function groupByEnroller(students) {
  const grouped = new Map();

  students.forEach((student) => {
    const current = grouped.get(student.enrolledBy) || {
      enrolledBy: student.enrolledBy,
      count: 0,
      income: 0,
    };

    grouped.set(student.enrolledBy, {
      ...current,
      count: current.count + 1,
      income: current.income + Number(student.amount || 0),
    });
  });

  return Array.from(grouped.values()).sort((a, b) => b.count - a.count || a.enrolledBy.localeCompare(b.enrolledBy));
}

function buildExportCsv(rows) {
  const csvRows = [
    ["Date", "Enrolled By", "Students", "Commission Rate", "Enrollment Pay", "Class Fee Income"],
    ...rows.map((row) => [row.date, row.enrolledBy, row.count, row.rate, row.pay, row.income]),
  ];

  return csvRows.map((row) => row.join(",")).join(NEWLINE);
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function SmallCard({ label, value, note }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>
  );
}

export default function AppCloudInsights() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30");

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(studentsCollection),
      (snapshot) => {
        setStudents(snapshot.docs.map((item) => normalizeStudent(item.id, item.data())));
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const rangeStudents = useMemo(() => getRangeStudents(students, Number(range)), [students, range]);
  const todayStudents = useMemo(() => students.filter((student) => student.joined === getTodayDate()), [students]);
  const yesterdayStudents = useMemo(() => {
    const yesterday = getDateDaysAgo(2);
    return students.filter((student) => student.joined === yesterday);
  }, [students]);

  const rowsByDateAndEnroller = useMemo(() => groupByDateAndEnroller(rangeStudents), [rangeStudents]);
  const rowsByEnroller = useMemo(() => groupByEnroller(rangeStudents), [rangeStudents]);

  const totalIncome = rangeStudents.reduce((sum, student) => sum + Number(student.amount || 0), 0);
  const totalPay = rowsByDateAndEnroller.reduce((sum, row) => sum + row.pay, 0);

  function exportBreakdown() {
    downloadTextFile(`enroller-breakdown-last-${range}-days-${getTodayDate()}.csv`, buildExportCsv(rowsByDateAndEnroller));
  }

  return (
    <div className="bg-slate-100">
      <div className="mx-auto max-w-7xl px-4 pt-4 md:px-8">
        <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm md:p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <h2 className="text-xl font-extrabold text-indigo-950">Enrollment Breakdown Dashboard</h2>
              <p className="mt-1 text-sm leading-6 text-indigo-800">
                දවසෙන් දවස, enrollment කරන කෙනා අනුව, last 7/14/30 days total එක බලන්න. Existing data එක change වෙන්නේ නැහැ.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => setRange("7")} className={`rounded-xl px-4 py-2 text-sm font-bold ${range === "7" ? "bg-indigo-900 text-white" : "bg-white text-indigo-900"}`}>Last 7 Days</button>
              <button type="button" onClick={() => setRange("14")} className={`rounded-xl px-4 py-2 text-sm font-bold ${range === "14" ? "bg-indigo-900 text-white" : "bg-white text-indigo-900"}`}>Last 14 Days</button>
              <button type="button" onClick={() => setRange("30")} className={`rounded-xl px-4 py-2 text-sm font-bold ${range === "30" ? "bg-indigo-900 text-white" : "bg-white text-indigo-900"}`}>Last 30 Days</button>
              <button type="button" onClick={exportBreakdown} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white">Export Breakdown CSV</button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-5">
            <SmallCard label="Today" value={loading ? "..." : todayStudents.length} note="අද add කළ students" />
            <SmallCard label="Yesterday" value={loading ? "..." : yesterdayStudents.length} note="ඊයේ add කළ students" />
            <SmallCard label={`Last ${range} Days`} value={loading ? "..." : rangeStudents.length} note="selected range total" />
            <SmallCard label="Range Income" value={formatMoney(totalIncome)} note="selected range fees" />
            <SmallCard label="Range Pay" value={formatMoney(totalPay)} note="enrollment pay total" />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-950">Enroller-wise Total — Last {range} Days</h3>
              <div className="mt-3 space-y-2">
                {rowsByEnroller.length === 0 ? (
                  <p className="text-sm text-slate-500">මෙම range එකට records නැහැ.</p>
                ) : (
                  rowsByEnroller.map((row) => (
                    <div key={row.enrolledBy} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                      <span className="font-semibold text-slate-800">{row.enrolledBy}</span>
                      <span className="font-bold text-indigo-900">{row.count} students</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-950">Day-by-day Enroller Breakdown</h3>
              <div className="mt-3 max-h-80 overflow-auto rounded-xl border border-slate-100">
                <div className="grid grid-cols-5 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
                  <span>Date</span>
                  <span>Enroller</span>
                  <span>Count</span>
                  <span>Rate</span>
                  <span>Pay</span>
                </div>
                {rowsByDateAndEnroller.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-slate-500">මෙම range එකට records නැහැ.</p>
                ) : (
                  rowsByDateAndEnroller.map((row) => (
                    <div key={`${row.date}-${row.enrolledBy}`} className="grid grid-cols-5 border-t border-slate-100 px-3 py-2 text-xs md:text-sm">
                      <span>{row.date}</span>
                      <span className="font-medium">{row.enrolledBy}</span>
                      <span>{row.count}</span>
                      <span>{formatMoney(row.rate)}</span>
                      <span className="font-bold text-emerald-700">{formatMoney(row.pay)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <AppCloudMonthly />
    </div>
  );
}
