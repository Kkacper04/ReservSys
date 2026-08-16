"use client";

import { useRouter } from "next/dist/client/components/navigation";
import { useState, useEffect } from "react";
import { Laptop, UserRound, AlertTriangle, X, User, Map, Grid } from "lucide-react";
import Link from "next/link";
import HelpDeskChat from "../components/HelpDeskChat";
import OfficeMap from "../components/OfficeMap";

interface NotificationMsg {
  id: number;
  message: string;
  is_read: boolean;
}

interface Seat {
  id: number;
  seat_number: string;
  is_available: boolean;
  office_name: string;
  zone: string;
  desk_type: string;
  has_monitor: boolean;
  is_active: boolean;
}

export default function SeatsPage() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notifications, setNotifications] = useState<NotificationMsg[]>([]);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  
  const getDefaultTimes = () => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    const start = now.toISOString().slice(0, 16);
    const end = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16);
    return { start, end };
  };

  const defaults = getDefaultTimes();
  const [startTime, setStartTime] = useState(defaults.start);
  const [endTime, setEndTime] = useState(defaults.end);
  const [recurrenceRule, setRecurrenceRule] = useState<string>("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>("");
  const [selectedOffice, setSelectedOffice] = useState<string>("");
  const router = useRouter();

   useEffect(() => {
    fetchSeats();
    fetchNotifications();
  }, []);

useEffect(() => {
  if(startTime && endTime && startTime<endTime){
    const now = new Date().toISOString().slice(0,16);
    if(startTime > now){
      fetchSeats();
    }
   }
  }, [startTime, endTime]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/me/notifications", {
        credentials: "include"
      });
            if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markNotificationRead = async (id: number) => {
    try {
      await fetch(`http://localhost:8000/api/me/notifications/${id}/read`, {
        method: "PATCH",
        credentials: "include"
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSeats = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `http://localhost:8000/api/seats/available?start_time=${startTime}:00&end_time=${endTime}:00`,
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Choose correct time range");
      }

        
      const data = await response.json();
      setSeats(data);
      if (data.length > 0 && selectedOffice === "") {
        setSelectedOffice(data[0].office_name);
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReserve = async () => {
    if (!selectedSeat) return;
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('http://localhost:8000/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: "include",
        body: JSON.stringify({
          seat_id: selectedSeat,
          res_start_time: `${startTime}:00`,
          res_end_time: `${endTime}:00`,
          recurrence_rule: recurrenceRule === "none" ? null : recurrenceRule,
          recurrence_end_date: recurrenceRule === "none" || !recurrenceEndDate ? null : `${recurrenceEndDate}T23:59:00`,
        }),
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }
    
      if (!response.ok) {
      
        const errorData = await response.json();
        throw new Error(errorData.detail || "Reservation failed");
      }

      setMessage({ type: "success", text: "Seat reserved successfully!" });
      setSelectedSeat(null);
      fetchSeats();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {notifications.length > 0 && (
        <div className="max-w-6xl mx-auto mb-6 flex flex-col gap-2">
          {notifications.map(notif => (
            <div key={notif.id} className="bg-red-900/80 border border-red-500 text-red-100 p-4 rounded-lg flex justify-between items-center shadow-lg shadow-red-900/20">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-red-400" size={24} />
                <span className="font-bold">{notif.message}</span>
              </div>
              <button 
                onClick={() => markNotificationRead(notif.id)} 
                className="text-red-300 hover:text-white bg-red-950 p-2 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-red-400">
            Seat Reservation
          </h1>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-4 py-2 rounded-lg border border-gray-700 transition-colors"
          >
            <User size={18} />
            My Reservations
          </Link>
          <button
            onClick={async() => {
              await fetch("http://localhost:8000/api/logout",{
                method: "POST",
                credentials : "include"
              });
              router.push('/login');
            }}
            className="flex items-center gap-2 bg-red-900/30 hover:bg-red-800 text-red-300 hover:text-white px-4 py-2 rounded-lg border border-red-800 transition-colors cursor-pointer"
          >
           Logout
          </button>
        </div>

        {message && (
          <div
            className={`p-4 mb-6 rounded-md text-center font-bold ${message.type === "success" ? "bg-green-900 text-green-200" : "bg-red-900 text-red-200"}`}
          >
            {message.text}
          </div>
        )}
       <div className="mb-8 p-5 bg-gray-800 rounded-lg border border-gray-700 flex flex-col gap-5 shadow-md">
          <div className="flex flex-col border-b border-gray-700 pb-5">
            <label className="text-gray-300 font-bold mb-2">Select Office:</label>
            <select 
              value={selectedOffice} 
              onChange={(e) => setSelectedOffice(e.target.value)}
              className="bg-gray-900 border border-gray-600 rounded-md p-3 text-white text-lg font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
            >
              {Array.from(new Set(seats.map(s => s.office_name))).map(office => (
                <option key={office} value={office}>{office}</option>
              ))}
            </select>
          </div>
          <p className="text-gray-300 font-semibold text-sm">
            Select time range:
          </p>

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

          <div className="flex flex-col border-t border-gray-700 pt-5 mt-2">
            <label className="text-gray-300 font-bold mb-2">Repeat Reservation:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <select 
                value={recurrenceRule} 
                onChange={(e) => setRecurrenceRule(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded-md p-2 text-white text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>

              {recurrenceRule !== "none" && (
                <div className="flex flex-col">
                  <label className="text-xs text-gray-400 mb-1">Until (End Date):</label>
                  <input
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    className="bg-gray-900 border border-gray-700 rounded-md p-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : (
          <div className="flex flex-col gap-8 mb-10">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-gray-300">Select your desk</h2>
              <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold text-sm transition-colors ${viewMode === "grid" ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-gray-200"}`}
                >
                  <Grid size={16} /> Grid
                </button>
                <button
                  onClick={() => setViewMode("map")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold text-sm transition-colors ${viewMode === "map" ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-gray-200"}`}
                >
                  <Map size={16} /> Map
                </button>
              </div>
            </div>

            {viewMode === "map" ? (
              <OfficeMap 
                seats={seats} 
                selectedSeat={selectedSeat} 
                onSelectSeat={setSelectedSeat} 
                selectedOffice={selectedOffice} 
              />
            ) : (
              <>
                {Array.from(new Set(seats.filter(s => s.office_name === selectedOffice).map((s) => s.zone))).map((zone) => (
              <div
                key={zone}
                className="bg-gray-800/50 p-6 rounded-xl border border-gray-700"
              >
                <div className="flex items-center justify-between mb-8 border-b border-gray-700 pb-4">
                  <h2 className="text-2xl font-bold text-blue-300 flex items-center gap-2">
                    {zone}
                  </h2>
                  <span className="text-gray-400 text-sm font-medium bg-gray-900 px-3 py-1 rounded-full border border-gray-700">
                    {seats.filter(s => s.zone === zone).length} seats
                  </span>
                </div>
                <div
                  className={`grid gap-4 ${
                    zone === "Open Space"
                      ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-y-12 gap-x-6 place-items-center"
                      : zone === "Quiet Zone"
                        ? "grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-12 place-items-center bg-gray-900/50 p-6 rounded-xl border border-gray-800"
                        : "grid-cols-2 gap-8 place-items-center"
                  }`}
                >
                  {seats
                    .filter((seat) => seat.zone === zone && seat.office_name === selectedOffice)
                    .map((seat) => (
                      <button
                        key={seat.id}
                        onClick={() => setSelectedSeat(selectedSeat === seat.id ? null : seat.id)}
                        disabled={!seat.is_available || !seat.is_active}
                        title={!seat.is_active ? "Out of service" : ""}
                        className={`relative group w-24 h-24 flex flex-col items-center justify-center rounded-xl font-bold transition-all duration-300 shadow-md ${
                          !seat.is_active
                            ? "bg-zinc-900 text-zinc-700 cursor-not-allowed border-2 border-zinc-800 opacity-40"
                            : !seat.is_available
                              ? "bg-gray-800 text-gray-600 cursor-not-allowed border-2 border-gray-900 opacity-60"
                              : selectedSeat === seat.id
                                ? "bg-blue-600 text-white scale-110 ring-4 ring-blue-400 ring-opacity-50 z-10"
                                : "bg-gradient-to-b from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-gray-200 border-2 border-gray-600 hover:border-blue-400 hover:shadow-blue-900/50 hover:shadow-lg cursor-pointer"
                        }`}
                      >
                        <div className="absolute top-0 w-full h-2 bg-white/10 rounded-t-xl"></div>

                        <span className="text-2xl tracking-wider mb-1">
                          {seat.seat_number}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm flex items-center gap-1 ${
                            !seat.is_active ? 'bg-zinc-800 text-zinc-600' :
                            seat.desk_type === "private"
                              ? "bg-red-900/40 text-red-300"
                              : seat.desk_type === "booth"
                                ? "bg-purple-900/50 text-purple-300"
                                : "bg-gray-900/50 text-gray-400"
                          }`}
                        >
                          {seat.desk_type}
                        </span>

                        {seat.has_monitor && seat.is_active && (
                          <div
                            className="absolute -top-3 -right-3 bg-slate-800 text-sky-400 w-8 h-8 flex items-center justify-center rounded-xl border border-slate-700 shadow-lg rotate-12 group-hover:rotate-0 group-hover:bg-sky-500 group-hover:text-white transition-all duration-300"
                            title="Seat has a monitor included"
                          >
                            <Laptop size={14} strokeWidth={2.5} />
                          </div>
                        )}
                        {!seat.is_active && (
                           <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl backdrop-blur-[1px] z-20">
                             <span className="text-red-500 font-black text-xs uppercase tracking-widest bg-red-950/80 px-2 py-1 rounded border border-red-900 rotate-[-15deg]">
                               Out of<br/>Service
                             </span>
                           </div>
                        )}
                        {!seat.is_available && seat.is_active && (
                          <div className="absolute -bottom-4 bg-rose-950/80 text-rose-400 px-3 py-1.5 flex items-center gap-1.5 rounded-lg border border-rose-900/50 shadow-sm backdrop-blur-sm z-10">
                            <UserRound size={12} strokeWidth={2.5} />
                            <span className="text-[9px] font-bold uppercase tracking-wider">
                              Occupied
                            </span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </>
            )}
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={handleReserve}
            disabled={!selectedSeat || isSubmitting}
            className={`px-10 py-4 rounded-lg font-bold text-lg transition-colors w-full md:w-auto ${
              !selectedSeat || isSubmitting
                ? "bg-gray-800 cursor-not-allowed text-gray-500 border border-gray-700"
                : "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/50 cursor-pointer"
            }`}
          >
            {isSubmitting ? "Processing..." : "Confirm Reservation"}
          </button>
        </div>
      </div>
      <HelpDeskChat />
    </div>
  );
}
