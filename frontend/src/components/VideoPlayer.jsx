import React, { useRef, useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { io } from 'socket.io-client';
import { X, Play, Pause, Volume2, VolumeX, Maximize2, SkipForward, SkipBack, Settings } from 'lucide-react';
import axios from 'axios';

export default function VideoPlayer({ file, onClose }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  
  const token = useAppStore(state => state.token);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [hasResumed, setHasResumed] = useState(false);
  const [socket, setSocket] = useState(null);

  const filename = file.relativePath.split('/').pop();
  const videoUrl = `/api/stream/video?path=${encodeURIComponent(file.relativePath)}&token=${token}`;
  const subtitleUrl = `/api/stream/subtitles?path=${encodeURIComponent(file.relativePath)}&token=${token}`;

  useEffect(() => {
    const s = io(window.location.origin);
    setSocket(s);

    s.on('connect', () => {
      s.emit('identify', { username: useAppStore.getState().username });
      s.emit('stream-start', { file: filename });
    });

    return () => {
      if (s) {
        s.emit('stream-stop');
        s.disconnect();
      }
    };
  }, [filename]);

  useEffect(() => {
    const fetchOffset = async () => {
      try {
        const res = await axios.get('/api/stream/progress', {
          headers: { Authorization: `Bearer ${token}` },
          params: { path: file.relativePath }
        });
        
        if (res.data && res.data.time > 0 && videoRef.current) {
          const progressPercent = (res.data.time / res.data.duration) * 100;
          if (progressPercent < 95) {
            videoRef.current.currentTime = res.data.time;
          }
        }
      } catch (err) {
        console.error('Failed to load playback progress:', err);
      }
      setHasResumed(true);
    };

    fetchOffset();
  }, [file.relativePath, token]);

  useEffect(() => {
    const interval = setInterval(() => {
      saveProgress();
    }, 5000);

    return () => {
      clearInterval(interval);
      saveProgress();
    };
  }, [currentTime, duration]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        seek(10);
      } else if (e.code === 'ArrowLeft') {
        seek(-10);
      } else if (e.code === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const saveProgress = async () => {
    if (!videoRef.current || !hasResumed) return;
    const time = videoRef.current.currentTime;
    const dur = videoRef.current.duration;

    if (time > 0 && dur > 0) {
      try {
        await axios.post('/api/stream/progress', {
          path: file.relativePath,
          time,
          duration: dur
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.error('Failed to save progress:', err);
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      if (socket) socket.emit('stream-stop');
    } else {
      videoRef.current.play().catch(e => console.error(e));
      setIsPlaying(true);
      if (socket) socket.emit('stream-start', { file: filename });
    }
  };

  const seek = (seconds) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime += seconds;
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeekChange = (e) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    videoRef.current.muted = nextMute;
  };

  const changeSpeed = (rate) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setShowSpeedMenu(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen().catch(err => console.error(err));
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00';
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = Math.floor(secs % 60);

    const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;
    if (hours > 0) {
      const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
      return `${hours}:${formattedMinutes}:${formattedSeconds}`;
    }
    return `${minutes}:${formattedSeconds}`;
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none"
    >
      <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 to-transparent p-6 flex justify-between items-center text-white z-10 opacity-0 hover:opacity-100 transition-opacity duration-300">
        <div>
          <h2 className="text-lg font-bold truncate max-w-[50vw]">{filename}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{file.resolution ? `Resolution: ${file.resolution}` : 'Streaming File'}</p>
        </div>
        <button 
          onClick={onClose}
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center relative cursor-pointer" onClick={togglePlay}>
        <video
          ref={videoRef}
          src={videoUrl}
          className="max-h-full max-w-full"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onClick={(e) => e.stopPropagation()}
          autoPlay
          controls={false}
        >
          <track 
            kind="subtitles" 
            src={subtitleUrl} 
            srcLang="en" 
            label="English" 
            default 
          />
        </video>
        
        {!isPlaying && (
          <div className="absolute p-6 bg-black/55 rounded-full text-white shadow-2xl backdrop-blur-sm pointer-events-none animate-scaleUp">
            <Play className="h-10 w-10 fill-white" />
          </div>
        )}
      </div>

      <div className="bg-gradient-to-t from-black/95 to-black/0 p-6 pt-12 space-y-4 text-white opacity-0 hover:opacity-100 transition-opacity duration-300 z-10">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-medium">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 1}
            value={currentTime}
            onChange={handleSeekChange}
            className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-brand-500 hover:accent-brand-600 transition-all outline-none"
            onClick={(e) => e.stopPropagation()}
          />
          <span className="text-xs font-mono font-medium">{formatTime(duration)}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button onClick={() => seek(-10)} className="text-slate-300 hover:text-white" title="Rewind 10s">
              <SkipBack className="h-5 w-5" />
            </button>
            <button onClick={togglePlay} className="p-2.5 bg-white text-black rounded-full hover:scale-105 transition-transform" title={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? <Pause className="h-5 w-5 fill-black" /> : <Play className="h-5 w-5 fill-black pl-0.5" />}
            </button>
            <button onClick={() => seek(10)} className="text-slate-300 hover:text-white" title="Forward 10s">
              <SkipForward className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-2 group ml-2">
              <button onClick={toggleMute} className="text-slate-300 hover:text-white">
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-0 group-hover:w-20 transition-all duration-300 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-5 relative">
            <div>
              <button 
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="flex items-center gap-1 text-slate-300 hover:text-white text-sm font-semibold rounded-lg bg-white/10 px-2.5 py-1 hover:bg-white/20"
                title="Playback speed"
              >
                <Settings className="h-4 w-4" />
                {playbackRate === 1 ? 'Normal' : `${playbackRate}x`}
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-10 right-10 bg-slate-900 border border-slate-800 rounded-xl p-1.5 shadow-xl flex flex-col gap-1 w-24 z-30">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => changeSpeed(rate)}
                      className={`text-left text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${playbackRate === rate ? 'bg-brand-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                      {rate === 1 ? 'Normal' : `${rate}x`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={toggleFullscreen} className="text-slate-300 hover:text-white" title="Fullscreen">
              <Maximize2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
