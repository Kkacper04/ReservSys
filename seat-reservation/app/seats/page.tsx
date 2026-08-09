"use client";

import { useRouter } from "next/dist/client/components/navigation";
import { useState, useEffect } from "react";
import { Laptop, UserRound, Headphones, DoorClosed } from "lucide-react";

interface Seat {
  id: number;
  seat_number: string;
  is_available: boolean;
  zone: string;
  desk_type: string;
  has_monitor: boolean;
}

export default function SeatsPage() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [userId, setUserId] = useState<number | null>(null);

  const [startTime, setStartTime] = useState("2026-08-10T10:00");
  const [endTime, setEndTime] = useState("2026-08-10T12:00");

  const router = useRouter();

  useEffect(() => {
    const storedUserId = localStorage.getItem("user_id");
    if (!storedUserId) {
      router.push("/login");
    } else {
      setUserId(parseInt(storedUserId));
      fetchSeats();
    }
  }, [router]);

  const fetchSeats = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `http://localhost:8000/api/seats/available?start_time=${startTime}:00&end_time=${endTime}:00`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch seats");
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
      setMessage({
        type: "error",
        text: "User not logged in. Please log in to reserve a seat.",
      });
      return;
    }
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("http://localhost:8000/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          seat_id: selectedSeat,
          res_start_time: `${startTime}:00`,
          res_end_time: `${endTime}:00`,
        }),
      });

      if (!response.ok) {
        throw new Error("Reservation failed");
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

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-red-500">
        Error: {error}
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-red-400">
          Seat Reservation
        </h1>

        {message && (
          <div
            className={`p-4 mb-6 rounded-md text-center font-bold ${message.type === "success" ? "bg-green-900 text-green-200" : "bg-red-900 text-red-200"}`}
          >
            {message.text}
          </div>
        )}
        <div className="mb-8 p-5 bg-gray-800 rounded-lg border border-gray-700 flex flex-col gap-4 shadow-md">
          <p className="text-gray-300 font-semibold text-center text-sm">
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

          <button
            onClick={fetchSeats}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-md transition-colors text-sm shadow cursor-pointer"
          >
            Check Available Seats
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : (
          <div className="flex flex-col gap-8 mb-10">
            {Array.from(new Set(seats.map((s) => s.zone))).map((zone) => (
              <div
                key={zone}
                className="bg-gray-800/50 p-6 rounded-xl border border-gray-700"
              >
                <div className="flex items-center justify-between mb-8 border-b border-gray-700 pb-4">
                  <h2 className="text-2xl font-bold text-blue-300 flex items-center gap-2">
                    {zone === 'Quiet Zone'  }
                    {zone === 'Private Room' }
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
                        : "grid-cols-2 gap-8 place-items-center" //Private Zone
                  }`}
                >
                  {seats
                    .filter((seat) => seat.zone === zone)
                    .map((seat) => (
                      <button
                        key={seat.id}
                        onClick={() => setSelectedSeat(seat.id)}
                        disabled={!seat.is_available}
                        className={`relative group w-24 h-24 flex flex-col items-center justify-center rounded-xl font-bold transition-all duration-300 shadow-md ${
                          !seat.is_available
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
                            seat.desk_type === "private"
                              ? "bg-red-900/40 text-red-300"
                              : seat.desk_type === "booth"
                                ? "bg-purple-900/50 text-purple-300"
                                : "bg-gray-900/50 text-gray-400"
                          }`}
                        >
                          {seat.desk_type}
                        </span>

                        {seat.has_monitor && (
                          <div
                            className="absolute -top-3 -right-3 bg-slate-800 text-sky-400 w-8 h-8 flex items-center justify-center rounded-xl border border-slate-700 shadow-lg rotate-12 group-hover:rotate-0 group-hover:bg-sky-500 group-hover:text-white transition-all duration-300"
                            title="Seat has a monitor included"
                          >
                            <Laptop size={14} strokeWidth={2.5} />
                          </div>
                        )}
                        {!seat.is_available && (
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
    </div>
  );
}
