import { useState, useRef, useEffect } from 'react';

/**
 * AnimatedLogo - Cross-browser animated logo component.
 * Uses <video> with WebM for supported browsers.
 * Falls back to a static PNG for Safari/iOS where WebM has issues
 * (black background, broken alpha, opens native player).
 */
function AnimatedLogo({ className = '' }) {
    const [useVideo, setUseVideo] = useState(true);
    const [videoError, setVideoError] = useState(false);
    const videoRef = useRef(null);

    useEffect(() => {
        // Detect if browser can play WebM with alpha properly
        const video = document.createElement('video');
        const canPlayWebm = video.canPlayType('video/webm; codecs="vp8, vorbis"') ||
                            video.canPlayType('video/webm; codecs="vp9"') ||
                            video.canPlayType('video/webm');

        // Safari/iOS detection — WebM support is broken or missing on many Apple devices
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        if (!canPlayWebm || isSafari || isIOS) {
            setUseVideo(false);
        }
    }, []);

    const handleVideoError = () => {
        setVideoError(true);
        setUseVideo(false);
    };

    if (!useVideo || videoError) {
        return (
            <img
                src="/evo-logo-horizontal.png"
                alt="EvoLogo"
                className={className}
                draggable={false}
            />
        );
    }

    return (
        <video
            ref={videoRef}
            src="/evo-logo.webm"
            autoPlay
            loop
            muted
            playsInline
            disablePictureInPicture
            onError={handleVideoError}
            className={className}
            style={{ backgroundColor: 'transparent' }}
        />
    );
}

export default AnimatedLogo;
