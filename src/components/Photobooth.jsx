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
    if (photos.length === 0) return;
  
    const link = document.createElement('a');
    const today = new Date();
    const timestamp = today.toISOString().replace(/[-:T]/g, '').split('.')[0];
    link.download = `photobooth-${timestamp}.png`;
  
    // Updated canvas settings for square photos
    const photoSize = 480; // Square size for each photo
    const padding = 50;
    const photoGap = 30;
    const photoFrameBorder = 4;
    const stripPadding = 15;
    const borderRadius = 16;
    const photoRadius = 12;
  
    const totalHeight = (photoSize * 3) + (photoGap * 2) + (padding * 2) + (stripPadding * 2);
    
    const canvas = document.createElement('canvas');
    canvas.width = photoSize + (padding * 2) + (stripPadding * 2);
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d');
  
    // ... (gradient and texture code remains the same)
  
    // Photo scaling - updated for square photos
    const scaledPhotoSize = (canvas.width - (padding * 2) - (stripPadding * 2)) * 0.85;
  
    Promise.all(photos.map(photo => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = photo;
        img.onload = () => resolve(img);
      });
    })).then(images => {
      images.forEach((img, index) => {
        const xPos = padding + stripPadding + ((canvas.width - (padding * 2) - (stripPadding * 2) - scaledPhotoSize) / 2);
        const yPos = padding + stripPadding + (index * (scaledPhotoSize + photoGap));
  
        // Draw shadow for the frame
        ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;
        
        // Draw rounded rectangle for white frame
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(
          xPos - photoFrameBorder - 4,
          yPos - photoFrameBorder - 4,
          scaledPhotoSize + (photoFrameBorder * 2) + 8,
          scaledPhotoSize + (photoFrameBorder * 2) + 8,
          photoRadius + photoFrameBorder
        );
        ctx.fill();
  
        // Reset shadow for photo
        ctx.shadowColor = 'transparent';
        
        // Draw square photo with rounded corners
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(xPos, yPos, scaledPhotoSize, scaledPhotoSize, photoRadius);
        ctx.clip();
        ctx.drawImage(img, xPos, yPos, scaledPhotoSize, scaledPhotoSize);
        ctx.restore();

        // Add subtle border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(xPos, yPos, scaledPhotoSize, scaledPhotoSize, photoRadius);
        ctx.stroke();
      });
  
      // ... (watermark code remains the same)
      
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

      <canvas ref={canvasRef} width="480" height="480" className="hidden" />
    </div>
  );
};

export default PhotoBooth;
