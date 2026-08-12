"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/dist/client/components/navigation";

interface Seat {
  id: number;
  seat_number: string;
  is_available: boolean;
  office_name: string;
  is_active: boolean;
}

interface Reservation {
  id: number;
  user_id: number;
  seat_id: number;
  res_start_time: string;
  res_end_time: string;
  status: string;
}

export default function AdminPanel() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [page, setPage] = useState(1);
  const limit = 5;
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    } else {
      fetchSeats();
      fetchReservations();
    }
  }, [router]);

  const fetchSeats = async () => {
    const now = new Date().toISOString();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const response = await fetch(`http://localhost:8000/api/seats/available?start_time=${now}&end_time=${tomorrow}`);
    const data = await response.json();
    setSeats(data);
  };

  const fetchReservations = async () => {
    const skip = (page -1) * limit
    const response = await fetch(`http://localhost:8000/api/reservations/?skip=${skip}&limit=${limit}`);
    const data = await response.json();
    setReservations(data);
  };
   useEffect(() => {
    fetchReservations();
  }, [page]);

  const cancelReservation = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/reservations/${id}/cancel`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        }
      });
      if (!response.ok) throw new Error("Błąd podczas anulowania");
      fetchReservations();
    } catch(err: any) {
      alert(err.message);
    }
  };

  const toggleSeat = async (seatId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/seats/${seatId}/toggle`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Brak uprawnień lub błąd serwera");
      }
      
      fetchSeats();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-blue-400">Admin Panel</h1>
        
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-xl mb-4">Desk Management</h2>
          
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="py-3">Desk</th>
                <th className="py-3">Office</th>
                <th className="py-3">Malfunction status</th>
                <th className="py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {seats.map(seat => (
                <tr key={seat.id} className="border-b border-gray-700/50">
                  <td className="py-3 font-bold">{seat.seat_number}</td>
                  <td className="py-3 text-gray-300">{seat.office_name}</td>
                  <td className="py-3">
                    {seat.is_active ? (
                      <span className="text-green-400">Functional</span>
                    ) : (
                      <span className="text-red-400 font-bold">Locked (malfunction)</span>
                    )}
                  </td>
                  <td className="py-3">
                    <button 
                      onClick={() => toggleSeat(seat.id)}
                      className={`px-4 py-1.5 rounded font-bold text-sm ${seat.is_active ? 'bg-red-900/50 hover:bg-red-900 text-red-200' : 'bg-green-900/50 hover:bg-green-900 text-green-200'}`}
                    >
                      {seat.is_active ? "Report problems" : "Unlock"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 mt-8">
          <h2 className="text-xl mb-4 text-orange-300 font-bold">Active Reservations</h2>
          
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="py-3">Reservation ID</th>
                <th className="py-3">User ID</th>
                <th className="py-3">Seat ID</th>
                <th className="py-3">Status</th>
                <th className="py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {reservations.filter(r => r.status !== "cancelled").map(res => (
                <tr key={res.id} className="border-b border-gray-700/50">
                  <td className="py-3 font-bold">#{res.id}</td>
                  <td className="py-3 text-gray-300">User {res.user_id}</td>
                  <td className="py-3 text-gray-300">Seat {res.seat_id}</td>
                  <td className="py-3">
                    <span className="text-blue-400">{res.status}</span>
                  </td>
                  <td className="py-3">
                    <button 
                      onClick={() => cancelReservation(res.id)}
                      className="px-4 py-1.5 rounded font-bold text-sm bg-orange-900/50 hover:bg-orange-900 text-orange-200 cursor-pointer"
                    >
                      Cancel Reservation
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}