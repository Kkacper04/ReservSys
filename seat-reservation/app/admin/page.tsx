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

export default function AdminPanel() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    } else {
      fetchSeats();
    }
  }, [router]);

  const fetchSeats = async () => {
    const response = await fetch("http://localhost:8000/api/seats/available?start_time=2026-08-10T10:00:00&end_time=2026-08-10T12:00:00");
    const data = await response.json();
    setSeats(data);
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
      </div>
    </div>
  );
}