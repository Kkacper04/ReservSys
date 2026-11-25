"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Monitor,
  Search,
  User as UserIcon,
  Wrench,
  X,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppShell, { AppShellUser } from "../components/AppShell";

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

interface ReservationUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface ReservationSeat {
  id: number;
  seat_number: string;
  zone: string;
  desk_type: string;
  office_name: string;
  has_monitor: boolean;
  is_active: boolean;
}

interface Reservation {
  id: number;
  user_id: number;
  seat_id: number;
  res_start_time: string;
  res_end_time: string;
  status: string;
  user?: ReservationUser | null;
  seat?: ReservationSeat | null;
}

interface PopularSeatStat {
  seat: string;
  count: number;
}

interface ZoneBreakdownStat {
  office: string;
  zone: string;
  count: number;
}

interface AnalyticsData {
  status_breakdown: Record<string, number>;
  popular_seats: PopularSeatStat[];
  zone_breakdown: ZoneBreakdownStat[];
}

interface CustomTooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
  label?: string;
}

type AdminTab = "desks" | "reservations" | "analytics";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const PAGE_LIMIT = 10;
const CHART_COLORS = ["#1B4D3E", "#2C5282", "#B7791F", "#9E2A2B", "#6B6A65"];

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
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFullDateTime(value: string): string {
  const date = parseApiDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(startValue: string, endValue: string): string {
  const start = parseApiDate(startValue);
  const end = parseApiDate(endValue);
  const diffMs = end.getTime() - start.getTime();
  if (Number.isNaN(diffMs) || diffMs <= 0) return "—";
  const totalMinutes = Math.round(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${String(minutes).padStart(2, "0")}m`);
  return parts.join(" ");
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

function ChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white border border-[#E4E2DC] rounded-lg px-3 py-2 shadow-sm text-xs text-[#161615]">
      {label && <p className="font-semibold mb-1">{label}</p>}
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2 tabular-nums">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: entry.color || "#1B4D3E" }}
          />
          <span className="text-[#6B6A65]">{entry.name}:</span>
          <span className="font-mono font-semibold">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

const STATUS_BADGE_MAP: Record<string, string> = {
  pending: "bg-[#FEF7EB] text-[#8A530D] border-[#EED4A1]",
  confirmed: "bg-[#ECF4F0] text-[#164234] border-[#B9D5C9]",
  checked_in: "bg-[#EEF2F8] text-[#1E3A5F] border-[#C2D1E5]",
  cancelled: "bg-[#FDF1F0] text-[#9E2A2B] border-[#EFC8C4]",
  no_show: "bg-[#FEF7EB] text-[#8A530D] border-[#EED4A1]",
};

export default function AdminPanel() {
  const router = useRouter();
  const [user, setUser] = useState<AppShellUser | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("desks");

  const [seats, setSeats] = useState<Seat[]>([]);
  const [seatsLoading, setSeatsLoading] = useState(true);
  const [seatSearch, setSeatSearch] = useState("");
  const [seatStatusFilter, setSeatStatusFilter] = useState<
    "all" | "active" | "maintenance"
  >("all");

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [resLoading, setResLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [resStatusFilter, setResStatusFilter] = useState<string>("all");
  const [resSearch, setResSearch] = useState("");
  const [busyResId, setBusyResId] = useState<number | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);
  const [modalConfirmCancel, setModalConfirmCancel] = useState(false);

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [maintenanceSeat, setMaintenanceSeat] = useState<Seat | null>(null);
  const [maintenanceStart, setMaintenanceStart] = useState("");
  const [maintenanceEnd, setMaintenanceEnd] = useState("");
  const [maintenanceError, setMaintenanceError] = useState<string | null>(null);
  const [submittingMaintenance, setSubmittingMaintenance] = useState(false);

  const fetchSeats = useCallback(async () => {
    setSeatsLoading(true);
    try {
      const now = new Date().toISOString();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const response = await fetch(
        `${API_URL}/api/seats/available?start_time=${encodeURIComponent(now)}&end_time=${encodeURIComponent(tomorrow)}`,
        { credentials: "include" }
      );
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, "Failed to load desks."));
      }
      const data = (await response.json()) as Seat[];
      setSeats(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load desks.");
    } finally {
      setSeatsLoading(false);
    }
  }, []);

  const requestReservationsPage = useCallback(async (targetPage: number) => {
    const skip = (targetPage - 1) * PAGE_LIMIT;
    const response = await fetch(
      `${API_URL}/api/reservations/?skip=${skip}&limit=${PAGE_LIMIT}`,
      { credentials: "include" }
    );
    if (response.status === 401) {
      return { redirect: "/login" as const, data: [] as Reservation[] };
    }
    if (response.status === 403) {
      return { redirect: "/seats" as const, data: [] as Reservation[] };
    }
    if (!response.ok) {
      throw new Error(
        await extractErrorMessage(response, "Failed to load reservations.")
      );
    }
    const data = (await response.json()) as Reservation[];
    return {
      redirect: null,
      data: Array.isArray(data) ? data : [],
    };
  }, []);

  const fetchReservations = useCallback(
    async (targetPage: number) => {
      setResLoading(true);
      try {
        const result = await requestReservationsPage(targetPage);
        if (result.redirect) {
          router.push(result.redirect);
          return;
        }
        setReservations(result.data);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load reservations."
        );
      } finally {
        setResLoading(false);
      }
    },
    [requestReservationsPage, router]
  );

  const requestAnalyticsData = useCallback(async () => {
    const response = await fetch(`${API_URL}/api/admin/analytics`, {
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(
        await extractErrorMessage(response, "Failed to load analytics.")
      );
    }
    return (await response.json()) as AnalyticsData;
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const data = await requestAnalyticsData();
      setAnalytics(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load analytics."
      );
    } finally {
      setAnalyticsLoading(false);
    }
  }, [requestAnalyticsData]);

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const meRes = await fetch(`${API_URL}/api/me`, {
          credentials: "include",
        });
        if (meRes.status === 401) {
          router.push("/login");
          return;
        }
        if (!meRes.ok) {
          router.push("/seats");
          return;
        }
        const meData = (await meRes.json()) as AppShellUser;
        if (!active) return;

        if (meData.role !== "admin") {
          router.push("/seats");
          return;
        }

        setUser(meData);
        setAuthorized(true);
        fetchSeats();
      } catch {
        router.push("/login");
      }
    };
    init();
    return () => {
      active = false;
    };
  }, [router, fetchSeats]);

  useEffect(() => {
    if (!authorized) return;
    let active = true;
    const run = async () => {
      try {
        const result = await requestReservationsPage(page);
        if (!active) return;
        if (result.redirect) {
          router.push(result.redirect);
          return;
        }
        setReservations(result.data);
      } catch (err) {
        if (!active) return;
        toast.error(
          err instanceof Error ? err.message : "Failed to load reservations."
        );
      } finally {
        if (active) setResLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [authorized, page, requestReservationsPage, router]);

  useEffect(() => {
    if (!authorized || activeTab !== "analytics" || analytics) return;
    let active = true;
    const run = async () => {
      try {
        const data = await requestAnalyticsData();
        if (!active) return;
        setAnalytics(data);
      } catch (err) {
        if (!active) return;
        toast.error(
          err instanceof Error ? err.message : "Failed to load analytics."
        );
      } finally {
        if (active) setAnalyticsLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [authorized, activeTab, analytics, requestAnalyticsData]);

  const cancelReservation = async (id: number) => {
    setBusyResId(id);
    try {
      const response = await fetch(`${API_URL}/api/reservations/${id}/cancel`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(
          await extractErrorMessage(response, "Failed to cancel reservation.")
        );
      }
      setConfirmCancelId(null);
      setModalConfirmCancel(false);
      setSelectedReservation((prev) => (prev?.id === id ? null : prev));
      toast.success(`Reservation #${id} cancelled and user notified`);
      fetchReservations(page);
      if (analytics) fetchAnalytics();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to cancel reservation."
      );
    } finally {
      setBusyResId(null);
    }
  };

  const handleToggleClick = (seat: Seat) => {
    if (seat.is_active) {
      setMaintenanceSeat(seat);
      setMaintenanceStart("");
      setMaintenanceEnd("");
      setMaintenanceError(null);
    } else {
      submitMaintenance(seat.id);
    }
  };

  const submitMaintenance = async (
    seatId: number,
    start?: string,
    end?: string
  ) => {
    setMaintenanceError(null);

    let body: string | undefined;
    if (start !== undefined || end !== undefined) {
      if (!start || !end) {
        setMaintenanceError("Please select both a start and end date/time.");
        return;
      }
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        setMaintenanceError("Please enter valid dates.");
        return;
      }
      if (endDate <= startDate) {
        setMaintenanceError("Maintenance end must be after the start time.");
        return;
      }
      body = JSON.stringify({
        maintenance_start: startDate.toISOString(),
        maintenance_end: endDate.toISOString(),
      });
    }

    setSubmittingMaintenance(true);
    try {
      const headers: Record<string, string> = {};
      if (body) headers["Content-Type"] = "application/json";

      const response = await fetch(`${API_URL}/api/seats/${seatId}/toggle`, {
        method: "PATCH",
        credentials: "include",
        headers,
        body,
      });

      if (!response.ok) {
        throw new Error(
          await extractErrorMessage(response, "Insufficient permissions or server error.")
        );
      }

      setMaintenanceSeat(null);
      toast.success(
        body ? "Desk locked for scheduled maintenance" : "Desk restored to active service"
      );
      await fetchSeats();
      await fetchReservations(page);
      if (analytics) fetchAnalytics();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Unable to update desk status.";
      if (body) {
        setMaintenanceError(msg);
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmittingMaintenance(false);
    }
  };

  const seatLookup = useMemo(() => {
    const map: Record<number, Seat> = {};
    for (const s of seats) map[s.id] = s;
    return map;
  }, [seats]);

  const filteredSeats = useMemo(() => {
    const query = seatSearch.trim().toLowerCase();
    return seats.filter((seat) => {
      if (seatStatusFilter === "active" && !seat.is_active) return false;
      if (seatStatusFilter === "maintenance" && seat.is_active) return false;
      if (!query) return true;
      return (
        seat.seat_number.toLowerCase().includes(query) ||
        seat.office_name.toLowerCase().includes(query) ||
        seat.zone.toLowerCase().includes(query) ||
        seat.desk_type.toLowerCase().includes(query)
      );
    });
  }, [seats, seatSearch, seatStatusFilter]);

  const closeReservationModal = useCallback(() => {
    setSelectedReservation(null);
    setModalConfirmCancel(false);
  }, []);

  useEffect(() => {
    if (!selectedReservation) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeReservationModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedReservation, closeReservationModal]);

  const filteredReservations = useMemo(() => {
    const query = resSearch.trim().toLowerCase();
    return reservations.filter((res) => {
      if (resStatusFilter !== "all" && res.status !== resStatusFilter) {
        return false;
      }
      if (!query) return true;
      const seat = res.seat ?? seatLookup[res.seat_id];
      const seatLabel = seat
        ? `${seat.seat_number} ${seat.office_name} ${seat.zone}`.toLowerCase()
        : "";
      const userLabel = res.user
        ? `${res.user.name} ${res.user.email}`.toLowerCase()
        : "";
      return (
        String(res.id).includes(query) ||
        String(res.user_id).includes(query) ||
        String(res.seat_id).includes(query) ||
        seatLabel.includes(query) ||
        userLabel.includes(query)
      );
    });
  }, [reservations, resStatusFilter, resSearch, seatLookup]);

  const activeDeskCount = useMemo(
    () => seats.filter((s) => s.is_active).length,
    [seats]
  );
  const maintenanceDeskCount = seats.length - activeDeskCount;

  const statusChartData = useMemo(() => {
    if (!analytics?.status_breakdown) return [];
    return Object.entries(analytics.status_breakdown).map(([name, value]) => ({
      name: name.replace(/_/g, " "),
      value,
    }));
  }, [analytics]);

  const zoneChartData = useMemo(() => {
    if (!analytics?.zone_breakdown) return [];
    return analytics.zone_breakdown.map((item) => ({
      label: `${item.office} · ${item.zone}`,
      count: item.count,
    }));
  }, [analytics]);

  const totalAnalyticsBookings = useMemo(() => {
    if (!analytics?.status_breakdown) return 0;
    return Object.values(analytics.status_breakdown).reduce(
      (sum, v) => sum + v,
      0
    );
  }, [analytics]);

  const checkinRate = useMemo(() => {
    if (!analytics?.status_breakdown || totalAnalyticsBookings === 0) return 0;
    const checkedIn = analytics.status_breakdown.checked_in || 0;
    return Math.round((checkedIn / totalAnalyticsBookings) * 100);
  }, [analytics, totalAnalyticsBookings]);

  if (!authorized) {
    return (
      <AppShell title="Admin Panel" subtitle="Verifying administrator access...">
        <div className="rs-card p-8 text-center text-sm text-[#6B6A65]">
          Checking permissions...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      user={user}
      title="Admin Panel"
      subtitle="Manage desk availability, review workspace bookings, and inspect utilization trends."
      actions={
        <Link href="/seats" className="rs-btn-secondary">
          Floor Plan
        </Link>
      }
    >
      <div className="border-b border-[#E4E2DC] mb-6 flex items-center gap-1 overflow-x-auto">
        {(
          [
            {
              id: "desks",
              label: "Desk Management",
              icon: Wrench,
              badge: seats.length,
            },
            {
              id: "reservations",
              label: "All Reservations",
              icon: CalendarDays,
              badge: null,
            },
            {
              id: "analytics",
              label: "Analytics",
              icon: BarChart3,
              badge: null,
            },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === "analytics" && !analytics) {
                  setAnalyticsLoading(true);
                }
              }}
              className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                active
                  ? "border-[#1B4D3E] text-[#1B4D3E]"
                  : "border-transparent text-[#6B6A65] hover:text-[#161615]"
              }`}
            >
              <Icon size={16} strokeWidth={1.9} />
              <span>{tab.label}</span>
              {tab.badge !== null && (
                <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-[#F1EFE9] text-[#6B6A65] tabular-nums">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === "desks" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rs-card p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-[#6B6A65]">
                Total Desks
              </p>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums">
                {seats.length}
              </p>
            </div>
            <div className="rs-card p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-[#6B6A65]">
                Functional
              </p>
              <p className="mt-1.5 text-2xl font-semibold text-[#1B4D3E] tabular-nums">
                {activeDeskCount}
              </p>
            </div>
            <div className="rs-card p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-[#6B6A65]">
                In Maintenance
              </p>
              <p className="mt-1.5 text-2xl font-semibold text-[#9E2A2B] tabular-nums">
                {maintenanceDeskCount}
              </p>
            </div>
          </div>

          <div className="rs-card overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E4E2DC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 w-full sm:w-72 bg-white border border-[#E4E2DC] rounded-lg px-3 py-2 focus-within:border-[#1B4D3E] focus-within:ring-3 focus-within:ring-[#1B4D3E]/12 transition-colors">
                <Search
                  size={15}
                  className="text-[#9A9890] shrink-0"
                />
                <input
                  type="text"
                  value={seatSearch}
                  onChange={(e) => setSeatSearch(e.target.value)}
                  placeholder="Search desk, office, or zone..."
                  className="w-full bg-transparent text-sm text-[#161615] placeholder:text-[#9A9890] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1 bg-[#F7F6F2] p-1 rounded-lg border border-[#E4E2DC] w-fit">
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "active", label: "Functional" },
                    { id: "maintenance", label: "Maintenance" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSeatStatusFilter(item.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      seatStatusFilter === item.id
                        ? "bg-white text-[#161615] border border-[#E4E2DC] shadow-xs"
                        : "text-[#6B6A65] hover:text-[#161615]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {seatsLoading ? (
              <div className="p-8 text-center text-sm text-[#6B6A65]">
                Loading desks...
              </div>
            ) : filteredSeats.length === 0 ? (
              <div className="p-10 text-center text-sm text-[#6B6A65]">
                No desks match the current filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F7F6F2] border-b border-[#E4E2DC] text-xs font-semibold uppercase tracking-wider text-[#6B6A65]">
                      <th className="py-3 px-5">Desk</th>
                      <th className="py-3 px-5">Office &amp; Zone</th>
                      <th className="py-3 px-5">Equipment</th>
                      <th className="py-3 px-5">Status</th>
                      <th className="py-3 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E2DC] text-sm">
                    {filteredSeats.map((seat) => (
                      <tr
                        key={seat.id}
                        className="hover:bg-[#F7F6F2]/50 transition-colors"
                      >
                        <td className="py-3.5 px-5 font-mono font-semibold text-[#161615] tabular-nums">
                          {seat.seat_number}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="font-medium text-[#161615]">
                            {seat.office_name}
                          </span>
                          <span className="text-[#6B6A65] text-xs ml-2">
                            {seat.zone}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-xs text-[#6B6A65]">
                          <div className="flex items-center gap-2">
                            <span className="capitalize">{seat.desk_type}</span>
                            {seat.has_monitor && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F1EFE9] border border-[#E4E2DC] text-[#161615]">
                                <Monitor size={11} />
                                Monitor
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-5">
                          {seat.is_active ? (
                            <span className="rs-badge bg-[#ECF4F0] text-[#164234] border-[#B9D5C9]">
                              <CheckCircle2 size={12} />
                              Functional
                            </span>
                          ) : (
                            <span className="rs-badge bg-[#FDF1F0] text-[#9E2A2B] border-[#EFC8C4]">
                              <AlertTriangle size={12} />
                              Maintenance
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          {seat.is_active ? (
                            <button
                              type="button"
                              onClick={() => handleToggleClick(seat)}
                              className="rs-btn-danger"
                            >
                              Schedule Maintenance
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleClick(seat)}
                              disabled={submittingMaintenance}
                              className="rs-btn-secondary text-xs py-1.5 px-3 text-[#1B4D3E] border-[#B9D5C9] bg-[#ECF4F0] hover:bg-[#DFECE6]"
                            >
                              Restore Desk
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "reservations" && (
        <div className="rs-card overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E4E2DC] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 w-full md:w-72 bg-white border border-[#E4E2DC] rounded-lg px-3 py-2 focus-within:border-[#1B4D3E] focus-within:ring-3 focus-within:ring-[#1B4D3E]/12 transition-colors">
              <Search
                size={15}
                className="text-[#9A9890] shrink-0"
              />
              <input
                type="text"
                value={resSearch}
                onChange={(e) => setResSearch(e.target.value)}
                placeholder="Filter current page by ID, user, desk..."
                className="w-full bg-transparent text-sm text-[#161615] placeholder:text-[#9A9890] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {(
                [
                  "all",
                  "pending",
                  "confirmed",
                  "checked_in",
                  "cancelled",
                  "no_show",
                ] as const
              ).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setResStatusFilter(status)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                    resStatusFilter === status
                      ? "bg-[#ECF4F0] text-[#1B4D3E] border-[#B9D5C9]"
                      : "bg-white text-[#6B6A65] border-[#E4E2DC] hover:text-[#161615]"
                  }`}
                >
                  {status === "all" ? "All" : status.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {resLoading ? (
            <div className="p-8 text-center text-sm text-[#6B6A65]">
              Loading reservations...
            </div>
          ) : filteredReservations.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#6B6A65]">
              No reservations found on this page.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F7F6F2] border-b border-[#E4E2DC] text-xs font-semibold uppercase tracking-wider text-[#6B6A65]">
                    <th className="py-3 px-5">Booking</th>
                    <th className="py-3 px-5">User</th>
                    <th className="py-3 px-5">Desk</th>
                    <th className="py-3 px-5">Window</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E2DC] text-sm">
                  {filteredReservations.map((res) => {
                    const seat = res.seat ?? seatLookup[res.seat_id];
                    const badgeClass =
                      STATUS_BADGE_MAP[res.status] ||
                      "bg-[#F1EFE9] text-[#6B6A65] border-[#DDD9CE]";
                    const isConfirming = confirmCancelId === res.id;
                    const isBusy = busyResId === res.id;
                    const canCancel =
                      res.status !== "cancelled" && res.status !== "no_show";

                    return (
                      <tr
                        key={res.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setModalConfirmCancel(false);
                          setSelectedReservation(res);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setModalConfirmCancel(false);
                            setSelectedReservation(res);
                          }
                        }}
                        className="hover:bg-[#F7F6F2]/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:bg-[#F7F6F2]"
                      >
                        <td className="py-3.5 px-5 font-mono font-semibold text-[#161615] tabular-nums">
                          #{res.id}
                        </td>
                        <td className="py-3.5 px-5">
                          {res.user ? (
                            <div>
                              <p className="font-medium text-[#161615] leading-snug">
                                {res.user.name}
                              </p>
                              <p className="text-xs text-[#6B6A65] truncate max-w-[220px]">
                                {res.user.email}
                              </p>
                            </div>
                          ) : (
                            <span className="text-[#161615] tabular-nums">
                              User #{res.user_id}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-5">
                          {seat ? (
                            <div>
                              <span className="font-mono font-semibold text-[#161615]">
                                {seat.seat_number}
                              </span>
                              <span className="text-xs text-[#6B6A65] ml-2">
                                {seat.office_name}
                              </span>
                            </div>
                          ) : (
                            <span className="tabular-nums text-[#6B6A65]">
                              Seat #{res.seat_id}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-xs text-[#6B6A65] tabular-nums whitespace-nowrap">
                          {formatDateTime(res.res_start_time)} –{" "}
                          {formatDateTime(res.res_end_time)}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className={`rs-badge ${badgeClass}`}>
                            {res.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          {canCancel ? (
                            isConfirming ? (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 bg-[#FDF1F0] border border-[#EFC8C4] rounded-lg px-2 py-1"
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cancelReservation(res.id);
                                  }}
                                  disabled={isBusy}
                                  className="px-2 py-0.5 rounded text-xs font-semibold bg-[#9E2A2B] text-white hover:bg-[#7F2021] cursor-pointer disabled:opacity-50"
                                >
                                  {isBusy ? "Cancelling..." : "Confirm"}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmCancelId(null);
                                  }}
                                  disabled={isBusy}
                                  className="px-1.5 py-0.5 text-xs text-[#6B6A65] hover:text-[#161615] cursor-pointer"
                                >
                                  Keep
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmCancelId(res.id);
                                }}
                                onKeyDown={(e) => e.stopPropagation()}
                                disabled={isBusy}
                                className="rs-btn-danger"
                              >
                                <XCircle size={13} />
                                Cancel
                              </button>
                            )
                          ) : (
                            <span className="text-xs text-[#9A9890]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-5 py-3.5 border-t border-[#E4E2DC] bg-[#F7F6F2]/60 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setResLoading(true);
                setPage((p) => Math.max(1, p - 1));
              }}
              disabled={page === 1 || resLoading}
              className="rs-btn-secondary text-xs py-1.5 px-3"
            >
              <ChevronLeft size={14} />
              Previous
            </button>

            <span className="text-xs font-medium text-[#6B6A65] tabular-nums">
              Page <span className="font-mono text-[#161615]">{page}</span>
            </span>

            <button
              type="button"
              onClick={() => {
                setResLoading(true);
                setPage((p) => p + 1);
              }}
              disabled={reservations.length < PAGE_LIMIT || resLoading}
              className="rs-btn-secondary text-xs py-1.5 px-3"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {activeTab === "analytics" && (
        analyticsLoading || !analytics ? (
          <div className="rs-card p-12 text-center text-sm text-[#6B6A65]">
            Loading analytics...
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rs-card p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-[#6B6A65]">
                  Total Bookings
                </p>
                <p className="mt-2 text-2xl font-semibold text-[#161615] tabular-nums">
                  {totalAnalyticsBookings}
                </p>
              </div>
              <div className="rs-card p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-[#6B6A65]">
                  Check-in Rate
                </p>
                <p className="mt-2 text-2xl font-semibold text-[#1B4D3E] tabular-nums">
                  {checkinRate}%
                </p>
              </div>
              <div className="rs-card p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-[#6B6A65]">
                  Top Desk
                </p>
                <p className="mt-2 text-2xl font-semibold font-mono text-[#161615] tabular-nums">
                  {analytics.popular_seats[0]?.seat ?? "—"}
                </p>
              </div>
              <div className="rs-card p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-[#6B6A65]">
                  Active Zones
                </p>
                <p className="mt-2 text-2xl font-semibold text-[#161615] tabular-nums">
                  {zoneChartData.length}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rs-card p-6">
                <div className="mb-5">
                  <h2 className="text-base font-semibold text-[#161615]">
                    Reservations by Status
                  </h2>
                  <p className="text-xs text-[#6B6A65] mt-0.5">
                    Distribution across all recorded bookings
                  </p>
                </div>
                {statusChartData.length === 0 ? (
                  <div className="h-72 flex items-center justify-center text-sm text-[#9A9890]">
                    No reservation data available yet.
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="h-64 w-full sm:w-3/5">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={84}
                            paddingAngle={statusChartData.length > 1 ? 2 : 0}
                            dataKey="value"
                            isAnimationActive={false}
                          >
                            {statusChartData.map((_, index) => (
                              <Cell
                                key={`status-${index}`}
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <RechartsTooltip content={<ChartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="w-full sm:w-2/5 space-y-2.5">
                      {statusChartData.map((entry, index) => {
                        const pct =
                          totalAnalyticsBookings > 0
                            ? Math.round(
                                (entry.value / totalAnalyticsBookings) * 100
                              )
                            : 0;
                        return (
                          <li
                            key={entry.name}
                            className="flex items-center justify-between gap-3 text-xs border-b border-[#E4E2DC]/60 pb-2 last:border-b-0 last:pb-0"
                          >
                            <span className="inline-flex items-center gap-2 text-[#161615] font-medium capitalize">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{
                                  backgroundColor:
                                    CHART_COLORS[index % CHART_COLORS.length],
                                }}
                              />
                              {entry.name}
                            </span>
                            <span className="font-mono text-[#6B6A65] tabular-nums">
                              {entry.value}{" "}
                              <span className="text-[#9A9890]">({pct}%)</span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>

              <div className="rs-card p-6">
                <div className="mb-5">
                  <h2 className="text-base font-semibold text-[#161615]">
                    Most Popular Desks
                  </h2>
                  <p className="text-xs text-[#6B6A65] mt-0.5">
                    Top 5 workstations by total booking volume
                  </p>
                </div>
                {analytics.popular_seats.length === 0 ? (
                  <div className="h-72 flex items-center justify-center text-sm text-[#9A9890]">
                    No desk popularity data yet.
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.popular_seats}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#E4E2DC"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="seat"
                          tick={{ fill: "#6B6A65", fontSize: 12 }}
                          axisLine={{ stroke: "#E4E2DC" }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "#6B6A65", fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <RechartsTooltip content={<ChartTooltip />} />
                        <Bar
                          dataKey="count"
                          fill="#2C5282"
                          name="Bookings"
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={false}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="rs-card p-6 lg:col-span-2">
                <div className="mb-5">
                  <h2 className="text-base font-semibold text-[#161615]">
                    Bookings by Office &amp; Zone
                  </h2>
                  <p className="text-xs text-[#6B6A65] mt-0.5">
                    Utilization broken down by office location and zone
                  </p>
                </div>
                {zoneChartData.length === 0 ? (
                  <div className="h-72 flex items-center justify-center text-sm text-[#9A9890]">
                    No zone data available yet.
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={zoneChartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#E4E2DC"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: "#6B6A65", fontSize: 12 }}
                          axisLine={{ stroke: "#E4E2DC" }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "#6B6A65", fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <RechartsTooltip content={<ChartTooltip />} />
                        <Bar
                          dataKey="count"
                          fill="#1B4D3E"
                          name="Bookings"
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={false}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      )}

      {maintenanceSeat !== null && (
        <div
          className="fixed inset-0 bg-[#161615]/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="maintenance-modal-title"
        >
          <div className="rs-card w-full max-w-md p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2
                  id="maintenance-modal-title"
                  className="text-lg font-semibold text-[#161615]"
                >
                  Schedule Desk Maintenance
                </h2>
                <p className="text-xs text-[#6B6A65] mt-0.5">
                  Desk{" "}
                  <span className="font-mono font-semibold text-[#161615]">
                    {maintenanceSeat.seat_number}
                  </span>{" "}
                  · {maintenanceSeat.office_name} ({maintenanceSeat.zone})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMaintenanceSeat(null)}
                className="p-1.5 rounded-md text-[#6B6A65] hover:text-[#161615] hover:bg-[#F1EFE9] cursor-pointer"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rounded-lg bg-[#FEF7EB] border border-[#EED4A1] px-3.5 py-2.5 text-xs text-[#8A530D] mb-4">
              Existing bookings overlapping this window will be cancelled
              automatically and affected users will be notified.
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="maintenance-start"
                  className="block text-xs font-semibold text-[#161615] mb-1.5"
                >
                  Maintenance Start
                </label>
                <input
                  id="maintenance-start"
                  type="datetime-local"
                  value={maintenanceStart}
                  onChange={(e) => {
                    setMaintenanceStart(e.target.value);
                    setMaintenanceError(null);
                  }}
                  className="rs-input tabular-nums"
                />
              </div>

              <div>
                <label
                  htmlFor="maintenance-end"
                  className="block text-xs font-semibold text-[#161615] mb-1.5"
                >
                  Maintenance End
                </label>
                <input
                  id="maintenance-end"
                  type="datetime-local"
                  value={maintenanceEnd}
                  onChange={(e) => {
                    setMaintenanceEnd(e.target.value);
                    setMaintenanceError(null);
                  }}
                  className="rs-input tabular-nums"
                />
              </div>

              {maintenanceError && (
                <p className="text-xs text-[#9E2A2B] bg-[#FDF1F0] border border-[#EFC8C4] rounded-md px-3 py-2">
                  {maintenanceError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setMaintenanceSeat(null)}
                disabled={submittingMaintenance}
                className="rs-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  submitMaintenance(
                    maintenanceSeat.id,
                    maintenanceStart,
                    maintenanceEnd
                  )
                }
                disabled={
                  !maintenanceStart || !maintenanceEnd || submittingMaintenance
                }
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#9E2A2B] text-white hover:bg-[#7F2021] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submittingMaintenance
                  ? "Scheduling..."
                  : "Confirm Maintenance"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedReservation !== null && (() => {
        const modalSeat =
          selectedReservation.seat ?? seatLookup[selectedReservation.seat_id];
        const modalBadgeClass =
          STATUS_BADGE_MAP[selectedReservation.status] ||
          "bg-[#F1EFE9] text-[#6B6A65] border-[#DDD9CE]";
        const canCancelModal =
          selectedReservation.status !== "cancelled" &&
          selectedReservation.status !== "no_show";
        const isModalBusy = busyResId === selectedReservation.id;
        const durationLabel = formatDuration(
          selectedReservation.res_start_time,
          selectedReservation.res_end_time
        );

        return (
          <div
            className="fixed inset-0 bg-[#161615]/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reservation-modal-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeReservationModal();
              }
            }}
          >
            <div className="bg-white border border-[#E4E2DC] rounded-xl w-full max-w-lg p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2
                      id="reservation-modal-title"
                      className="text-lg font-semibold text-[#161615]"
                    >
                      Reservation{" "}
                      <span className="font-mono tabular-nums">
                        #{selectedReservation.id}
                      </span>
                    </h2>
                    <span className={`rs-badge ${modalBadgeClass}`}>
                      {selectedReservation.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B6A65] mt-0.5">
                    Reservation details and workstation assignment
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeReservationModal}
                  className="p-1.5 rounded-md text-[#6B6A65] hover:text-[#161615] hover:bg-[#F1EFE9] cursor-pointer"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3.5">
                <div className="rounded-lg bg-[#F7F6F2] border border-[#E4E2DC] p-4">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#6B6A65]">
                      <UserIcon size={13} />
                      Booked by
                    </span>
                    <span className="font-mono text-xs text-[#6B6A65] tabular-nums">
                      User #{selectedReservation.user?.id ?? selectedReservation.user_id}
                    </span>
                  </div>
                  {selectedReservation.user ? (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#161615] truncate">
                          {selectedReservation.user.name}
                        </p>
                        <p className="text-xs text-[#6B6A65] mt-0.5 truncate">
                          {selectedReservation.user.email}
                        </p>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded text-xs font-medium capitalize bg-white border border-[#E4E2DC] text-[#161615]">
                        {selectedReservation.user.role}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-[#6B6A65]">
                      User profile unavailable (ID #{selectedReservation.user_id})
                    </p>
                  )}
                </div>

                <div className="rounded-lg bg-[#F7F6F2] border border-[#E4E2DC] p-4">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#6B6A65]">
                      <Clock size={13} />
                      Reservation window
                    </span>
                    <span className="font-mono text-xs font-medium px-2 py-0.5 rounded bg-white border border-[#E4E2DC] text-[#161615] tabular-nums">
                      {durationLabel}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white border border-[#E4E2DC] rounded-md px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-[#6B6A65]">
                        From
                      </p>
                      <p className="mt-1 text-sm font-medium text-[#161615] tabular-nums">
                        {formatFullDateTime(selectedReservation.res_start_time)}
                      </p>
                    </div>
                    <div className="bg-white border border-[#E4E2DC] rounded-md px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-[#6B6A65]">
                        To
                      </p>
                      <p className="mt-1 text-sm font-medium text-[#161615] tabular-nums">
                        {formatFullDateTime(selectedReservation.res_end_time)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-[#F7F6F2] border border-[#E4E2DC] p-4">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#6B6A65]">
                      <MapPin size={13} />
                      Workstation
                    </span>
                    <span className="font-mono text-xs text-[#6B6A65] tabular-nums">
                      Seat #{selectedReservation.seat_id}
                    </span>
                  </div>
                  {modalSeat ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#161615]">
                          <span className="font-mono tabular-nums">
                            {modalSeat.seat_number}
                          </span>
                          <span className="text-[#6B6A65] font-normal mx-1.5">
                            ·
                          </span>
                          <span>{modalSeat.office_name}</span>
                        </p>
                        <p className="text-xs text-[#6B6A65] mt-0.5 capitalize">
                          {modalSeat.zone} · {modalSeat.desk_type}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-[#E4E2DC] text-[#161615]">
                        <Monitor size={12} />
                        {modalSeat.has_monitor ? "Monitor included" : "No monitor"}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-[#6B6A65]">
                      Workstation details unavailable (Seat #{selectedReservation.seat_id})
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-[#E4E2DC]">
                <div>
                  {canCancelModal &&
                    (modalConfirmCancel ? (
                      <div className="inline-flex items-center gap-2 bg-[#FDF1F0] border border-[#EFC8C4] rounded-lg px-2.5 py-1.5">
                        <button
                          type="button"
                          onClick={() => cancelReservation(selectedReservation.id)}
                          disabled={isModalBusy}
                          className="px-2.5 py-1 rounded text-xs font-semibold bg-[#9E2A2B] text-white hover:bg-[#7F2021] cursor-pointer disabled:opacity-50"
                        >
                          {isModalBusy ? "Cancelling..." : "Confirm Cancel"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalConfirmCancel(false)}
                          disabled={isModalBusy}
                          className="px-2 py-1 text-xs text-[#6B6A65] hover:text-[#161615] cursor-pointer"
                        >
                          Keep
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setModalConfirmCancel(true)}
                        disabled={isModalBusy}
                        className="rs-btn-danger"
                      >
                        <XCircle size={14} />
                        Cancel Reservation
                      </button>
                    ))}
                </div>

                <button
                  type="button"
                  onClick={closeReservationModal}
                  disabled={isModalBusy}
                  className="rs-btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </AppShell>
  );
}
