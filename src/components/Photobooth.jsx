import { useState, useRef, useEffect } from 'react';
import { Camera, Download, FlipHorizontal } from 'lucide-react';
import * as faceapi from 'face-api.js';
import "./Photobooth.css";
import watermark from "../assets/asd.png";
import { graduationHat } from '../assets/graduationHat.png';
import { glassesFilter } from '../assets/glasses.png';

const PhotoBooth = () => {
  const [capturing, setCapturing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [flash, setFlash] = useState(false);
  const [showFinalCard, setShowFinalCard] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [showHat, setShowHat] = useState(false);
  const [showGlasses, setShowGlasses] = useState(false);
  const [hatImage, setHatImage] = useState(null);
  const [glassesImage, setGlassesImage] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const photoCardRef = useRef(null);
  const overlayCanvasRef = useRef(null);

  // Load image
  useEffect(() => {
    // Replace these paths with your actual image paths
    const loadImages = async () => {
      const hatImg = new Image();
      hatImg.src = graduationHat;  // Replace with your hat image path
      await new Promise((resolve) => { hatImg.onload = resolve; });
      setHatImage(hatImg);

      const glassesImg = new Image();
      glassesImg.src = glassesFilter;  // Replace with your glasses image path
      await new Promise((resolve) => { glassesImg.onload = resolve; });
      setGlassesImage(glassesImg);
    };
    loadImages();
  }, []);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        // Use a CDN for the models
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ]);
        setIsModelLoaded(true);
      } catch (err) {
        console.error('Error loading face-api models:', err);
      }
    };
    loadModels();
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  useEffect(() => {
    const startCamera = async () => {
      try {
        stopCamera();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            aspectRatio: 1 / 1,
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
  
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  // Face detection and filter rendering
  useEffect(() => {
    if (!isModelLoaded || !videoRef.current || !overlayCanvasRef.current || !hatImage || !glassesImage) return;

    let animationFrameId;
    const detectAndDraw = async () => {
      if (!videoRef.current || !overlayCanvasRef.current) return;

      const detections = await faceapi.detectAllFaces(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks();

      const canvas = overlayCanvasRef.current;
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);

      if (detections.length > 0) {
        detections.forEach(detection => {
          const landmarks = detection.landmarks;
          const positions = landmarks.positions;

          if (showHat) {
            // Position hat above the head
            const topOfHead = positions[24].y;
            const hatWidth = detection.detection.box.width * 1.5;
            const hatHeight = hatWidth * (hatImage.height / hatImage.width);
            
            context.drawImage(
              hatImage,
              positions[24].x - hatWidth / 2,
              topOfHead - hatHeight,
              hatWidth,
              hatHeight
            );
          }

          if (showGlasses) {
            // Position glasses on the eyes
            const leftEye = landmarks.getLeftEye();
            const rightEye = landmarks.getRightEye();
            
            const leftEyeCenter = {
              x: leftEye.reduce((sum, p) => sum + p.x, 0) / leftEye.length,
              y: leftEye.reduce((sum, p) => sum + p.y, 0) / leftEye.length
            };
            
            const rightEyeCenter = {
              x: rightEye.reduce((sum, p) => sum + p.x, 0) / rightEye.length,
              y: rightEye.reduce((sum, p) => sum + p.y, 0) / rightEye.length
            };

            const eyeDistance = Math.abs(rightEyeCenter.x - leftEyeCenter.x);
            const glassesWidth = eyeDistance * 1.8;
            const glassesHeight = glassesWidth * (glassesImage.height / glassesImage.width);

            context.drawImage(
              glassesImage,
              leftEyeCenter.x - (glassesWidth * 0.2),
              leftEyeCenter.y - (glassesHeight * 0.5),
              glassesWidth,
              glassesHeight
            );
          }
        });
      }

      animationFrameId = requestAnimationFrame(detectAndDraw);
    };

    detectAndDraw();
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isModelLoaded, showHat, showGlasses, hatImage, glassesImage]);

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
    if (videoRef.current && canvasRef.current && overlayCanvasRef.current) {
      setFlash(true);
      setTimeout(() => setFlash(false), 200);
      const context = canvasRef.current.getContext('2d');

      context.clearRect(0, 0, 480, 480);

      if (facingMode === 'user') {
        context.save();
        context.scale(-1, 1);
        context.drawImage(videoRef.current, -480, 0, 480, 480);
        context.restore();
      } else {
        context.drawImage(videoRef.current, 0, 0, 480, 480);
      }

      // Draw the filters overlay onto the final image
      context.drawImage(overlayCanvasRef.current, 0, 0);

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

    const canvas = document.createElement('canvas');
    const photoCard = photoCardRef.current;
    const rect = photoCard.getBoundingClientRect();
    
    canvas.width = rect.width;
    canvas.height = rect.height;

    import('html2canvas').then(html2canvas => {
      html2canvas.default(photoCard, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      }).then(canvas => {
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
          <canvas 
            ref={overlayCanvasRef}
            width={480}
            height={480}
            className="filter-overlay"
          />
          {flash && <div className="flash-effect" />}
          {countdown !== null && <div key="countdown" className="countdown">{countdown}</div>}
        </div>
      )}
  
      {!showFinalCard && (
        <div className="button-group">
          <button onClick={toggleCamera} className="capture-button secondary">
            <FlipHorizontal className="icon" /> Switch Camera
          </button>
          <button 
            onClick={() => setShowHat(!showHat)} 
            className={`capture-button ${showHat ? 'active' : ''}`}
          >
            Hat Filter
          </button>
          <button 
            onClick={() => setShowGlasses(!showGlasses)} 
            className={`capture-button ${showGlasses ? 'active' : ''}`}
          >
            Glasses Filter
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