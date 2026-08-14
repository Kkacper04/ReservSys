"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/dist/client/components/navigation";
import { AlertTriangle, X, Clock, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import HelpDeskChat from "../components/HelpDeskChat";

interface Reservation {
  id: number;
  user_id: number;
  seat_id: number;
  res_start_time: string;
  res_end_time: string;
  status: string;
}

interface NotificationMsg {
  id: number;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function DashboardPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [notifications, setNotifications] = useState<NotificationMsg[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

    useEffect(() => {
      fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    

    try {
      const [resResponse, notifResponse] = await Promise.all([
        fetch("http://localhost:8000/api/reservations/my", {credentials: "include" }),
        fetch("http://localhost:8000/api/me/notifications", { credentials: "include" }),
      ]);

      if (resResponse.ok) {
        setReservations(await resResponse.json());
      }
      if (notifResponse.ok) {
        setNotifications(await notifResponse.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const markNotificationRead = async (id: number) => {
    try {
      await fetch(`http://localhost:8000/api/me/notifications/${id}/read`, {
        method: "PATCH",
        credentials: "include"
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const cancelReservation = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/reservations/${id}/my-cancel`, {
        method: "PATCH",
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to cancel reservation");
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock size={16} className="text-yellow-400" />;
      case "confirmed":
        return <CheckCircle size={16} className="text-green-400" />;
      case "cancelled":
        return <XCircle size={16} className="text-red-400" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-900/30 text-yellow-300 border-yellow-800";
      case "confirmed":
        return "bg-green-900/30 text-green-300 border-green-800";
      case "cancelled":
        return "bg-red-900/30 text-red-300 border-red-800";
      default:
        return "bg-gray-900/30 text-gray-300 border-gray-800";
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const activeReservations = reservations.filter((r) => r.status !== "cancelled");
  const cancelledReservations = reservations.filter((r) => r.status === "cancelled");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-blue-400">My Dashboard</h1>
          <button
            onClick={() => router.push("/seats")}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
            Back to Seats
          </button>
        </div>

        {notifications.length > 0 && (
          <div className="mb-8 flex flex-col gap-2">
            <h2 className="text-lg font-bold text-red-400 mb-2">Notifications</h2>
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="bg-red-900/80 border border-red-500 text-red-100 p-4 rounded-lg flex justify-between items-center shadow-lg shadow-red-900/20"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-red-400 shrink-0" size={24} />
                  <div>
                    <span className="font-bold">{notif.message}</span>
                    <p className="text-red-300 text-xs mt-1">
                      {formatDate(notif.created_at)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => markNotificationRead(notif.id)}
                  className="text-red-300 hover:text-white bg-red-950 p-2 rounded-full transition-colors cursor-pointer shrink-0 ml-4"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 mb-6">
          <h2 className="text-xl font-bold mb-4 text-blue-300">Active Reservations</h2>

          {activeReservations.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No active reservations</p>
          ) : (
            <div className="flex flex-col gap-3">
              {activeReservations.map((res) => (
                <div
                  key={res.id}
                  className="bg-gray-900 p-4 rounded-lg border border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-white bg-gray-800 w-12 h-12 flex items-center justify-center rounded-lg border border-gray-600">
                      {res.seat_id}
                    </span>
                    <div>
                      <p className="font-bold text-gray-200">
                        Seat #{res.seat_id}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {formatDate(res.res_start_time)} — {formatDate(res.res_end_time)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold ${getStatusStyle(res.status)}`}
                    >
                      {getStatusIcon(res.status)}
                      {res.status.toUpperCase()}
                    </div>
                    <button
                      onClick={() => cancelReservation(res.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-800 bg-red-900/30 text-red-300 hover:bg-red-900 hover:text-red-100 text-sm font-bold transition-colors cursor-pointer"
                    >
                      <XCircle size={14} />
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cancelledReservations.length > 0 && (
          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50">
            <h2 className="text-xl font-bold mb-4 text-gray-500">Cancelled Reservations</h2>
            <div className="flex flex-col gap-3">
              {cancelledReservations.map((res) => (
                <div
                  key={res.id}
                  className="bg-gray-900/50 p-4 rounded-lg border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 opacity-50"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-gray-600 bg-gray-800 w-12 h-12 flex items-center justify-center rounded-lg border border-gray-700">
                      {res.seat_id}
                    </span>
                    <div>
                      <p className="font-bold text-gray-500">
                        Seat #{res.seat_id}
                      </p>
                      <p className="text-gray-600 text-sm">
                        {formatDate(res.res_start_time)} — {formatDate(res.res_end_time)}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold ${getStatusStyle(res.status)}`}
                  >
                    {getStatusIcon(res.status)}
                    {res.status.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <HelpDeskChat />
    </div>
  );
}
