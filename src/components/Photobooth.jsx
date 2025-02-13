import React, { useState, useRef, useEffect } from 'react';
import { Camera, Download, FlipHorizontal } from 'lucide-react';
import "./Photobooth.css";
import watermark from "../assets/asd.png";

const PhotoBooth = () => {
  const [capturing, setCapturing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [flash, setFlash] = useState(false);
  const [showFinalCard, setShowFinalCard] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const photoCardRef = useRef(null); // New ref for the photo card

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const startCamera = async () => {
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          aspectRatio: 1/1,
          width: { ideal: 480 },
          height: { ideal: 480 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };

  const toggleCamera = () => {
    setFacingMode(current => (current === 'user' ? 'environment' : 'user'));
  };

  const startCapturing = () => {
    setPhotos([]);
    setShowFinalCard(false);
    setCapturing(true);
    captureSequence(3);
  };

  const reloadPage = () => {
    window.location.reload();
  };


  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      setFlash(true);
      setTimeout(() => setFlash(false), 200);
      const context = canvasRef.current.getContext('2d');

      // Clear canvas first
      context.clearRect(0, 0, 480, 480); // Updated to square dimensions

      // Flip for front camera
      if (facingMode === 'user') {
        context.save();
        context.scale(-1, 1);
        context.drawImage(videoRef.current, -480, 0, 480, 480); // Updated to square dimensions
        context.restore();
      } else {
        context.drawImage(videoRef.current, 0, 0, 480, 480); // Updated to square dimensions
      }

      const photoData = canvasRef.current.toDataURL('image/jpeg');
      setPhotos(prev => [...prev, photoData]);
    }
  };

  const captureSequence = (remainingPhotos) => {
    if (remainingPhotos === 0) {
      setCapturing(false);
      setShowFinalCard(true);
      return;
    }

    let count = 3;
    const countdownTimer = setInterval(() => {
      setCountdown(count);
      if (count === 1) {
        setTimeout(() => {
          clearInterval(countdownTimer);
          setCountdown('Cheese!');
          setTimeout(() => {
            takePhoto();
            setCountdown(null);
            captureSequence(remainingPhotos - 1);
          }, 500);
        }, 1000);
      }
      count--;
    }, 1000);
  };

  const downloadPhotos = () => {
    if (photos.length === 0 || !photoCardRef.current) return;

    // Create a canvas with the same size as the photo card
    const canvas = document.createElement('canvas');
    const photoCard = photoCardRef.current;
    const rect = photoCard.getBoundingClientRect();
    
    // Set canvas size to match the photo card
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Use html2canvas to capture the photo card (you'll need to install this package)
    import('html2canvas').then(html2canvas => {
      html2canvas.default(photoCard, {
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      }).then(canvas => {
        // Create download link
        const link = document.createElement('a');
        const today = new Date();
        const timestamp = today.toISOString().replace(/[-:T]/g, '').split('.')[0];
        link.download = `photobooth-${timestamp}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
      });
    });
  };

  return (
    <div className={`photo-booth-container ${showFinalCard ? 'showing-final' : ''}`}>
      <h1 className="title">DIGITAL PHOTO BOOTH</h1>
  
      {!showFinalCard && (
        <div className="camera-container">
          <video ref={videoRef} autoPlay playsInline muted className={facingMode === 'user' ? 'mirror-mode' : ''} />
          {flash && <div className="flash-effect" />}
          {countdown !== null && <div key="countdown" className="countdown">{countdown}</div>}
        </div>
      )}
  
      {!showFinalCard && (
        <div className="button-group">
          <button onClick={toggleCamera} className="capture-button secondary">
            <FlipHorizontal className="icon" /> Switch Camera
          </button>
          <button onClick={startCapturing} disabled={capturing} className="capture-button">
            <Camera className="icon" /> {capturing ? 'Taking Photos...' : 'Start Photo Session'}
          </button>
        </div>
      )}
  
      {showFinalCard && photos.length === 3 && (
        <>
          <div className="photo-card" ref={photoCardRef}>
            <div className="photo-strip">
              {photos.map((photo, index) => (
                <img key={index} src={photo} alt={`Photo ${index + 1}`} className="photo-frame" />
              ))}
            </div>
            <p className="title-watermark">
              <img src={watermark} alt="Watermark" className="watermark" /> 
               Digital Photo 
              <img src={watermark} alt="Watermark" className="watermark" /> 
            </p>
          </div>
          <div className="button-group">
            <button onClick={downloadPhotos} className="capture-button">
              <Download className="icon" /> Download Photos
            </button>
            <button onClick={reloadPage} className="capture-button">
              <Camera className="icon" /> Take New Photos
            </button>
          </div>
        </>
      )}
  
      <canvas ref={canvasRef} width="480" height="480" className="hidden" />
    </div>
  );
};

export default PhotoBooth;
