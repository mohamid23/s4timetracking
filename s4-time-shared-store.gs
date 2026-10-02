/**
 * S4 Connect, Time and Profitability: shared store.
 *
 * The HTML file works on its own with no backend, but then each person's time lives only in
 * their own browser. This script turns a Google Sheet into the one shared book everyone writes to.
 *
 * Setup, about five minutes:
 *   1. Create a new Google Sheet in the S4 shared drive. Name it something like "S4 Time Store".
 *   2. Extensions, Apps Script. Delete the sample code and paste this file in. Save.
 *   3. Optional but recommended: put a random string in TOKEN below, for example "s4-9f3k2p".
 *   4. Deploy, New deployment, type Web app.
 *        Execute as: Me
 *        Who has access: Anyone with the link
 *      Approve the permissions prompt. Copy the web app URL that ends in /exec.
 *   5. If you set a TOKEN, add it to the URL:  https://script.google.com/.../exec?t=s4-9f3k2p
 *   6. Open the HTML file, go to Setup, paste that URL into "Shared endpoint" and hit Connect.
 *      Send the same URL to everyone else with the HTML file.
 *
 * A note on security. Anyone holding this URL can read and write the book, so treat it like a
 * password and keep it in ClickUp behind your normal team access rather than anywhere public.
 * The token is what makes a guessed or leaked bare /exec URL useless.
 */

var SHEET_NAME = 'store';
var TOKEN = ''; // leave empty for no token, or set a random string and append ?t=THAT to the URL
var CHUNK = 40000; // a cell holds 50,000 characters, so long months are split across rows

function doPost(e) {
  var out;
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (TOKEN && (!e.parameter || e.parameter.t !== TOKEN)) {
      out = { error: 'Bad or missing token' };
    } else {
      var req = JSON.parse(e.postData.contents);
      if (req.action === 'ping') {
        out = { ok: true, sheet: SpreadsheetApp.getActiveSpreadsheet().getName() };
      } else if (req.action === 'get') {
        out = { ok: true, value: readKey(req.key) };
      } else if (req.action === 'set') {
        writeKey(req.key, req.value);
        out = { ok: true };
      } else if (req.action === 'list') {
        out = { ok: true, keys: listKeys(req.prefix || '') };
      } else {
        out = { error: 'Unknown action: ' + req.action };
      }
    }
  } catch (err) {
    out = { error: String(err) };
  } finally {
    lock.releaseLock();
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, note: 'S4 time store is running. The app talks to it by POST.' })
  ).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- sheet as key value store ---------- */

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['key', 'part', 'value', 'updated']);
  }
  return sh;
}

function rows_() {
  var sh = sheet_();
  var last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, 4).getValues();
}

function readKey(key) {
  var parts = rows_()
    .filter(function (r) { return r[0] === key; })
    .sort(function (a, b) { return a[1] - b[1]; })
    .map(function (r) { return r[2]; });
  return parts.length ? parts.join('') : null;
}

function listKeys(prefix) {
  var seen = {};
  rows_().forEach(function (r) {
    if (String(r[0]).indexOf(prefix) === 0) seen[r[0]] = true;
  });
  return Object.keys(seen);
}

function writeKey(key, value) {
  var kept = rows_().filter(function (r) { return r[0] !== key; });
  var now = new Date();
  var text = String(value == null ? '' : value);
  for (var i = 0; i < text.length; i += CHUNK) {
    kept.push([key, i / CHUNK, text.substring(i, i + CHUNK), now]);
  }
  var sh = sheet_();
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 4).clearContent();
  if (kept.length) sh.getRange(2, 1, kept.length, 4).setValues(kept);
}

/* ---------- optional: a readable tab finance can pivot ---------- */
/**
 * Run this by hand, or put it on a daily time driven trigger, and it writes every time entry
 * out to a flat "Entries" tab: date, person, client, service type, hours, cost.
 * Nothing in the app depends on it, it exists so the numbers can be checked outside the tool.
 */
function rebuildEntriesTab() {
  var cfg = JSON.parse(readKey('s4tt:config') || '{}');
  var people = {};
  (cfg.employees || []).forEach(function (e) { people[e.id] = e; });
  var clients = {};
  (cfg.clients || []).forEach(function (c) { clients[c.id] = c.name; });

  var out = [['Date', 'Person', 'Client', 'Service type', 'Hours', 'Labor cost']];
  listKeys('s4tt:entries:').forEach(function (k) {
    (JSON.parse(readKey(k) || '[]')).forEach(function (e) {
      var p = people[e.emp] || {};
      out.push([
        e.date,
        p.name || e.emp,
        clients[e.client] || e.client,
        e.svc,
        Number(e.hours) || 0,
        (Number(e.hours) || 0) * (Number(p.rate) || 0),
      ]);
    });
  });

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Entries') || ss.insertSheet('Entries');
  sh.clear();
  sh.getRange(1, 1, out.length, 6).setValues(out);
  sh.setFrozenRows(1);
}
