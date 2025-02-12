import React, { useState, useRef, useEffect } from 'react';
import { Camera, Download, FlipHorizontal } from 'lucide-react';
import "./Photobooth.css"

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
          aspectRatio: 4 / 3,
          width: { ideal: 640 },
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

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      setFlash(true);
      setTimeout(() => setFlash(false), 200);
      const context = canvasRef.current.getContext('2d');

      // Clear canvas first
      context.clearRect(0, 0, 640, 480);

      // Flip for front camera
      if (facingMode === 'user') {
        context.save();
        context.scale(-1, 1);
        context.drawImage(videoRef.current, -640, 0, 640, 480);
        context.restore();
      } else {
        context.drawImage(videoRef.current, 0, 0, 640, 480);
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
    if (photos.length === 0) return;
  
    const link = document.createElement('a');
    const today = new Date();
    const timestamp = today.toISOString().replace(/[-:T]/g, '').split('.')[0];
    link.download = `the-photobooth-${timestamp}.png`; 
  
    // Canvas settings
    const photoWidth = 640;
    const photoHeight = 480;
    const padding = 30;
    const photoGap = 20;
    const photoFrameBorder = 2;
    const stripPadding = 8;
    const borderRadius = 10;
  
    // Total height calculation
    const totalHeight = (photoHeight * 3) + (photoGap * 2) + (padding * 2) + (stripPadding * 2);
    
    const canvas = document.createElement('canvas');
    canvas.width = photoWidth + (padding * 2) + (stripPadding * 2);
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d');
  
    // Apply rounded corners
    ctx.beginPath();
    ctx.moveTo(borderRadius, 0);
    ctx.lineTo(canvas.width - borderRadius, 0);
    ctx.quadraticCurveTo(canvas.width, 0, canvas.width, borderRadius);
    ctx.lineTo(canvas.width, canvas.height - borderRadius);
    ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - borderRadius, canvas.height);
    ctx.lineTo(borderRadius, canvas.height);
    ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - borderRadius);
    ctx.lineTo(0, borderRadius);
    ctx.quadraticCurveTo(0, 0, borderRadius, 0);
    ctx.closePath();
    ctx.clip();
  
    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#ff9a9e");
    gradient.addColorStop(0.33, "#fad0c4");
    gradient.addColorStop(0.66, "#fbc2eb");
    gradient.addColorStop(1, "#a18cd1");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

  
    // Photo scaling
    const scaledPhotoWidth = (canvas.width - (padding * 2) - (stripPadding * 2)) * 0.9;
    const scaledPhotoHeight = (scaledPhotoWidth * photoHeight) / photoWidth;
  
    // Load all images before drawing
    const imagePromises = photos.map(photo => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = photo;
        img.onload = () => resolve(img);
      });
    });
  
    Promise.all(imagePromises).then(images => {
      images.forEach((img, index) => {
        const xPos = padding + stripPadding + ((canvas.width - (padding * 2) - (stripPadding * 2) - scaledPhotoWidth) / 2);
        const yPos = padding + stripPadding + (index * (scaledPhotoHeight + photoGap));
  
        // Photo border (frame)
        ctx.fillStyle = '#e5e7eb';
        ctx.fillRect(xPos - photoFrameBorder, yPos - photoFrameBorder, 
                     scaledPhotoWidth + (photoFrameBorder * 2), 
                     scaledPhotoHeight + (photoFrameBorder * 2));
  
        // Draw photo
        ctx.drawImage(img, xPos, yPos, scaledPhotoWidth, scaledPhotoHeight);
      });
  
      // Export as PNG to preserve transparency
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    });
};
  

  return (
    <div className={`photo-booth-container ${showFinalCard ? 'showing-final' : ''}`}>
      <h1 className="title">DIGITAL PHOTO BOOTH</h1>

      {!showFinalCard && (
        <div className="camera-container">
          <video ref={videoRef} autoPlay playsInline muted className={facingMode === 'user' ? 'mirror-mode' : ''} />
          {flash && <div className="flash-effect" />}
          {countdown !== null && <div className="countdown">{countdown}</div>}
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
          <div className="photo-card">
            <div className="photo-strip">
              {photos.map((photo, index) => (
                <img key={index} src={photo} alt={`Photo ${index + 1}`} className="photo-frame" />
              ))}
            </div>
          </div>
          <div className="button-group">
            <button onClick={downloadPhotos} className="capture-button">
              <Download className="icon" /> Download Photos
            </button>
            <button onClick={startCapturing} className="capture-button">
              <Camera className="icon" /> Take New Photos
            </button>
          </div>
        </>
      )}

      <canvas ref={canvasRef} width="640" height="480" className="hidden" />
    </div>
  );
};

export default PhotoBooth;
