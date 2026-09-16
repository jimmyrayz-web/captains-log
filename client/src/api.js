const BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function listEntries() {
  return request('/api/entries');
}

export function getEntry(id) {
  return request(`/api/entries/${id}`);
}

export function createEntry(data) {
  return request('/api/entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function updateEntry(id, data) {
  return request(`/api/entries/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function deleteEntry(id) {
  return request(`/api/entries/${id}`, { method: 'DELETE' });
}

export function uploadPhotos(entryId, files) {
  const formData = new FormData();
  for (const file of files) formData.append('photos', file);
  return request(`/api/entries/${entryId}/photos`, {
    method: 'POST',
    body: formData,
  });
}

export function deletePhoto(photoId) {
  return request(`/api/photos/${photoId}`, { method: 'DELETE' });
}

export function photoUrl(photoId) {
  return `${BASE}/api/photos/${photoId}/file`;
}
