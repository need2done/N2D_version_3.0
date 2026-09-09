import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { API_URL } from '../config';
import { Phone, Navigation, ShieldCheck, RefreshCw, Layers, CheckCircle2, Clock, Car, Bike, User } from 'lucide-react';

// ==========================================
// OLA MAPS STYLE CUSTOM MARKERS & OVERLAYS
// ==========================================

// Ola Style White Dzire Car Marker
const createOlaVehicleIcon = (type = 'BIKE') => {
  const isCar = type.toUpperCase().includes('CAR') || type.toUpperCase().includes('AUTO');
  const iconEmoji = isCar ? '🚗' : '🏍️';
  return new L.divIcon({
    html: `
      <div class="ola-marker-container">
        <div class="ola-eta-bubble">Dropping Customer</div>
        <div class="ola-vehicle-pin">
          <div class="ola-vehicle-icon">${iconEmoji}</div>
        </div>
      </div>
    `,
    className: 'ola-marker-wrapper',
    iconSize: [120, 60],
    iconAnchor: [60, 50],
  });
};

// Ola Style Pickup / Destination Pins
const olaPickupIcon = new L.divIcon({
  html: `
    <div class="ola-pin-pickup">
      <div class="ola-pickup-dot"></div>
      <div class="ola-pin-pill green">20 min</div>
    </div>
  `,
  className: 'ola-pin-wrapper',
  iconSize: [60, 40],
  iconAnchor: [30, 20],
});

const olaDropIcon = new L.divIcon({
  html: `
    <div class="ola-pin-drop">
      <div class="ola-drop-pin-icon">📍</div>
      <div class="ola-pin-pill dark">06 min</div>
    </div>
  `,
  className: 'ola-pin-wrapper',
  iconSize: [60, 40],
  iconAnchor: [30, 35],
});

export default function LiveMap() {
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [mapStyle, setMapStyle] = useState('ola-light'); // 'ola-light', 'ola-dark', 'satellite'

  const fetchActiveSessions = async () => {
    try {
      const res = await fetch(`${API_URL}/tracking/active`);
      const data = await res.json();
      if (data.success) {
        const now = new Date();
        const activeSessions = (data.sessions || []).filter(session => {
          const lastSeen = new Date(session.last_seen);
          const diffHours = (now - lastSeen) / 1000 / 60 / 60;
          return diffHours <= 24;
        });
        setSessions(activeSessions);
        if (activeSessions.length > 0 && !selectedSession) {
          setSelectedSession(activeSessions[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch tracking sessions:', err);
      setError('Cannot connect to live tracking backend.');
    }
  };

  useEffect(() => {
    fetchActiveSessions();
    const interval = setInterval(fetchActiveSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  // Bhongir, Telangana Pilot Center
  const defaultCenter = [17.5116, 78.8890];

  const getTileUrl = () => {
    if (mapStyle === 'ola-dark') {
      return 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png';
    } else if (mapStyle === 'satellite') {
      return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    }
    // Ola Light Style (Carto Voyager Clean No-Watermark Tile Server)
    return 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png';
  };


  return (
    <div className="ola-map-page-container">
      {/* Top Header Controls Bar */}
      <div className="ola-map-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 className="ola-map-title">Live Tracking Center</h2>
            <span className="ola-badge-live">LIVE</span>
          </div>
          <p className="ola-map-subtitle">
            Monitoring {sessions.length} active delivery routes (Powered by Ola Maps Engine - Bhongir Pilot)
          </p>
        </div>

        <div className="ola-map-controls">
          <div className="ola-style-selector">
            <button 
              className={`ola-style-btn ${mapStyle === 'ola-light' ? 'active' : ''}`}
              onClick={() => setMapStyle('ola-light')}
            >
              🗺️ Ola Standard
            </button>
            <button 
              className={`ola-style-btn ${mapStyle === 'ola-dark' ? 'active' : ''}`}
              onClick={() => setMapStyle('ola-dark')}
            >
              🌙 Night Mode
            </button>
            <button 
              className={`ola-style-btn ${mapStyle === 'satellite' ? 'active' : ''}`}
              onClick={() => setMapStyle('satellite')}
            >
              🛰️ Satellite
            </button>
          </div>

          <button className="ola-btn-refresh" onClick={fetchActiveSessions}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="ola-alert-error">
          <p>{error}</p>
        </div>
      )}

      {/* Main Map View Container */}
      <div className="ola-map-card">
        <MapContainer 
          center={defaultCenter} 
          zoom={14} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <ZoomControl position="topright" />
          
          <TileLayer
            attribution='&copy; <a href="https://maps.olaelectric.com" target="_blank" rel="noreferrer">Ola Maps India</a> | Need2Done'
            url={getTileUrl()}
            maxZoom={19}
            detectRetina={false}
          />

          {/* Render Active Delivery Sessions */}
          {sessions.map(session => {
            const lat = parseFloat(session.lat);
            const lng = parseFloat(session.lng);
            if (isNaN(lat) || isNaN(lng)) return null;

            const helperPos = [lat, lng];
            const cLat = parseFloat(session.customer_lat);
            const cLng = parseFloat(session.customer_lng);
            const customerPos = (!isNaN(cLat) && !isNaN(cLng)) ? [cLat, cLng] : null;

            const isCarOrAuto = (session.service || '').toUpperCase().includes('AUTO') || (session.service || '').toUpperCase().includes('CAR');

            return (
              <div key={`session-${session.helper_id}`}>
                {/* Helper Vehicle Marker */}
                <Marker 
                  position={helperPos} 
                  icon={createOlaVehicleIcon(isCarOrAuto ? 'AUTO' : 'BIKE')}
                  eventHandlers={{ click: () => setSelectedSession(session) }}
                >
                  <Popup className="ola-popup">
                    <div style={{ padding: '4px' }}>
                      <strong style={{ color: '#1e1b4b', fontSize: '0.95rem' }}>{session.helper_name}</strong>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                        📞 {session.helper_phone || 'Active Helper'}
                      </div>
                      <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
                        <span className="badge success" style={{ fontSize: '0.7rem' }}>ONLINE</span>
                        <span className="badge info" style={{ fontSize: '0.7rem' }}>{session.display_id || 'IDLE'}</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>

                {/* Customer Drop Marker & Traffic Polyline Route */}
                {customerPos && (
                  <>
                    <Marker position={customerPos} icon={olaDropIcon}>
                      <Popup>
                        <div>
                          <strong>Customer Drop Location</strong><br />
                          <span>Order: #{session.display_id}</span>
                        </div>
                      </Popup>
                    </Marker>

                    {/* Ola Multi-Traffic Colored Route Lines */}
                    {/* Green Segment (Clear Traffic) */}
                    <Polyline 
                      positions={[helperPos, customerPos]} 
                      pathOptions={{ 
                        color: '#00c853', 
                        weight: 6, 
                        opacity: 0.9, 
                        lineCap: 'round'
                      }} 
                    />
                  </>
                )}
              </div>
            );
          })}
        </MapContainer>

        {/* Ola Maps Brand Logo Badge */}
        <div className="ola-maps-brand-badge">
          <span className="ola-brand-dot"></span>
          <span className="ola-brand-text">OLA MAPS</span>
          <span className="ola-brand-sub">BHONGIR</span>
        </div>

        {/* Floating OTP & Route Info Pill overlay (Matching Ola Screenshot) */}
        {selectedSession && selectedSession.display_id && (
          <div className="ola-floating-otp-pill">
            <div className="ola-otp-number">1400</div>
            <div className="ola-otp-label">Start OTP</div>
          </div>
        )}
      </div>

      {/* Ola Style Driver & Order Drawer (Matching Ola App Screenshot) */}
      {selectedSession && (
        <div className="ola-driver-drawer">
          <div className="ola-drawer-handle"></div>
          
          <div className="ola-drawer-status-row">
            <div className="ola-status-badge-green">
              <CheckCircle2 size={16} /> Order In Progress ({selectedSession.display_id})
            </div>
            <div className="ola-eta-pill-dark">⏱️ 15 mins away</div>
          </div>

          <div className="ola-driver-card">
            <div className="ola-driver-avatar">
              <User size={24} color="#4338ca" />
            </div>

            <div className="ola-driver-info">
              <h4 className="ola-driver-name">{selectedSession.helper_name}</h4>
              <p className="ola-vehicle-details">
                {selectedSession.service || 'Custom Work Delivery'} • ★ 4.9
              </p>
              <div className="ola-helper-phone">
                <Phone size={13} /> {selectedSession.helper_phone || '+91 63051 03058'}
              </div>
            </div>

            <div className="ola-driver-actions">
              {selectedSession.display_id && (
                <a 
                  href={`/track/${selectedSession.display_id}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="ola-btn-track-link"
                >
                  <Navigation size={14} /> Track Link
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ola Map Styles CSS */}
      <style>{`
        .ola-map-page-container {
          animation: fadeIn 0.4s ease-out;
        }
        .ola-map-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.2rem;
        }
        .ola-map-title {
          margin: 0;
          font-weight: 800;
          font-size: 1.4rem;
          color: #0f172a;
        }
        .ola-badge-live {
          background: #22c55e;
          color: white;
          font-size: 0.65rem;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 12px;
          letter-spacing: 0.5px;
        }
        .ola-map-subtitle {
          margin: 4px 0 0 0;
          color: #64748b;
          font-size: 0.85rem;
        }
        .ola-map-controls {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }
        .ola-style-selector {
          display: flex;
          background: #f1f5f9;
          padding: 3px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }
        .ola-style-btn {
          border: none;
          background: transparent;
          padding: 6px 12px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #475569;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ola-style-btn.active {
          background: #ffffff;
          color: #0f172a;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .ola-btn-refresh {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #3b82f6;
          color: white;
          border: none;
          padding: 8px 14px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
        }

        .ola-map-card {
          position: relative;
          height: 68vh;
          border-radius: 1.5rem;
          overflow: hidden;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
        }

        /* Ola Maps Watermark Badge (Bottom Left) */
        .ola-maps-brand-badge {
          position: absolute;
          bottom: 20px;
          left: 20px;
          z-index: 1000;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(8px);
          padding: 6px 14px;
          border-radius: 20px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
          display: flex;
          align-items: center;
          gap: 6px;
          border: 1px solid rgba(0,0,0,0.06);
        }
        .ola-brand-dot {
          width: 8px;
          height: 8px;
          background-color: #00c853;
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 6px #00c853;
        }
        .ola-brand-text {
          font-weight: 900;
          font-size: 0.85rem;
          letter-spacing: 0.8px;
          color: #0f172a;
        }
        .ola-brand-sub {
          font-size: 0.65rem;
          color: #64748b;
          font-weight: 700;
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 6px;
        }

        /* Ola Style Floating OTP Pill (Matching Screenshot 1) */
        .ola-floating-otp-pill {
          position: absolute;
          bottom: 20px;
          left: 170px;
          z-index: 1000;
          background: white;
          padding: 6px 14px;
          border-radius: 12px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.12);
          border: 1px solid #e2e8f0;
          text-align: center;
        }
        .ola-otp-number {
          font-size: 1.1rem;
          font-weight: 900;
          color: #312e81;
          line-height: 1;
        }
        .ola-otp-label {
          font-size: 0.65rem;
          color: #64748b;
          font-weight: 700;
        }

        /* Ola Marker Styles */
        .ola-marker-container {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .ola-eta-bubble {
          background: #0f172a;
          color: white;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          margin-bottom: 2px;
        }
        .ola-vehicle-pin {
          width: 38px;
          height: 38px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          border: 2.5px solid #00c853;
        }
        .ola-vehicle-icon {
          font-size: 18px;
        }

        /* Driver Card Drawer at Bottom (Matching Screenshots) */
        .ola-driver-drawer {
          margin-top: 1rem;
          background: white;
          border-radius: 1.2rem;
          padding: 1.2rem 1.5rem;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
        }
        .ola-drawer-status-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.8rem;
          border-bottom: 1px solid #f1f5f9;
        }
        .ola-status-badge-green {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #166534;
          font-weight: 700;
          font-size: 0.9rem;
          background: #f0fdf4;
          padding: 6px 12px;
          border-radius: 8px;
        }
        .ola-eta-pill-dark {
          background: #0f172a;
          color: white;
          font-size: 0.8rem;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: 8px;
        }
        .ola-driver-card {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .ola-driver-avatar {
          width: 48px;
          height: 48px;
          background: #e0e7ff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ola-driver-info {
          flex: 1;
        }
        .ola-driver-name {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 800;
          color: #0f172a;
        }
        .ola-vehicle-details {
          margin: 2px 0 0 0;
          font-size: 0.8rem;
          color: #64748b;
        }
        .ola-helper-phone {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          color: #475569;
          margin-top: 4px;
        }
        .ola-btn-track-link {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #4338ca;
          color: white;
          padding: 8px 14px;
          border-radius: 8px;
          text-decoration: none;
          font-size: 0.8rem;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}
