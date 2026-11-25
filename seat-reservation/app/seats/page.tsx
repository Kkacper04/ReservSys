"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  Check,
  LayoutGrid,
  Map as MapIcon,
  Monitor,
  Repeat,
  X,
} from "lucide-react";
import AppShell, { AppShellUser } from "../components/AppShell";
import OfficeMap, { OfficeMapSeat } from "../components/OfficeMap";
import HelpDeskChat from "../components/HelpDeskChat";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface NotificationMsg {
  id: number;
  message: string;
  is_read: boolean;
}

interface MyReservation {
  id: number;
  seat_id: number;
  res_start_time: string;
  res_end_time: string;
  status: string;
}

function toLocalDateTimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toLocalDateInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

function parseApiDate(value: string): Date {
  const hasTz = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  return new Date(hasTz ? value : `${value}Z`);
}

function getDefaultTimes() {
  const now = new Date();
  const startObj = new Date(now.getTime() + 15 * 60000);
  const endObj = new Date(startObj.getTime() + 2 * 60 * 60 * 1000);
  return {
    start: toLocalDateTimeInput(startObj),
    end: toLocalDateTimeInput(endObj),
  };
}

function formatReadableRange(startStr: string, endStr: string): string {
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "";
  }
  const sameDay = start.toDateString() === end.toDateString();
  const datePart = start.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const startTime = start.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = end.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (sameDay) {
    return `${datePart}, ${startTime}–${endTime}`;
  }
  const endDatePart = end.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
  return `${datePart} ${startTime} – ${endDatePart} ${endTime}`;
}

export default function SeatsPage() {
  const [defaults] = useState(() => getDefaultTimes());
  const [seats, setSeats] = useState<OfficeMapSeat[]>([]);
  const [myReservations, setMyReservations] = useState<MyReservation[]>([]);
  const [user, setUser] = useState<AppShellUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notifications, setNotifications] = useState<NotificationMsg[]>([]);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [startTime, setStartTime] = useState(defaults.start);
  const [endTime, setEndTime] = useState(defaults.end);
  const [recurrenceRule, setRecurrenceRule] = useState<string>("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>("");
  const [selectedOffice, setSelectedOffice] = useState<string>("");

  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [onlyMonitor, setOnlyMonitor] = useState(false);
  const [deskTypeFilter, setDeskTypeFilter] = useState<string>("all");

  const router = useRouter();

  const timeValidationError = useMemo(() => {
    if (!startTime || !endTime) return "Select both start and end times.";
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return "Enter a valid date and time range.";
    }
    if (start >= end) {
      return "End time must be after start time.";
    }
    if ((end.getTime() - start.getTime()) / (1000 * 60 * 60) > 16) {
      return "A single reservation cannot exceed 16 hours.";
    }
    return null;
  }, [startTime, endTime]);

  const loadSeats = async (startVal: string, endVal: string) => {
    const startIso = new Date(startVal).toISOString();
    const endIso = new Date(endVal).toISOString();
    const response = await fetch(
      `${API_URL}/api/seats/available?start_time=${encodeURIComponent(
        startIso
      )}&end_time=${encodeURIComponent(endIso)}`,
      { credentials: "include" }
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.detail || "Unable to load seats for this range.");
    }
    return (await response.json()) as OfficeMapSeat[];
  };

  const applySeatsData = (data: OfficeMapSeat[]) => {
    setSeats(data);
    setSelectedOffice((prev) => {
      if (prev && data.some((s) => s.office_name === prev)) return prev;
      return data.length > 0 ? data[0].office_name : "";
    });
    setSelectedSeat((prev) => {
      if (!prev) return null;
      const match = data.find((s) => s.id === prev);
      return match && match.is_active && match.is_available ? prev : null;
    });
  };

  const refreshAccountData = async () => {
    const [meRes, notifRes, myRes] = await Promise.all([
      fetch(`${API_URL}/api/me`, { credentials: "include" }),
      fetch(`${API_URL}/api/me/notifications`, { credentials: "include" }),
      fetch(`${API_URL}/api/reservations/my`, { credentials: "include" }),
    ]);

    if (meRes.status === 401 || notifRes.status === 401) {
      router.push("/login");
      return;
    }

    if (meRes.ok) {
      setUser(await meRes.json());
    }
    if (notifRes.ok) {
      setNotifications(await notifRes.json());
    }
    if (myRes.ok) {
      setMyReservations(await myRes.json());
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [meRes, notifRes, myRes] = await Promise.all([
          fetch(`${API_URL}/api/me`, { credentials: "include" }),
          fetch(`${API_URL}/api/me/notifications`, { credentials: "include" }),
          fetch(`${API_URL}/api/reservations/my`, { credentials: "include" }),
        ]);

        if (!active) return;

        if (meRes.status === 401 || notifRes.status === 401) {
          router.push("/login");
          return;
        }

        if (meRes.ok) {
          setUser(await meRes.json());
        }
        if (notifRes.ok) {
          setNotifications(await notifRes.json());
        }
        if (myRes.ok) {
          setMyReservations(await myRes.json());
        }
      } catch (err) {
        console.error(err);
      }
    })();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (timeValidationError) return;
    let active = true;

    (async () => {
      try {
        const data = await loadSeats(startTime, endTime);
        if (!active) return;
        applySeatsData(data);
      } catch (err: unknown) {
        if (!active) return;
        const msg =
          err instanceof Error ? err.message : "Failed to load available desks.";
        setFeedback({ type: "error", text: msg });
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [startTime, endTime, timeValidationError]);

  const markNotificationRead = async (id: number) => {
    try {
      await fetch(`${API_URL}/api/me/notifications/${id}/read`, {
        method: "PATCH",
        credentials: "include",
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const applyDurationPreset = (hours: number) => {
    const base = new Date();
    const startObj = new Date(base.getTime() + 15 * 60000);
    const endObj = new Date(startObj.getTime() + hours * 60 * 60 * 1000);
    setStartTime(toLocalDateTimeInput(startObj));
    setEndTime(toLocalDateTimeInput(endObj));
  };

  const applyTomorrowWorkday = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startObj = new Date(
      tomorrow.getFullYear(),
      tomorrow.getMonth(),
      tomorrow.getDate(),
      9,
      0
    );
    const endObj = new Date(
      tomorrow.getFullYear(),
      tomorrow.getMonth(),
      tomorrow.getDate(),
      17,
      0
    );
    setStartTime(toLocalDateTimeInput(startObj));
    setEndTime(toLocalDateTimeInput(endObj));
  };

  const handleRecurrenceChange = (value: string) => {
    setRecurrenceRule(value);
    if (value !== "none" && !recurrenceEndDate) {
      const startDate = new Date(startTime);
      const base = Number.isNaN(startDate.getTime()) ? new Date() : startDate;
      base.setDate(base.getDate() + (value === "weekly" ? 21 : 7));
      setRecurrenceEndDate(toLocalDateInput(base));
    }
  };

  const mySeatIds = useMemo(() => {
    const reqStart = new Date(startTime).getTime();
    const reqEnd = new Date(endTime).getTime();
    const ids = new Set<number>();
    if (Number.isNaN(reqStart) || Number.isNaN(reqEnd)) return ids;

    for (const res of myReservations) {
      if (res.status === "cancelled" || res.status === "no_show") continue;
      const resStart = parseApiDate(res.res_start_time).getTime();
      const resEnd = parseApiDate(res.res_end_time).getTime();
      if (resStart < reqEnd && resEnd > reqStart) {
        ids.add(res.seat_id);
      }
    }
    return ids;
  }, [myReservations, startTime, endTime]);

  const offices = useMemo(
    () => Array.from(new Set(seats.map((s) => s.office_name))),
    [seats]
  );

  const officeSeats = useMemo(
    () => seats.filter((s) => s.office_name === selectedOffice),
    [seats, selectedOffice]
  );

  const deskTypes = useMemo(
    () => Array.from(new Set(officeSeats.map((s) => s.desk_type))),
    [officeSeats]
  );

  const filteredSeats = useMemo(() => {
    return officeSeats.filter((seat) => {
      if (onlyAvailable && (!seat.is_available || !seat.is_active)) return false;
      if (onlyMonitor && !seat.has_monitor) return false;
      if (deskTypeFilter !== "all" && seat.desk_type !== deskTypeFilter)
        return false;
      return true;
    });
  }, [officeSeats, onlyAvailable, onlyMonitor, deskTypeFilter]);

  const zones = useMemo(
    () => Array.from(new Set(filteredSeats.map((s) => s.zone))),
    [filteredSeats]
  );

  const selectedSeatObj = useMemo(
    () => seats.find((s) => s.id === selectedSeat) || null,
    [seats, selectedSeat]
  );

  const officeStats = useMemo(() => {
    const total = officeSeats.length;
    const available = officeSeats.filter(
      (s) => s.is_active && s.is_available
    ).length;
    const maintenance = officeSeats.filter((s) => !s.is_active).length;
    return { total, available, maintenance };
  }, [officeSeats]);

  const handleReserve = async () => {
    if (!selectedSeat) return;

    if (timeValidationError) {
      setFeedback({ type: "error", text: timeValidationError });
      return;
    }

    if (new Date(startTime) <= new Date()) {
      const msg = "Reservation start time must be in the future.";
      setFeedback({ type: "error", text: msg });
      toast.error(msg);
      return;
    }

    if (recurrenceRule !== "none" && !recurrenceEndDate) {
      const msg = "Select an end date for your recurring reservation.";
      setFeedback({ type: "error", text: msg });
      toast.error(msg);
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch(`${API_URL}/api/reservations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          seat_id: selectedSeat,
          res_start_time: new Date(startTime).toISOString(),
          res_end_time: new Date(endTime).toISOString(),
          recurrence_rule: recurrenceRule === "none" ? null : recurrenceRule,
          recurrence_end_date:
            recurrenceRule === "none" || !recurrenceEndDate
              ? null
              : new Date(`${recurrenceEndDate}T23:59:00`).toISOString(),
        }),
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || "Reservation failed.");
      }

      const seatLabel = selectedSeatObj ? `Desk ${selectedSeatObj.seat_number}` : "Desk";
      const successMsg = `${seatLabel} reserved for ${formatReadableRange(
        startTime,
        endTime
      )}.`;
      setFeedback({ type: "success", text: successMsg });
      toast.success("Reservation confirmed");
      setSelectedSeat(null);
      const [updatedSeats] = await Promise.all([
        loadSeats(startTime, endTime),
        refreshAccountData(),
      ]);
      applySeatsData(updatedSeats);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Could not complete reservation.";
      setFeedback({ type: "error", text: msg });
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell
      user={user}
      title="Book a Desk"
      subtitle="Choose an office location, time window, and available workstation."
      actions={
        <div className="flex items-center gap-2 text-xs font-mono text-[#6B6A65] bg-white border border-[#E4E2DC] rounded-lg px-3 py-2 tabular-nums">
          <span className="w-2 h-2 rounded-full bg-[#1B4D3E]" />
          <span>
            {officeStats.available} / {officeStats.total} desks open
          </span>
        </div>
      }
    >
      {notifications.length > 0 && (
        <div className="mb-6 space-y-2">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="bg-[#FDF1F0] border border-[#EFC8C4] text-[#9E2A2B] px-4 py-3 rounded-xl flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 text-sm font-medium">
                <AlertTriangle size={18} className="shrink-0" />
                <span>{notif.message}</span>
              </div>
              <button
                type="button"
                onClick={() => markNotificationRead(notif.id)}
                className="p-1.5 rounded-lg hover:bg-[#F9DFDD] transition-colors cursor-pointer shrink-0"
                aria-label="Dismiss notification"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {feedback && (
        <div
          role="status"
          className={`mb-6 px-4 py-3 rounded-xl border text-sm font-medium flex items-center justify-between gap-4 ${
            feedback.type === "success"
              ? "bg-[#ECF4F0] border-[#B9D5C9] text-[#164234]"
              : "bg-[#FDF1F0] border-[#EFC8C4] text-[#9E2A2B]"
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 rounded hover:bg-black/5 cursor-pointer"
            aria-label="Close message"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <section className="rs-card p-5 sm:p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">
          <div className="lg:col-span-3">
            <label
              htmlFor="office-select"
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#6B6A65] mb-2"
            >
              <Building2 size={14} />
              Office
            </label>
            <select
              id="office-select"
              value={selectedOffice}
              onChange={(e) => {
                setSelectedOffice(e.target.value);
                setSelectedSeat(null);
              }}
              className="rs-input font-medium cursor-pointer"
            >
              {offices.map((office) => (
                <option key={office} value={office}>
                  {office}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3">
            <label
              htmlFor="start-time"
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#6B6A65] mb-2"
            >
              <CalendarClock size={14} />
              From
            </label>
            <input
              id="start-time"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="rs-input tabular-nums"
            />
          </div>

          <div className="lg:col-span-3">
            <label
              htmlFor="end-time"
              className="block text-xs font-semibold uppercase tracking-wider text-[#6B6A65] mb-2"
            >
              To
            </label>
            <input
              id="end-time"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="rs-input tabular-nums"
            />
          </div>

          <div className="lg:col-span-3">
            <label
              htmlFor="recurrence-select"
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#6B6A65] mb-2"
            >
              <Repeat size={14} />
              Repeat
            </label>
            <select
              id="recurrence-select"
              value={recurrenceRule}
              onChange={(e) => handleRecurrenceChange(e.target.value)}
              className="rs-input cursor-pointer"
            >
              <option value="none">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[#E4E2DC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#6B6A65] mr-1">Quick range:</span>
            <button
              type="button"
              onClick={() => applyDurationPreset(2)}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#F7F6F2] hover:bg-[#ECE9E0] border border-[#E4E2DC] text-[#161615] transition-colors cursor-pointer"
            >
              Next 2h
            </button>
            <button
              type="button"
              onClick={() => applyDurationPreset(4)}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#F7F6F2] hover:bg-[#ECE9E0] border border-[#E4E2DC] text-[#161615] transition-colors cursor-pointer"
            >
              4h block
            </button>
            <button
              type="button"
              onClick={() => applyDurationPreset(8)}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#F7F6F2] hover:bg-[#ECE9E0] border border-[#E4E2DC] text-[#161615] transition-colors cursor-pointer"
            >
              8h workday
            </button>
            <button
              type="button"
              onClick={applyTomorrowWorkday}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#F7F6F2] hover:bg-[#ECE9E0] border border-[#E4E2DC] text-[#161615] transition-colors cursor-pointer"
            >
              Tomorrow 09:00–17:00
            </button>
          </div>

          {recurrenceRule !== "none" && (
            <div className="flex items-center gap-2.5">
              <label
                htmlFor="recurrence-end"
                className="text-xs font-medium text-[#6B6A65] whitespace-nowrap"
              >
                Repeat until:
              </label>
              <input
                id="recurrence-end"
                type="date"
                value={recurrenceEndDate}
                onChange={(e) => setRecurrenceEndDate(e.target.value)}
                className="rs-input py-1.5 w-auto tabular-nums"
              />
            </div>
          )}
        </div>

        {timeValidationError && (
          <p className="mt-3 text-xs font-medium text-[#9E2A2B]">
            {timeValidationError}
          </p>
        )}
      </section>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOnlyAvailable((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              onlyAvailable
                ? "bg-[#ECF4F0] border-[#B9D5C9] text-[#1B4D3E]"
                : "bg-white border-[#E4E2DC] text-[#6B6A65] hover:text-[#161615]"
            }`}
          >
            Available only
          </button>

          <button
            type="button"
            onClick={() => setOnlyMonitor((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              onlyMonitor
                ? "bg-[#ECF4F0] border-[#B9D5C9] text-[#1B4D3E]"
                : "bg-white border-[#E4E2DC] text-[#6B6A65] hover:text-[#161615]"
            }`}
          >
            <Monitor size={13} />
            Monitor included
          </button>

          {deskTypes.length > 1 && (
            <div className="inline-flex items-center bg-white border border-[#E4E2DC] rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setDeskTypeFilter("all")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  deskTypeFilter === "all"
                    ? "bg-[#161615] text-white"
                    : "text-[#6B6A65] hover:text-[#161615]"
                }`}
              >
                All types
              </button>
              {deskTypes.map((dt) => (
                <button
                  key={dt}
                  type="button"
                  onClick={() => setDeskTypeFilter(dt)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer ${
                    deskTypeFilter === dt
                      ? "bg-[#161615] text-white"
                      : "text-[#6B6A65] hover:text-[#161615]"
                  }`}
                >
                  {dt}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="inline-flex bg-white border border-[#E4E2DC] rounded-lg p-1 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              viewMode === "grid"
                ? "bg-[#1B4D3E] text-white"
                : "text-[#6B6A65] hover:text-[#161615]"
            }`}
          >
            <LayoutGrid size={14} />
            Grid
          </button>
          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              viewMode === "map"
                ? "bg-[#1B4D3E] text-white"
                : "text-[#6B6A65] hover:text-[#161615]"
            }`}
          >
            <MapIcon size={14} />
            Floor Plan
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="rs-card p-12 text-center text-sm text-[#6B6A65]">
          Loading available desks...
        </div>
      ) : viewMode === "map" ? (
        <div className="mb-24">
          <OfficeMap
            seats={filteredSeats}
            selectedSeat={selectedSeat}
            onSelectSeat={setSelectedSeat}
            selectedOffice={selectedOffice}
            mySeatIds={mySeatIds}
          />
        </div>
      ) : zones.length === 0 ? (
        <div className="rs-card p-12 text-center text-sm text-[#6B6A65] mb-24">
          No desks match your current filters in {selectedOffice || "this office"}.
        </div>
      ) : (
        <div className="space-y-6 mb-24">
          {zones.map((zone) => {
            const zoneSeats = filteredSeats.filter((s) => s.zone === zone);
            const zoneOpen = zoneSeats.filter(
              (s) => s.is_active && s.is_available
            ).length;

            return (
              <section key={zone} className="rs-card p-5 sm:p-6">
                <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#E4E2DC]">
                  <div>
                    <h2 className="text-base font-semibold text-[#161615]">
                      {zone}
                    </h2>
                    <p className="text-xs text-[#6B6A65] mt-0.5 tabular-nums">
                      {zoneOpen} of {zoneSeats.length} desks available
                    </p>
                  </div>
                  <span className="font-mono text-xs text-[#6B6A65] bg-[#F7F6F2] border border-[#E4E2DC] px-2.5 py-1 rounded-md tabular-nums">
                    {zoneSeats.length} desks
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                  {zoneSeats.map((seat) => {
                    const isSelected = selectedSeat === seat.id;
                    const isMine = mySeatIds.has(seat.id);
                    const isDisabled = !seat.is_active || !seat.is_available;

                    let cardClasses =
                      "bg-white border-[#E4E2DC] text-[#161615] hover:border-[#1B4D3E] hover:bg-[#FAF9F6] cursor-pointer";
                    let statusLabel = seat.desk_type;
                    let statusClasses = "text-[#6B6A65]";

                    if (!seat.is_active) {
                      cardClasses =
                        "bg-[#F1EFE9] border-[#DDD9CE] text-[#9A9890] cursor-not-allowed";
                      statusLabel = "Maintenance";
                      statusClasses = "text-[#9A9890]";
                    } else if (isSelected) {
                      cardClasses =
                        "bg-[#1B4D3E] border-[#143B2F] text-white ring-2 ring-[#B9D5C9] cursor-pointer";
                      statusLabel = "Selected";
                      statusClasses = "text-[#DCEAE3]";
                    } else if (isMine) {
                      cardClasses =
                        "bg-[#EEF2F8] border-[#C2D1E5] text-[#1E3A5F] cursor-not-allowed";
                      statusLabel = "Your booking";
                      statusClasses = "text-[#4B6991]";
                    } else if (!seat.is_available) {
                      cardClasses =
                        "bg-[#FDF1F0] border-[#EFC8C4] text-[#9E2A2B] cursor-not-allowed";
                      statusLabel = "Occupied";
                      statusClasses = "text-[#B85D5E]";
                    }

                    return (
                      <button
                        key={seat.id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() =>
                          setSelectedSeat(isSelected ? null : seat.id)
                        }
                        title={
                          !seat.is_active
                            ? "Under maintenance"
                            : isMine
                              ? "You already reserved this desk"
                              : !seat.is_available
                                ? "Occupied for selected range"
                                : `Select desk ${seat.seat_number}`
                        }
                        className={`relative text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between min-h-[96px] ${cardClasses}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono text-lg font-semibold tracking-tight tabular-nums">
                            {seat.seat_number}
                          </span>
                          {seat.has_monitor && seat.is_active && (
                            <span
                              title="Monitor included"
                              className={`p-1 rounded-md ${
                                isSelected
                                  ? "bg-white/15 text-white"
                                  : "bg-[#F7F6F2] text-[#6B6A65]"
                              }`}
                            >
                              <Monitor size={13} strokeWidth={2} />
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-1">
                          <span
                            className={`text-[11px] font-medium capitalize truncate ${statusClasses}`}
                          >
                            {statusLabel}
                          </span>
                          {isSelected && <Check size={14} strokeWidth={2.5} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div className="sticky bottom-4 z-20">
        <div className="rs-card px-5 py-4 shadow-[0_8px_24px_rgba(22,22,21,0.09)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {selectedSeatObj ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-[#1B4D3E] bg-[#ECF4F0] border border-[#B9D5C9] px-2.5 py-0.5 rounded-md">
                  {selectedSeatObj.seat_number}
                </span>
                <span className="font-medium text-[#161615]">
                  {selectedSeatObj.office_name} · {selectedSeatObj.zone}
                </span>
              </div>
              <span className="text-[#6B6A65] text-xs font-mono tabular-nums">
                {formatReadableRange(startTime, endTime)}
                {recurrenceRule !== "none" ? ` · repeats ${recurrenceRule}` : ""}
              </span>
            </div>
          ) : (
            <p className="text-sm text-[#6B6A65]">
              Select an available desk from the grid or floor plan to confirm a
              reservation.
            </p>
          )}

          <div className="flex items-center gap-2.5 shrink-0">
            {selectedSeatObj && (
              <button
                type="button"
                onClick={() => setSelectedSeat(null)}
                className="rs-btn-secondary"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={handleReserve}
              disabled={!selectedSeat || isSubmitting || !!timeValidationError}
              className="rs-btn-primary px-6"
            >
              {isSubmitting ? "Booking..." : "Confirm Reservation"}
            </button>
          </div>
        </div>
      </div>

      <HelpDeskChat />
    </AppShell>
  );
}
