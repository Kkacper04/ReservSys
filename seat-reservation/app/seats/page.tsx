'use client';

import { useRouter } from 'next/dist/client/components/navigation';
import { useState, useEffect } from 'react';

interface Seat {
  id: number;
  seat_number: string;
  is_available: boolean;
}

export default function SeatsPage() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  
  const [startTime, setStartTime] = useState("2026-08-10T10:00");
  const [endTime, setEndTime] = useState("2026-08-10T12:00");
  
  const router = useRouter();
  
  useEffect(() => {
    const storedUserId = localStorage.getItem('user_id');
    if (storedUserId) {
      setUserId(parseInt(storedUserId));
    }
    fetchSeats();
  }, []);

  const fetchSeats = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`http://localhost:8000/api/seats/available?start_time=${startTime}:00&end_time=${endTime}:00`);
      if (!response.ok) {
        throw new Error('Failed to fetch seats');
      }
      const data = await response.json();
      setSeats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReserve = async () => {
    if (!selectedSeat) return;
    
    if (!userId) {
      setMessage({ type: 'error', text: 'User not logged in. Please log in to reserve a seat.' });
      return;
    }
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('http://localhost:8000/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          seat_id: selectedSeat,
          res_start_time: `${startTime}:00`,
          res_end_time: `${endTime}:00`
        }),
      });

      if (!response.ok) {
        throw new Error('Reservation failed');
      }

      setMessage({ type: 'success', text: 'Seat reserved successfully!' });
      setSelectedSeat(null);
      fetchSeats(); 
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-red-500">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-red-400">Seat Reservation</h1>
        
        {message && (
          <div className={`p-4 mb-6 rounded-md text-center font-bold ${message.type === 'success' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
            {message.text}
          </div>
        )}
        <div className="mb-8 p-5 bg-gray-800 rounded-lg border border-gray-700 flex flex-col gap-4 shadow-md">
          <p className="text-gray-300 font-semibold text-center text-sm">Select time range:</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-xs text-gray-400 mb-1">From:</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded-md p-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs text-gray-400 mb-1">To:</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded-md p-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            onClick={fetchSeats}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-md transition-colors text-sm shadow cursor-pointer"
          >
            Check Available Seats
          </button>
        </div>

        {/* Siatka krzeseł */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading seats...</div>
        ) : (
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {seats.map((seat) => (
              <button
                key={seat.id}
                onClick={() => setSelectedSeat(seat.id)}
                disabled={!seat.is_available} 
                className={`w-14 h-14 flex items-center justify-center rounded-md font-bold transition-all duration-200 shadow-sm ${
                  !seat.is_available
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-800 opacity-50' 
                    : selectedSeat === seat.id
                      ? 'bg-blue-500 text-white scale-105 ring-2 ring-blue-300' 
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600 hover:border-gray-500 cursor-pointer'
                }`}
              >
                {seat.seat_number}
              </button>
            ))}
          </div>
        )}
        
        <div className="flex justify-center">
          <button
            onClick={handleReserve}
            disabled={!selectedSeat || isSubmitting}
            className={`px-10 py-4 rounded-lg font-bold text-lg transition-colors w-full md:w-auto ${
              !selectedSeat || isSubmitting
                ? 'bg-gray-800 cursor-not-allowed text-gray-500 border border-gray-700'
                : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/50 cursor-pointer'
            }`}
          >
            {isSubmitting ? 'Processing...' : 'Confirm Reservation'}
          </button>
        </div>
      </div>
    </div>
  );
}