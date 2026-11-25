"use client";

import React, { useMemo, useState } from "react";
import { Monitor } from "lucide-react";

export interface OfficeMapSeat {
  id: number;
  seat_number: string;
  is_available: boolean;
  office_name: string;
  zone: string;
  desk_type: string;
  has_monitor: boolean;
  is_active: boolean;
}

interface OfficeMapProps {
  seats: OfficeMapSeat[];
  selectedSeat: number | null;
  onSelectSeat: (id: number | null) => void;
  selectedOffice: string;
  mySeatIds?: Set<number>;
}

interface PositionedSeat {
  seat: OfficeMapSeat;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ZoneBox {
  zone: string;
  x: number;
  y: number;
  w: number;
  h: number;
  seats: PositionedSeat[];
  isPrivate: boolean;
}

function compareSeatNumbers(a: OfficeMapSeat, b: OfficeMapSeat) {
  const rowA = a.seat_number.replace(/\d+/g, "");
  const rowB = b.seat_number.replace(/\d+/g, "");
  if (rowA !== rowB) return rowA.localeCompare(rowB);
  const numA = parseInt(a.seat_number.replace(/\D+/g, ""), 10) || 0;
  const numB = parseInt(b.seat_number.replace(/\D+/g, ""), 10) || 0;
  return numA - numB;
}

export default function OfficeMap({
  seats,
  selectedSeat,
  onSelectSeat,
  selectedOffice,
  mySeatIds,
}: OfficeMapProps) {
  const [hoveredSeat, setHoveredSeat] = useState<OfficeMapSeat | null>(null);

  const officeSeats = useMemo(
    () => seats.filter((s) => s.office_name === selectedOffice),
    [seats, selectedOffice]
  );

  const layout = useMemo(() => {
    const outerPad = 36;
    const zoneGap = 24;
    const deskW = 86;
    const deskH = 62;
    const colGap = 16;
    const rowGap = 22;
    const zonePadX = 24;
    const zonePadTop = 48;
    const zonePadBottom = 24;
    const colsPerRow = 8;

    const privateZoneNames = new Set(
      officeSeats
        .filter((s) => s.zone.toLowerCase().includes("private"))
        .map((s) => s.zone)
    );

    const mainZoneOrder = Array.from(
      new Set(
        officeSeats
          .filter((s) => !privateZoneNames.has(s.zone))
          .map((s) => s.zone)
      )
    );

    const privateZoneList = Array.from(privateZoneNames);

    const mainColumnWidth =
      zonePadX * 2 + colsPerRow * deskW + (colsPerRow - 1) * colGap;
    const privateSuiteW = 148;
    const privateSuiteH = 88;
    const privateColumnWidth =
      privateZoneList.length > 0 ? zonePadX * 2 + privateSuiteW : 0;

    const zones: ZoneBox[] = [];
    let currentY = outerPad + 28;

    for (const zoneName of mainZoneOrder) {
      const zoneSeats = officeSeats
        .filter((s) => s.zone === zoneName)
        .sort(compareSeatNumbers);

      const rowsMap = new Map<string, OfficeMapSeat[]>();
      for (const s of zoneSeats) {
        const prefix = s.seat_number.match(/^[A-Za-z]+/)?.[0] || "Z";
        const group = rowsMap.get(prefix) || [];
        group.push(s);
        rowsMap.set(prefix, group);
      }

      const positioned: PositionedSeat[] = [];
      let rowIndex = 0;

      for (const [, groupSeats] of rowsMap) {
        groupSeats.forEach((seat, idx) => {
          const wrappedRow = Math.floor(idx / colsPerRow);
          const col = idx % colsPerRow;
          const x = outerPad + zonePadX + col * (deskW + colGap);
          const y =
            currentY + zonePadTop + (rowIndex + wrappedRow) * (deskH + rowGap);
          positioned.push({ seat, x, y, w: deskW, h: deskH });
        });
        rowIndex += Math.max(1, Math.ceil(groupSeats.length / colsPerRow));
      }

      const zoneHeight =
        zonePadTop +
        rowIndex * deskH +
        Math.max(0, rowIndex - 1) * rowGap +
        zonePadBottom;

      zones.push({
        zone: zoneName,
        x: outerPad,
        y: currentY,
        w: mainColumnWidth,
        h: zoneHeight,
        seats: positioned,
        isPrivate: false,
      });

      currentY += zoneHeight + zoneGap;
    }

    const mainTotalHeight =
      zones.length > 0 ? currentY - zoneGap + outerPad : outerPad * 2 + 240;

    let privateTotalHeight = 0;
    if (privateZoneList.length > 0) {
      const privateX =
        mainZoneOrder.length > 0 ? outerPad + mainColumnWidth + zoneGap : outerPad;
      let privY = outerPad + 28;

      for (const zoneName of privateZoneList) {
        const zoneSeats = officeSeats
          .filter((s) => s.zone === zoneName)
          .sort(compareSeatNumbers);

        const positioned: PositionedSeat[] = zoneSeats.map((seat, idx) => ({
          seat,
          x: privateX + zonePadX,
          y: privY + zonePadTop + idx * (privateSuiteH + 16),
          w: privateSuiteW,
          h: privateSuiteH,
        }));

        const zoneHeight =
          zonePadTop +
          zoneSeats.length * privateSuiteH +
          Math.max(0, zoneSeats.length - 1) * 16 +
          zonePadBottom;

        zones.push({
          zone: zoneName,
          x: privateX,
          y: privY,
          w: privateColumnWidth,
          h: zoneHeight,
          seats: positioned,
          isPrivate: true,
        });

        privY += zoneHeight + zoneGap;
      }
      privateTotalHeight = privY - zoneGap + outerPad;
    }

    const svgWidth =
      outerPad * 2 +
      (mainZoneOrder.length > 0 ? mainColumnWidth : 0) +
      (mainZoneOrder.length > 0 && privateZoneList.length > 0 ? zoneGap : 0) +
      privateColumnWidth;

    const svgHeight = Math.max(mainTotalHeight, privateTotalHeight, 360);

    return { zones, svgWidth: Math.max(svgWidth, 560), svgHeight };
  }, [officeSeats]);

  const availableCount = officeSeats.filter(
    (s) => s.is_active && s.is_available
  ).length;

  const getSeatPalette = (seat: OfficeMapSeat) => {
    const isSelected = selectedSeat === seat.id;
    const isMine = mySeatIds?.has(seat.id) ?? false;

    if (!seat.is_active) {
      return {
        fill: "#F1EFE9",
        stroke: "#DDD9CE",
        text: "#9A9890",
        subtext: "#9A9890",
        status: "Maintenance",
        clickable: false,
      };
    }
    if (isSelected) {
      return {
        fill: "#1B4D3E",
        stroke: "#143B2F",
        text: "#FFFFFF",
        subtext: "#DCEAE3",
        status: "Selected",
        clickable: true,
      };
    }
    if (isMine) {
      return {
        fill: "#EEF2F8",
        stroke: "#8CA8CE",
        text: "#1E3A5F",
        subtext: "#4B6991",
        status: "Your Booking",
        clickable: false,
      };
    }
    if (!seat.is_available) {
      return {
        fill: "#FDF1F0",
        stroke: "#EFC8C4",
        text: "#9E2A2B",
        subtext: "#B85D5E",
        status: "Occupied",
        clickable: false,
      };
    }
    return {
      fill: "#FFFFFF",
      stroke: "#CFCBC2",
      text: "#161615",
      subtext: "#6B6A65",
      status: "Available",
      clickable: true,
    };
  };

  if (officeSeats.length === 0) {
    return (
      <div className="rs-card p-10 text-center text-sm text-[#6B6A65]">
        No desks match your current filters in {selectedOffice || "this office"}.
      </div>
    );
  }

  return (
    <div className="rs-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#E4E2DC] bg-[#FAF9F6] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-wider text-[#6B6A65]">
            {selectedOffice} Floor Plan
          </span>
          <span className="text-xs text-[#9A9890]">·</span>
          <span className="text-xs font-medium text-[#161615] tabular-nums">
            {availableCount} of {officeSeats.length} available
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B6A65]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-white border border-[#CFCBC2]" />
            Available
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#1B4D3E] border border-[#143B2F]" />
            Selected
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#EEF2F8] border border-[#8CA8CE]" />
            Your Booking
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#FDF1F0] border border-[#EFC8C4]" />
            Occupied
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#F1EFE9] border border-[#DDD9CE]" />
            Maintenance
          </span>
          <span className="inline-flex items-center gap-1 text-[#161615]">
            <Monitor size={13} strokeWidth={2} />
            Monitor
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-6 overflow-x-auto bg-[#F7F6F2]/60">
        <div className="min-w-[680px]">
          <svg
            viewBox={`0 0 ${layout.svgWidth} ${layout.svgHeight}`}
            className="w-full h-auto select-none"
            role="img"
            aria-label={`${selectedOffice} office floor plan`}
          >
            <defs>
              <pattern
                id="arch-grid"
                width="24"
                height="24"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 24 0 L 0 0 0 24"
                  fill="none"
                  stroke="#ECEAE2"
                  strokeWidth="0.75"
                />
              </pattern>
              <pattern
                id="maint-hatch"
                width="8"
                height="8"
                patternTransform="rotate(45 0 0)"
                patternUnits="userSpaceOnUse"
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="8"
                  stroke="#DDD9CE"
                  strokeWidth="2"
                />
              </pattern>
            </defs>

            <rect
              x="12"
              y="12"
              width={layout.svgWidth - 24}
              height={layout.svgHeight - 24}
              rx="12"
              fill="#FFFFFF"
              stroke="#CFCBC2"
              strokeWidth="2"
            />
            <rect
              x="16"
              y="16"
              width={layout.svgWidth - 32}
              height={layout.svgHeight - 32}
              rx="10"
              fill="url(#arch-grid)"
            />

            <text
              x="36"
              y="38"
              fill="#6B6A65"
              fontSize="11"
              fontWeight="600"
              letterSpacing="1.6"
              style={{ fontFamily: "var(--font-jetbrains), monospace" }}
            >
              {selectedOffice.toUpperCase()} · ARCHITECTURAL FLOORPLAN
            </text>

            {layout.zones.map((zone) => (
              <g key={zone.zone}>
                <rect
                  x={zone.x}
                  y={zone.y}
                  width={zone.w}
                  height={zone.h}
                  rx="8"
                  fill={zone.isPrivate ? "#FAF9F6" : "#FFFFFF"}
                  fillOpacity="0.9"
                  stroke="#E4E2DC"
                  strokeWidth="1.5"
                />

                <text
                  x={zone.x + 20}
                  y={zone.y + 27}
                  fill="#161615"
                  fontSize="12"
                  fontWeight="600"
                  letterSpacing="1"
                  style={{ fontFamily: "var(--font-jetbrains), monospace" }}
                >
                  {zone.zone.toUpperCase()}
                </text>

                <line
                  x1={zone.x + 20}
                  y1={zone.y + 36}
                  x2={zone.x + zone.w - 20}
                  y2={zone.y + 36}
                  stroke="#EFECE6"
                  strokeWidth="1"
                />

                {zone.seats.map(({ seat, x, y, w, h }) => {
                  const palette = getSeatPalette(seat);
                  const isSelected = selectedSeat === seat.id;
                  const isHovered = hoveredSeat?.id === seat.id;

                  return (
                    <g
                      key={seat.id}
                      transform={`translate(${x}, ${y})`}
                      role={palette.clickable ? "button" : undefined}
                      tabIndex={palette.clickable ? 0 : -1}
                      aria-label={`Desk ${seat.seat_number}, ${seat.zone}, ${seat.desk_type}, ${palette.status}${seat.has_monitor ? ", includes monitor" : ""}`}
                      aria-pressed={palette.clickable ? isSelected : undefined}
                      onClick={() => {
                        if (!palette.clickable) return;
                        onSelectSeat(isSelected ? null : seat.id);
                      }}
                      onKeyDown={(e) => {
                        if (!palette.clickable) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelectSeat(isSelected ? null : seat.id);
                        }
                      }}
                      onMouseEnter={() => setHoveredSeat(seat)}
                      onMouseLeave={() =>
                        setHoveredSeat((cur) => (cur?.id === seat.id ? null : cur))
                      }
                      className={
                        palette.clickable
                          ? "cursor-pointer outline-none"
                          : "cursor-not-allowed outline-none"
                      }
                    >
                      {zone.isPrivate && (
                        <path
                          d={`M -12 16 A 14 14 0 0 1 2 30`}
                          fill="none"
                          stroke="#CFCBC2"
                          strokeWidth="1.2"
                          strokeDasharray="3 2"
                        />
                      )}

                      {isSelected && (
                        <rect
                          x="-4"
                          y="-4"
                          width={w + 8}
                          height={h + 8}
                          rx="9"
                          fill="none"
                          stroke="#B9D5C9"
                          strokeWidth="3"
                        />
                      )}

                      <rect
                        width={w}
                        height={h}
                        rx="6"
                        fill={
                          isHovered && palette.clickable && !isSelected
                            ? "#F4F8F6"
                            : palette.fill
                        }
                        stroke={
                          isHovered && palette.clickable && !isSelected
                            ? "#1B4D3E"
                            : palette.stroke
                        }
                        strokeWidth={isSelected ? "2" : "1.25"}
                      />

                      {!seat.is_active && (
                        <rect
                          width={w}
                          height={h}
                          rx="6"
                          fill="url(#maint-hatch)"
                          opacity="0.7"
                        />
                      )}

                      {seat.has_monitor && seat.is_active && (
                        <g transform={`translate(${w / 2 - 12}, 7)`}>
                          <rect
                            width="24"
                            height="4"
                            rx="1.5"
                            fill={isSelected ? "#B9D5C9" : "#1B4D3E"}
                          />
                        </g>
                      )}

                      <text
                        x={w / 2}
                        y={h / 2 + 2}
                        textAnchor="middle"
                        fill={palette.text}
                        fontSize={zone.isPrivate ? "17" : "16"}
                        fontWeight="600"
                        style={{
                          fontFamily: "var(--font-jetbrains), monospace",
                        }}
                      >
                        {seat.seat_number}
                      </text>

                      <text
                        x={w / 2}
                        y={h - 11}
                        textAnchor="middle"
                        fill={palette.subtext}
                        fontSize="9.5"
                        fontWeight="500"
                        letterSpacing="0.5"
                      >
                        {!seat.is_active
                          ? "MAINTENANCE"
                          : !seat.is_available
                            ? mySeatIds?.has(seat.id)
                              ? "YOURS"
                              : "OCCUPIED"
                            : seat.desk_type.toUpperCase()}
                      </text>
                    </g>
                  );
                })}
              </g>
            ))}
          </svg>
        </div>
      </div>

      <div className="px-5 py-2.5 border-t border-[#E4E2DC] bg-[#FAF9F6] flex items-center justify-between text-xs text-[#6B6A65] min-h-[38px]">
        {hoveredSeat ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono font-semibold text-[#161615]">
              Desk {hoveredSeat.seat_number}
            </span>
            <span>{hoveredSeat.zone}</span>
            <span className="capitalize">{hoveredSeat.desk_type}</span>
            <span>
              {hoveredSeat.has_monitor ? "External monitor included" : "No monitor"}
            </span>
            <span className="font-medium text-[#161615]">
              · {getSeatPalette(hoveredSeat).status}
            </span>
          </div>
        ) : (
          <span>Hover or focus any desk to inspect specifications. Click an available desk to select.</span>
        )}
      </div>
    </div>
  );
}
