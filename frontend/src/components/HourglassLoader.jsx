import './HourglassLoader.css';

/**
 * HourglassLoader - Animated hourglass loading indicator
 * Adapted for orange color palette
 */
function HourglassLoader({ message = 'Carregando...' }) {
    return (
        <div className="hourglass-wrapper">
            <div className="hourglassBackground">
                <div className="hourglassContainer">
                    <div className="hourglassGlassTop"></div>
                    <div className="hourglassGlass"></div>
                    <div className="hourglassCurves"></div>
                    <div className="hourglassSandStream"></div>
                    <div className="hourglassSand"></div>
                    <div className="hourglassCapTop"></div>
                    <div className="hourglassCapBottom"></div>
                </div>
            </div>
            {message && (
                <p className="hourglass-message">{message}</p>
            )}
        </div>
    );
}

export default HourglassLoader;
