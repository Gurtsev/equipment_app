import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProjects, createProject, deleteProject } from '../api/client';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const STATUS_COLORS = {
    'Активный': 'badge-green',
    'Завершен': 'badge-gray',
    'Приостановлен': 'badge-yellow',
};

function ProjectForm({ onClose }) {
    const qc = useQueryClient();
    const [form, setForm] = useState({ name: '', description: '', status: 'Активный', started_at: '', ended_at: '' });
    const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

    const mutation = useMutation({
        mutationFn: createProject,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); onClose(); },
    });

    return (
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(form); }} className="asset-form">
            <div className="form-group"><label>Название</label><input required value={form.name} onChange={set('name')} /></div>
            <div className="form-group"><label>Описание</label><textarea value={form.description} onChange={set('description')} rows={3} /></div>
            <div className="form-group">
                <label>Статус</label>
                <select value={form.status} onChange={set('status')}>
                    {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
                </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group"><label>Начало</label><input type="date" value={form.started_at} onChange={set('started_at')} /></div>
                <div className="form-group"><label>Конец</label><input type="date" value={form.ended_at} onChange={set('ended_at')} /></div>
            </div>
            {mutation.isError && <p className="form-error">{mutation.error.message}</p>}
            <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={onClose}>Отмена</button>
                <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Создание...' : 'Создать'}
                </button>
            </div>
        </form>
    );
}

export default function ProjectsPage() {
    const qc = useQueryClient();
    const { data: projects = [], isLoading } = useQuery({ queryKey: ['projects'], queryFn: () => getProjects() });
    const [showAdd, setShowAdd] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const deleteMutation = useMutation({
        mutationFn: deleteProject,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
    });

    return (
        <div className="page">
            <div className="page-header">
                <h1>Проекты</h1>
                <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Создать</button>
            </div>

            {isLoading ? <p>Загрузка...</p> : (
                <div className="project-grid">
                    {projects.map(p => (
                        <div key={p.id} className="project-card">
                            <div className="project-card-header">
                                <Link to={`/projects/${p.id}`} className="project-name">{p.name}</Link>
                                <span className={`badge ${STATUS_COLORS[p.status] || 'badge-gray'}`}>{p.status}</span>
                            </div>
                            {p.description && <p className="project-desc">{p.description}</p>}
                            <div className="project-card-footer">
                                <span>{p.asset_count} ед. оборудования</span>
                                <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(p)}>Удалить</button>
                            </div>
                        </div>
                    ))}
                    {!projects.length && <p style={{ color: '#888' }}>Нет проектов</p>}
                </div>
            )}

            <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Новый проект">
                <ProjectForm onClose={() => setShowAdd(false)} />
            </Modal>

            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
                title="Удалить проект"
                message={`Удалить проект "${deleteTarget?.name}"?`}
            />
        </div>
    );
}
