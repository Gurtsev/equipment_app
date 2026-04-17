import QRScanner from '../components/qr/QRScanner';

export default function ScanPage() {
    return (
        <div className="page">
            <div className="page-header">
                <h1>QR-сканер</h1>
            </div>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>
                Наведите камеру на QR-код оборудования для быстрого перехода к карточке.
            </p>
            <QRScanner />
        </div>
    );
}
