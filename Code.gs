/**
 * PFE Vehicle Service — Google Sheets sync backend.
 *
 * Deploy: bind this script to the workbook (Extensions → Apps Script), then
 * Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone.
 * Copy the Web app URL into SCRIPT_URL in index.html.
 *
 * Design invariants (match PFE Tracker / Cropping App, hard-won):
 * - Header-mapped read/write. Values are matched to the header row, never by
 *   column position. New fields append to the END of a HEADERS list — never
 *   insert mid-schema (a mid-schema insert shifts every row and corrupts data).
 * - Row-level merge on push: for each incoming row, keep whichever updatedAt is
 *   newer (or the new row). Explicit deletes remove by id. Two writers editing
 *   different rows both survive.
 * - Data range is written as plain text so date / ISO-timestamp strings round-trip
 *   exactly (Sheets would otherwise auto-parse them into Date objects).
 * - A script lock serialises concurrent pushes.
 */

// Leave "" when this script is BOUND to the workbook (recommended). Otherwise put the Sheet id here.
const SHEET_ID = "";

const HEADERS = {
  Vehicles: ["id","name","rego","type","makeModel","year","assignedTo","location","currentKm","currentHours","status","notes","updatedAt","category"],  // category appended at END (never insert mid-schema)
  Plans:    ["id","vehicleId","task","priority","everyKm","everyHours","everyMonths","lastKm","lastHours","lastDate","parts","estHours","supplier","notes","updatedAt"],
  History:  ["id","vehicleId","date","task","km","hours","parts","cost","performedBy","notes","updatedAt"],
  Parts:    ["id","name","partNo","supplier","qty","reorder","unitCost","location","vehicleIds","notes","updatedAt"],
  Checks:   ["id","vehicleId","date","checkedBy","km","hours","items","note","updatedAt"]  // items = JSON string
};

// payload key (lowercase) -> sheet tab name
const TAB = { vehicles:"Vehicles", plans:"Plans", history:"History", parts:"Parts", checks:"Checks" };
const NUMERIC_SETTINGS = ["soonKm","soonHours","soonDays"];

function ss_() {
  return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function sheet_(ss, name) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]);
  }
  return sh;
}

function readObjects_(ss, name) {
  const headers = HEADERS[name];
  const sh = sheet_(ss, name);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const values = sh.getRange(2, 1, last - 1, headers.length).getValues();
  return values
    .filter(r => String(r[0] || "").trim() !== "")           // skip blank rows (no id)
    .map(r => {
      const o = {};
      headers.forEach((h, i) => { o[h] = r[i]; });
      return o;
    });
}

function writeObjects_(ss, name, rows) {
  const headers = HEADERS[name];
  const sh = sheet_(ss, name);
  sh.clearContents();                                        // clearContents, NOT deleteRows
  const out = [headers];
  rows.forEach(o => out.push(headers.map(h => o[h] == null ? "" : o[h])));
  const range = sh.getRange(1, 1, out.length, headers.length);
  range.setNumberFormat("@");                                // plain text — stops date auto-parsing
  range.setValues(out);
}

function mergeRows_(existing, incoming, deletes) {
  const map = {};
  existing.forEach(r => { map[String(r.id)] = r; });
  (incoming || []).forEach(r => {
    if (!r || !r.id) return;
    const cur = map[String(r.id)];
    if (!cur || String(r.updatedAt || "") >= String(cur.updatedAt || "")) {
      map[String(r.id)] = r;
    }
  });
  (deletes || []).forEach(idv => { delete map[String(idv)]; });
  return Object.keys(map).map(k => map[k]);
}

function readMeta_(ss) {
  const sh = sheet_(ss, "Meta");
  const last = sh.getLastRow();
  const out = {};
  if (last >= 2) {
    const values = sh.getRange(2, 1, last - 1, 2).getValues();
    values.forEach(([k, v]) => {
      if (String(k || "").trim() === "") return;
      out[k] = NUMERIC_SETTINGS.indexOf(k) >= 0 ? Number(v) : v;
    });
  }
  return out;
}

function writeMeta_(ss, obj) {
  const sh = ss.getSheetByName("Meta") || ss.insertSheet("Meta");
  const rows = [["key", "value"]];
  Object.keys(obj).forEach(k => rows.push([k, obj[k] == null ? "" : obj[k]]));
  sh.clearContents();
  const range = sh.getRange(1, 1, rows.length, 2);
  range.setNumberFormat("@");
  range.setValues(rows);
}

function snapshot_(ss) {
  const meta = readMeta_(ss);
  const lastModified = meta.lastModified || "";
  delete meta.lastModified;
  return {
    vehicles: readObjects_(ss, "Vehicles"),
    plans: readObjects_(ss, "Plans"),
    history: readObjects_(ss, "History"),
    parts: readObjects_(ss, "Parts"),
    checks: readObjects_(ss, "Checks"),
    settings: meta,
    lastModified: lastModified
  };
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return json_(snapshot_(ss_()));
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss = ss_();
    Object.keys(TAB).forEach(key => {
      const name = TAB[key];
      const existing = readObjects_(ss, name);
      const merged = mergeRows_(existing, payload[key] || [], (payload.deletes || {})[key] || []);
      writeObjects_(ss, name, merged);
    });
    const settings = payload.settings || readMeta_(ss);
    const lastModified = new Date().toISOString();
    settings.lastModified = lastModified;
    writeMeta_(ss, settings);
    return json_({ status: "ok", lastModified: lastModified, data: snapshot_(ss_()) });
  } catch (err) {
    return json_({ status: "error", message: String(err) });
  } finally {
    lock.releaseLock();
  }
}
