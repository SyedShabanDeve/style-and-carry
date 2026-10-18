import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

import api from '../../api/client';
import { pushToast } from '../../store/uiSlice';
import { fetchProducts } from '../../store/productsSlice';
import { fetchContent } from '../../store/contentSlice';
import { fetchSettings } from '../../store/settingsSlice';
import { formatDate } from '../../lib/format';
import { Database, Download, Upload, Refresh, Lock, Alert, Check, Clock, Info } from '../../components/ui/Icons';

/* Tells the dashboard frame (banner, bell, sidebar) the latest backup status. */
export const announceBackup = (status) => window.dispatchEvent(new CustomEvent('sc:backup', { detail: status }));

const REASONS = {
  weekly: 'Weekly copy (automatic)',
  manual: 'Saved by you',
  'before-restore': 'Saved just before a restore',
};

const daysAgo = (iso) => {
  if (!iso) return null;
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86400000);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  return `${d} days ago`;
};

const countsOf = (data) => ({
  products: data?.products?.length || 0,
  categories: data?.categories?.length || 0,
  admins: data?.users?.length || 0,
  orders: data?.orders?.length || 0,
  reviews: data?.reviews?.length || 0,
  subscribers: data?.subscribers?.length || 0,
});

const LABELS = [
  ['products', 'Products'],
  ['categories', 'Categories'],
  ['admins', 'Admins'],
  ['orders', 'Orders'],
  ['subscribers', 'Subscribers'],
  ['photos', 'Photos'],
];

function saveFile(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

const fileStem = (store) =>
  String(store || 'store')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'store';

const readme = (env) => `${env.storeName} - full backup
Made: ${new Date(env.createdAt).toLocaleString('en-PK')}${env.by ? ` by ${env.by}` : ''}

What is inside
  store-data.json  products, categories, homepage, settings, admins, orders,
                   reviews and subscribers
  photos/          every photo uploaded from the dashboard

To put it back
  Dashboard -> Backup -> Restore from a backup file -> choose this zip.
  A copy of the store as it is at that moment is saved first, so a restore
  can always be undone.

Keep this file private. It holds your admins' sign-in details (stored
safely, never the passwords themselves) and your customers' names, phone
numbers and addresses.
`;

/** One line of figures: products, categories, admins... */
function Figures({ counts, compare }) {
  return (
    <ul className="bk-figs">
      {LABELS.filter(([k]) => counts?.[k] !== undefined).map(([k, label]) => (
        <li key={k}>
          <b>{counts[k]}</b>
          <span>{label}</span>
          {compare && compare[k] !== undefined && compare[k] !== counts[k] && <small>now {compare[k]}</small>}
        </li>
      ))}
    </ul>
  );
}

export default function AdminBackup() {
  const dispatch = useDispatch();
  const me = useSelector((s) => s.auth.user);
  const storeName = useSelector((s) => s.settings.data.storeName) || 'Style & Carry';
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState(null);
  const [picked, setPicked] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const fileRef = useRef(null);

  const load = async () => {
    try {
      const st = await api.get('/backup/status', { auth: true });
      setStatus(st);
      announceBackup(st);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (me?.role === 'owner') load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (me && me.role !== 'owner') return <Navigate to="/admin" replace />;

  const toast = (title, message, kind = 'ok', ms) => dispatch(pushToast({ title, message, kind, ms }));

  /* ---------- download a full backup to this computer ---------- */
  const download = async () => {
    setBusy('download');
    setProgress({ pct: 3, label: 'Collecting your store data…' });
    try {
      const env = await api.get('/backup/data', { auth: true });
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const { photos = [], ...rest } = env;
      zip.file('store-data.json', JSON.stringify(rest, null, 2), { compression: 'DEFLATE' });
      zip.file('README.txt', readme(env), { compression: 'DEFLATE' });
      const folder = zip.folder('photos');

      const queue = [...photos];
      const missing = [];
      let done = 0;
      const tick = () => setProgress({ pct: 5 + Math.round((done / Math.max(1, photos.length)) * 80), label: `Adding photos ${done} of ${photos.length}…` });
      tick();
      const worker = async () => {
        while (queue.length) {
          const name = queue.shift();
          try {
            const r = await fetch(`/uploads/${encodeURIComponent(name)}`);
            if (!r.ok) throw new Error(String(r.status));
            folder.file(name, await r.arrayBuffer(), { binary: true });
          } catch {
            missing.push(name);
          }
          done++;
          tick();
        }
      };
      await Promise.all(Array.from({ length: 6 }, worker));

      setProgress({ pct: 88, label: 'Packing the file…' });
      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' }, (m) =>
        setProgress({ pct: 88 + Math.round(m.percent * 0.1), label: 'Packing the file…' })
      );
      saveFile(blob, `${fileStem(storeName)}-backup-${new Date().toISOString().slice(0, 10)}.zip`);

      const st = await api.post('/backup/done', { photos: photos.length - missing.length }, { auth: true });
      setStatus(st);
      announceBackup(st);
      const c = env.counts || {};
      toast(
        'Backup saved to your computer',
        `${c.products} products, ${c.categories} categories, ${c.admins} admins and ${photos.length - missing.length} photos. Look in your Downloads folder.`,
        'ok',
        9000
      );
      if (missing.length) toast('Some photos were not added', `${missing.length} photo${missing.length === 1 ? '' : 's'} could not be fetched. Try again later.`, 'warn', 9000);
    } catch (err) {
      toast('The backup could not be made', err.message || 'Please try again.', 'bad', 9000);
    } finally {
      setBusy('');
      setProgress(null);
    }
  };

  /* ---------- copies kept on the server ---------- */
  const saveCopy = async () => {
    setBusy('copy');
    try {
      const st = await api.post('/backup/copies', {}, { auth: true });
      setStatus(st);
      announceBackup(st);
      toast('Copy saved on the server', 'You can download or restore it below at any time.');
    } catch (err) {
      toast('The copy could not be saved', err.message, 'bad');
    } finally {
      setBusy('');
    }
  };

  const downloadCopy = async (c) => {
    setBusy(c.key);
    try {
      const env = await api.get(`/backup/copies/${encodeURIComponent(c.key)}`, { auth: true });
      const day = (c.createdAt || new Date().toISOString()).slice(0, 10);
      saveFile(new Blob([JSON.stringify(env, null, 2)], { type: 'application/json' }), `${fileStem(storeName)}-copy-${day}.json`);
      toast('Copy downloaded', 'This file has the store data. For photos too, use “Download full backup”.');
    } catch (err) {
      toast('The copy could not be downloaded', err.message, 'bad');
    } finally {
      setBusy('');
    }
  };

  /* ---------- restore ---------- */
  const pickFile = async (file) => {
    setPicked(null);
    setError(null);
    if (!file) return;
    setBusy('read');
    try {
      let env;
      let zip = null;
      if (/\.zip$/i.test(file.name) || /zip/.test(file.type)) {
        const { default: JSZip } = await import('jszip');
        zip = await JSZip.loadAsync(file);
        const f = zip.file('store-data.json');
        if (!f) throw new Error('This zip is not a Style & Carry backup: it has no store-data.json inside.');
        env = JSON.parse(await f.async('string'));
      } else {
        env = JSON.parse(await file.text());
      }
      const data = env?.app === 'style-and-carry' ? env.data : env;
      if (!data || !Array.isArray(data.products) || !Array.isArray(data.users)) {
        throw new Error('This file is not a Style & Carry backup.');
      }
      const photoFiles = zip ? Object.keys(zip.files).filter((p) => p.startsWith('photos/') && !zip.files[p].dir) : [];
      // Compare with the store as it is right now, not when the page opened.
      await load();
      setPicked({
        fileName: file.name,
        createdAt: env.createdAt || null,
        by: env.by || '',
        backup: env.app === 'style-and-carry' ? env : { app: 'style-and-carry', data },
        zip,
        photoFiles,
        counts: { ...countsOf(data), ...(zip ? { photos: photoFiles.length } : {}) },
      });
    } catch (err) {
      setError(err instanceof SyntaxError ? 'This file could not be read. Choose the .zip you downloaded from this page.' : err.message);
    } finally {
      setBusy('');
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const afterRestore = async (r) => {
    dispatch(fetchProducts({ includeInactive: true }));
    dispatch(fetchContent());
    dispatch(fetchSettings());
    setPicked(null);
    await load();
    const c = r.counts || {};
    toast(
      'Store restored',
      `${c.products} products, ${c.categories} categories and ${c.admins} admins are back. How it was just before is saved under “Copies on the server”.`,
      'ok',
      10000
    );
  };

  const restoreFile = async () => {
    const { backup, zip, photoFiles } = picked;
    setConfirm(null);
    setBusy('restore');
    try {
      if (zip && photoFiles.length) {
        setProgress({ pct: 4, label: 'Checking which photos are missing…' });
        const names = photoFiles.map((p) => p.slice('photos/'.length));
        const { missing } = await api.post('/backup/photos/check', { names }, { auth: true });
        let done = 0;
        for (const name of missing) {
          const blob = await zip.file(`photos/${name}`).async('blob');
          const fd = new FormData();
          fd.append('name', name);
          fd.append('file', blob, name);
          await api.post('/backup/photo', fd, { auth: true, raw: true });
          done++;
          setProgress({ pct: 5 + Math.round((done / missing.length) * 80), label: `Putting back photos ${done} of ${missing.length}…` });
        }
      }
      setProgress({ pct: 90, label: 'Restoring products, settings and admins…' });
      const r = await api.post('/backup/restore', { backup }, { auth: true });
      await afterRestore(r);
    } catch (err) {
      toast('The restore did not finish', `${err.message} Nothing was replaced unless you see “Store restored”.`, 'bad', 10000);
    } finally {
      setBusy('');
      setProgress(null);
    }
  };

  const restoreCopy = async (c) => {
    setConfirm(null);
    setBusy(c.key);
    try {
      const r = await api.post(`/backup/copies/${encodeURIComponent(c.key)}/restore`, {}, { auth: true });
      await afterRestore(r);
    } catch (err) {
      toast('The restore did not finish', err.message, 'bad', 10000);
    } finally {
      setBusy('');
    }
  };

  if (!status && !error) {
    return (
      <div className="page-load" role="status">
        <div className="spin" />
        <span>Loading backups…</span>
      </div>
    );
  }

  const due = status?.due;
  const working = Boolean(busy);

  return (
    <div className="a-scroll">
      <div className="bk">
        {error && !status && (
          <div className="alert alert-bad" role="alert">
            <Alert size={17} />
            <span>{error}</span>
          </div>
        )}

        {/* ---------- status + download ---------- */}
        {status && (
          <section className={`a-panel bk-hero${due ? ' is-due' : ' is-ok'}`}>
            <div className="bk-hero-in">
              <span className="bk-ico">{due ? <Clock size={26} /> : <Check size={26} />}</span>
              <div className="bk-hero-t">
                <span className={`pill ${due ? 'warn' : 'ok'}`}>{due ? 'Backup needed' : 'Backed up'}</span>
                <h2>{due ? 'Save a backup of your store' : 'Your store is backed up'}</h2>
                <p>
                  {status.lastBackupAt
                    ? `Last saved to your computer ${daysAgo(status.lastBackupAt)} (${formatDate(status.lastBackupAt)})${status.lastBackupBy ? ` by ${status.lastBackupBy}` : ''}.`
                    : 'You have not saved a backup to your computer yet.'}{' '}
                  We remind you every {status.remindAfterDays} days.
                </p>
              </div>
              <button type="button" className="btn btn-primary btn-lg bk-go" onClick={download} disabled={working}>
                {busy === 'download' ? <span className="spin" /> : <Download size={18} />} Download full backup
              </button>
            </div>

            <div className="bk-what">
              <span>What is saved</span>
              <Figures counts={status.current} />
            </div>

            {progress && busy === 'download' && (
              <div className="bk-progress" role="status" aria-live="polite">
                <div className="bk-bar">
                  <i style={{ width: `${Math.min(100, progress.pct)}%` }} />
                </div>
                <span>{progress.label}</span>
              </div>
            )}

            <p className="bk-note">
              <Lock size={14} /> The file holds your admins’ sign-in details and your customers’ names, phones and addresses. Keep it private,
              for example on a USB drive or in your own Google Drive.
            </p>
          </section>
        )}

        {/* ---------- server copies ---------- */}
        {status && (
          <section className="a-panel">
            <div className="a-panel-head">
              <div>
                <h2>Copies kept on the server</h2>
                <p>A copy is made every week and just before any restore. The newest 12 are kept.</p>
              </div>
              <button type="button" className="btn btn-outline btn-sm" onClick={saveCopy} disabled={working}>
                {busy === 'copy' ? <span className="spin" /> : <Database size={15} />} Save a copy now
              </button>
            </div>
            <div className="a-panel-body">
              {status.copies.length === 0 ? (
                <p className="bk-empty">No copies yet. The first weekly copy is made automatically.</p>
              ) : (
                <ul className="bk-copies">
                  {status.copies.map((c) => (
                    <li key={c.key}>
                      <span className="bk-copy-i">
                        <Database size={16} />
                      </span>
                      <div className="bk-copy-t">
                        <b>{c.createdAt ? formatDate(c.createdAt) : c.key}</b>
                        <span>
                          {REASONS[c.reason] || 'Copy'}
                          {c.createdAt ? ` · ${daysAgo(c.createdAt)}` : ''}
                        </span>
                      </div>
                      <div className="bk-copy-act">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => downloadCopy(c)} disabled={working}>
                          {busy === c.key ? <span className="spin" /> : <Download size={14} />} <span className="hide-sm">Download</span>
                        </button>
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => setConfirm({ kind: 'copy', copy: c })} disabled={working}>
                          <Refresh size={14} /> Restore
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {/* ---------- restore from a file ---------- */}
        {status && (
          <section className="a-panel">
            <div className="a-panel-head">
              <div>
                <h2>Restore from a backup file</h2>
                <p>Brings back products, categories, homepage, settings, admins, orders and photos from a backup you downloaded.</p>
              </div>
            </div>
            <div className="a-panel-body">
              {error && status && (
                <div className="alert alert-bad" role="alert">
                  <Alert size={17} />
                  <span>{error}</span>
                </div>
              )}
              {!picked ? (
                <label className={`bk-drop${busy === 'read' ? ' is-busy' : ''}`}>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".zip,.json,application/zip,application/json"
                    onChange={(e) => pickFile(e.target.files?.[0])}
                    disabled={working}
                  />
                  {busy === 'read' ? <span className="spin" /> : <Upload size={22} />}
                  <b>{busy === 'read' ? 'Reading the backup…' : 'Choose a backup file'}</b>
                  <span>The .zip you downloaded from this page (or a .json copy)</span>
                </label>
              ) : (
                <div className="bk-picked">
                  <div className="bk-picked-h">
                    <Info size={17} />
                    <div>
                      <b>{picked.fileName}</b>
                      <span>
                        {picked.createdAt ? `Made ${formatDate(picked.createdAt)}${picked.by ? ` by ${picked.by}` : ''}` : 'Date not recorded'}
                      </span>
                    </div>
                  </div>
                  <Figures counts={picked.counts} compare={status.current} />
                  <div className="bk-picked-act">
                    <button type="button" className="btn btn-ghost" onClick={() => setPicked(null)} disabled={working}>
                      Choose another file
                    </button>
                    <button type="button" className="btn btn-danger" onClick={() => setConfirm({ kind: 'file' })} disabled={working}>
                      {busy === 'restore' ? <span className="spin" /> : <Refresh size={15} />} Restore this backup
                    </button>
                  </div>
                </div>
              )}
              {progress && busy === 'restore' && (
                <div className="bk-progress" role="status" aria-live="polite">
                  <div className="bk-bar">
                    <i style={{ width: `${Math.min(100, progress.pct)}%` }} />
                  </div>
                  <span>{progress.label}</span>
                </div>
              )}
              {status.lastRestoreAt && <p className="bk-empty">Last restore: {formatDate(status.lastRestoreAt)}.</p>}
            </div>
          </section>
        )}
      </div>

      {confirm && (
        <div className="confirm">
          <div className="confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="bk-c-t">
            <div className="ring">
              <Refresh size={22} />
            </div>
            <h3 id="bk-c-t">Replace the store with this backup?</h3>
            <p>
              Products, categories, homepage, settings, admins and orders will all be replaced with the backup
              {confirm.kind === 'copy' && confirm.copy.createdAt ? ` from ${formatDate(confirm.copy.createdAt)}` : picked?.createdAt ? ` from ${formatDate(picked.createdAt)}` : ''}.
              A copy of the store as it is now is saved first, so you can undo this.
            </p>
            <div className="confirm-act">
              <button className="btn btn-outline" onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={() => (confirm.kind === 'copy' ? restoreCopy(confirm.copy) : restoreFile())}>
                Yes, restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
