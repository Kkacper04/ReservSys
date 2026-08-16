"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/dist/client/components/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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
  const [activeTab, setActiveTab] = useState<"management" | "analytics">("management");
  const [analytics, setAnalytics] = useState<any>(null);
  const limit = 5;
  const router = useRouter();

     useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/reservations/?skip=0&limit=${limit}`, {
          credentials: "include"
        });
        if (res.status === 403 || res.status === 401) {
          router.push("/seats");
          return;
        }

        fetchSeats();
      } catch {
        router.push("/login");
      }
    };
    init();
  }, []);

  const fetchSeats = async () => {
    const now = new Date().toISOString();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const response = await fetch(`http://localhost:8000/api/seats/available?start_time=${now}&end_time=${tomorrow}`);
    const data = await response.json();
    setSeats(data);
  };

  const fetchReservations = async () => {
    const skip = (page -1) * limit
    const response = await fetch(`http://localhost:8000/api/reservations/?skip=${skip}&limit=${limit}`, {credentials : "include"});
    const data = await response.json();
    setReservations(data);
  };
  
  const fetchAnalytics = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/admin/analytics", {credentials: "include"});
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [page]);

  useEffect(() => {
    if (activeTab === "analytics" && !analytics) {
      fetchAnalytics();
    }
  }, [activeTab]);

  const cancelReservation = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/reservations/${id}/cancel`, {
        method: "DELETE",
        credentials: "include"
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
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Brak uprawnień lub błąd serwera");
      }
      
      fetchSeats();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-blue-400">Admin Panel</h1>
        
        <div className="flex gap-4 mb-8 border-b border-gray-700 pb-2">
          <button 
            onClick={() => setActiveTab("management")}
            className={`px-4 py-2 font-bold transition-colors ${activeTab === "management" ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400 hover:text-gray-200"}`}
          >
            Management
          </button>
          <button 
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-2 font-bold transition-colors ${activeTab === "analytics" ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400 hover:text-gray-200"}`}
          >
            Analytics
          </button>
        </div>

        {activeTab === "management" ? (
          <>
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
              {reservations.map(res => (
                <tr key={res.id} className="border-b border-gray-700/50">
                  <td className="py-3 font-bold">#{res.id}</td>
                  <td className="py-3 text-gray-300">User {res.user_id}</td>
                  <td className="py-3 text-gray-300">Seat {res.seat_id}</td>
                  <td className="py-3">
                 
                    <span className={res.status === 'cancelled' ? "text-gray-500" : "text-blue-400"}>
                      {res.status}
                    </span>
                  </td>
                  <td className="py-3">
                   
                    {res.status !== 'cancelled' && (
                      <button 
                        onClick={() => cancelReservation(res.id)}
                        className="px-4 py-1.5 rounded font-bold text-sm bg-orange-900/50 hover:bg-orange-900 text-orange-200 cursor-pointer"
                      >
                        Cancel Reservation
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`px-4 py-2 rounded-lg font-bold ${page === 1 ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
            >
              Previous Page
            </button>
            
            <span className="text-gray-400 font-bold">Page {page}</span>
            
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={reservations.length < limit}
              className={`px-4 py-2 rounded-lg font-bold ${reservations.length < limit ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
            >
              Next Page
            </button>
          </div>
        </div>
        </>
        ) : (
          analytics ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                <h2 className="text-xl font-bold mb-6 text-gray-200">Reservations by Status</h2>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(analytics.status_breakdown).map(([k, v]) => ({ name: k, value: v }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      >
                        {Object.entries(analytics.status_breakdown).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: 'white' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                <h2 className="text-xl font-bold mb-6 text-gray-200">Most Popular Seats</h2>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.popular_seats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="seat" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" allowDecimals={false} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: 'white' }} />
                      <Legend />
                      <Bar dataKey="count" fill="#3b82f6" name="Total Reservations" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg lg:col-span-2">
                <h2 className="text-xl font-bold mb-6 text-gray-200">Total Reservations by Zone & Office</h2>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.zone_breakdown}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="zone" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" allowDecimals={false} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: 'white' }} />
                      <Legend />
                      <Bar dataKey="count" fill="#10b981" name="Reservations" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">Loading analytics...</div>
          )
        )}
      </div>
    </div>
  );
}