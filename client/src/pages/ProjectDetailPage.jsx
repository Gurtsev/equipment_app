import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProject, getAssets, assignAsset, releaseAsset } from '../api/client';
import StatusBadge from '../components/assets/StatusBadge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';

function AssignModal({ projectId, onClose }) {
    const qc = useQueryClient();
    const { data: assets = [] } = useQuery({ queryKey: ['assets'], queryFn: getAssets });
    const [selected, setSelected] = useState('');
    const [note, setNote] = useState('');

    const free = assets.filter(a => a.status !== 'В проекте');

    const mutation = useMutation({
        mutationFn: () => assignAsset(projectId, { asset_id: Number(selected), note }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['project', projectId] });
            qc.invalidateQueries({ queryKey: ['assets'] });
            onClose();
        },
    });

    return (
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="asset-form">
            <div className="form-group">
                <label>Оборудование</label>
                <select required value={selected} onChange={e => setSelected(e.target.value)}>
                    <option value="">— выберите —</option>
                    {free.map(a => <option key={a.id} value={a.id}>{a.title} ({a.serial_number})</option>)}
                </select>
            </div>
            <div className="form-group">
                <label>Примечание</label>
                <input value={note} onChange={e => setNote(e.target.value)} />
            </div>
            {mutation.isError && <p className="form-error">{mutation.error.message}</p>}
            <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={onClose}>Отмена</button>
                <button type="submit" className="btn btn-primary" disabled={mutation.isPending || !selected}>
                    {mutation.isPending ? 'Назначение...' : 'Назначить'}
                </button>
            </div>
        </form>
    );
}

export default function ProjectDetailPage() {
    const { id } = useParams();
    const qc = useQueryClient();

    const { data: project, isLoading } = useQuery({ queryKey: ['project', id], queryFn: () => getProject(id) });
    const [showAssign, setShowAssign] = useState(false);
    const [releaseTarget, setReleaseTarget] = useState(null);

    const releaseMutation = useMutation({
        mutationFn: (assetId) => releaseAsset(id, assetId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['project', id] });
            qc.invalidateQueries({ queryKey: ['assets'] });
        },
    });

    if (isLoading) return <div className="page"><p>Загрузка...</p></div>;
    if (!project) return <div className="page"><p>Не найдено</p></div>;

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <Link to="/projects" className="back-link">← Все проекты</Link>
                    <h1>{project.name}</h1>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAssign(true)}>+ Добавить оборудование</button>
            </div>

            {project.description && <p style={{ color: '#555', marginBottom: '1.5rem' }}>{project.description}</p>}

            <h2>Оборудование в проекте ({project.assets?.length ?? 0})</h2>

            <table className="asset-table" style={{ marginTop: '1rem' }}>
                <thead>
                    <tr><th>Название</th><th>Серийный номер</th><th>Статус</th><th>Ответственный</th><th>Назначено</th><th>Примечание</th><th></th></tr>
                </thead>
                <tbody>
                    {project.assets?.map(a => (
                        <tr key={a.id}>
                            <td><Link to={`/assets/${a.id}`}>{a.title}</Link></td>
                            <td className="mono">{a.serial_number}</td>
                            <td><StatusBadge status={a.status} /></td>
                            <td>{a.employee_name || '—'}</td>
                            <td>{new Date(a.assigned_at).toLocaleDateString('ru-RU')}</td>
                            <td>{a.note || '—'}</td>
                            <td><button className="btn btn-sm btn-danger" onClick={() => setReleaseTarget(a)}>Освободить</button></td>
                        </tr>
                    ))}
                    {!project.assets?.length && (
                        <tr><td colSpan={7} style={{ textAlign: 'center', color: '#888' }}>Оборудование не добавлено</td></tr>
                    )}
                </tbody>
            </table>

            <Modal isOpen={showAssign} onClose={() => setShowAssign(false)} title="Добавить оборудование в проект">
                <AssignModal projectId={id} onClose={() => setShowAssign(false)} />
            </Modal>

            <ConfirmDialog
                isOpen={!!releaseTarget}
                onClose={() => setReleaseTarget(null)}
                onConfirm={() => releaseMutation.mutate(releaseTarget.id)}
                title="Освободить оборудование"
                message={`Вернуть "${releaseTarget?.title}" на склад?`}
            />
        </div>
    );
}
