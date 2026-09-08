import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ==========================================
// CUSTOM PREMIUM ICONS (SVG Base64)
// ==========================================

// Helper / Delivery Bike Icon
const helperIconSvg = `data:image/svg+xml;base64,${btoa(`
<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="20" cy="20" r="18" fill="white" stroke="#6366f1" stroke-width="2"/>
  <path d="M12 25C12 23.3431 13.3431 22 15 22H25C26.6569 22 28 23.3431 28 25V27H12V25Z" fill="#6366f1"/>
  <circle cx="20" cy="16" r="4" fill="#6366f1"/>
  <path d="M15 22L12 18H28L25 22" stroke="#6366f1" stroke-width="2" stroke-linecap="round"/>
</svg>
`)}`;

// Customer / Destination Pin Icon
const customerIconSvg = `data:image/svg+xml;base64,${btoa(`
<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M20 38C20 38 34 26 34 16C34 8.26801 27.732 2 20 2C12.268 2 6 8.26801 6 16C6 26 20 38 20 38Z" fill="#f43f5e" stroke="white" stroke-width="2"/>
  <circle cx="20" cy="16" r="5" fill="white"/>
</svg>
`)}`;

const helperIcon = new L.divIcon({
  html: `<div style="background-color: #6366f1; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 16px;">🏍️</div>`,
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const customerIcon = new L.divIcon({
  html: `<div style="background-color: #f43f5e; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 16px;">📍</div>`,
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});


const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function LiveMap() {
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState(null);
  const [mapEngine, setMapEngine] = useState('carto'); // 'carto' or 'ola'

  const fetchActiveSessions = async () => {
    try {
      const res = await fetch(`${API_URL}/tracking/active`);
      const data = await res.json();
      if (data.success) {
        const now = new Date();
        const activeSessions = data.sessions.filter(session => {
            const lastSeen = new Date(session.last_seen);
            const diffHours = (now - lastSeen) / 1000 / 60 / 60;
            return diffHours <= 24;
        });
        setSessions(activeSessions);
      }
    } catch (err) {
      console.error('Failed to fetch tracking sessions:', err);
      setError('Cannot connect to backend.');
    }
  };

  useEffect(() => {
    fetchActiveSessions();
    const interval = setInterval(fetchActiveSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const defaultCenter = [12.9716, 77.5946];

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>Live Tracking Center</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Monitoring {sessions.length} active delivery routes (Powered by Ola Maps)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => setMapEngine(prev => prev === 'carto' ? 'ola' : 'carto')}
            style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem', backgroundColor: mapEngine === 'ola' ? '#10b981' : '#374151', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            🗺️ Map Engine: {mapEngine === 'ola' ? 'Ola Maps (India)' : 'CARTO Voyager'}
          </button>
          <div className="badge success" style={{ padding: '0.6rem 1rem' }}>
             LIVE
          </div>
          <button className="btn btn-primary" onClick={fetchActiveSessions}>🔄 Refresh</button>
        </div>
      </div>

      {error && <div className="card" style={{ borderLeft: '4px solid var(--danger)', marginBottom: '1rem' }}><p style={{ color: 'var(--danger)' }}>{error}</p></div>}

      <div className="card" style={{ height: '70vh', padding: 0, overflow: 'hidden', borderRadius: '1.5rem', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)' }}>
        <MapContainer 
          center={defaultCenter} 
          zoom={13} 
          style={{ height: '100%', width: '100%', background: '#f8fafc' }}
          zoomControl={false}
        >
          <ZoomControl position="bottomright" />
          
          {mapEngine === 'ola' ? (
            <TileLayer
              attribution='&copy; <a href="https://olamaps.io">Ola Maps</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          ) : (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
          )}

          {sessions.map(session => {
            const lat = parseFloat(session.lat);
            const lng = parseFloat(session.lng);
            
            if (isNaN(lat) || isNaN(lng)) return null;
            
            const helperPos = [lat, lng];
            const cLat = parseFloat(session.customer_lat);
            const cLng = parseFloat(session.customer_lng);
            const customerPos = (!isNaN(cLat) && !isNaN(cLng)) ? [cLat, cLng] : null;

            const isIdle = !session.display_id;

            return (
              <div key={`helper-${session.helper_id}`}>
                {/* HELPER MARKER */}
                <Marker position={helperPos} icon={helperIcon}>
                  <Popup>
                    <div style={{ minWidth: '200px' }}>
                      <div style={{ borderBottom: '1px solid #eee', marginBottom: '8px', paddingBottom: '4px' }}>
                        <strong style={{ color: '#4338ca' }}>{session.helper_name}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#666' }}>
                          {isIdle ? 'IDLE / Available' : `Order: ${session.display_id}`}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
                        {isIdle ? (
                           <>
                             <b>Status:</b> <span className="badge success" style={{ fontSize: '0.7rem' }}>ONLINE</span><br />
                             <b>Contact:</b> {session.helper_phone || 'N/A'}<br />
                           </>
                        ) : (
                          <>
                            <b>Service:</b> {session.service || 'Custom Work'}<br />
                            <b>Status:</b> <span className="badge info" style={{ fontSize: '0.7rem' }}>{session.order_status}</span><br />
                            <div style={{ marginTop: '8px' }}>
                              <a 
                                href={`/track/${session.display_id}`} 
                                target="_blank" 
                                rel="noreferrer"
                                style={{ display: 'inline-block', backgroundColor: '#4338ca', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', textDecoration: 'none', fontWeight: 'bold' }}
                              >
                                🔗 Open Tracking Link
                              </a>
                            </div>
                          </>
                        )}
                        <hr style={{ margin: '8px 0', border: '0', borderTop: '1px solid #eee' }} />
                        <div style={{ color: '#999', fontSize: '0.7rem' }}>Last Seen: {new Date(session.last_seen).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  </Popup>
                </Marker>

                {/* CUSTOMER MARKER */}
                {customerPos && (
                  <>
                    <Marker position={customerPos} icon={customerIcon}>
                      <Popup>
                        <div style={{ textAlign: 'center' }}>
                          <strong>Destination</strong><br />
                          <span style={{ fontSize: '0.8rem' }}>Customer for {session.display_id}</span>
                        </div>
                      </Popup>
                    </Marker>

                    {/* BLUE PATH LINE */}
                    <Polyline 
                      positions={[helperPos, customerPos]} 
                      pathOptions={{ 
                        color: '#6366f1', 
                        weight: 4, 
                        opacity: 0.6, 
                        dashArray: '10, 10',
                        lineCap: 'round'
                      }} 
                    />
                  </>
                )}
              </div>
            );
          })}
        </MapContainer>
      </div>

      <style>{`
        .leaflet-container {
          font-family: 'Inter', sans-serif;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          padding: 4px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        .badge.info { background: #e0e7ff; color: #4338ca; }
      `}</style>
    </div>
  );
}


