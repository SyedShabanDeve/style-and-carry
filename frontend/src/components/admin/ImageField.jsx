import { useRef, useState } from 'react';
import { useDispatch } from 'react-redux';

import api from '../../api/client';
import { pushToast } from '../../store/uiSlice';
import { imageUrl } from '../../lib/format';
import { IMAGE_SIZES, sizeText, ratio, checkFit } from '../../lib/imageSizes';
import { Upload, X, Alert, Check, Image as ImageIcon } from '../ui/Icons';

const MAX_MB = 4;
const TYPES = 'image/jpeg,image/png,image/webp,image/avif';

/**
 * One image slot in the dashboard.
 *
 * Always states the size the slot needs, previews the image in exactly the
 * shape the storefront will show it, and warns when an upload is a different
 * shape or too small, so the owner knows to replace it with one that fits.
 */
export default function ImageField({ kind, value, onChange, label, optional = false, compact = false, was }) {
  const spec = IMAGE_SIZES[kind];
  const dispatch = useDispatch();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [dims, setDims] = useState(null);

  const warning = dims ? checkFit(kind, dims.w, dims.h) : null;

  const upload = async (files) => {
    const file = files?.[0];
    if (!file) return;
    if (!TYPES.split(',').includes(file.type)) {
      dispatch(pushToast({ message: 'Use a JPG, PNG, WebP or AVIF image', kind: 'bad' }));
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      dispatch(pushToast({ message: `That image is over ${MAX_MB} MB. Compress it and try again.`, kind: 'bad' }));
      return;
    }
    const data = new FormData();
    data.append('images', file);
    setBusy(true);
    try {
      const res = await api.upload('/admin/upload', data);
      setDims(null);
      onChange(res.images[0]);
    } catch (err) {
      dispatch(pushToast({ message: err.message, kind: 'bad' }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`imgf${compact ? ' imgf-compact' : ''}`}>
      <div className="imgf-head">
        <span className="imgf-label">
          {label || spec.label}
          {optional && <small> (optional)</small>}
        </span>
        <span className="imgf-size" title="Upload images at this size for a perfect fit">
          {sizeText(kind)}
        </span>
      </div>

      <div
        className={`imgf-box${value ? ' has' : ''}${over ? ' over' : ''}${spec.contain ? ' contain' : ''}`}
        style={{ aspectRatio: ratio(kind) }}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          upload(e.dataTransfer.files);
        }}
      >
        {value ? (
          <img
            src={imageUrl(value)}
            alt=""
            onLoad={(e) => setDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          />
        ) : (
          <button type="button" className="imgf-empty" onClick={() => input.current?.click()} disabled={busy}>
            <ImageIcon size={22} />
            <span>
              <b>Click to upload</b> or drop an image
            </span>
            <small>{sizeText(kind)}</small>
          </button>
        )}
        {busy && (
          <span className="imgf-busy">
            <span className="spin" /> Uploading…
          </span>
        )}
      </div>

      <p className="imgf-note">{spec.note} JPG, PNG or WebP, up to {MAX_MB} MB.</p>

      {value && dims && (
        <p className={`imgf-fit${warning ? ' warn' : ' ok'}`}>
          {warning ? <Alert size={14} /> : <Check size={14} />}
          <span>{warning || `${dims.w} × ${dims.h} px. Good fit.`}</span>
        </p>
      )}

      {was !== undefined && (was || '') !== (value || '') && (
        <div className="was was-img">
          <span className="was-k">Live now</span>
          {was ? <img src={imageUrl(was)} alt="Image that is live now" /> : <em>no image</em>}
          <button type="button" onClick={() => onChange(was || '')}>
            Undo
          </button>
        </div>
      )}

      <div className="imgf-act">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => input.current?.click()} disabled={busy}>
          <Upload size={14} /> {value ? 'Replace' : 'Upload'}
        </button>
        {value && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setDims(null);
              onChange('');
            }}
          >
            <X size={14} /> Remove
          </button>
        )}
      </div>

      <input
        ref={input}
        type="file"
        accept={TYPES}
        hidden
        onChange={(e) => {
          upload(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
