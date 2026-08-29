import React from "react";

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

interface OfficeMapProps {
  seats: Seat[];
  selectedSeat: number | null;
  onSelectSeat: (id: number) => void;
  selectedOffice: string;
}

export default function OfficeMap({ seats, selectedSeat, onSelectSeat, selectedOffice }: OfficeMapProps) {
  // Filter seats for the selected office
  const officeSeats = seats.filter(s => s.office_name === selectedOffice);

  // Helper to determine coordinates based on seat number 
  const getCoordinates = (seatNumber: string) => {
    const row = seatNumber.charAt(0).toUpperCase();
    const num = parseInt(seatNumber.slice(1), 10);
    
    // Grid system: block size
    const blockWidth = 100;
    const blockHeight = 80;
    const paddingX = 80;
    const paddingY = 80;

    let x = 0;
    let y = 0;

    // Custom layout rules
    if (row === "A") {
      x = paddingX + (num - 1) * blockWidth;
      y = paddingY; // Top row
    } else if (row === "B") {
      x = paddingX + (num - 1) * blockWidth;
      y = paddingY + blockHeight * 1.5; // Second row (Open Space)
    } else if (row === "C") {
      // Quiet Zone - bottom left
      x = paddingX + (num - 1) * blockWidth;
      y = paddingY + blockHeight * 4.5; 
    } else if (row === "D") {
      // Private Rooms - right side column
      x = paddingX + 9 * blockWidth; 
      y = paddingY + (num - 1) * (blockHeight * 1.5);
    } else {
      // Fallback
      x = paddingX + (num - 1) * blockWidth;
      y = paddingY + 6 * blockHeight;
    }

    return { x, y };
  };

  // Determine the bounding box to automatically size the SVG
  let maxX = 800;
  let maxY = 600;
  officeSeats.forEach(seat => {
    const { x, y } = getCoordinates(seat.seat_number);
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  });

  const svgWidth = Math.max(maxX + 200, 1100);
  const svgHeight = Math.max(maxY + 150, 700);

  return (
    <div className="w-full overflow-x-auto bg-gray-900/50 rounded-xl border border-gray-700 shadow-inner p-4 custom-scrollbar">
      <div className="min-w-[800px] relative">
        <svg 
          width="100%" 
          height="100%" 
          viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
          className="w-full h-auto drop-shadow-xl"
        >
          {/* Floor background */}
          <rect x="20" y="20" width={svgWidth - 40} height={svgHeight - 40} rx="20" fill="#1f2937" stroke="#374151" strokeWidth="4" />
          
          {/* Zone Backgrounds */}
          <rect x="40" y="40" width={svgWidth - 280} height={svgHeight * 0.45} rx="15" fill="#111827" opacity="0.5" />
          <text x="60" y="70" fill="#4b5563" fontSize="20" fontWeight="bold" letterSpacing="2">OPEN SPACE</text>

          <rect x="40" y={svgHeight * 0.55} width={svgWidth - 280} height={svgHeight * 0.35} rx="15" fill="#27272a" opacity="0.4" />
          <text x="60" y={svgHeight * 0.55 + 30} fill="#71717a" fontSize="20" fontWeight="bold" letterSpacing="2">QUIET ZONE</text>

          <rect x={svgWidth - 220} y="40" width="180" height={svgHeight - 80} rx="15" fill="#450a0a" opacity="0.3" />
          <text x={svgWidth - 200} y="70" fill="#991b1b" fontSize="20" fontWeight="bold" letterSpacing="2" writingMode="vertical-rl">PRIVATE ROOMS</text>

          {officeSeats.map((seat) => {
            const { x, y } = getCoordinates(seat.seat_number);
            const isSelected = selectedSeat === seat.id;
            const isUnavailable = !seat.is_available;
            const isInactive = !seat.is_active;

            let rectFill = "#374151"; // Default Gray
            let rectStroke = "#4b5563";
            let textColor = "#d1d5db";

            if (isInactive) {
              rectFill = "#111827";
              rectStroke = "#1f2937";
              textColor = "#4b5563";
            } else if (isUnavailable) {
              rectFill = "#7f1d1d"; // Dark Red
              rectStroke = "#991b1b";
              textColor = "#fca5a5";
            } else if (isSelected) {
              rectFill = "#059669"; // Emerald
              rectStroke = "#34d399";
              textColor = "#ffffff";
            } else {
              rectFill = "#1f2937"; // Available
              rectStroke = "#4b5563";
              textColor = "#e5e7eb";
            }

            return (
              <g 
                key={seat.id} 
                transform={`translate(${x}, ${y})`}
                onClick={() => {
                  if (seat.is_active && seat.is_available) {
                    onSelectSeat(seat.id);
                  }
                }}
                className={seat.is_active && seat.is_available ? "cursor-pointer" : "cursor-not-allowed"}
                style={{ transition: "all 0.3s ease" }}
              >
                <rect 
                  width="80" 
                  height="60" 
                  rx="8" 
                  fill={rectFill} 
                  stroke={isSelected ? "#34d399" : rectStroke} 
                  strokeWidth={isSelected ? "3" : "2"}
                  className={`transition-all duration-300 ${seat.is_active && seat.is_available && !isSelected ? "hover:fill-gray-600 hover:stroke-gray-400" : ""}`}
                />
                
                
                <text x="40" y="35" textAnchor="middle" fill={textColor} fontSize="22" fontWeight="bold" className="pointer-events-none">
                  {seat.seat_number}
                </text>

             
                <text x="40" y="50" textAnchor="middle" fill={textColor} opacity="0.6" fontSize="10" fontWeight="bold" className="pointer-events-none uppercase">
                  {seat.desk_type}
                </text>

               
                {seat.has_monitor && seat.is_active && (
                  <g transform="translate(60, -10)">
                    <rect width="20" height="20" rx="4" fill="#0f172a" stroke="#10b981" strokeWidth="1" />
                    <svg width="12" height="12" x="4" y="4" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                      <line x1="8" y1="21" x2="16" y2="21"></line>
                      <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                  </g>
                )}

               
                {isUnavailable && seat.is_active && (
                  <g transform="translate(10, -10)">
                     <rect width="60" height="20" rx="6" fill="#4c0519" stroke="#9f1239" strokeWidth="1" />
                     <text x="30" y="14" textAnchor="middle" fill="#fda4af" fontSize="10" fontWeight="bold">OCCUPIED</text>
                  </g>
                )}

               
                {isInactive && (
                  <g transform="translate(0, 20) rotate(-15)">
                     <rect width="80" height="20" rx="2" fill="#000000" opacity="0.8" />
                     <text x="40" y="14" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="black" letterSpacing="1">MAINTENANCE</text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
