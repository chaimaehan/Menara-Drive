import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, X, Download } from 'lucide-react';

const GOLD = '#AA9766';

const QRCodeLivraison = ({ livraison }) => {
  const [showModal, setShowModal] = useState(false);

  const qrData = String(livraison.id);

  const downloadQR = () => {
    const svg = document.getElementById('qr-' + livraison.id);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      const a = document.createElement('a');
      a.download = 'livraison-' + livraison.id + '.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className='flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-white transition-all'
        style={{ background: GOLD }}
        title='Voir QR Code'
      >
        <QrCode className='w-3 h-3' />
        QR
      </button>

      {showModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl'>
            
            <div className='flex items-center justify-between mb-4'>
              <div>
                <h3 className='font-bold text-lg' style={{ color: '#2c2b26' }}>
                  QR Code Livraison #{livraison.id}
                </h3>
                <p className='text-sm' style={{ color: GOLD }}>
                  {livraison.client_nom}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className='p-1 rounded-lg hover:opacity-70'
                style={{ color: GOLD }}
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            <div className='flex justify-center mb-4 p-4 rounded-xl' style={{ background: '#F8F5EB' }}>
              <QRCodeSVG
                id={'qr-' + livraison.id}
                value={qrData}
                size={200}
                fgColor='#2c2b26'
                bgColor='#F8F5EB'
                level='H'
                includeMargin={true}
              />
            </div>

            <div className='text-center mb-4'>
              <p className='text-xs text-gray-500'>Scannez ce QR code pour confirmer la livraison</p>
              <p className='text-xs font-bold mt-1' style={{ color: GOLD }}>ID: {livraison.id}</p>
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <button
                onClick={downloadQR}
                className='flex items-center justify-center gap-2 py-2 rounded-xl text-white text-sm font-medium'
                style={{ background: GOLD }}
              >
                <Download className='w-4 h-4' />
                Télécharger
              </button>
              <button
                onClick={() => setShowModal(false)}
                className='py-2 rounded-xl text-sm font-medium border'
                style={{ borderColor: '#E8E0CC', color: GOLD }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QRCodeLivraison;
