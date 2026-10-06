import JSZip from 'jszip';
import { listEntries, getEntry, createEntry, uploadPhotos, photoUrl } from './api.js';

export const CSV_COLUMNS = [
  ['date', 'Date'],
  ['departure_point', 'Departure'],
  ['departure_time', 'Departure Time'],
  ['departure_fuel', 'Departure Fuel'],
  ['arrival_point', 'Arrival'],
  ['arrival_time', 'Arrival Time'],
  ['arrival_fuel', 'Arrival Fuel'],
  ['distance_nm', 'Distance (nm)'],
  ['duration_hours', 'Duration (hrs)'],
  ['weather', 'Weather'],
  ['engine_hours', 'Engine Hours'],
  ['fuel_added_gal', 'Fuel Added (gal)'],
  ['oil_checked', 'Departure Checklist Complete'],
  ['crew', 'Crew'],
  ['maintenance_notes', 'Maintenance Notes'],
  ['notes', 'Notes'],
];

const CSV_LABEL_TO_KEY = Object.fromEntries(CSV_COLUMNS.map(([key, label]) => [label, key]));

const EXT_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  bmp: 'image/bmp',
};

function mimeForFilename(name) {
  const ext = name.split('.').pop().toLowerCase();
  return EXT_MIME[ext] || 'image/jpeg';
}

function csvCell(value) {
  const str = value == null ? '' : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

// Parses RFC4180-style CSV: quoted fields may contain commas, escaped
// quotes (""), and newlines.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\r') {
      // skip; \n (handled below) ends the row
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

function csvRowToPayload(record) {
  const num = (v) => (v && v.trim() !== '' ? Number(v) : null);
  return {
    date: record.date || '',
    departure_point: record.departure_point || '',
    departure_time: record.departure_time || '',
    arrival_point: record.arrival_point || '',
    arrival_time: record.arrival_time || '',
    weather: record.weather || '',
    maintenance_notes: record.maintenance_notes || '',
    notes: record.notes || '',
    engine_hours: num(record.engine_hours),
    distance_nm: num(record.distance_nm),
    duration_hours: num(record.duration_hours),
    fuel_added_gal: num(record.fuel_added_gal),
    departure_fuel: num(record.departure_fuel),
    arrival_fuel: num(record.arrival_fuel),
    oil_checked: (record.oil_checked || '').trim().toLowerCase() === 'yes',
    crew: (record.crew || '')
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

// Builds a .zip containing entries.csv (all fields plus a "Photos"
// column listing zip-relative paths) and a photos/ folder with the
// actual image bytes for every entry.
export async function exportEntriesZip() {
  const summaries = await listEntries();
  const zip = new JSZip();
  const photosFolder = zip.folder('photos');
  const rows = [];

  for (const summary of summaries) {
    const entry = await getEntry(summary.id);
    const photoPaths = [];
    for (const photo of entry.photos) {
      const res = await fetch(photoUrl(photo.id));
      const blob = await res.blob();
      const safeName = (photo.filename || `photo-${photo.id}`).replace(/[\\/]/g, '_');
      const path = `${photo.id}-${safeName}`;
      photosFolder.file(path, blob);
      photoPaths.push(`photos/${path}`);
    }
    rows.push({ entry, photoPaths });
  }

  const header = [...CSV_COLUMNS.map(([, label]) => label), 'Photos'].map(csvCell).join(',');
  const csvRows = rows.map(({ entry, photoPaths }) =>
    [
      ...CSV_COLUMNS.map(([key]) => {
        let value = entry[key];
        if (key === 'crew') value = (value || []).join('; ');
        if (key === 'oil_checked') value = value ? 'Yes' : 'No';
        return csvCell(value);
      }),
      csvCell(photoPaths.join('; ')),
    ].join(',')
  );
  zip.file('entries.csv', [header, ...csvRows].join('\n'));

  return zip.generateAsync({ type: 'blob' });
}

// Accepts either a .zip produced by exportEntriesZip (CSV + photos) or
// a plain .csv (text fields only, no photos). Creates one entry per
// data row and re-uploads any referenced photos found in the zip.
export async function importEntriesZip(file) {
  let csvText;
  let zip = null;
  const isZip = file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip';

  if (isZip) {
    zip = await JSZip.loadAsync(file);
    const csvFile = zip.file('entries.csv');
    if (!csvFile) throw new Error('No entries.csv found inside the zip.');
    csvText = await csvFile.async('string');
  } else {
    csvText = await file.text();
  }

  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    return { imported: 0, skipped: 0, photosImported: 0, empty: true };
  }

  const [headerRow, ...dataRows] = rows;
  const keysByColumn = headerRow.map((label) => {
    const trimmed = label.trim();
    return trimmed === 'Photos' ? 'photos' : CSV_LABEL_TO_KEY[trimmed];
  });

  let imported = 0;
  let skipped = 0;
  let photosImported = 0;

  for (const row of dataRows) {
    const record = {};
    keysByColumn.forEach((key, i) => {
      if (key) record[key] = row[i] ?? '';
    });
    if (!record.date) {
      skipped++;
      continue;
    }

    try {
      const created = await createEntry(csvRowToPayload(record));
      imported++;

      if (zip && record.photos) {
        const paths = record.photos
          .split(';')
          .map((p) => p.trim())
          .filter(Boolean);
        const files = [];
        for (const path of paths) {
          const zipEntry = zip.file(path);
          if (!zipEntry) continue;
          const blob = await zipEntry.async('blob');
          const filename = path.split('/').pop();
          files.push(new File([blob], filename, { type: mimeForFilename(filename) }));
        }
        if (files.length > 0) {
          await uploadPhotos(created.id, files);
          photosImported += files.length;
        }
      }
    } catch {
      skipped++;
    }
  }

  return { imported, skipped, photosImported, empty: false };
}
