import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAsset, getAssetLogs, deleteAsset } from '../api/client';
import StatusBadge from '../components/assets/StatusBadge';
import AssetForm from '../components/assets/AssetForm';
import QRModal from '../components/qr/QRModal';
import AssetLogTable from '../components/history/AssetLogTable';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';

export default function AssetDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const qc = useQueryClient();

    const { data: asset, isLoading } = useQuery({ queryKey: ['asset', id], queryFn: () => getAsset(id) });
    const { data: logs = [] } = useQuery({ queryKey: ['assetLogs', id], queryFn: () => getAssetLogs(id) });

    const [showEdit, setShowEdit] = useState(false);
    const [showQR, setShowQR] = useState(false);
    const [showDelete, setShowDelete] = useState(false);

    const deleteMutation = useMutation({
        mutationFn: () => deleteAsset(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['assets'] });
            navigate('/assets');
        },
    });

    if (isLoading) return <div className="page"><p>Загрузка...</p></div>;
    if (!asset) return <div className="page"><p>Не найдено</p></div>;

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <Link to="/assets" className="back-link">← Все оборудование</Link>
                    <h1>{asset.title}</h1>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={() => setShowQR(true)}>QR-код</button>
                    <button className="btn btn-secondary" onClick={() => setShowEdit(true)}>Редактировать</button>
                    <button className="btn btn-danger" onClick={() => setShowDelete(true)}>Удалить</button>
                </div>
            </div>

            <div className="detail-card">
                <div className="detail-row"><span>Серийный номер</span><span className="mono">{asset.serial_number}</span></div>
                <div className="detail-row"><span>Статус</span><StatusBadge status={asset.status} /></div>
                <div className="detail-row"><span>Ответственный</span><span>{asset.employee_name || '—'}</span></div>
                <div className="detail-row"><span>Добавлено</span><span>{new Date(asset.created_at).toLocaleString('ru-RU')}</span></div>
            </div>

            <h2 style={{ marginTop: '2rem', marginBottom: '1rem' }}>История перемещений</h2>
            <AssetLogTable logs={logs} />

            <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Редактировать">
                <AssetForm initial={asset} onClose={() => setShowEdit(false)} />
            </Modal>

            <QRModal asset={showQR ? asset : null} onClose={() => setShowQR(false)} />

            <ConfirmDialog
                isOpen={showDelete}
                onClose={() => setShowDelete(false)}
                onConfirm={() => deleteMutation.mutate()}
                title="Удалить оборудование"
                message={`Удалить "${asset.title}"?`}
            />
        </div>
    );
}
