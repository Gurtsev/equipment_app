import { useState, useEffect } from 'react';

export default function SearchInput({ value, onChange, placeholder = 'Поиск...' }) {
    const [local, setLocal] = useState(value);

    useEffect(() => {
        const t = setTimeout(() => onChange(local), 200);
        return () => clearTimeout(t);
    }, [local]);

    return (
        <input
            className="search-input"
            type="text"
            value={local}
            onChange={e => setLocal(e.target.value)}
            placeholder={placeholder}
        />
    );
}
