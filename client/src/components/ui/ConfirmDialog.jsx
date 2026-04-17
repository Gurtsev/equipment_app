import Modal from './Modal';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message }) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title || 'Подтверждение'}>
            <p style={{ marginBottom: '1.5rem' }}>{message}</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
                <button className="btn btn-danger" onClick={() => { onConfirm(); onClose(); }}>Удалить</button>
            </div>
        </Modal>
    );
}
