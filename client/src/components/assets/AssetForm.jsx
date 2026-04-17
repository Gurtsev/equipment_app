import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEmployees, createAsset, updateAsset } from '../../api/client';

const STATUSES = ['На складе', 'У сотрудника', 'В ремонте', 'В проекте'];

export default function AssetForm({ initial, onClose }) {
    const qc = useQueryClient();
    const isEdit = !!initial;

    const [form, setForm] = useState({
        title: initial?.title ?? '',
        serial_number: initial?.serial_number ?? '',
        status: initial?.status ?? 'На складе',
        employee_id: initial?.employee_id ?? '',
    });

    const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: getEmployees });

    const mutation = useMutation({
        mutationFn: isEdit
            ? (body) => updateAsset(initial.id, body)
            : createAsset,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['assets'] });
            if (isEdit) qc.invalidateQueries({ queryKey: ['asset', initial.id] });
            onClose();
        },
    });

    const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

    const handleSubmit = (e) => {
        e.preventDefault();
        mutation.mutate({
            ...form,
            employee_id: form.employee_id || null,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="asset-form">
            <div className="form-group">
                <label>Название</label>
                <input required value={form.title} onChange={set('title')} />
            </div>
            <div className="form-group">
                <label>Серийный номер</label>
                <input required value={form.serial_number} onChange={set('serial_number')} />
            </div>
            <div className="form-group">
                <label>Статус</label>
                <select value={form.status} onChange={set('status')}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
            </div>
            <div className="form-group">
                <label>Ответственный</label>
                <select value={form.employee_id} onChange={set('employee_id')}>
                    <option value="">— не назначен —</option>
                    {employees.map(e => (
                        <option key={e.id} value={e.id}>{e.full_name}</option>
                    ))}
                </select>
            </div>
            {mutation.isError && <p className="form-error">{mutation.error.message}</p>}
            <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={onClose}>Отмена</button>
                <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Добавить'}
                </button>
            </div>
        </form>
    );
}
