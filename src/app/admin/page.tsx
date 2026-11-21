"use client";

import { useEffect, useMemo, useState } from "react";

// The organisers' page: everyone who's checked in (with emails and key cards), meal orders, room
// partners, votes, games, nominations and suggestions. Read-only: nothing here changes or deletes
// anything. Each list downloads as a spreadsheet (CSV), and each guest has an "Email" button that
// opens a ready-written message (their key card and how to log back in) in your own mail app.
// History lists every entry ever saved (check-ins with the name typed, every request, cancel and
// decline), newest first, and downloads like the rest.

type Row = Record<string, string>;
type Data = {
  guests: Row[];
  meals: Row[];
  movies: Row[];
  games: Row[];
  awards: Row[];
  roommates: Row[];
  suggestions: Row[];
  history: Row[];
  event: { name: string; dates: string; checkIn: string; checkOut: string };
};

const TABS: { id: keyof Omit<Data, "event">; label: string; cols: [string, string][] }[] = [
  { id: "guests", label: "Guests", cols: [["name", "Name"], ["email", "Email"], ["card", "Key card"], ["sex", "Lady / Guy"], ["checkedIn", "Checked in"]] },
  { id: "meals", label: "Meals", cols: [["name", "Name"], ["meal", "Meal"], ["dishes", "Order"], ["notes", "Notes"], ["at", "Saved"]] },
  { id: "roommates", label: "Room partners", cols: [["from", "Who"], ["to", "Wants"], ["status", "Status"], ["at", "Saved"]] },
  { id: "movies", label: "Movie votes", cols: [["name", "Name"], ["movie", "Movie"], ["at", "Saved"]] },
  { id: "games", label: "Games", cols: [["name", "Name"], ["games", "Games"], ["at", "Saved"]] },
  { id: "awards", label: "Nominations", cols: [["name", "Who"], ["award", "Award"], ["nominee", "Nominee"], ["at", "Saved"]] },
  { id: "suggestions", label: "Suggestions", cols: [["kind", "Kind"], ["text", "Suggestion"], ["by", "By"]] },
  { id: "history", label: "History", cols: [["at", "When"], ["who", "Who"], ["what", "What"], ["detail", "Details"]] },
];

const when = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(+d) ? iso : d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

function csv(rows: Row[], cols: [string, string][]) {
  const cell = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.map(([, h]) => cell(h)).join(","), ...rows.map((r) => cols.map(([k]) => cell(k === "at" || k === "checkedIn" ? when(r[k]) : r[k])).join(","))].join("\n");
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function emailFor(g: Row, e: Data["event"]) {
  const site = typeof window !== "undefined" ? window.location.origin : "";
  const first = g.name.split(" ")[0];
  const subject = `Your ${e.name} key card 🔑`;
  const body = [
    `Hi ${first},`,
    ``,
    `You're checked in for ${e.name} at Silver Dome, Ibadan (${e.dates}).`,
    `Check in: ${e.checkIn}`,
    `Check out: ${e.checkOut}`,
    ``,
    `Your key card: ${g.card}`,
    ``,
    `To get back in on any phone: open ${site}, tap "Been here before? Log back in" and enter your key card (or this email address).`,
    `Everything you've picked (room partner, meals, movie vote, games) is saved there.`,
    ``,
    `See you at Silver Dome! 🌴`,
  ].join("\n");
  return { to: g.email, subject, body, mailto: `mailto:${encodeURIComponent(g.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` };
}

export default function Admin() {
  const [key, setKey] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("guests");
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState("");

  const load = async (k: string) => {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: k }), cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Couldn't load.");
      setData(d);
      try {
        sessionStorage.setItem("silverdome:admin", k);
      } catch {
        /* fine */
      }
    } catch (e) {
      setErr((e as Error).message);
      setData(null);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    try {
      const k = sessionStorage.getItem("silverdome:admin");
      if (k) {
        setKey(k);
        void load(k);
      }
    } catch {
      /* fine */
    }
  }, []);

  const t = TABS.find((x) => x.id === tab)!;
  const rows = useMemo(() => {
    const list = data?.[tab] ?? [];
    const k = q.trim().toLowerCase();
    return k ? list.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(k))) : list;
  }, [data, tab, q]);

  if (!data)
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#0b2328] p-4 text-white">
        <form
          className="panel w-full max-w-sm rounded-2xl p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void load(key);
          }}
        >
          <div className="eyebrow">WESCOSA Staycation</div>
          <h1 className="title mt-1 text-3xl">Organisers</h1>
          <p className="mt-1 text-sm text-white/65">Everyone&apos;s check-ins, meals, room partners and votes. Read-only.</p>
          <input className="input mt-4 text-base" type="password" placeholder="Admin password" value={key} onChange={(e) => setKey(e.target.value)} autoFocus />
          {err && <p className="mt-2 text-sm text-[#ff9b7a]">{err}</p>}
          <button className="btn mt-3 w-full py-3" disabled={busy || !key}>
            {busy ? "Opening…" : "Open"}
          </button>
        </form>
      </main>
    );

  const matched = data.roommates.filter((r) => r.status.startsWith("Matched")).length / 2;
  return (
    <main className="min-h-dvh bg-[#0b2328] p-4 text-white sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">WESCOSA Staycation · {data.event.dates}</div>
          <h1 className="title mt-1 text-3xl">Organisers</h1>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost px-3 py-2 text-sm" onClick={() => load(key)} disabled={busy}>
            {busy ? "Refreshing…" : "↻ Refresh"}
          </button>
          <button
            className="btn-ghost px-3 py-2 text-sm"
            onClick={() => {
              sessionStorage.removeItem("silverdome:admin");
              setData(null);
              setKey("");
            }}
          >
            Lock
          </button>
        </div>
      </header>

      <section className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Checked in", data.guests.length, `${data.guests.filter((g) => g.sex === "Lady").length} ladies · ${data.guests.filter((g) => g.sex === "Guy").length} guys`],
          ["Meal orders", data.meals.length, `${new Set(data.meals.map((m) => m.name)).size} people`],
          ["Room partners", Math.floor(matched), `matched pairs · ${data.roommates.length} requests`],
          ["Movie votes", data.movies.length, `${data.games.length} joined games · ${data.awards.length} nominations`],
        ].map(([k, v, sub]) => (
          <div key={String(k)} className="card p-3">
            <div className="eyebrow">{k}</div>
            <div className="mt-1 text-3xl font-bold">{v}</div>
            <div className="text-[11px] text-white/55">{sub}</div>
          </div>
        ))}
      </section>

      <nav className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((x) => (
          <button key={x.id} className={`chip shrink-0 ${x.id === tab ? "chip-on" : ""}`} onClick={() => setTab(x.id)}>
            {x.label} ({data[x.id].length})
          </button>
        ))}
      </nav>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input className="input max-w-xs text-sm" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn px-3 py-2 text-sm" onClick={() => download(`staycation-${tab}.csv`, csv(data[tab], t.cols))}>
          ⬇ Download {t.label} (spreadsheet)
        </button>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-white/5 text-[11px] uppercase tracking-wider text-white/60">
            <tr>
              {t.cols.map(([k, h]) => (
                <th key={k} className="px-3 py-2">
                  {h}
                </th>
              ))}
              {tab === "guests" && <th className="px-3 py-2">Send key card</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((r, i) => (
              <tr key={i} className="align-top hover:bg-white/5">
                {t.cols.map(([k]) => (
                  <td key={k} className={`px-3 py-2 ${k === "card" ? "font-mono" : ""}`}>
                    {k === "at" || k === "checkedIn" ? when(r[k]) : r[k]}
                  </td>
                ))}
                {tab === "guests" && (
                  <td className="whitespace-nowrap px-3 py-2">
                    {r.email ? (
                      <span className="flex gap-1.5">
                        <a className="btn px-2.5 py-1 text-xs" href={emailFor(r, data.event).mailto}>
                          ✉ Email
                        </a>
                        <button
                          className="btn-ghost px-2.5 py-1 text-xs"
                          onClick={async () => {
                            const m = emailFor(r, data.event);
                            await navigator.clipboard.writeText(`To: ${m.to}\nSubject: ${m.subject}\n\n${m.body}`);
                            setCopied(r.card);
                            setTimeout(() => setCopied(""), 1500);
                          }}
                        >
                          {copied === r.card ? "Copied ✓" : "Copy"}
                        </button>
                      </span>
                    ) : (
                      <span className="text-white/40">no email</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="px-3 py-6 text-center text-white/50" colSpan={t.cols.length + 1}>
                  Nothing yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-white/40">Read-only: this page never changes or deletes anything.</p>
    </main>
  );
}
