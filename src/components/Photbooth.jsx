import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon } from 'lucide-react';

const PhotoBooth = () => {
  const [capturing, setCapturing] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [photos, setPhotos] = useState([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Request camera access and set up video stream
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  // Start the photo capture process
  const startCapturing = () => {
    setCapturing(true);
    setCountdown(3);
    setCurrentPhotoIndex(0);
    captureSequence();
  };

  // Take a photo from the video stream
  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      context.drawImage(videoRef.current, 0, 0, 640, 480);
      const photoData = canvasRef.current.toDataURL('image/jpeg');
      setPhotos(prev => [...prev, photoData]);
      setCurrentPhotoIndex(prev => prev + 1);
    }
  };

  // Handle the capture sequence with countdown
  const captureSequence = () => {
    let photoCount = 0;
    const maxPhotos = 3;
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev === 1) {
          clearInterval(countdownInterval);
          takePhoto();
          photoCount++;
          
          if (photoCount < maxPhotos) {
            setTimeout(() => {
              setCountdown(3);
              countdownInterval;
              captureSequence();
            }, 1000);
          } else {
            setCapturing(false);
          }
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Start camera when component mounts
  React.useEffect(() => {
    startCamera();
    return () => {
      // Cleanup: stop all media tracks when component unmounts
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="space-y-4">
        {/* Camera Preview */}
        <div className="relative border-4 border-gray-200 rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-[480px] object-cover"
          />
          
          {/* Countdown Overlay */}
          {capturing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <span className="text-white text-8xl font-bold">{countdown}</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center">
          <button
            onClick={startCapturing}
            disabled={capturing}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            <Camera className="mr-2" />
            {capturing ? 'Capturing...' : 'Start Capture'}
          </button>
        </div>

        {/* Photo Gallery */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <ImageIcon className="mr-2" />
            Captured Photos
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {photos.map((photo, index) => (
              <div key={index} className="border rounded-lg overflow-hidden">
                <img
                  src={photo}
                  alt={`Captured photo ${index + 1}`}
                  className="w-full h-40 object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hidden canvas for capturing photos */}
      <canvas
        ref={canvasRef}
        width="640"
        height="480"
        className="hidden"
      />
    </div>
  );
};

export default PhotoBooth;