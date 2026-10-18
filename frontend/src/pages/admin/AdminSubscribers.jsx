import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import api from '../../api/client';
import { pushToast } from '../../store/uiSlice';
import { formatDate } from '../../lib/format';
import { Mail, Trash, Upload, Search } from '../../components/ui/Icons';

/** Newsletter sign-ups from the storefront, with a spreadsheet download. */
export default function AdminSubscribers() {
  const dispatch = useDispatch();
  const [list, setList] = useState(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    api
      .get('/newsletter', { auth: true })
      .then((d) => setList(d.subscribers))
      .catch((err) => {
        setList([]);
        dispatch(pushToast({ message: err.message, kind: 'bad' }));
      });
  }, [dispatch]);

  const shown = (list || []).filter((s) => !q.trim() || s.email.includes(q.trim().toLowerCase()));

  const download = () => {
    const rows = [['Email', 'Signed up'], ...(list || []).map((s) => [s.email, new Date(s.createdAt).toISOString()])];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText((list || []).map((s) => s.email).join(', '));
      dispatch(pushToast({ message: 'All emails copied', kind: 'ok' }));
    } catch {
      dispatch(pushToast({ message: 'Could not copy. Use the download instead.', kind: 'bad' }));
    }
  };

  const remove = async (s) => {
    if (!window.confirm(`Remove ${s.email} from the list?`)) return;
    try {
      await api.del(`/newsletter/${s.id}`, { auth: true });
      setList((l) => l.filter((x) => x.id !== s.id));
      dispatch(pushToast({ message: 'Subscriber removed', kind: 'ok' }));
    } catch (err) {
      dispatch(pushToast({ message: err.message, kind: 'bad' }));
    }
  };

  return (
    <>
      <div className="a-tools">
        <div className="search">
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search emails…" aria-label="Search emails" />
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={copy} disabled={!list?.length}>
          <Mail size={15} /> Copy all
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={download} disabled={!list?.length}>
          <Upload size={15} /> Download CSV
        </button>
      </div>

      <div className="a-panel fill">
        {!list ? (
          <div className="page-load" style={{ minHeight: 260 }}>
            <div className="spin" />
          </div>
        ) : shown.length === 0 ? (
          <div className="a-empty">
            <i>
              <Mail size={26} />
            </i>
            <h3>{list.length ? 'No match' : 'No subscribers yet'}</h3>
            <p>People who sign up in the newsletter band above the footer appear here.</p>
          </div>
        ) : (
          <div className="t-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Signed up</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {shown.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <a href={`mailto:${s.email}`} className="a-link">
                        {s.email}
                      </a>
                    </td>
                    <td>{formatDate(s.createdAt)}</td>
                    <td>
                      <div className="row-act">
                        <button type="button" className="mini danger" onClick={() => remove(s)} aria-label={`Remove ${s.email}`}>
                          <Trash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
