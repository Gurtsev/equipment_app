import { useQuery } from '@tanstack/react-query';
import Modal from '../ui/Modal';
import { getQRCode } from '../../api/client';

export default function QRModal({ asset, onClose }) {
    const { data, isLoading } = useQuery({
        queryKey: ['qr', asset?.serial_number],
        queryFn: () => getQRCode(asset.serial_number),
        enabled: !!asset,
    });

    const handlePrint = () => {
        const win = window.open('', '_blank');
        win.document.write(`
            <html><body style="text-align:center;font-family:sans-serif">
            <h3>${asset.title}</h3>
            <p>${asset.serial_number}</p>
            <img src="${data.image}" style="width:200px"/>
            </body></html>
        `);
        win.print();
        win.close();
    };

    return (
        <Modal isOpen={!!asset} onClose={onClose} title="QR-код">
            {isLoading ? (
                <p>Генерация...</p>
            ) : (
                <div style={{ textAlign: 'center' }}>
                    <p style={{ marginBottom: '0.5rem', fontWeight: 500 }}>{asset?.title}</p>
                    <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.875rem' }}>{asset?.serial_number}</p>
                    {data && <img src={data.image} alt="QR" style={{ width: 200, height: 200 }} />}
                    <div style={{ marginTop: '1rem' }}>
                        <button className="btn btn-primary" onClick={handlePrint}>Печать</button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
