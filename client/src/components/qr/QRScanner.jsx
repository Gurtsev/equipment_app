import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import { getAssetBySerial } from '../../api/client';

export default function QRScanner() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const rafRef = useRef(null);
    const streamRef = useRef(null);
    const [error, setError] = useState(null);
    const [scanning, setScanning] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        let active = true;

        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(stream => {
                if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
                streamRef.current = stream;
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                tick();
            })
            .catch(() => setError('Нет доступа к камере'));

        function tick() {
            if (!active) return;
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
                rafRef.current = requestAnimationFrame(tick);
                return;
            }
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
                setScanning(false);
                getAssetBySerial(code.data)
                    .then(asset => navigate(`/assets/${asset.id}`))
                    .catch(() => {
                        setError(`Оборудование не найдено: ${code.data}`);
                        setScanning(true);
                        rafRef.current = requestAnimationFrame(tick);
                    });
                return;
            }
            rafRef.current = requestAnimationFrame(tick);
        }

        return () => {
            active = false;
            cancelAnimationFrame(rafRef.current);
            streamRef.current?.getTracks().forEach(t => t.stop());
        };
    }, [navigate]);

    return (
        <div className="scanner-wrap">
            {error && <p className="scanner-error">{error}</p>}
            <video ref={videoRef} className="scanner-video" playsInline muted />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            {!scanning && !error && <p className="scanner-status">Распознавание...</p>}
        </div>
    );
}
