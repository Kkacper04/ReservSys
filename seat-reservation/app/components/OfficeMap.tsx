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

interface AisleMarker {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface RowTag {
  label: string;
  x: number;
  y: number;
}

interface ZoneBox {
  zone: string;
  x: number;
  y: number;
  w: number;
  h: number;
  seats: PositionedSeat[];
  aisles: AisleMarker[];
  rowTags: RowTag[];
  isPrivate: boolean;
}

interface SeatPalette {
  fill: string;
  stroke: string;
  secondaryFill: string;
  secondaryStroke: string;
  wallStroke: string;
  monitorFill: string;
  text: string;
  floorText: string;
  status: string;
  shortLabel: string;
  clickable: boolean;
}

function compareSeatNumbers(a: OfficeMapSeat, b: OfficeMapSeat) {
  const rowA = a.seat_number.replace(/\d+/g, "");
  const rowB = b.seat_number.replace(/\d+/g, "");
  if (rowA !== rowB) return rowA.localeCompare(rowB);
  const numA = parseInt(a.seat_number.replace(/\D+/g, ""), 10) || 0;
  const numB = parseInt(b.seat_number.replace(/\D+/g, ""), 10) || 0;
  return numA - numB;
}

function buildSeatPalette(
  seat: OfficeMapSeat,
  isSelected: boolean,
  isHovered: boolean,
  isMine: boolean
): SeatPalette {
  if (!seat.is_active) {
    return {
      fill: "#F1EFE9",
      stroke: "#DDD9CE",
      secondaryFill: "#E7E4DC",
      secondaryStroke: "#CFCBC2",
      wallStroke: "#CFCBC2",
      monitorFill: "#9A9890",
      text: "#7B7870",
      floorText: "#9A9890",
      status: "Maintenance",
      shortLabel: "MAINT.",
      clickable: false,
    };
  }
  if (isSelected) {
    return {
      fill: "#1B4D3E",
      stroke: "#143B2F",
      secondaryFill: "#256350",
      secondaryStroke: "#B9D5C9",
      wallStroke: "#143B2F",
      monitorFill: "#DCEAE3",
      text: "#FFFFFF",
      floorText: "#143B2F",
      status: "Selected",
      shortLabel: "SELECTED",
      clickable: true,
    };
  }
  if (isMine) {
    return {
      fill: "#EEF2F8",
      stroke: "#8CA8CE",
      secondaryFill: "#DCE6F4",
      secondaryStroke: "#7B9AC4",
      wallStroke: "#6E8FB8",
      monitorFill: "#1E3A5F",
      text: "#1E3A5F",
      floorText: "#1E3A5F",
      status: "Your Booking",
      shortLabel: "YOURS",
      clickable: false,
    };
  }
  if (!seat.is_available) {
    return {
      fill: "#FDF1F0",
      stroke: "#EFC8C4",
      secondaryFill: "#F9DFDC",
      secondaryStroke: "#D99B95",
      wallStroke: "#D99B95",
      monitorFill: "#9E2A2B",
      text: "#9E2A2B",
      floorText: "#9E2A2B",
      status: "Occupied",
      shortLabel: "OCCUPIED",
      clickable: false,
    };
  }
  return {
    fill: isHovered ? "#F4F8F6" : "#FFFFFF",
    stroke: isHovered ? "#1B4D3E" : "#C4BFB4",
    secondaryFill: isHovered ? "#E6F0EC" : "#F4F2EC",
    secondaryStroke: isHovered ? "#1B4D3E" : "#ACA79D",
    wallStroke: isHovered ? "#1B4D3E" : "#9C978C",
    monitorFill: "#1B4D3E",
    text: "#161615",
    floorText: isHovered ? "#1B4D3E" : "#6B6A65",
    status: "Available",
    shortLabel: seat.desk_type.toUpperCase(),
    clickable: true,
  };
}

function MonitorSilhouette({
  cx,
  y,
  fill,
  compact = false,
}: {
  cx: number;
  y: number;
  fill: string;
  compact?: boolean;
}) {
  const screenW = compact ? 24 : 28;
  const screenH = compact ? 3.5 : 4;
  const baseW = compact ? 10 : 12;

  return (
    <g>
      <rect
        x={cx - screenW / 2}
        y={y}
        width={screenW}
        height={screenH}
        rx="1.25"
        fill={fill}
      />
      <rect
        x={cx - 1.5}
        y={y + screenH}
        width="3"
        height="2.2"
        fill={fill}
        opacity="0.82"
      />
      <rect
        x={cx - baseW / 2}
        y={y + screenH + 2}
        width={baseW}
        height="1.6"
        rx="0.75"
        fill={fill}
        opacity="0.75"
      />
    </g>
  );
}

function StandardDeskSvg({
  seat,
  w,
  h,
  palette,
  isSelected,
}: {
  seat: OfficeMapSeat;
  w: number;
  h: number;
  palette: SeatPalette;
  isSelected: boolean;
}) {
  const cx = w / 2;
  const deskY = 4;
  const deskH = 42;

  return (
    <g>
      {isSelected && (
        <>
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
          <rect
            x="-2"
            y="-2"
            width={w + 4}
            height={h + 4}
            rx="7"
            fill="#EBF3EF"
            stroke="#1B4D3E"
            strokeWidth="1.5"
          />
        </>
      )}

      <rect
        x="4"
        y={deskY}
        width={w - 8}
        height={deskH}
        rx="4"
        fill={palette.fill}
        stroke={palette.stroke}
        strokeWidth={isSelected ? "1.75" : "1.25"}
      />

      {!seat.is_active && (
        <rect
          x="4"
          y={deskY}
          width={w - 8}
          height={deskH}
          rx="4"
          fill="url(#maint-hatch)"
          opacity="0.6"
        />
      )}

      {seat.has_monitor && seat.is_active && (
        <MonitorSilhouette cx={cx} y={deskY + 3.5} fill={palette.monitorFill} />
      )}

      {!seat.is_active && (
        <rect
          x={cx - 17}
          y={deskY + 16}
          width="34"
          height="18"
          rx="3"
          fill="#F1EFE9"
          fillOpacity="0.88"
        />
      )}

      <text
        x={cx}
        y={deskY + 29.5}
        textAnchor="middle"
        fill={palette.text}
        fontSize="15.5"
        fontWeight="700"
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {seat.seat_number}
      </text>

      <rect
        x={cx - 14}
        y={deskY + deskH + 2}
        width="2.5"
        height="7"
        rx="1.25"
        fill={palette.secondaryStroke}
      />
      <rect
        x={cx + 11.5}
        y={deskY + deskH + 2}
        width="2.5"
        height="7"
        rx="1.25"
        fill={palette.secondaryStroke}
      />
      <rect
        x={cx - 11}
        y={deskY + deskH - 1}
        width="22"
        height="10"
        rx="3.5"
        fill={palette.secondaryFill}
        stroke={palette.secondaryStroke}
        strokeWidth="1.15"
      />
      <path
        d={`M ${cx - 12} ${deskY + deskH + 11} Q ${cx} ${deskY + deskH + 16.5} ${cx + 12} ${deskY + deskH + 11}`}
        fill="none"
        stroke={palette.secondaryStroke}
        strokeWidth="3.25"
        strokeLinecap="round"
      />

      <text
        x={cx}
        y={h - 4.5}
        textAnchor="middle"
        fill={palette.floorText}
        fontSize="8.5"
        fontWeight="600"
        letterSpacing="0.7"
        style={{ fontFamily: "var(--font-jetbrains), monospace" }}
      >
        {palette.shortLabel}
      </text>
    </g>
  );
}

function QuietBoothSvg({
  seat,
  w,
  h,
  palette,
  isSelected,
}: {
  seat: OfficeMapSeat;
  w: number;
  h: number;
  palette: SeatPalette;
  isSelected: boolean;
}) {
  const cx = w / 2;
  const boothFloorPath = `M 8 61 L 8 11 Q 8 4 15 4 L ${w - 15} 4 Q ${w - 8} 4 ${w - 8} 11 L ${w - 8} 61 Z`;
  const boothWallPath = `M 8 60 L 8 11 Q 8 4 15 4 L ${w - 15} 4 Q ${w - 8} 4 ${w - 8} 11 L ${w - 8} 60`;
  const boothInnerRib = `M 11.5 58 L 11.5 12 Q 11.5 7.5 16 7.5 L ${w - 16} 7.5 Q ${w - 11.5} 7.5 ${w - 11.5} 12 L ${w - 11.5} 58`;

  return (
    <g>
      {isSelected && (
        <>
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
          <rect
            x="-2"
            y="-2"
            width={w + 4}
            height={h + 4}
            rx="7"
            fill="#EBF3EF"
            stroke="#1B4D3E"
            strokeWidth="1.5"
          />
        </>
      )}

      <path d={boothFloorPath} fill={palette.fill} />

      {!seat.is_active && (
        <path d={boothFloorPath} fill="url(#maint-hatch)" opacity="0.58" />
      )}

      <path
        d={boothWallPath}
        fill="none"
        stroke={palette.wallStroke}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d={boothInnerRib}
        fill="none"
        stroke={palette.secondaryStroke}
        strokeWidth="0.75"
        opacity="0.55"
      />

      <rect
        x="13"
        y="9.5"
        width={w - 26}
        height="15"
        rx="2"
        fill={palette.secondaryFill}
        stroke={palette.secondaryStroke}
        strokeWidth="1"
      />

      {seat.has_monitor && seat.is_active && (
        <MonitorSilhouette cx={cx} y={11.5} fill={palette.monitorFill} compact />
      )}

      {!seat.is_active && (
        <rect
          x={cx - 16}
          y={26}
          width="32"
          height="17"
          rx="3"
          fill="#F1EFE9"
          fillOpacity="0.88"
        />
      )}

      <text
        x={cx}
        y="39"
        textAnchor="middle"
        fill={palette.text}
        fontSize="15"
        fontWeight="700"
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {seat.seat_number}
      </text>

      <rect
        x={cx - 13}
        y="47"
        width="26"
        height="9.5"
        rx="3.5"
        fill={palette.secondaryFill}
        stroke={palette.secondaryStroke}
        strokeWidth="1.15"
      />
      <line
        x1={cx - 8}
        y1="51.75"
        x2={cx + 8}
        y2="51.75"
        stroke={palette.secondaryStroke}
        strokeWidth="0.8"
        opacity="0.5"
      />

      <text
        x={cx}
        y={h - 4.5}
        textAnchor="middle"
        fill={palette.floorText}
        fontSize="8.5"
        fontWeight="600"
        letterSpacing="0.7"
        style={{ fontFamily: "var(--font-jetbrains), monospace" }}
      >
        {palette.shortLabel}
      </text>
    </g>
  );
}

function PrivateRoomSvg({
  seat,
  w,
  h,
  palette,
  isSelected,
}: {
  seat: OfficeMapSeat;
  w: number;
  h: number;
  palette: SeatPalette;
  isSelected: boolean;
}) {
  const doorW = Math.min(24, Math.round(h * 0.25));
  const doorBottom = h - 10;
  const doorTop = doorBottom - doorW;
  const wallX = 1.5;

  const deskX = Math.max(doorW + 18, Math.round(w * 0.3));
  const deskW = w - deskX - 14;
  const deskY = 14;
  const deskH = Math.round(h * 0.38);
  const deskCx = deskX + deskW / 2;

  return (
    <g>
      {isSelected && (
        <rect
          x="-4"
          y="-4"
          width={w + 8}
          height={h + 8}
          rx="7"
          fill="none"
          stroke="#B9D5C9"
          strokeWidth="3.5"
        />
      )}

      <rect
        x="1.5"
        y="1.5"
        width={w - 3}
        height={h - 3}
        rx="3"
        fill={palette.fill}
      />

      {!seat.is_active && (
        <rect
          x="1.5"
          y="1.5"
          width={w - 3}
          height={h - 3}
          rx="3"
          fill="url(#maint-hatch)"
          opacity="0.55"
        />
      )}

      <path
        d={`M ${wallX} ${doorTop} L ${wallX} 1.5 L ${w - 1.5} 1.5 L ${w - 1.5} ${h - 1.5} L ${wallX} ${h - 1.5} L ${wallX} ${doorBottom}`}
        fill="none"
        stroke={palette.wallStroke}
        strokeWidth="3"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />

      <line
        x1={wallX}
        y1={doorBottom}
        x2={wallX + doorW}
        y2={doorBottom}
        stroke={palette.wallStroke}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d={`M ${wallX + doorW} ${doorBottom} A ${doorW} ${doorW} 0 0 0 ${wallX} ${doorTop}`}
        fill="none"
        stroke={palette.secondaryStroke}
        strokeWidth="1.2"
        strokeDasharray="3 2.5"
      />

      <rect
        x={deskX}
        y={deskY}
        width={deskW}
        height={deskH}
        rx="3.5"
        fill={palette.secondaryFill}
        stroke={palette.secondaryStroke}
        strokeWidth="1.25"
      />

      {seat.has_monitor && seat.is_active && (
        <MonitorSilhouette
          cx={deskCx}
          y={deskY + 3.5}
          fill={palette.monitorFill}
          compact
        />
      )}

      {!seat.is_active && (
        <rect
          x={deskCx - 17}
          y={deskY + deskH / 2 - 9}
          width="34"
          height="18"
          rx="3"
          fill="#E7E4DC"
          fillOpacity="0.9"
        />
      )}

      <text
        x={deskCx}
        y={deskY + deskH / 2 + 5.5}
        textAnchor="middle"
        fill={palette.text}
        fontSize={w >= 120 ? "16" : "13"}
        fontWeight="700"
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {seat.seat_number}
      </text>

      <rect
        x={deskCx - 14.5}
        y={deskY + deskH + 1}
        width="2.5"
        height="7"
        rx="1.25"
        fill={palette.secondaryStroke}
      />
      <rect
        x={deskCx + 12}
        y={deskY + deskH + 1}
        width="2.5"
        height="7"
        rx="1.25"
        fill={palette.secondaryStroke}
      />
      <rect
        x={deskCx - 12}
        y={deskY + deskH - 1}
        width="24"
        height="10"
        rx="3.5"
        fill={palette.secondaryFill}
        stroke={palette.secondaryStroke}
        strokeWidth="1.15"
      />
      <path
        d={`M ${deskCx - 13} ${deskY + deskH + 11} Q ${deskCx} ${deskY + deskH + 16} ${deskCx + 13} ${deskY + deskH + 11}`}
        fill="none"
        stroke={palette.secondaryStroke}
        strokeWidth="3.25"
        strokeLinecap="round"
      />

      <text
        x={deskCx}
        y={h - 9.5}
        textAnchor="middle"
        fill={isSelected ? "#DCEAE3" : palette.floorText}
        fontSize="9"
        fontWeight="600"
        letterSpacing="0.7"
        style={{ fontFamily: "var(--font-jetbrains), monospace" }}
      >
        {palette.shortLabel}
      </text>
    </g>
  );
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
    const outerPadX = 34;
    const outerPadTop = 60;
    const outerPadBottom = 72;
    const zoneGapY = 26;
    const corridorGap = 54;
    const deskW = 88;
    const deskH = 76;
    const colGap = 14;
    const wrappedRowGap = 14;
    const aisleGap = 36;
    const zonePadLeft = 40;
    const zonePadRight = 24;
    const zonePadTop = 48;
    const zonePadBottom = 22;
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
      zonePadLeft +
      colsPerRow * deskW +
      (colsPerRow - 1) * colGap +
      zonePadRight;
    const privateSuiteW = 168;
    const privateSuiteH = 98;
    const privateSuiteGap = 18;
    const privatePadX = 24;
    const privateColumnWidth =
      privateZoneList.length > 0 ? privatePadX * 2 + privateSuiteW : 0;

    const hasMain = mainZoneOrder.length > 0;
    const hasPrivate = privateZoneList.length > 0;
    const hasCorridor = hasMain && hasPrivate;

    const rawWidth =
      outerPadX * 2 +
      (hasMain ? mainColumnWidth : 0) +
      (hasCorridor ? corridorGap : 0) +
      privateColumnWidth;
    const svgWidth = Math.max(rawWidth, 560);
    const xOffset = (svgWidth - rawWidth) / 2;

    const zones: ZoneBox[] = [];
    let currentY = outerPadTop;

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
      const aisles: AisleMarker[] = [];
      const rowTags: RowTag[] = [];
      const zoneX = xOffset + outerPadX;
      let cursorY = currentY + zonePadTop;
      let groupIdx = 0;

      for (const [prefix, groupSeats] of rowsMap) {
        if (groupIdx > 0) {
          aisles.push({
            x: zoneX + 18,
            y: cursorY + 7,
            w: mainColumnWidth - 36,
            h: aisleGap - 14,
          });
          cursorY += aisleGap;
        }

        const subRows = Math.max(1, Math.ceil(groupSeats.length / colsPerRow));
        const groupHeight =
          subRows * deskH + Math.max(0, subRows - 1) * wrappedRowGap;

        rowTags.push({
          label: `ROW ${prefix.toUpperCase()}`,
          x: zoneX + 20,
          y: cursorY + groupHeight / 2 - 4,
        });

        groupSeats.forEach((seat, idx) => {
          const wrappedRow = Math.floor(idx / colsPerRow);
          const col = idx % colsPerRow;
          const x = zoneX + zonePadLeft + col * (deskW + colGap);
          const y = cursorY + wrappedRow * (deskH + wrappedRowGap);
          positioned.push({ seat, x, y, w: deskW, h: deskH });
        });

        cursorY += groupHeight;
        groupIdx += 1;
      }

      const zoneHeight = cursorY - currentY + zonePadBottom;

      zones.push({
        zone: zoneName,
        x: zoneX,
        y: currentY,
        w: mainColumnWidth,
        h: zoneHeight,
        seats: positioned,
        aisles,
        rowTags,
        isPrivate: false,
      });

      currentY += zoneHeight + zoneGapY;
    }

    const mainBottomY = hasMain ? currentY - zoneGapY : outerPadTop + 200;

    let privateBottomY = 0;
    if (hasPrivate) {
      const privateX =
        xOffset +
        outerPadX +
        (hasMain ? mainColumnWidth + corridorGap : 0);
      let privY = outerPadTop;

      for (const zoneName of privateZoneList) {
        const zoneSeats = officeSeats
          .filter((s) => s.zone === zoneName)
          .sort(compareSeatNumbers);

        const positioned: PositionedSeat[] = zoneSeats.map((seat, idx) => ({
          seat,
          x: privateX + privatePadX,
          y: privY + zonePadTop + idx * (privateSuiteH + privateSuiteGap),
          w: privateSuiteW,
          h: privateSuiteH,
        }));

        const zoneHeight =
          zonePadTop +
          zoneSeats.length * privateSuiteH +
          Math.max(0, zoneSeats.length - 1) * privateSuiteGap +
          zonePadBottom;

        zones.push({
          zone: zoneName,
          x: privateX,
          y: privY,
          w: privateColumnWidth,
          h: zoneHeight,
          seats: positioned,
          aisles: [],
          rowTags: [],
          isPrivate: true,
        });

        privY += zoneHeight + zoneGapY;
      }
      privateBottomY = privY - zoneGapY;
    }

    const contentBottomY = Math.max(mainBottomY, privateBottomY, 260);
    const svgHeight = contentBottomY + outerPadBottom;
    const corridorX = xOffset + outerPadX + mainColumnWidth;
    const corridorCenterX = corridorX + corridorGap / 2;
    const entranceX = hasCorridor ? corridorCenterX : svgWidth / 2;

    return {
      zones,
      svgWidth,
      svgHeight,
      hasCorridor,
      corridorX,
      corridorGap,
      corridorCenterX,
      entranceX,
      outerPadTop,
    };
  }, [officeSeats]);

  const availableCount = officeSeats.filter(
    (s) => s.is_active && s.is_available
  ).length;

  const wallBottomY = layout.svgHeight - 14;

  if (officeSeats.length === 0) {
    return (
      <div className="rs-card p-10 text-center text-sm text-[#6B6A65]">
        No desks match your current filters in {selectedOffice || "this office"}.
      </div>
    );
  }

  const hoveredPalette = hoveredSeat
    ? buildSeatPalette(
        hoveredSeat,
        selectedSeat === hoveredSeat.id,
        false,
        mySeatIds?.has(hoveredSeat.id) ?? false
      )
    : null;

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
              height={layout.svgHeight - 26}
              rx="12"
              fill="#FFFFFF"
              stroke="#CFCBC2"
              strokeWidth="2"
            />
            <rect
              x="16"
              y="16"
              width={layout.svgWidth - 32}
              height={layout.svgHeight - 34}
              rx="10"
              fill="url(#arch-grid)"
            />

            <text
              x="34"
              y="39"
              fill="#6B6A65"
              fontSize="11"
              fontWeight="600"
              letterSpacing="1.6"
              style={{ fontFamily: "var(--font-jetbrains), monospace" }}
            >
              {selectedOffice.toUpperCase()} · ARCHITECTURAL FLOORPLAN
            </text>

            <g transform={`translate(${layout.svgWidth - 118}, 30)`}>
              <text
                x="0"
                y="9"
                fill="#9A9890"
                fontSize="9"
                fontWeight="600"
                letterSpacing="1.2"
                style={{ fontFamily: "var(--font-jetbrains), monospace" }}
              >
                PLAN · CAD
              </text>
              <g transform="translate(74, 5)">
                <circle
                  cx="0"
                  cy="0"
                  r="7"
                  fill="#FFFFFF"
                  stroke="#CFCBC2"
                  strokeWidth="1"
                />
                <polygon points="0,-5 2.2,2 0,0.5 -2.2,2" fill="#6B6A65" />
                <text
                  x="0"
                  y="-9"
                  textAnchor="middle"
                  fill="#9A9890"
                  fontSize="6.5"
                  fontWeight="700"
                  style={{ fontFamily: "var(--font-jetbrains), monospace" }}
                >
                  N
                </text>
              </g>
            </g>

            {layout.hasCorridor && (
              <g>
                <rect
                  x={layout.corridorX + 6}
                  y={layout.outerPadTop}
                  width={layout.corridorGap - 12}
                  height={wallBottomY - layout.outerPadTop - 32}
                  rx="4"
                  fill="#F7F6F2"
                  fillOpacity="0.82"
                />
                <line
                  x1={layout.corridorCenterX}
                  y1={layout.outerPadTop + 12}
                  x2={layout.corridorCenterX}
                  y2={wallBottomY - 46}
                  stroke="#DCD8CE"
                  strokeWidth="1.25"
                  strokeDasharray="5 5"
                />
                <text
                  x={layout.corridorCenterX}
                  y={(layout.outerPadTop + wallBottomY - 34) / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#9A9890"
                  fontSize="8.5"
                  fontWeight="600"
                  letterSpacing="2.2"
                  transform={`rotate(-90 ${layout.corridorCenterX} ${(layout.outerPadTop + wallBottomY - 34) / 2})`}
                  style={{ fontFamily: "var(--font-jetbrains), monospace" }}
                >
                  MAIN CORRIDOR
                </text>
              </g>
            )}

            <g>
              <rect
                x={layout.entranceX - 24}
                y={wallBottomY - 3}
                width="48"
                height="6"
                fill="#FFFFFF"
              />
              <line
                x1={layout.entranceX - 22}
                y1={wallBottomY}
                x2={layout.entranceX - 22}
                y2={wallBottomY - 22}
                stroke="#9C978C"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
              <line
                x1={layout.entranceX + 22}
                y1={wallBottomY}
                x2={layout.entranceX + 22}
                y2={wallBottomY - 22}
                stroke="#9C978C"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
              <path
                d={`M ${layout.entranceX} ${wallBottomY} A 22 22 0 0 0 ${layout.entranceX - 22} ${wallBottomY - 22}`}
                fill="none"
                stroke="#CFCBC2"
                strokeWidth="1.2"
                strokeDasharray="3 2.5"
              />
              <path
                d={`M ${layout.entranceX} ${wallBottomY} A 22 22 0 0 1 ${layout.entranceX + 22} ${wallBottomY - 22}`}
                fill="none"
                stroke="#CFCBC2"
                strokeWidth="1.2"
                strokeDasharray="3 2.5"
              />
              <polygon
                points={`${layout.entranceX},${wallBottomY - 36} ${layout.entranceX - 4},${wallBottomY - 30} ${layout.entranceX + 4},${wallBottomY - 30}`}
                fill="#9A9890"
              />
              <text
                x={layout.entranceX}
                y={wallBottomY - 41}
                textAnchor="middle"
                fill="#6B6A65"
                fontSize="8.5"
                fontWeight="600"
                letterSpacing="1.6"
                style={{ fontFamily: "var(--font-jetbrains), monospace" }}
              >
                MAIN ENTRANCE
              </text>
            </g>

            {layout.zones.map((zone) => {
              const doorwayCenterY = zone.y + zone.h * 0.56;

              return (
                <g key={zone.zone}>
                  <rect
                    x={zone.x}
                    y={zone.y}
                    width={zone.w}
                    height={zone.h}
                    rx="8"
                    fill={zone.isPrivate ? "#F5F3EE" : "#FAF9F6"}
                    fillOpacity="0.92"
                    stroke="#DCD8CE"
                    strokeWidth="1.5"
                  />

                  {!zone.isPrivate && layout.hasCorridor && (
                    <g>
                      <line
                        x1={zone.x + zone.w}
                        y1={doorwayCenterY - 18}
                        x2={zone.x + zone.w}
                        y2={doorwayCenterY + 18}
                        stroke="#FAF9F6"
                        strokeWidth="3.5"
                      />
                      <line
                        x1={zone.x + zone.w}
                        y1={doorwayCenterY - 18}
                        x2={zone.x + zone.w}
                        y2={doorwayCenterY + 18}
                        stroke="#CFCBC2"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                      />
                      <circle
                        cx={zone.x + zone.w}
                        cy={doorwayCenterY - 18}
                        r="1.75"
                        fill="#ACA79D"
                      />
                      <circle
                        cx={zone.x + zone.w}
                        cy={doorwayCenterY + 18}
                        r="1.75"
                        fill="#ACA79D"
                      />
                    </g>
                  )}

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

                  <text
                    x={zone.x + zone.w - 20}
                    y={zone.y + 27}
                    textAnchor="end"
                    fill="#9A9890"
                    fontSize="9.5"
                    fontWeight="500"
                    letterSpacing="0.8"
                    style={{ fontFamily: "var(--font-jetbrains), monospace" }}
                  >
                    {zone.isPrivate ? "SUITES" : `${zone.seats.length} STATIONS`}
                  </text>

                  <line
                    x1={zone.x + 20}
                    y1={zone.y + 36}
                    x2={zone.x + zone.w - 20}
                    y2={zone.y + 36}
                    stroke="#EAE7DF"
                    strokeWidth="1"
                  />

                  {zone.rowTags.map((tag) => (
                    <text
                      key={`${zone.zone}-${tag.label}`}
                      x={tag.x}
                      y={tag.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#9A9890"
                      fontSize="8"
                      fontWeight="600"
                      letterSpacing="1.2"
                      transform={`rotate(-90 ${tag.x} ${tag.y})`}
                      style={{ fontFamily: "var(--font-jetbrains), monospace" }}
                    >
                      {tag.label}
                    </text>
                  ))}

                  {zone.aisles.map((aisle, idx) => (
                    <g key={`${zone.zone}-aisle-${idx}`}>
                      <rect
                        x={aisle.x}
                        y={aisle.y}
                        width={aisle.w}
                        height={aisle.h}
                        rx="3"
                        fill="#F2EFE8"
                      />
                      <line
                        x1={aisle.x + 8}
                        y1={aisle.y + aisle.h / 2}
                        x2={aisle.x + aisle.w - 8}
                        y2={aisle.y + aisle.h / 2}
                        stroke="#DCD8CE"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                      <rect
                        x={aisle.x + aisle.w / 2 - 48}
                        y={aisle.y + aisle.h / 2 - 6}
                        width="96"
                        height="12"
                        rx="2"
                        fill="#F2EFE8"
                      />
                      <text
                        x={aisle.x + aisle.w / 2}
                        y={aisle.y + aisle.h / 2 + 3}
                        textAnchor="middle"
                        fill="#9A9890"
                        fontSize="7.5"
                        fontWeight="600"
                        letterSpacing="1.6"
                        style={{
                          fontFamily: "var(--font-jetbrains), monospace",
                        }}
                      >
                        WALKWAY · AISLE
                      </text>
                    </g>
                  ))}

                  {zone.seats.map(({ seat, x, y, w, h }) => {
                    const isSelected = selectedSeat === seat.id;
                    const isHovered = hoveredSeat?.id === seat.id;
                    const isMine = mySeatIds?.has(seat.id) ?? false;
                    const palette = buildSeatPalette(
                      seat,
                      isSelected,
                      isHovered,
                      isMine
                    );
                    const deskType = seat.desk_type.toLowerCase();
                    const isPrivateSeat =
                      zone.isPrivate || deskType === "private";
                    const isBoothSeat = !isPrivateSeat && deskType === "booth";

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
                          setHoveredSeat((cur) =>
                            cur?.id === seat.id ? null : cur
                          )
                        }
                        onFocus={() => setHoveredSeat(seat)}
                        onBlur={() =>
                          setHoveredSeat((cur) =>
                            cur?.id === seat.id ? null : cur
                          )
                        }
                        className={
                          palette.clickable
                            ? "cursor-pointer outline-none"
                            : "cursor-not-allowed outline-none"
                        }
                      >
                        {isPrivateSeat ? (
                          <PrivateRoomSvg
                            seat={seat}
                            w={w}
                            h={h}
                            palette={palette}
                            isSelected={isSelected}
                          />
                        ) : isBoothSeat ? (
                          <QuietBoothSvg
                            seat={seat}
                            w={w}
                            h={h}
                            palette={palette}
                            isSelected={isSelected}
                          />
                        ) : (
                          <StandardDeskSvg
                            seat={seat}
                            w={w}
                            h={h}
                            palette={palette}
                            isSelected={isSelected}
                          />
                        )}
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="px-5 py-2.5 border-t border-[#E4E2DC] bg-[#FAF9F6] flex items-center justify-between text-xs text-[#6B6A65] min-h-[38px]">
        {hoveredSeat && hoveredPalette ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono font-semibold text-[#161615] tabular-nums">
              Desk {hoveredSeat.seat_number}
            </span>
            <span>{hoveredSeat.zone}</span>
            <span className="capitalize">{hoveredSeat.desk_type}</span>
            <span>
              {hoveredSeat.has_monitor
                ? "External monitor included"
                : "No monitor"}
            </span>
            <span className="font-medium text-[#161615]">
              · {hoveredPalette.status}
            </span>
          </div>
        ) : (
          <span>
            Hover or focus any desk to inspect specifications. Click an
            available desk to select.
          </span>
        )}
      </div>
    </div>
  );
}
