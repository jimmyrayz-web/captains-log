import { useRef, useState } from 'react';
import { photoUrl, uploadPhotos, deletePhoto } from '../api.js';

export default function PhotoGallery({ entryId, photos, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef(null);

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    setError('');
    try {
      const updated = await uploadPhotos(entryId, files);
      onChange(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function handleDelete(photoId) {
    try {
      await deletePhoto(photoId);
      onChange(photos.filter((p) => p.id !== photoId));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h3 style={{ color: 'var(--navy)', marginBottom: '0.6rem' }}>Photos</h3>
      {error && <div className="error-banner">{error}</div>}

      {photos.length > 0 && (
        <div className="photo-grid" style={{ marginBottom: '1rem' }}>
          {photos.map((photo) => (
            <div className="photo-tile" key={photo.id}>
              <img src={photoUrl(photo.id)} alt={photo.filename || ''} />
              <button
                type="button"
                className="no-print"
                onClick={() => handleDelete(photo.id)}
                aria-label="Delete photo"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <label className="photo-upload no-print" style={{ display: 'block', cursor: 'pointer' }}>
        {uploading ? 'Uploading…' : '📷 Tap to add photos'}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          disabled={uploading}
          style={{ display: 'block', margin: '0.5rem auto 0' }}
        />
      </label>
    </div>
  );
}
