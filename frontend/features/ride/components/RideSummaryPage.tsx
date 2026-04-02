import React, { useState, useEffect, useMemo } from "react";
import { 
  CheckCircle2, 
  MapPin, 
  Star, 
  CreditCard, 
  Banknote, 
  Wallet, 
  ChevronRight, 
  Tag, 
  ArrowRight,
  ShieldCheck,
  Clock,
  Navigation,
  Loader2,
  QrCode,
  IndianRupee,
  X,
  MessageCircle,
  ThumbsUp
} from "lucide-react";
import api from "@/lib/axios";
import toast from "react-hot-toast";

interface RideSummaryPageProps {
  user: any;
  activeRide: any;
  onComplete: (rating: number, feedback: string) => void;
  getRideSettlementAmount: (ride: any) => number;
  processPayment: (amount: number, rideId?: string, driverId?: string) => Promise<boolean>;
  promotions: any[];
  setActiveRide: (v: any) => void;
}

export function RideSummaryPage({
  user,
  activeRide,
  onComplete,
  getRideSettlementAmount,
  processPayment,
  promotions,
  setActiveRide
}: RideSummaryPageProps) {
  const [currentStep, setCurrentStep] = useState<"SUMMARY" | "RATING">("SUMMARY");
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isPaymentDone, setIsPaymentDone] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const shouldShowRating = !(activeRide?.type === "CARPOOL" || activeRide?.isSharedRide);
  const resolvedPaymentMethod = useMemo(() => {
    const currentUserId = String(user?.id || user?._id || "");
    const passengerEntry = Array.isArray(activeRide?.passengers)
      ? activeRide.passengers.find(
          (passenger: any) => String(passenger.userId?._id || passenger.userId || "") === currentUserId
        )
      : null;

    return passengerEntry?.paymentMethod || activeRide?.paymentMethod || "CASH";
  }, [activeRide, user?.id, user?._id]);

  // If already paid (WALLET or CASH), we mark it as done 
  useEffect(() => {
    if (resolvedPaymentMethod !== "UPI" || activeRide.paymentStatus === "COMPLETED") {
      setIsPaymentDone(true);
      return;
    }

    setIsPaymentDone(false);
  }, [activeRide?.paymentStatus, resolvedPaymentMethod]);

  const fare = getRideSettlementAmount(activeRide);

  const handleApplyPromo = async (code: string) => {
    if (!code) return;
    setIsProcessing(true);
    try {
      const { data } = await api.post("/rides/apply-promo", { 
        rideId: activeRide.rideId || activeRide._id, 
        code 
      });
      toast.success(data.message);
      const resp = await api.get("/rides/active");
      setActiveRide(resp.data);
      setPromoCodeInput("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Invalid promo code");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayment = async () => {
    const rId = activeRide.rideId || activeRide._id;
    const dId = activeRide.driverId?._id || activeRide.driverId;
    const success = await processPayment(fare, rId, dId);
    if (success) {
      setIsPaymentDone(true);
      if (shouldShowRating) {
        setCurrentStep("RATING");
      } else {
        onComplete(0, "");
      }
    }
  };

  const handleFinish = () => {
    onComplete(rating, feedback);
  };

  const handlePrimaryAction = () => {
    if (!isPaymentDone) {
      handlePayment();
      return;
    }

    if (shouldShowRating) {
      setCurrentStep("RATING");
      return;
    }

    onComplete(0, "");
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white overflow-y-auto selection:bg-[#FFD700]/30 selection:text-[#0A192F] animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto min-h-screen flex flex-col p-6 lg:p-12">
        
        {currentStep === "SUMMARY" ? (
          <div className="flex-1 flex flex-col animate-in slide-in-from-left-4 duration-500">
            {/* Header Section */}
            <div className="flex flex-col items-center justify-center text-center mb-12 space-y-4">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center border-4 border-emerald-100 shadow-xl shadow-emerald-500/10 mb-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-4xl lg:text-5xl font-black text-[#0A192F] tracking-tighter italic uppercase leading-none">
                  Trip <span className="text-[#FFD700]">Completed</span>
                </h1>
                <p className="text-slate-400 font-bold text-xs lg:text-sm uppercase tracking-[0.4em] mt-3">
                  Summary & Settlement
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 flex-1">
              {/* Left Column: Trip Details */}
              <div className="space-y-8">
                <div className="bg-slate-50/80 rounded-[40px] p-8 border border-slate-100 relative overflow-hidden group">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-[22px] overflow-hidden border-4 border-white shadow-lg bg-slate-100">
                      {(() => {
                        const rawPhoto = activeRide.driverInfo?.profilePhoto || activeRide.driverInfo?.photo;
                        const driverName = activeRide.driverInfo?.name || activeRide.driverName || "Driver";
                        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(driverName)}&background=0A192F&color=FFFFFF&bold=true`;
                        
                        return (
                          <img
                            src={rawPhoto || avatarUrl}
                            alt="Driver"
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = avatarUrl; }}
                          />
                        );
                      })()}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-[#0A192F] tracking-tight uppercase italic">{activeRide.driverInfo?.name || "Driver"}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-[#0A192F] text-[#FFD700] rounded-lg text-[10px] font-black uppercase">
                          <Star className="w-3 h-3 fill-[#FFD700]" />
                          {activeRide.driverInfo?.rating || "4.9"}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{activeRide.driverInfo?.vehicleModel || "Partner Vehicle"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 relative z-10">
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 bg-black rounded-full shadow-sm" />
                        <div className="w-0.5 h-10 bg-slate-200 my-1" />
                        <div className="w-3.5 h-3.5 bg-white border-[3px] border-black" />
                      </div>
                      <div className="flex-1 space-y-7">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Pick up</p>
                          <p className="text-[14px] font-bold text-[#0A192F] line-clamp-1">{activeRide.pickup?.label || "Trip Origin"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Drop off</p>
                          <p className="text-[14px] font-bold text-[#0A192F] line-clamp-1">{activeRide.destination?.label || activeRide.drop?.label || "Trip Destination"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Fare & Action */}
              <div className="space-y-8">
                <div className="bg-white rounded-[40px] p-8 border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.05)] space-y-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                    <IndianRupee className="w-3 h-3" />
                    Payment Breakdown
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                      <span>Base Fare</span>
                      <span className="text-[#0A192F]">₹{activeRide.originalPrice || activeRide.price || 0}</span>
                    </div>
                    {activeRide.promoCode && (
                      <div className="flex justify-between items-center text-emerald-500 bg-emerald-50 px-4 py-3 rounded-2xl border border-emerald-100">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          <span className="text-xs font-black uppercase tracking-tight">{activeRide.promoCode}</span>
                        </div>
                        <span className="font-bold text-sm">-₹{activeRide.discount || 0}</span>
                      </div>
                    )}
                    
                    <div className="pt-6 border-t border-slate-100 flex justify-between items-end">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount to Pay</p>
                        <div className={`p-2 rounded-xl text-[10px] font-black uppercase text-center w-max ${
                          resolvedPaymentMethod === 'UPI' ? 'bg-blue-50 text-blue-600' : 'bg-[#FEF3C7] text-[#0A192F]'
                        }`}>
                          via {resolvedPaymentMethod}
                        </div>
                      </div>
                      <span className="text-5xl font-black text-[#0A192F] tracking-tighter italic">₹{fare}</span>
                    </div>
                  </div>

                  {!activeRide.promoCode && (
                    <div className="pt-6 border-t border-slate-100 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Offers</p>
                        {promotions && promotions.length > 0 && (
                          <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md">{promotions.length} Active</span>
                        )}
                      </div>
                      
                      {/* Available Promotions List */}
                      {promotions && promotions.length > 0 && (
                        <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                          {promotions.map((promo, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleApplyPromo(promo.code)}
                              disabled={isProcessing}
                              className="w-full flex items-center justify-between p-3 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 transition-colors group text-left shrink-0 disabled:opacity-50"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                  <Tag className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-[#0A192F] uppercase tracking-wider">{promo.code}</p>
                                  <p className="text-[10px] font-bold text-slate-500 truncate mt-0.5">
                                    {promo.type === 'PERCENTAGE' ? `${promo.value}% OFF on this ride` : `Flat ₹${promo.value} OFF`}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[10px] font-black uppercase text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white px-3 py-1.5 rounded-lg transition-colors">
                                Apply
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 pt-1">
                        <div className="flex-1 flex items-center bg-slate-50 border border-slate-100 rounded-2xl px-4 py-1 transition-colors focus-within:border-slate-300">
                          <input 
                            type="text" 
                            placeholder="HAVE A CUSTOM CODE?"
                            className="bg-transparent border-none outline-none text-[11px] font-black uppercase text-[#0A192F] w-full"
                            value={promoCodeInput}
                            onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                          />
                        </div>
                        <button 
                          onClick={() => handleApplyPromo(promoCodeInput)}
                          disabled={isProcessing || !promoCodeInput.trim()}
                          className="h-11 px-6 bg-[#0A192F] text-[#FFD700] rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-black transition-colors"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <button 
                  onClick={handlePrimaryAction}
                  disabled={isProcessing}
                  className="w-full py-6 bg-[#0A192F] hover:bg-black text-[#FFD700] rounded-[32px] font-black text-[15px] uppercase tracking-[0.2em] transition-all shadow-2xl flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-95"
                >
                  {isProcessing && <Loader2 className="w-5 h-5 animate-spin" />}
                  {isPaymentDone ? (
                    <>
                      <span>{shouldShowRating ? "Go to Feedback" : "Complete & Close"}</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  ) : (
                    <>
                      <QrCode className="w-5 h-5" />
                      <span>Complete Payment</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full animate-in zoom-in-95 duration-500">
            <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.08)] w-full flex flex-col items-center text-center space-y-8">
              <div className="space-y-2">
                <div className="inline-flex items-center bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100 mb-2">
                  <ThumbsUp className="w-3.5 h-3.5 text-amber-500 mr-1.5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Rate your driver</span>
                </div>
                <h3 className="text-2xl font-black text-[#0A192F] tracking-tight leading-tight">
                  How was your <br/> <span className="text-[#FFD700]">Experience?</span>
                </h3>
              </div>

              <div className="flex justify-center gap-2.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`group transition-all duration-300 transform p-1.5 rounded-2xl ${star <= rating ? 'bg-amber-50 scale-110 shadow-sm' : 'hover:scale-105 active:scale-95 grayscale opacity-30 hover:opacity-100 hover:bg-slate-50'}`}
                  >
                    <Star 
                      className={`w-9 h-9 transition-all duration-500 ${star <= rating ? 'fill-[#FFD700] text-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.6)]' : 'text-slate-300'}`}
                      strokeWidth={2.5}
                    />
                  </button>
                ))}
              </div>

              <div className="w-full space-y-2.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">Would you like to share more?</p>
                <textarea 
                  placeholder="Leave a comment (optional)"
                  className="w-full h-24 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[#0A192F] text-sm outline-none focus:border-[#FFD700] transition-all placeholder:text-slate-400 resize-none shadow-inner"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>

              <div className="w-full flex flex-col gap-3">
                <button 
                   onClick={handleFinish}
                   disabled={rating === 0 || isProcessing}
                   className="w-full py-4 bg-[#0A192F] text-[#FFD700] rounded-2xl font-black text-sm uppercase tracking-wide shadow-lg transition-all hover:bg-black hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Complete & Close"}
                </button>
                
                <button 
                  onClick={() => setCurrentStep("SUMMARY")}
                  className="text-slate-400 font-bold text-xs hover:text-[#0A192F] transition-colors"
                >
                  Back to Summary
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Support & Security Badge - Fixed to bottom */}
        {currentStep === "SUMMARY" && (
          <div className="mt-12 flex flex-col items-center gap-8 border-t border-slate-100 pt-8">
            <div className="flex gap-8 items-center text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Secured Settlement
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Receipt Emailed
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
