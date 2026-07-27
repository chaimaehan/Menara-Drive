import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, CheckCircle, XCircle, Camera, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const GOLD = '#AA9766';

const QRScanner = ({ user, onLogout }) => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [manualId, setManualId] = useState('');
  const scannerRef = useRef(null);
  const navigate = useNavigate();

  const startScanner = () => {
    setResult(null);
    setScanning(true);
  };

  useEffect(() => {
    if (scanning) {
      const scanner = new Html5QrcodeScanner('qr-reader', {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
      }, false);

      scanner.render(
        async (decodedText) => {
          scanner.clear();
          setScanning(false);
          await confirmerLivraison(decodedText);
        },
        (errorMessage) => {}
      );

      scannerRef.current = scanner;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, [scanning]);

  const confirmerLivraison = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(
        'http://localhost/OptiTruck/backend/controllers/adminLivraisons/livraisons.php',
        { 
          id: parseInt(id), 
          livree: 1, 
          status: 'completed',
          completed_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        { headers: { Authorization: 'Bearer ' + token } }
      );
      if (res.data.success) {
        setResult({ success: true, message: 'Livraison #' + id + ' confirmee avec succes !' });
      } else {
        setResult({ success: false, message: 'Erreur: ' + (res.data.error || 'Inconnue') });
      }
    } catch (err) {
      setResult({ success: false, message: 'Erreur de connexion au serveur.' });
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualId) return;
    await confirmerLivraison(manualId);
    setManualId('');
  };

  return (
    <div className='min-h-screen' style={{ background: '#F8F5EB' }}>
      <div className='max-w-md mx-auto p-4'>

        {/* Header */}
        <div className='flex items-center gap-3 py-4 mb-4'>
          <button
            onClick={() => navigate('/chauffeur')}
            className='p-2 rounded-xl'
            style={{ background: '#fff', border: '1px solid #E8E0CC' }}
          >
            <ArrowLeft className='w-5 h-5' style={{ color: GOLD }} />
          </button>
          <div className='flex items-center gap-2'>
            <div className='p-2 rounded-xl' style={{ background: GOLD }}>
              <QrCode className='w-5 h-5 text-white' />
            </div>
            <div>
              <h1 className='text-xl font-bold' style={{ color: '#2c2b26' }}>Scanner QR Code</h1>
              <p className='text-xs' style={{ color: GOLD }}>Confirmer une livraison</p>
            </div>
          </div>
        </div>

        {/* Scanner */}
        <div className='bg-white rounded-2xl shadow-lg p-4 mb-4'>
          {!scanning ? (
            <button
              onClick={startScanner}
              className='w-full py-4 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-all'
              style={{ background: GOLD }}
            >
              <Camera className='w-5 h-5' />
              Ouvrir la camera
            </button>
          ) : (
            <div>
              <div id='qr-reader' className='w-full' />
              <button
                onClick={() => { scannerRef.current?.clear(); setScanning(false); }}
                className='w-full mt-3 py-2 rounded-xl text-white font-medium'
                style={{ background: '#ef4444' }}
              >
                Annuler
              </button>
            </div>
          )}
        </div>

        {/* Saisie manuelle */}
        <div className='bg-white rounded-2xl shadow-lg p-4 mb-4'>
          <h2 className='font-bold mb-1' style={{ color: '#2c2b26' }}>Saisie manuelle</h2>
          <p className='text-xs text-gray-500 mb-3'>Entrez l ID de livraison manuellement</p>
          <form onSubmit={handleManualSubmit} className='flex gap-2'>
            <input
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              type='number'
              placeholder='ID livraison...'
              className='flex-1 px-3 py-2 border rounded-xl text-sm outline-none'
              style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
            />
            <button
              type='submit'
              className='px-4 py-2 rounded-xl text-white font-medium text-sm'
              style={{ background: GOLD }}
            >
              Confirmer
            </button>
          </form>
        </div>

        {/* Resultat */}
        {result && (
          <div
            className='rounded-2xl shadow-lg p-4 flex items-center gap-3'
            style={{
              background: result.success ? '#f0fdf4' : '#fff5f5',
              border: '1px solid ' + (result.success ? '#86efac' : '#fecaca')
            }}
          >
            {result.success
              ? <CheckCircle className='w-6 h-6 text-green-500 flex-shrink-0' />
              : <XCircle className='w-6 h-6 text-red-500 flex-shrink-0' />
            }
            <p className='font-medium text-sm' style={{ color: result.success ? '#166534' : '#991b1b' }}>
              {result.message}
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default QRScanner;
