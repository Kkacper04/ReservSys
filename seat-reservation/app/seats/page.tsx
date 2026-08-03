'use client';

import { useState, useEffect } from 'react';

interface Seat {
  id: number;
  seat_number: string;
}

export default function SeatsPage() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  
  
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [reservationStatus, setReservationStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);


  const startTime = new Date('2026-08-10T10:00:00').toISOString();
  const endTime = new Date('2026-08-10T12:00:00').toISOString();

  const fetchSeats = () => {
    setLoading(true);
    const url = `http://localhost:8000/api/seats/available?start_time=${startTime}&end_time=${endTime}`;

    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error('Error connecting to API');
        return response.json();
      })
      .then((data) => {
        setSeats(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Błąd:", error);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSeats();
  }, []);

  const handleReserve = async () => {
    if (!selectedSeat) return;
    
    setIsSubmitting(true);
    setReservationStatus(null);

    const payload = {
      seat_id: selectedSeat,
      user_id: 1, 
      start_time: startTime,
      end_time: endTime
    };

    try {
      const response = await fetch('http://localhost:8000/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to reserve the seat.');
      }

      setReservationStatus({ type: 'success', msg: 'Success! The seat has been reserved.' });
      setSelectedSeat(null);
      fetchSeats(); 
    
    } catch (error: any) {
      setReservationStatus({ type: 'error', msg: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-lg">Loading available seats...</div>;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Seat Reservation</h1>
    
      {reservationStatus && (
        <div className={`p-4 mb-6 rounded-md ${reservationStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {reservationStatus.msg}
        </div>
      )}

      {seats.length === 0 ? (
        <p className="text-gray-600">No available seats in this time slot.</p>
      ) : (
        <>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-4 mb-8">
            {seats.map((seat) => (
              <button
                key={seat.id}
                onClick={() => setSelectedSeat(seat.id)}
                className={`p-4 rounded-lg text-center font-semibold transition-all duration-200 border-2 ${
                  selectedSeat === seat.id 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105' 
                    : 'bg-blue-50 text-blue-900 border-transparent hover:bg-blue-100 hover:border-blue-300'
                }`}
              >
                {seat.seat_number}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between bg-gray-50 p-6 rounded-lg border border-gray-200">
            <div>
              <p className="text-sm text-gray-500">Selected place:</p>
              <p className="text-xl font-bold text-gray-800">
                {selectedSeat ? seats.find(s => s.id === selectedSeat)?.seat_number : 'Brak'}
              </p>
            </div>
            
            <button
              onClick={handleReserve}
              disabled={!selectedSeat || isSubmitting}
              className={`px-8 py-3 rounded-md font-bold text-white transition-colors ${
                !selectedSeat || isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 shadow-lg'
              }`}
            >
              {isSubmitting ? 'Przetwarzanie...' : 'Potwierdź rezerwację'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}