export default function AssetLogTable({ logs }) {
    if (!logs.length) return <p style={{ color: '#888' }}>История пуста</p>;

    return (
        <table className="log-table">
            <thead>
                <tr>
                    <th>Дата</th>
                    <th>Событие</th>
                    <th>Описание</th>
                    <th>Сотрудник</th>
                </tr>
            </thead>
            <tbody>
                {logs.map(l => (
                    <tr key={l.id}>
                        <td>{new Date(l.created_at).toLocaleString('ru-RU')}</td>
                        <td><span className="event-type">{l.event_type}</span></td>
                        <td>{l.description}</td>
                        <td>{l.employee_name || '—'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
