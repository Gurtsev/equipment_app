const STATUS_MAP = {
    'На складе':      'badge-green',
    'У сотрудника':   'badge-blue',
    'В ремонте':      'badge-yellow',
    'В проекте':      'badge-purple',
};

export default function StatusBadge({ status }) {
    return (
        <span className={`badge ${STATUS_MAP[status] || 'badge-gray'}`}>{status}</span>
    );
}
