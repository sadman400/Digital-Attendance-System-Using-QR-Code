import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../utils/api';
import { QrCode, CheckCircle, XCircle, Camera, AlertCircle, Sparkles } from 'lucide-react';

function ScanQR() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef(null);
  const isScanning = useRef(false);

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    setScanning(true);
    setResult(null);
    setError('');
    setCameraError('');

    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      // Try to get back camera first (for mobile), fallback to any camera
      let cameraId = null;
      
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          // Prefer back camera on mobile
          const backCamera = devices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('rear') ||
            device.label.toLowerCase().includes('environment')
          );
          cameraId = backCamera ? backCamera.id : devices[0].id;
        }
      } catch (e) {
        console.log('Could not enumerate cameras, using facingMode');
      }

      isScanning.current = true;

      if (cameraId) {
        await html5QrCode.start(
          cameraId,
          config,
          onScanSuccess,
          onScanError
        );
      } else {
        // Fallback to facingMode for mobile
        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          onScanSuccess,
          onScanError
        );
      }
    } catch (err) {
      console.error('Camera error:', err);
      isScanning.current = false;
      setScanning(false);
      
      if (err.toString().includes('NotAllowedError') || err.toString().includes('Permission')) {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings and try again.');
      } else if (err.toString().includes('NotFoundError')) {
        setCameraError('No camera found on this device.');
      } else if (err.toString().includes('NotReadableError')) {
        setCameraError('Camera is being used by another application. Please close other apps using the camera.');
      } else if (err.toString().includes('OverconstrainedError')) {
        setCameraError('Camera constraints not satisfied. Trying alternative...');
        // Try with user-facing camera as fallback
        try {
          const html5QrCode = scannerRef.current || new Html5Qrcode('qr-reader');
          scannerRef.current = html5QrCode;
          isScanning.current = true;
          await html5QrCode.start(
            { facingMode: "user" },
            { fps: 10, qrbox: { width: 200, height: 200 } },
            onScanSuccess,
            onScanError
          );
          setCameraError('');
          setScanning(true);
          return;
        } catch (e) {
          setCameraError('Could not access any camera. Please check permissions.');
        }
      } else {
        setCameraError(`Camera error: ${err.message || err}`);
      }
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && isScanning.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        console.log('Error stopping scanner:', e);
      }
    }
    scannerRef.current = null;
    isScanning.current = false;
    setScanning(false);
  };

  const onScanSuccess = async (decodedText) => {
    stopScanning();
    setLoading(true);

    try {
      const qrData = JSON.parse(decodedText);
      
      if (new Date() > new Date(qrData.expiresAt)) {
        setError('This QR code has expired. Please ask your teacher to generate a new one.');
        setLoading(false);
        return;
      }

      const response = await api.post('/attendance/mark', {
        sessionCode: qrData.sessionCode,
        classId: qrData.classId
      });

      setResult({
        success: true,
        message: response.data.message,
        className: qrData.className
      });
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('Invalid QR code format');
      } else {
        setError(err.response?.data?.message || 'Failed to mark attendance');
      }
    } finally {
      setLoading(false);
    }
  };

  const onScanError = (error) => {
    console.debug('Scan error:', error);
  };

  const resetScanner = () => {
    setResult(null);
    setError('');
    setScanning(false);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Scan QR Code</h1>
        <p className="text-gray-400 mt-1">Scan the QR code displayed by your teacher</p>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-[#1a1f2e] to-[#151928] border border-white/10 p-6">
        {!scanning && !result && !error && (
          <div className="text-center py-12">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center mx-auto mb-6">
              <QrCode className="h-12 w-12 text-cyan-400" />
            </div>
            <p className="text-gray-400 mb-8 max-w-xs mx-auto">
              Click the button below to start scanning the attendance QR code
            </p>
            <button
              onClick={startScanning}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all font-medium"
            >
              <Camera className="h-5 w-5" />
              Start Scanning
            </button>
          </div>
        )}

        {scanning && (
          <div>
            <div id="qr-reader" className="rounded-xl overflow-hidden bg-black min-h-[300px]"></div>
            <button
              onClick={stopScanning}
              className="w-full mt-4 px-4 py-3.5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
          </div>
        )}

        {cameraError && (
          <div className="text-center py-12">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-12 w-12 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Camera Access Issue
            </h3>
            <p className="text-yellow-400 mb-6 max-w-xs mx-auto text-sm">{cameraError}</p>
            <div className="space-y-3">
              <button
                onClick={startScanning}
                className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all font-medium"
              >
                Try Again
              </button>
              <p className="text-xs text-gray-500">
                Make sure to allow camera permissions when prompted
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-14 w-14 border-2 border-cyan-500 border-t-transparent mx-auto"></div>
            <p className="mt-6 text-gray-400">Marking attendance...</p>
          </div>
        )}

        {result && (
          <div className="text-center py-12">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-12 w-12 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Attendance Marked!
            </h3>
            <p className="text-gray-400 mb-2">{result.message}</p>
            <p className="text-cyan-400 font-medium text-lg">{result.className}</p>
            <button
              onClick={resetScanner}
              className="mt-8 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all font-medium"
            >
              Scan Another
            </button>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center mx-auto mb-6">
              <XCircle className="h-12 w-12 text-red-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Error
            </h3>
            <p className="text-red-400 mb-6">{error}</p>
            <button
              onClick={resetScanner}
              className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all font-medium"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="rounded-2xl bg-cyan-500/10 border border-cyan-500/20 p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <p className="font-medium text-white mb-2">How to mark attendance:</p>
            <ol className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs text-cyan-400 flex-shrink-0 mt-0.5">1</span>
                Ask your teacher to display the QR code
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs text-cyan-400 flex-shrink-0 mt-0.5">2</span>
                Click "Start Scanning" and point your camera at the QR code
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs text-cyan-400 flex-shrink-0 mt-0.5">3</span>
                Wait for the confirmation message
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScanQR;
