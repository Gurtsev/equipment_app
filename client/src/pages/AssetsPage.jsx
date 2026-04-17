import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAssets, deleteAsset } from '../api/client';
import StatusBadge from '../components/assets/StatusBadge';
import AssetForm from '../components/assets/AssetForm';
import QRModal from '../components/qr/QRModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import SearchInput from '../components/ui/SearchInput';

export default function AssetsPage() {
    const qc = useQueryClient();
    const { data: assets = [], isLoading } = useQuery({ queryKey: ['assets'], queryFn: getAssets });

    const [search, setSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [qrAsset, setQrAsset] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const deleteMutation = useMutation({
        mutationFn: deleteAsset,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
    });

    const filtered = assets.filter(a =>
        `${a.title} ${a.serial_number} ${a.employee_name ?? ''}`.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="page">
            <div className="page-header">
                <h1>Оборудование</h1>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <SearchInput value={search} onChange={setSearch} placeholder="Поиск по названию, серийному номеру..." />
                    <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Добавить</button>
                </div>
            </div>

            {isLoading ? (
                <p>Загрузка...</p>
            ) : (
                <table className="asset-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Название</th>
                            <th>Серийный номер</th>
                            <th>Статус</th>
                            <th>Ответственный</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(a => (
                            <tr key={a.id}>
                                <td>{a.id}</td>
                                <td><Link to={`/assets/${a.id}`}>{a.title}</Link></td>
                                <td className="mono">{a.serial_number}</td>
                                <td><StatusBadge status={a.status} /></td>
                                <td>{a.employee_name || '—'}</td>
                                <td className="row-actions">
                                    <button className="btn btn-sm" onClick={() => setQrAsset(a)}>QR</button>
                                    <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(a)}>Удалить</button>
                                </td>
                            </tr>
                        ))}
                        {!filtered.length && (
                            <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888' }}>Ничего не найдено</td></tr>
                        )}
                    </tbody>
                </table>
            )}

            <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Добавить оборудование">
                <AssetForm onClose={() => setShowAdd(false)} />
            </Modal>

            <QRModal asset={qrAsset} onClose={() => setQrAsset(null)} />

            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
                title="Удалить оборудование"
                message={`Удалить "${deleteTarget?.title}"? Это действие необратимо.`}
            />
        </div>
    );
}
