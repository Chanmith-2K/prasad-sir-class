import React, { useState } from "react";
import { getApp } from "firebase/app";
import { collection, deleteDoc, doc, getDocs, getFirestore } from "firebase/firestore";
import AppCloud from "./AppCloud.jsx";

const db = getFirestore(getApp());
const studentsCollection = collection(db, "students");

export default function AppCloudMonthly() {
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState("");

  async function resetAllMonthlyData() {
    const firstConfirm = window.confirm(
      "මාසය අවසානයේ cloud database එකේ සියලුම student records සහ slip photos delete කරන්නද? මෙම action එක undo කරන්න බැහැ."
    );
    if (!firstConfirm) return;

    const typed = window.prompt("Final confirmation එකට RESET කියලා type කරන්න.");
    if (typed !== "RESET") {
      setMessage("Monthly reset cancel වුණා. RESET කියලා type කළේ නැහැ.");
      return;
    }

    setResetting(true);
    setMessage("Monthly reset running... Cloud records delete වෙනවා.");

    try {
      const snapshot = await getDocs(studentsCollection);
      await Promise.all(snapshot.docs.map((item) => deleteDoc(doc(db, "students", item.id))));
      setMessage("Monthly reset complete. Student details සහ slip photos සියල්ල clear වුණා. New month එකට fresh start කරන්න පුළුවන්.");
    } catch (error) {
      console.error(error);
      setMessage(`Monthly reset failed: ${error.message}`);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="bg-slate-100">
      <div className="mx-auto max-w-7xl px-4 pt-4 md:px-8">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 shadow-sm md:p-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-lg font-extrabold text-red-800">Monthly Data Reset</h2>
              <p className="mt-1 text-sm leading-6 text-red-700">
                මාසය අවසානයේ free quota save කරගන්න student records සහ saved slip photos සියල්ල clear කරන්න. Reset කරන්න කලින් CSV / Slip Report download කරලා තියාගන්න.
              </p>
              {message ? <p className="mt-2 rounded-xl bg-white px-3 py-2 text-sm text-red-700">{message}</p> : null}
            </div>
            <button
              type="button"
              onClick={resetAllMonthlyData}
              disabled={resetting}
              className="rounded-2xl bg-red-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resetting ? "Resetting..." : "RESET ALL MONTH DATA"}
            </button>
          </div>
        </div>
      </div>
      <AppCloud />
    </div>
  );
}
