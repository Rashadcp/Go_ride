import { Car, User } from "lucide-react";
import { useState } from "react";

export function CarSeatSelector({ seats = [], onSelectSeats }: { seats?: any[], onSelectSeats?: (seats: any[]) => void }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const getDisplaySeats = () => {
    return seats && seats.length > 0 ? seats : [
      { seatId: 'FRONT_PASSENGER', type: 'FL', status: 'AVAILABLE' },
      { seatId: 'BACK_LEFT', type: 'BL', status: 'AVAILABLE' },
      { seatId: 'BACK_MIDDLE', type: 'BM', status: 'AVAILABLE' },
      { seatId: 'BACK_RIGHT', type: 'BR', status: 'AVAILABLE' },
    ];
  };

  const displaySeats = getDisplaySeats();

  const handleSelect = (seat: any) => {
    if (seat.status !== 'AVAILABLE') return;
    
    let newSelected: string[];
    if (selectedIds.includes(seat.seatId)) {
       newSelected = selectedIds.filter(id => id !== seat.seatId);
    } else {
       newSelected = [...selectedIds, seat.seatId];
    }
    setSelectedIds(newSelected);
    
    if (onSelectSeats) {
        const selectedSeatObjects = newSelected.map(id => displaySeats.find(s => s.seatId === id));
        onSelectSeats(selectedSeatObjects);
    }
  };

  const renderSeat = (seatId: string) => {
    const seat = displaySeats.find(s => s.seatId === seatId);
    if (!seat) return <div className="w-12 h-12 sm:w-14 sm:h-14 opacity-0 flex-shrink-0" />; 

    let bgClass = "bg-gradient-to-b from-slate-200 to-slate-300 border-b-4 border-slate-400 text-slate-500 shadow-[0_5px_15px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.2)] hover:-translate-y-1";
    if (seat.status === 'BOOKED' || seat.status === 'LOCKED') bgClass = "bg-gradient-to-b from-rose-200 to-rose-300 border-b-4 border-rose-400 text-rose-500 cursor-not-allowed opacity-70 shadow-inner";
    if (selectedIds.includes(seat.seatId)) bgClass = "bg-gradient-to-b from-emerald-400 to-emerald-500 border-b-4 border-emerald-600 text-white shadow-[0_8px_20px_rgba(16,185,129,0.4)] -translate-y-1 ring-2 ring-emerald-300/50";

    return (
      <button 
        key={seatId}
        onClick={(e) => { e.stopPropagation(); handleSelect(seat); }}
        disabled={seat.status !== 'AVAILABLE'}
        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl sm:rounded-[20px] flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden group flex-shrink-0 ${bgClass}`}
      >
        <div className="absolute inset-x-2 top-0 h-1/2 bg-white/20 rounded-b-[10px]" />
        <User className={`w-5 h-5 sm:w-6 sm:h-6 relative z-10 ${selectedIds.includes(seat.seatId) ? 'text-white drop-shadow-md' : 'opacity-70'}`} />
        <span className="text-[8px] sm:text-[9px] font-black mt-0.5 uppercase tracking-widest relative z-10 opacity-80">{seat.type}</span>
      </button>
    );
  };

  const isBike = displaySeats.length === 1 && displaySeats[0].seatId === 'PILLION';

  if (isBike) {
    return (
      <div className="bg-slate-50/50 p-4 sm:p-6 rounded-3xl border border-slate-100 max-w-xs mx-auto my-4 w-full relative group shadow-inner">
          <div className="absolute inset-0 bg-white/40 ring-1 ring-inset ring-slate-100 rounded-3xl group-hover:bg-slate-50 transition-colors" />
          <div className="relative flex flex-col items-center justify-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-slate-700 to-slate-800 flex flex-col items-center justify-center shadow-[0_5px_15px_rgba(0,0,0,0.3)] border-b-4 border-slate-900 relative">
                 <div className="absolute inset-x-2 top-0 h-1/2 bg-white/5 rounded-b-[10px]" />
                 <span className="text-[10px] text-white font-black opacity-60 tracking-widest relative z-10">DRIVER</span>
              </div>
              {renderSeat('PILLION')}
          </div>
      </div>
    );
  }

  const hasMiddleRow = displaySeats.some(s => s.seatId === 'MIDDLE_LEFT' || s.seatId === 'MIDDLE_RIGHT');

  return (
    <div className="w-full flex flex-col items-center justify-center overflow-visible">
      {/* 3D Car Outline */}
      <div className="w-[280px] sm:w-[320px] bg-slate-900 rounded-[60px] p-4 relative shadow-[0_30px_60px_rgba(0,0,0,0.4),inset_0_8px_20px_rgba(255,255,255,0.05)] border-[6px] border-slate-800">
        
        {/* Windshield */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[85%] h-14 bg-gradient-to-b from-cyan-900/40 to-transparent rounded-t-[50px] pointer-events-none" />

        {/* Dashboard Structure */}
        <div className="w-full h-16 bg-slate-800 rounded-t-[40px] mb-8 relative border-b-4 border-slate-950 shadow-[inset_0_-5px_15px_rgba(0,0,0,0.5)]">
           {/* Right-hand side Steering Wheel (India/UK) */}
           <div className="absolute right-6 bottom-[-14px] w-14 h-14 sm:w-16 sm:h-16 rounded-full border-[5px] sm:border-[6px] border-slate-700 shadow-[0_8px_15px_rgba(0,0,0,0.6)] flex items-center justify-center z-20 overflow-hidden bg-slate-800/80">
               {/* inner rim */}
               <div className="absolute inset-1 rounded-full border-2 border-slate-600 opacity-50" />
               <div className="w-2 h-2 rounded-full bg-slate-500 shadow-inner z-10" />
               <div className="absolute w-full h-[4px] bg-slate-700 top-1/2 -translate-y-1/2" />
               <div className="absolute w-[4px] h-1/2 bg-slate-700 bottom-0 left-1/2 -translate-x-1/2" />
           </div>
        </div>

        {/* Interior Floor */}
        <div className="bg-slate-800/90 rounded-[40px] px-3 sm:px-4 py-8 shadow-[inset_0_10px_30px_rgba(0,0,0,0.6)] relative border border-slate-700">
            
            {/* Center Console */}
            <div className="absolute left-1/2 -translate-x-1/2 top-4 bottom-4 w-10 sm:w-12 bg-slate-900 rounded-full shadow-[inset_0_4px_15px_rgba(0,0,0,0.6)] border-[2px] border-slate-800 flex flex-col items-center py-6 gap-6 z-0">
                <div className="w-5 sm:w-6 h-8 sm:h-10 bg-slate-800 rounded-full shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] border border-slate-700" />
                <div className="w-4 h-4 bg-slate-800 rounded-full shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] border border-slate-700" />
            </div>

            {/* ROW 1: Front Seats (Left Passenger, Right Driver) */}
            <div className="flex justify-between items-center mb-10 w-full relative z-10 px-1 sm:px-2">
              {/* Front Left Passenger Seat */}
              {renderSeat('FRONT_PASSENGER')}
              
              {/* Driver Seat (Right Side) */}
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl sm:rounded-[20px] bg-gradient-to-b from-slate-700 to-slate-800 flex flex-col items-center justify-center shadow-[0_5px_15px_rgba(0,0,0,0.3)] border-b-4 border-slate-900 relative flex-shrink-0">
                <div className="absolute inset-x-2 top-0 h-1/2 bg-white/5 rounded-b-[10px]" />
                <User className="w-5 h-5 sm:w-6 sm:h-6 relative z-10 text-slate-500 opacity-60 mb-0.5" />
                <span className="text-[8px] text-slate-400 font-black opacity-60 tracking-widest relative z-10">DRIVER</span>
              </div>
            </div>

            {/* ROW 2: Middle */}
            {hasMiddleRow && (
              <div className="flex justify-between items-center w-full mb-10 relative z-10 px-1 sm:px-2">
                {renderSeat('MIDDLE_LEFT')}
                {renderSeat('MIDDLE_RIGHT')}
              </div>
            )}

            {/* ROW 3: Rear Seats */}
            <div className="flex justify-between items-center w-full relative z-10">
              {renderSeat('BACK_LEFT')}
              {renderSeat('BACK_MIDDLE')}
              {renderSeat('BACK_RIGHT')}
            </div>

        </div>
      </div>

      <div className="mt-8 flex justify-center gap-4 sm:gap-6 px-4 bg-white py-3 rounded-full shadow-sm border border-slate-100">
         <div className="flex items-center gap-2"><div className="w-4 h-4 bg-gradient-to-b from-slate-200 to-slate-300 border border-slate-400 rounded-md" /> <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500">Available</span></div>
         <div className="flex items-center gap-2"><div className="w-4 h-4 bg-gradient-to-b from-rose-200 to-rose-300 border border-rose-400 rounded-md" /> <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500">Booked</span></div>
         <div className="flex items-center gap-2"><div className="w-4 h-4 bg-gradient-to-b from-emerald-400 to-emerald-500 border border-emerald-600 rounded-md shadow-sm" /> <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-600">Selected</span></div>
      </div>
    </div>
  );
}
