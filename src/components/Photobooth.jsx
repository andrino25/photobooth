import React, { useState, useRef, useEffect } from 'react';
import { Camera, Download, FlipHorizontal } from 'lucide-react';
import "./Photobooth.css"

const PhotoBooth = () => {
  const [capturing, setCapturing] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [photos, setPhotos] = useState([]);
  const [flash, setFlash] = useState(false);
  const [showFinalCard, setShowFinalCard] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
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
          aspectRatio: 4/3,
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
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
    setFacingMode(current => current === 'user' ? 'environment' : 'user');
  };

  const startCapturing = () => {
    setPhotos([]);
    setShowFinalCard(false);
    setCapturing(true);
    setCountdown(3);
    captureSequence(3);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      setFlash(true);
      setTimeout(() => setFlash(false), 200);
      const context = canvasRef.current.getContext('2d');
      
      // Clear the canvas first
      context.clearRect(0, 0, 640, 480);
      
      // If using front camera, flip the image horizontally
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

    let timer = setInterval(() => {
      setCountdown(prev => {
        if (prev === 1) {
          clearInterval(timer);
          takePhoto();
          setTimeout(() => {
            captureSequence(remainingPhotos - 1);
            setCountdown(3);
          }, 1000);
        }
        return prev - 1;
      });
    }, 1000);
  };

  const downloadPhotos = () => {
    const link = document.createElement('a');
    link.download = 'photo-strip.jpg';
    
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 1440; // Increased height for better spacing
    const ctx = canvas.getContext('2d');
    
    // Draw white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw border
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
    
    // Draw each photo with proper spacing
    photos.forEach((photo, index) => {
      const img = new Image();
      img.src = photo;
      ctx.drawImage(img, 40, 40 + (index * 460), canvas.width - 80, 440);
    });
    
    link.href = canvas.toDataURL('image/jpeg');
    link.click();
  };

  return (
    <div className="photo-booth-container">
      <h1 className="title">DIGITAL PHOTO BOOTH</h1>
      
      {!showFinalCard && (
        <div className="camera-container">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className={facingMode === 'user' ? 'mirror-mode' : ''} 
          />
          {flash && <div className="flash-effect" />}
          {capturing && <div className="countdown">{countdown}</div>}
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