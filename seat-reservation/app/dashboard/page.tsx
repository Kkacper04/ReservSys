"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  AlertCircle,
  Bell,
  CalendarClock,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw,
  X,
  XCircle,
} from "lucide-react";
import AppShell, { AppShellUser } from "../components/AppShell";
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

interface SeatSummary {
  id: number;
  seat_number: string;
  office_name: string;
  zone: string;
}

type FilterTab = "active" | "history" | "all";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function parseApiDate(value: string): Date {
  const hasTz = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
  return new Date(hasTz ? value : `${value}Z`);
}

function formatDateTime(value: string): string {
  const date = parseApiDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatReservationWindow(startStr: string, endStr: string): {
  dateLabel: string;
  timeLabel: string;
} {
  const start = parseApiDate(startStr);
  const end = parseApiDate(endStr);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { dateLabel: startStr, timeLabel: endStr };
  }

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  const dateFmt: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  };
  const timeFmt: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };

  if (sameDay) {
    return {
      dateLabel: start.toLocaleDateString("en-GB", dateFmt),
      timeLabel: `${start.toLocaleTimeString("en-GB", timeFmt)} – ${end.toLocaleTimeString("en-GB", timeFmt)}`,
    };
  }

  return {
    dateLabel: `${start.toLocaleDateString("en-GB", dateFmt)} – ${end.toLocaleDateString("en-GB", dateFmt)}`,
    timeLabel: `${start.toLocaleTimeString("en-GB", timeFmt)} – ${end.toLocaleTimeString("en-GB", timeFmt)}`,
  };
}

async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string" && data.detail.trim()) {
      return data.detail;
    }
  } catch {
    // Ignore non-JSON error payloads
  }
  return fallback;
}

const STATUS_META: Record<
  string,
  { label: string; className: string; icon: "clock" | "check" | "x" }
> = {
  pending: {
    label: "Pending",
    className: "bg-[#FEF7EB] text-[#8A530D] border-[#EED4A1]",
    icon: "clock",
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-[#ECF4F0] text-[#164234] border-[#B9D5C9]",
    icon: "check",
  },
  checked_in: {
    label: "Checked In",
    className: "bg-[#EEF2F8] text-[#1E3A5F] border-[#C2D1E5]",
    icon: "check",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-[#FDF1F0] text-[#9E2A2B] border-[#EFC8C4]",
    icon: "x",
  },
  no_show: {
    label: "No-show",
    className: "bg-[#FEF7EB] text-[#8A530D] border-[#EED4A1]",
    icon: "x",
  },
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AppShellUser | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [notifications, setNotifications] = useState<NotificationMsg[]>([]);
  const [seatMap, setSeatMap] = useState<Record<number, SeatSummary>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [filterTab, setFilterTab] = useState<FilterTab>("active");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);
  const [dismissingAll, setDismissingAll] = useState(false);

  const fetchDashboardPayload = useCallback(async () => {
    const nowIso = new Date().toISOString();
    const nextHourIso = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const [resResponse, notifResponse, userResponse, seatsResponse] =
      await Promise.all([
        fetch(`${API_URL}/api/reservations/my`, { credentials: "include" }),
        fetch(`${API_URL}/api/me/notifications`, { credentials: "include" }),
        fetch(`${API_URL}/api/me`, { credentials: "include" }),
        fetch(
          `${API_URL}/api/seats/available?start_time=${encodeURIComponent(nowIso)}&end_time=${encodeURIComponent(nextHourIso)}`,
          { credentials: "include" }
        ),
      ]);

    if (resResponse.status === 401 || userResponse.status === 401) {
      return { unauthorized: true as const };
    }

    if (!resResponse.ok) {
      throw new Error(
        await extractErrorMessage(resResponse, "Unable to load your reservations.")
      );
    }

    const [resData, notifData, userData] = await Promise.all([
      resResponse.json() as Promise<Reservation[]>,
      notifResponse.ok
        ? (notifResponse.json() as Promise<NotificationMsg[]>)
        : Promise.resolve([]),
      userResponse.ok
        ? (userResponse.json() as Promise<AppShellUser>)
        : Promise.resolve(null),
    ]);

    let lookup: Record<number, SeatSummary> | null = null;
    if (seatsResponse.ok) {
      const seatsData = (await seatsResponse.json()) as SeatSummary[];
      lookup = {};
      for (const s of seatsData) {
        lookup[s.id] = s;
      }
    }

    return {
      unauthorized: false as const,
      reservations: Array.isArray(resData) ? resData : [],
      notifications: Array.isArray(notifData) ? notifData : [],
      user: userData,
      seatMap: lookup,
    };
  }, []);

  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    setLoadError(null);
    try {
      const result = await fetchDashboardPayload();
      if (result.unauthorized) {
        router.push("/login");
        return;
      }
      setReservations(result.reservations);
      setNotifications(result.notifications);
      if (result.user) setUser(result.user);
      if (result.seatMap) setSeatMap(result.seatMap);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load dashboard data."
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [fetchDashboardPayload, router]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = await fetchDashboardPayload();
        if (!active) return;
        if (result.unauthorized) {
          router.push("/login");
          return;
        }
        setReservations(result.reservations);
        setNotifications(result.notifications);
        if (result.user) setUser(result.user);
        if (result.seatMap) setSeatMap(result.seatMap);
      } catch (err) {
        if (!active) return;
        setLoadError(
          err instanceof Error ? err.message : "Failed to load dashboard data."
        );
      } finally {
        if (active) setIsLoading(false);
      }
    };
    load();

    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [fetchDashboardPayload, router]);

  const markNotificationRead = async (id: number) => {
    try {
      const response = await fetch(
        `${API_URL}/api/me/notifications/${id}/read`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );
      if (!response.ok) {
        throw new Error(
          await extractErrorMessage(response, "Failed to dismiss notification.")
        );
      }
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not dismiss notification."
      );
    }
  };

  const dismissAllNotifications = async () => {
    if (notifications.length === 0) return;
    setDismissingAll(true);
    try {
      await Promise.all(
        notifications.map((n) =>
          fetch(`${API_URL}/api/me/notifications/${n.id}/read`, {
            method: "PATCH",
            credentials: "include",
          })
        )
      );
      setNotifications([]);
      toast.success("All notifications cleared");
    } catch {
      toast.error("Some notifications could not be dismissed.");
    } finally {
      setDismissingAll(false);
    }
  };

  const cancelReservation = async (id: number) => {
    setBusyId(id);
    try {
      const response = await fetch(
        `${API_URL}/api/reservations/${id}/my-cancel`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );
      if (!response.ok) {
        throw new Error(
          await extractErrorMessage(response, "Failed to cancel reservation.")
        );
      }
      setConfirmCancelId(null);
      toast.success("Reservation cancelled");
      await fetchData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to cancel reservation."
      );
    } finally {
      setBusyId(null);
    }
  };

  const checkinReservation = async (id: number) => {
    setBusyId(id);
    try {
      const response = await fetch(
        `${API_URL}/api/reservations/${id}/checkin`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );
      if (!response.ok) {
        throw new Error(
          await extractErrorMessage(response, "Failed to check in.")
        );
      }
      toast.success("Checked in successfully");
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to check in.");
    } finally {
      setBusyId(null);
    }
  };

  const getCheckinState = useCallback(
    (res: Reservation): "open" | "upcoming" | "expired" | "none" => {
      if (res.status !== "pending" && res.status !== "confirmed") return "none";
      const startTime = parseApiDate(res.res_start_time);
      if (Number.isNaN(startTime.getTime())) return "none";
      const diffMinutes =
        (currentTime.getTime() - startTime.getTime()) / (1000 * 60);
      if (diffMinutes >= -15 && diffMinutes <= 15) return "open";
      if (diffMinutes < -15) return "upcoming";
      return "expired";
    },
    [currentTime]
  );

  const activeReservations = useMemo(
    () =>
      reservations.filter(
        (r) => r.status !== "cancelled" && r.status !== "no_show"
      ),
    [reservations]
  );

  const historyReservations = useMemo(
    () =>
      reservations.filter(
        (r) => r.status === "cancelled" || r.status === "no_show"
      ),
    [reservations]
  );

  const checkinReadyCount = useMemo(
    () =>
      activeReservations.filter((r) => getCheckinState(r) === "open").length,
    [activeReservations, getCheckinState]
  );

  const nextUpcoming = useMemo(() => {
    const nowMs = currentTime.getTime();
    const upcoming = activeReservations
      .filter((r) => parseApiDate(r.res_end_time).getTime() > nowMs)
      .sort(
        (a, b) =>
          parseApiDate(a.res_start_time).getTime() -
          parseApiDate(b.res_start_time).getTime()
      );
    return upcoming[0] ?? null;
  }, [activeReservations, currentTime]);

  const displayedReservations = useMemo(() => {
    if (filterTab === "active") return activeReservations;
    if (filterTab === "history") return historyReservations;
    return reservations;
  }, [filterTab, activeReservations, historyReservations, reservations]);

  const renderStatusBadge = (status: string) => {
    const meta = STATUS_META[status] ?? {
      label: status.replace(/_/g, " "),
      className: "bg-[#F1EFE9] text-[#6B6A65] border-[#DDD9CE]",
      icon: "clock" as const,
    };
    return (
      <span className={`rs-badge ${meta.className}`}>
        {meta.icon === "check" && <CheckCircle2 size={13} />}
        {meta.icon === "clock" && <Clock size={13} />}
        {meta.icon === "x" && <XCircle size={13} />}
        {meta.label}
      </span>
    );
  };

  const renderSeatLabel = (seatId: number) => {
    const seat = seatMap[seatId];
    if (!seat) return { title: `Seat #${seatId}`, subtitle: null };
    return {
      title: seat.seat_number,
      subtitle: `${seat.office_name} · ${seat.zone}`,
    };
  };

  return (
    <AppShell
      user={user}
      title="My Reservations"
      subtitle="Track your upcoming workspace bookings, check in upon arrival, and manage changes."
      actions={
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchData}
            disabled={isLoading || isRefreshing}
            className="rs-btn-secondary"
            aria-label="Refresh reservations"
          >
            <RefreshCw
              size={15}
              className={isLoading || isRefreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>
          <Link href="/seats" className="rs-btn-primary">
            Book a Desk
          </Link>
        </div>
      }
    >
      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="rs-card p-5 h-24 animate-pulse bg-white"
              >
                <div className="h-3 w-24 bg-[#F1EFE9] rounded mb-3" />
                <div className="h-6 w-16 bg-[#F1EFE9] rounded" />
              </div>
            ))}
          </div>
          <div className="rs-card p-6 space-y-4">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className="h-16 bg-[#F7F6F2] rounded-lg animate-pulse"
              />
            ))}
          </div>
        </div>
      ) : loadError ? (
        <div className="rs-card p-6 border-[#EFC8C4] bg-[#FDF1F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-[#9E2A2B] shrink-0 mt-0.5" size={20} />
            <div>
              <h2 className="text-sm font-semibold text-[#9E2A2B]">
                Unable to load reservations
              </h2>
              <p className="text-sm text-[#6B6A65] mt-0.5">{loadError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchData}
            className="rs-btn-secondary shrink-0"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <section
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            aria-label="Reservation summary"
          >
            <div className="rs-card p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-[#6B6A65]">
                Active Bookings
              </p>
              <p className="mt-2 text-2xl font-semibold text-[#161615] tabular-nums">
                {activeReservations.length}
              </p>
            </div>

            <div
              className={`rs-card p-5 ${
                checkinReadyCount > 0
                  ? "border-[#B9D5C9] bg-[#ECF4F0]/50"
                  : ""
              }`}
            >
              <p className="text-xs font-medium uppercase tracking-wider text-[#6B6A65]">
                Check-in Ready
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <p
                  className={`text-2xl font-semibold tabular-nums ${
                    checkinReadyCount > 0 ? "text-[#1B4D3E]" : "text-[#161615]"
                  }`}
                >
                  {checkinReadyCount}
                </p>
                {checkinReadyCount > 0 && (
                  <span className="text-xs font-medium text-[#164234]">
                    Window open
                  </span>
                )}
              </div>
            </div>

            <div className="rs-card p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-[#6B6A65]">
                Next Session
              </p>
              {nextUpcoming ? (
                <div className="mt-2">
                  <p className="text-sm font-semibold text-[#161615] truncate">
                    Desk {renderSeatLabel(nextUpcoming.seat_id).title}
                  </p>
                  <p className="text-xs text-[#6B6A65] tabular-nums mt-0.5">
                    {formatDateTime(nextUpcoming.res_start_time)}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-[#9A9890]">None scheduled</p>
              )}
            </div>

            <div className="rs-card p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-[#6B6A65]">
                Past &amp; Cancelled
              </p>
              <p className="mt-2 text-2xl font-semibold text-[#161615] tabular-nums">
                {historyReservations.length}
              </p>
            </div>
          </section>

          {notifications.length > 0 && (
            <section
              className="rs-card border-[#EED4A1] bg-[#FEF7EB] p-5"
              aria-label="Unread notifications"
            >
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-[#8A530D]" />
                  <h2 className="text-sm font-semibold text-[#8A530D]">
                    Notifications ({notifications.length})
                  </h2>
                </div>
                {notifications.length > 1 && (
                  <button
                    type="button"
                    onClick={dismissAllNotifications}
                    disabled={dismissingAll}
                    className="text-xs font-medium text-[#8A530D] hover:underline cursor-pointer disabled:opacity-50"
                  >
                    {dismissingAll ? "Clearing..." : "Dismiss all"}
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="bg-white/85 border border-[#EED4A1] rounded-lg px-4 py-3 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#161615]">
                        {notif.message}
                      </p>
                      <p className="text-xs text-[#6B6A65] tabular-nums mt-1">
                        {formatDateTime(notif.created_at)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => markNotificationRead(notif.id)}
                      className="p-1.5 rounded-md text-[#6B6A65] hover:text-[#161615] hover:bg-[#F1EFE9] transition-colors cursor-pointer shrink-0"
                      aria-label="Dismiss notification"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rs-card overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E4E2DC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1 bg-[#F7F6F2] p-1 rounded-lg border border-[#E4E2DC] w-fit">
                {(
                  [
                    {
                      id: "active",
                      label: "Active",
                      count: activeReservations.length,
                    },
                    {
                      id: "history",
                      label: "Cancelled & No-show",
                      count: historyReservations.length,
                    },
                    {
                      id: "all",
                      label: "All",
                      count: reservations.length,
                    },
                  ] as const
                ).map((tab) => {
                  const selected = filterTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilterTab(tab.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                        selected
                          ? "bg-white text-[#161615] shadow-xs border border-[#E4E2DC]"
                          : "text-[#6B6A65] hover:text-[#161615]"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className="font-mono text-[11px] text-[#9A9890] tabular-nums">
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-[#6B6A65]">
                Check-in opens 15 minutes before and closes 15 minutes after start time.
              </p>
            </div>

            {displayedReservations.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <CalendarClock
                  size={28}
                  className="mx-auto text-[#9A9890] mb-3"
                  strokeWidth={1.6}
                />
                <p className="text-sm font-medium text-[#161615]">
                  {filterTab === "active"
                    ? "No active reservations"
                    : "No reservations in this view"}
                </p>
                <p className="text-xs text-[#6B6A65] mt-1">
                  {filterTab === "active"
                    ? "Select an available desk on the floor plan to create a booking."
                    : "Your completed or cancelled bookings will appear here."}
                </p>
                {filterTab === "active" && (
                  <Link href="/seats" className="rs-btn-primary mt-4">
                    Browse Available Desks
                  </Link>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[#E4E2DC]">
                {displayedReservations.map((res) => {
                  const seatInfo = renderSeatLabel(res.seat_id);
                  const windowText = formatReservationWindow(
                    res.res_start_time,
                    res.res_end_time
                  );
                  const checkinState = getCheckinState(res);
                  const isBusy = busyId === res.id;
                  const isConfirming = confirmCancelId === res.id;
                  const canCancel =
                    res.status !== "cancelled" &&
                    res.status !== "no_show" &&
                    res.status !== "checked_in";
                  const isMuted =
                    res.status === "cancelled" || res.status === "no_show";

                  return (
                    <div
                      key={res.id}
                      className={`px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                        isMuted ? "bg-[#F7F6F2]/50" : "hover:bg-[#F7F6F2]/40"
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-4 min-w-0">
                        <div
                          className={`w-14 h-12 rounded-lg border flex items-center justify-center font-mono text-sm font-semibold shrink-0 tabular-nums ${
                            isMuted
                              ? "bg-[#F1EFE9] border-[#E4E2DC] text-[#6B6A65]"
                              : "bg-[#ECF4F0] border-[#B9D5C9] text-[#1B4D3E]"
                          }`}
                        >
                          {seatInfo.title}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-[#161615]">
                              {seatMap[res.seat_id]
                                ? `Desk ${seatInfo.title}`
                                : seatInfo.title}
                            </span>
                            {seatInfo.subtitle && (
                              <span className="inline-flex items-center gap-1 text-xs text-[#6B6A65]">
                                <MapPin size={12} className="text-[#9A9890]" />
                                {seatInfo.subtitle}
                              </span>
                            )}
                            <span className="font-mono text-[11px] text-[#9A9890] tabular-nums">
                              #{res.id}
                            </span>
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6B6A65] tabular-nums">
                            <span>{windowText.dateLabel}</span>
                            <span className="text-[#CFCBC2]">|</span>
                            <span className="font-mono text-[#161615]">
                              {windowText.timeLabel}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
                        {renderStatusBadge(res.status)}

                        {checkinState === "open" && (
                          <button
                            type="button"
                            onClick={() => checkinReservation(res.id)}
                            disabled={isBusy}
                            className="rs-btn-primary text-xs py-1.5 px-3"
                          >
                            <CheckCircle2 size={14} />
                            {isBusy ? "Checking in..." : "Check in now"}
                          </button>
                        )}

                        {checkinState === "upcoming" && (
                          <span className="text-xs text-[#6B6A65] px-2 py-1 rounded bg-[#F7F6F2] border border-[#E4E2DC]">
                            Check-in opens 15m prior
                          </span>
                        )}

                        {checkinState === "expired" && (
                          <span className="text-xs text-[#9E2A2B] px-2 py-1 rounded bg-[#FDF1F0] border border-[#EFC8C4]">
                            Check-in window passed
                          </span>
                        )}

                        {canCancel &&
                          (isConfirming ? (
                            <div className="flex items-center gap-1.5 bg-[#FDF1F0] border border-[#EFC8C4] rounded-lg px-2 py-1">
                              <span className="text-xs font-medium text-[#9E2A2B] px-1">
                                Cancel booking?
                              </span>
                              <button
                                type="button"
                                onClick={() => cancelReservation(res.id)}
                                disabled={isBusy}
                                className="px-2.5 py-1 rounded text-xs font-semibold bg-[#9E2A2B] text-white hover:bg-[#7F2021] transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {isBusy ? "Cancelling..." : "Confirm"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmCancelId(null)}
                                disabled={isBusy}
                                className="px-2 py-1 rounded text-xs font-medium text-[#6B6A65] hover:text-[#161615] cursor-pointer"
                              >
                                Keep
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmCancelId(res.id)}
                              disabled={isBusy}
                              className="rs-btn-danger"
                            >
                              <XCircle size={14} />
                              Cancel
                            </button>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      <HelpDeskChat />
    </AppShell>
  );
}
