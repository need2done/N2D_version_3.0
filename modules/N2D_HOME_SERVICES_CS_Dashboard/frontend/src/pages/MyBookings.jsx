import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FaCalendarAlt, FaClock, FaExclamationCircle } from 'react-icons/fa';

const MyBookings = () => {
  const [searchParams] = useSearchParams();
  let rawCustomerId = searchParams.get('customerId') || localStorage.getItem('n2d_customerId');
  if (rawCustomerId && rawCustomerId.startsWith('N2DHS')) {
    rawCustomerId = rawCustomerId.substring(5);
  }
  if (rawCustomerId && !/^\d+$/.test(rawCustomerId)) {
    try {
      const decoded = atob(rawCustomerId);
      if (decoded.match(/^\d+$/)) rawCustomerId = decoded;
    } catch (e) {}
  }
  const customerId = rawCustomerId;
  const orderId = searchParams.get('orderId');
  const navigate = useNavigate();
  
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Reschedule Form State
  const [reschedulingBooking, setReschedulingBooking] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlot, setRescheduleSlot] = useState('');

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    try {
      const res = await api.post(`/orders/${bookingId}/cancel`, { reason: 'Cancelled by customer' });
      if (res.data.success) {
        alert("Booking cancelled successfully.");
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to cancel booking.");
    }
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleDate || !rescheduleSlot) {
      alert("Please select both date and time slot.");
      return;
    }
    try {
      const res = await api.post('/home-services/reschedule', {
        id: reschedulingBooking.id,
        bookingDate: rescheduleDate,
        bookingSlot: rescheduleSlot
      });
      if (res.data.success) {
        alert("Booking rescheduled successfully!");
        setReschedulingBooking(null);
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to reschedule booking.");
    }
  };

  useEffect(() => {
    if (!customerId && !orderId) {
      setLoading(false);
      return;
    }

    const fetchBookings = async () => {
      try {
        const query = orderId ? `orderId=${orderId}` : `customerId=${customerId}`;
        const res = await api.get(`/home-services/my-bookings?${query}`);
        if (res.data.success) {
          setBookings(res.data.orders);
          if (res.data.customerId) {
            localStorage.setItem('n2d_customerId', res.data.customerId);
          }
        }
      } catch (err) {
        console.error("Failed to fetch bookings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, [customerId, orderId]);

  const canEdit = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return false;
    try {
      const datePart = dateStr;
      let [time, modifier] = timeStr.split(' ');
      let [hours, minutes] = time.split(':');
      if (hours === '12') hours = '00';
      if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
      const bookingDate = new Date(`${datePart}T${hours}:${minutes}:00`);
      const now = new Date();
      const diffMs = bookingDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      return diffHours > 1;
    } catch (e) {
      return false;
    }
  };

  if (loading) return <div className="text-center py-20">Loading your bookings...</div>;

  if (!customerId && !orderId) {
    return (
      <div className="bg-gray-50 min-h-screen py-20 px-4 text-center">
        <h1 className="text-2xl font-bold text-red-500">Invalid Session</h1>
        <p className="mt-4 text-gray-600">Please access your bookings via the secure link sent on WhatsApp.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl md:text-5xl font-black text-gray-900 mb-10 tracking-tight">My Bookings</h1>
        
        {bookings.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-100">
            <p className="text-gray-500 text-lg mb-4">You have no bookings yet.</p>
            <button onClick={() => navigate('/')} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-xl transition-all">
              Book a Service
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {bookings.map(booking => {
              let payload = {};
              try {
                payload = typeof booking.payload === 'string' ? JSON.parse(booking.payload) : (booking.payload || {});
              } catch(e) {}

              const isEditable = canEdit(payload.bookingDate, payload.bookingSlot);

              const getStatusLabelAndColor = (status) => {
                switch (status) {
                  case 'DRAFT':
                    return { label: 'Draft', bg: 'bg-gray-100 text-gray-700' };
                  case 'CONFIRMED':
                    return { label: 'Booked', bg: 'bg-blue-100 text-blue-800' };
                  case 'HELPER_ACCEPTED':
                  case 'ASSIGNED':
                    return { label: 'Assigned', bg: 'bg-indigo-100 text-indigo-800' };
                  case 'HELPER_ARRIVED':
                  case 'ITEMS_PICKED_UP':
                  case 'RIDE_STARTED':
                    return { label: 'On The Way', bg: 'bg-yellow-100 text-yellow-800' };
                  case 'COMPLETED':
                    return { label: 'Completed', bg: 'bg-green-100 text-green-800' };
                  case 'CANCELLED':
                    return { label: 'Cancelled', bg: 'bg-red-100 text-red-800' };
                  default:
                    return { label: status.replace(/_/g, ' '), bg: 'bg-blue-50 text-blue-700' };
                }
              };

              const statusMeta = getStatusLabelAndColor(booking.status);

              return (
                <div key={booking.order_id} className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center">
                  
                  <div className="mb-6 md:mb-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-black text-gray-900">{payload.serviceName || 'Home Service'}</h3>
                      <span className={`${statusMeta.bg} text-xs font-bold px-3 py-1 rounded-full uppercase`}>
                        {statusMeta.label}
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm mb-4">Booking ID: {booking.order_id}</p>
                    
                    <div className="flex flex-wrap gap-6 text-sm font-medium text-gray-700">
                      <div className="flex items-center">
                        <FaCalendarAlt className="text-orange-500 mr-2" /> {payload.bookingDate || 'N/A'}
                      </div>
                      <div className="flex items-center">
                        <FaClock className="text-orange-500 mr-2" /> {payload.bookingSlot || 'N/A'}
                      </div>
                      <div className="flex items-center font-bold text-gray-900">
                        ₹{booking.total_amount}
                      </div>
                    </div>
                  </div>

                    <div className="flex flex-col gap-3 w-full md:w-auto">
                      {isEditable && !['CANCELLED', 'COMPLETED', 'PAID'].includes(booking.status) ? (
                        <>
                          {(payload.rescheduleCount || 0) < 2 ? (
                            <button 
                              onClick={() => {
                                setReschedulingBooking(booking);
                                setRescheduleDate(payload.bookingDate || '');
                                setRescheduleSlot(payload.bookingSlot || '');
                              }}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-3 px-6 rounded-xl transition-all text-sm w-full"
                            >
                              Reschedule
                            </button>
                          ) : (
                            <div className="bg-orange-50 border border-orange-200 p-3 rounded-xl text-xs text-orange-600 flex items-start w-full">
                              <FaExclamationCircle className="text-orange-400 mt-0.5 mr-2 shrink-0" />
                              Maximum 2 reschedules allowed.
                            </div>
                          )}
                          <button 
                            onClick={() => handleCancelBooking(booking.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 px-6 rounded-xl transition-all text-sm w-full"
                          >
                            Cancel Booking
                          </button>
                        </>
                      ) : (
                        <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-xs text-gray-500 flex items-start max-w-[200px]">
                          <FaExclamationCircle className="text-gray-400 mt-0.5 mr-2 shrink-0" />
                          {booking.status === 'CANCELLED' ? "Booking cancelled." : ['COMPLETED', 'PAID'].includes(booking.status) ? "Booking completed." : "Cannot be edited. Time is within 1 hour of service."}
                        </div>
                      )}
                    </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Reschedule Modal */}
      {reschedulingBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-lg w-full p-8 shadow-2xl border border-gray-100">
            <h2 className="text-2xl font-black text-gray-900 mb-6 tracking-tight">Reschedule Booking</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Select Date</label>
                <input 
                  type="date" 
                  min={new Date().toLocaleDateString('en-CA')}
                  className="w-full p-4 border-2 border-gray-200 rounded-2xl outline-none font-bold text-gray-700"
                  value={rescheduleDate}
                  onChange={(e) => {
                    setRescheduleDate(e.target.value);
                    setRescheduleSlot('');
                  }}
                />
              </div>

              {rescheduleDate && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Select Time Slot</label>
                  <div className="grid grid-cols-2 gap-3 max-h-[180px] overflow-y-auto pr-2">
                    {['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM'].filter(s => {
                      const selectedD = new Date(rescheduleDate);
                      const today = new Date();
                      if (selectedD.toDateString() !== today.toDateString()) return true;
                      const match = s.match(/(\d+):(\d+)\s+(AM|PM)/);
                      if (!match) return false;
                      let hour = parseInt(match[1]);
                      const ampm = match[3];
                      if (ampm === 'PM' && hour !== 12) hour += 12;
                      if (ampm === 'AM' && hour === 12) hour = 0;
                      return hour > today.getHours();
                    }).map(s => (
                      <button 
                        key={s}
                        type="button"
                        onClick={() => setRescheduleSlot(s)}
                        className={`py-3 px-4 rounded-xl border-2 text-xs font-bold transition-all ${rescheduleSlot === s ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-600 hover:bg-gray-50'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-8">
              <button 
                onClick={() => setReschedulingBooking(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmReschedule}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MyBookings;
