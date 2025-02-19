import React, { useState, useRef, useEffect } from 'react';
import { Camera, Download, FlipHorizontal } from 'lucide-react';
import "./Photobooth.css";
import watermark from "../assets/asd.png";
import mustache from "../assets/mustache.png";
import glasses from "../assets/glasses.png";
import goofyGlasses from "../assets/goofyGlasses.png";
import graduationHat from "../assets/graduationHat.png";
import graduationHat1 from "../assets/graduationHat1.png";

const PhotoBooth = () => {
  const [capturing, setCapturing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [flash, setFlash] = useState(false);
  const [showFinalCard, setShowFinalCard] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [selectedProps, setSelectedProps] = useState([]);
  const [photoProps, setPhotoProps] = useState([]);
  const [activeTab, setActiveTab] = useState('hats');
  const [propsLoaded, setPropsLoaded] = useState({});
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const photoCardRef = useRef(null);

  // Props data with consistent sizing and positioning
  const propsData = {
    hats: [
      {
        id: 'cowboy-hat',
        name: 'Graduation Hat v1',
        imageUrl: graduationHat,
        position: { top: '20%', left: '50%', width: '60%' }
      },
      {
        id: 'party-hat',
        name: 'Graduation Hat v2',
        imageUrl: graduationHat1, 
        position: { top: '20%', left: '50%', width: '60%' }
      }
    ],
    facial: [
      {
        id: 'mustache',
        name: 'Mustache',
        imageUrl: mustache, 
        position: { top: '60%', left: '50%', width: '60%' }
      },
      {
        id: 'glasses',
        name: 'Glasses',
        imageUrl: glasses,
        position: { top: '40%', left: '50%', width: '70%' }
      },
      {
        id: 'glasses1',
        name: 'Goofy Grad Glasses',
        imageUrl: goofyGlasses,
        position: { top: '35%', left: '50%', width: '60%' }
      },
    ]
  };

  // Preload prop images
  useEffect(() => {
    const allProps = [...propsData.hats, ...propsData.facial];
    const loadPromises = allProps.map(prop => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          setPropsLoaded(prev => ({
            ...prev,
            [prop.id]: img
          }));
          resolve();
        };
        img.onerror = () => resolve(); // Still resolve even if loading fails
        img.src = prop.imageUrl;
      });
    });
    
    Promise.all(loadPromises).then(() => {
      console.log("All props loaded");
    });
  }, []);

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

  const toggleProp = (propId) => {
    setSelectedProps(prev => {
      if (prev.includes(propId)) {
        return prev.filter(id => id !== propId);
      }
      return [...prev, propId];
    });
  };

  const renderProps = () => {
    const allProps = [...propsData.hats, ...propsData.facial];
    return selectedProps.map(propId => {
      const prop = allProps.find(p => p.id === propId);
      if (!prop) return null;
      
      return (
        <img
          key={prop.id}
          src={prop.imageUrl}
          alt={prop.name}
          className="prop-overlay"
          style={{
            position: 'absolute',
            ...prop.position,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 2
          }}
        />
      );
    });
  };

  const calculatePropDimensions = (prop) => {
    // Consistent calculation for prop dimensions and positions
    const { top, left, width } = prop.position;
    const topPercentage = parseFloat(top) / 100;
    const leftPercentage = parseFloat(left) / 100;
    const widthPercentage = parseFloat(width) / 100;
    
    const canvasSize = 480;
    const propWidth = widthPercentage * canvasSize;
    const propHeight = propWidth; // Assuming square-ish props
    const propX = (leftPercentage * canvasSize) - (propWidth / 2);
    const propY = (topPercentage * canvasSize) - (propHeight / 2);
    
    return { propX, propY, propWidth, propHeight };
  };

  const drawPhotoWithProps = (context, video, propsToRender) => {
    return new Promise((resolve) => {
      // Draw video
      context.clearRect(0, 0, 480, 480);
      if (facingMode === 'user') {
        context.save();
        context.scale(-1, 1);
        context.drawImage(video, -480, 0, 480, 480);
        context.restore();
      } else {
        context.drawImage(video, 0, 0, 480, 480);
      }

      if (!propsToRender || propsToRender.length === 0) {
        resolve();
        return;
      }

      // Draw all props
      const allProps = [...propsData.hats, ...propsData.facial];
      let propsDrawn = 0;
      
      propsToRender.forEach(propId => {
        const prop = allProps.find(p => p.id === propId);
        if (prop && propsLoaded[propId]) {
          const { propX, propY, propWidth, propHeight } = calculatePropDimensions(prop);
          context.drawImage(propsLoaded[propId], propX, propY, propWidth, propHeight);
        }
        propsDrawn++;
        
        if (propsDrawn === propsToRender.length) {
          resolve();
        }
      });
    });
  };

  const captureExactView = () => {
    if (!videoRef.current) return null;
    
    // Create a temporary container with the exact same dimensions and position
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.width = '480px';
    container.style.height = '480px';
    
    // First, take a screenshot of the video element
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 480;
    tempCanvas.height = 480;
    const ctx = tempCanvas.getContext('2d');
    
    // Apply mirroring if needed
    if (facingMode === 'user') {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, -480, 0, 480, 480);
      ctx.restore();
    } else {
      ctx.drawImage(videoRef.current, 0, 0, 480, 480);
    }
    
    // Add the video screenshot as background
    const videoImg = document.createElement('img');
    videoImg.src = tempCanvas.toDataURL('image/jpeg');
    videoImg.style.position = 'absolute';
    videoImg.style.top = '0';
    videoImg.style.left = '0';
    videoImg.style.width = '100%';
    videoImg.style.height = '100%';
    container.appendChild(videoImg);
    
    // Get all the current prop elements and clone them exactly
    const propElements = document.querySelectorAll('.prop-overlay');
    propElements.forEach(propEl => {
      const clonedProp = propEl.cloneNode(true);
      container.appendChild(clonedProp);
    });
    
    return container;
  };


  const takePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    // Show flash effect
    setFlash(true);
    setTimeout(() => setFlash(false), 200);
    
    // Save current props configuration
    const currentSelectedProps = [...selectedProps];
    setPhotoProps(prev => [...prev, currentSelectedProps]);
    
    // Use html2canvas to capture exactly what is displayed
    try {
      // Get the camera container with all its children (video and props)
      const container = document.querySelector('.camera-container');
      
      // Create a promise-based wrapper for requestAnimationFrame
      // to ensure we capture after the current render cycle
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      // Create a new canvas matching the camera container dimensions
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      
      // First, draw the video element
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      // Then draw each prop overlay at its exact position
      const propElements = container.querySelectorAll('.prop-overlay');
      for (const propEl of propElements) {
        const propRect = propEl.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Calculate relative position within container
        const x = propRect.left - containerRect.left;
        const y = propRect.top - containerRect.top;
        
        // Load and draw the prop image
        const img = new Image();
        await new Promise(resolve => {
          img.onload = resolve;
          img.src = propEl.src;
        });
        
        context.drawImage(img, x, y, propRect.width, propRect.height);
      }
      
      // Get the final image data
      const photoData = canvas.toDataURL('image/jpeg');
      setPhotos(prev => [...prev, photoData]);
      
    } catch (error) {
      console.error('Error capturing photo:', error);
      // Fallback to basic canvas capture if the advanced method fails
      const context = canvasRef.current.getContext('2d');
      context.drawImage(videoRef.current, 0, 0, 480, 480);
      const photoData = canvasRef.current.toDataURL('image/jpeg');
      setPhotos(prev => [...prev, photoData]);
    }
  };

  const startCapturing = () => {
    setPhotos([]);
    setPhotoProps([]);
    setShowFinalCard(false);
    setCapturing(true);
    captureSequence(3);
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
            setTimeout(() => {
              captureSequence(remainingPhotos - 1);
            }, 500);
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

  const reloadPage = () => {
    window.location.reload();
  };

  // DEBUG: This helps verify that each photo has its own props configuration
  useEffect(() => {
    if (photoProps.length > 0) {
      console.log("Photo props configurations:", photoProps);
    }
  }, [photoProps]);

  return (
    <div className={`photo-booth-container ${showFinalCard ? 'showing-final' : ''}`}>
      <h1 className="title">DIGITAL PHOTO BOOTH</h1>

      {!showFinalCard && (
        <>
          <div className="camera-container">
            <video ref={videoRef} autoPlay playsInline muted className={facingMode === 'user' ? 'mirror-mode' : ''} />
            {renderProps()}
            {flash && <div className="flash-effect" />}
            {countdown !== null && <div className="countdown">{countdown}</div>}
          </div>

          <div className="props-tabs">
            <div className="tabs-list">
              <button
                className={`tab-button ${activeTab === 'hats' ? 'active' : ''}`}
                onClick={() => setActiveTab('hats')}
              >
                Hats
              </button>
              <button
                className={`tab-button ${activeTab === 'facial' ? 'active' : ''}`}
                onClick={() => setActiveTab('facial')}
              >
                Facial Props
              </button>
            </div>
            
            <div className="props-grid">
              {propsData[activeTab].map(prop => (
                <button
                  key={prop.id}
                  className={`prop-button ${selectedProps.includes(prop.id) ? 'selected' : ''}`}
                  onClick={() => toggleProp(prop.id)}
                >
                  <img src={prop.imageUrl} alt={prop.name} className="prop-preview" />
                </button>
              ))}
            </div>
          </div>

          <div className="button-group">
            <button onClick={toggleCamera} className="capture-button secondary">
              <FlipHorizontal className="icon" /> Switch Camera
            </button>
            <button onClick={startCapturing} disabled={capturing} className="capture-button">
              <Camera className="icon" /> {capturing ? 'Taking Photos...' : 'Start Photo Session'}
            </button>
          </div>
        </>
      )}

      {showFinalCard && photos.length === 3 && (
        <>
          <div className="photo-card" ref={photoCardRef}>
            <div className="photo-strip">
              {photos.map((photo, index) => (
                <img 
                  key={index} 
                  src={photo} 
                  alt={`Photo ${index + 1}`} 
                  className="photo-frame" 
                />
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