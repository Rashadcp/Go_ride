import { Car, User } from "lucide-react";
import { useState } from "react";

export function CarSeatSelector({ seats = [], onSelectSeat }: { seats: any[], onSelectSeat: (s: any) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (seat: any) => {
    if (seat.status !== 'AVAILABLE') return;
    setSelectedId(seat.seatId);
    onSelectSeat(seat);
  };

  const renderSeat = (seatId: string) => {
    const seat = seats.find(s => s.seatId === seatId);
    if (!seat) return null; // e.g., Driver seat representation

    let bgClass = "bg-white border-slate-300 hover:border-emerald-500 cursor-pointer text-slate-400 hover:text-emerald-500";
    if (seat.status === 'BOOKED') bgClass = "bg-red-50 border-red-200 cursor-not-allowed opacity-60 text-red-300";
    if (seat.status === 'LOCKED') bgClass = "bg-amber-50 border-amber-200 cursor-not-allowed text-amber-300";
    if (selectedId === seatId) bgClass = "bg-emerald-500 text-white border-emerald-600 shadow-md";

    return (
      <button 
        key={seatId}
        onClick={(e) => { e.stopPropagation(); handleSelect(seat); }}
        disabled={seat.status !== 'AVAILABLE'}
        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${bgClass}`}
      >
        <User className={`w-5 h-5 sm:w-6 sm:h-6 ${selectedId === seatId ? 'text-white' : ''}`} />
        <span className="text-[8px] sm:text-[9px] font-black mt-0.5 sm:mt-1 uppercase tracking-widest">{seat.type}</span>
      </button>
    );
  };

  if (!seats || seats.length === 0) {
    return (
      <div className="p-4 text-center text-slate-500 text-sm font-semibold">
        No seat mapping available for this vehicle.
      </div>
    );
  }

  const isBike = seats.length === 1;

  if (isBike) {
    return (
      <div className="bg-slate-50/50 p-4 sm:p-6 rounded-3xl border border-slate-100 max-w-xs mx-auto my-4 w-full relative group">
          <div className="absolute inset-0 bg-white/40 ring-1 ring-inset ring-slate-100 rounded-3xl group-hover:bg-slate-50 transition-colors" />
          <div className="relative flex flex-col items-center justify-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 flex flex-col items-center justify-center shadow-inner relative border-2 border-slate-900">
                 <div className="w-8 h-1.5 bg-slate-500 absolute top-[-6px] rounded-full" /> 
                 <span className="text-[10px] text-white font-black opacity-80 tracking-widest">DRIVER</span>
              </div>
              {renderSeat('PILLION')}
          </div>
      </div>
    );
  }

  const hasMiddleRow = seats.some(s => s.seatId === 'MIDDLE_LEFT' || s.seatId === 'MIDDLE_RIGHT');

  return (
    <div className="w-full">
      {/* Visual Car Boundary outline */}
      <div className="border-[3px] border-slate-200 rounded-[40px] p-5 sm:p-6 bg-white relative max-w-[280px] sm:max-w-xs mx-auto shadow-sm">
        
        {/* ROW 1: Front Seats */}
        <div className="flex justify-between items-center mb-6 sm:mb-8 w-full px-1 sm:px-2 relative z-10">
          {/* Driver Seat */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-slate-800 flex flex-col items-center justify-center shadow-inner relative border-2 border-slate-900 pointer-events-none">
             <div className="w-6 h-[3px] bg-slate-400 absolute top-[-6px] rounded-full" />
             <span className="text-[9px] text-white font-black opacity-80 tracking-widest">DRIVER</span>
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 sm:w-8 h-10 sm:h-12 bg-slate-100 rounded-lg border border-slate-200 shadow-inner" />

          {/* Front Passenger Seat */}
          {renderSeat('FRONT_PASSENGER')}
        </div>

        {/* ROW 2: Middle (For XL) */}
        {hasMiddleRow && (
          <div className="flex justify-between items-center w-full gap-2 mb-6 sm:mb-8 px-1 sm:px-2 relative z-10">
             {renderSeat('MIDDLE_LEFT')}
             {renderSeat('MIDDLE_RIGHT')}
          </div>
        )}

        {/* ROW 3: Rear Seats (3 across) */}
        <div className={`flex justify-between items-center w-full gap-1.5 sm:gap-2 px-1 sm:px-2 relative z-10 ${!hasMiddleRow ? 'mt-8 sm:mt-10' : ''}`}>
           {renderSeat('BACK_LEFT')}
           {renderSeat('BACK_MIDDLE')}
           {renderSeat('BACK_RIGHT')}
        </div>

      </div>

      <div className="mt-5 flex justify-center gap-4 sm:gap-6 px-2 scale-90 opacity-80">
         <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-white border-2 border-slate-300 rounded-[4px]" /> <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Available</span></div>
         <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-100 border-2 border-red-200 rounded-[4px]" /> <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Booked</span></div>
         <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-500 rounded-[4px] shadow-sm" /> <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600">Selected</span></div>
      </div>
    </div>
  );
}
