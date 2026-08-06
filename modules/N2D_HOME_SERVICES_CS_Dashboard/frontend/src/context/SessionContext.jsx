import React, { createContext, useState, useContext, useEffect } from 'react';

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
    const [bookingSession, setBookingSession] = useState(() => {
        const saved = localStorage.getItem('n2d_booking_session');
        return saved ? JSON.parse(saved) : null;
    });

    useEffect(() => {
        if (bookingSession) {
            localStorage.setItem('n2d_booking_session', JSON.stringify(bookingSession));
        } else {
            localStorage.removeItem('n2d_booking_session');
        }
    }, [bookingSession]);

    return (
        <SessionContext.Provider value={{ bookingSession, setBookingSession }}>
            {children}
        </SessionContext.Provider>
    );
};

export const useSession = () => useContext(SessionContext);
