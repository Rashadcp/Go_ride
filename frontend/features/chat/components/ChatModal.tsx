import React, { useState, useEffect, useRef } from "react";
import { X, Send, User, MessageCircle, MoreVertical, ShieldCheck, Clock } from "lucide-react";
import { socket } from "@/lib/socket";
import { useRideStore } from "@/features/ride/store/useRideStore";

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  message: string;
  timestamp: string;
  isSelf: boolean;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  rideId: string;
  userId: string;
  receiverId: string;
  receiverName: string;
  senderName: string;
}

export const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose, rideId, userId, receiverId, receiverName, senderName }) => {
  const { chatHistory, addChatMessage, clearUnreadCount } = useRideStore();
  const [inputText, setInputText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const conversationKey = `${rideId}_${[userId, receiverId].sort().join("_")}`;
  const messages = chatHistory[conversationKey] || [];

  useEffect(() => {
    if (!isOpen) return;

    // Clear unread count when opening
    clearUnreadCount(conversationKey);

    // Smooth scroll to bottom on open
    setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'instant' });
    }, 100);
  }, [isOpen, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const payload = {
      rideId,
      senderId: userId,
      receiverId,
      senderName: senderName,
      message: inputText.trim(),
    };

    socket.emit("chat:message", payload);
    
    addChatMessage(conversationKey, { 
        ...payload, 
        id: Date.now().toString(), 
        timestamp: new Date().toISOString(), 
        isSelf: true 
    });
    setInputText("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center pointer-events-auto">
      <div 
        className="absolute inset-0 bg-[#0A192F]/60 backdrop-blur-md animate-fade-in pointer-events-auto" 
        onClick={onClose} 
      />
      
      <div className="relative w-full sm:max-w-[420px] h-[75vh] sm:h-[620px] bg-white sm:rounded-[40px] rounded-t-[40px] shadow-[0_45px_120px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden animate-slide-up pointer-events-auto border border-white/20">
        
        {/* Header - Premium Navigation Feel */}
        <div className="px-6 py-5 bg-[#0A192F] text-white flex items-center justify-between shadow-lg relative shrink-0">
           <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
           <div className="flex items-center gap-4 relative z-10">
              <div className="relative">
                 <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 overflow-hidden shadow-sm">
                    <User className="w-6 h-6 text-[#FFD700]" />
                 </div>
                 <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#0A192F] rounded-full shadow-md" />
              </div>
              <div className="flex flex-col">
                 <h4 className="font-black text-base tracking-tight leading-none uppercase italic">{receiverName}</h4>
                 <p className="text-[9px] font-black text-[#FFD700] uppercase tracking-widest mt-1.5 flex items-center gap-1.5 opacity-80">
                    <ShieldCheck className="w-3 h-3" /> VERIFIED DRIVER
                 </p>
              </div>
           </div>
           
           <div className="flex items-center gap-2 relative z-10">
              <button className="p-2.5 hover:bg-white/10 rounded-full transition-colors opacity-60">
                 <MoreVertical className="w-5 h-5" />
              </button>
              <button 
                onClick={onClose}
                className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-all active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
           </div>
        </div>

        {/* Chat History Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar bg-slate-50/50"
        >
          {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40 px-10">
                 <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="w-10 h-10 text-[#0A192F]" />
                 </div>
                 <p className="text-[13px] font-black text-[#0A192F] uppercase tracking-widest leading-relaxed">No messages yet. Say hi to your companion!</p>
              </div>
          )}

          {messages.map((msg, idx) => (
            <div 
              key={msg.id || idx} 
              className={`flex flex-col ${msg.isSelf ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              <div className={`max-w-[85%] px-5 py-3.5 rounded-[22px] text-sm shadow-sm ${
                msg.isSelf 
                  ? 'bg-[#0A192F] text-white rounded-br-none' 
                  : 'bg-white text-[#0A192F] border border-slate-100 rounded-bl-none'
              }`}>
                <p className="font-bold leading-relaxed">{msg.message}</p>
              </div>
              <div className={`flex items-center gap-1.5 mt-2 px-1 opacity-40 ${msg.isSelf ? 'flex-row-reverse' : ''}`}>
                 <Clock className="w-2.5 h-2.5" />
                 <span className="text-[9px] font-black uppercase tracking-tighter">
                   {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                 </span>
              </div>
            </div>
          ))}
        </div>

        {/* Improved Message Input Area */}
        <div className="px-6 py-6 bg-white border-t border-slate-100 relative shrink-0">
           <div className="flex items-center gap-3 relative">
              <input
                type="text"
                placeholder="Type your message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                className="flex-1 h-[56px] bg-slate-100/80 rounded-2xl px-6 font-bold text-sm text-[#0A192F] outline-none ring-2 ring-transparent focus:ring-[#FFD700]/30 focus:bg-white transition-all placeholder:text-slate-400"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                className="w-[56px] h-[56px] bg-[#0A192F] text-[#FFD700] rounded-2xl flex items-center justify-center shadow-lg shadow-[#0A192F]/20 active:scale-90 disabled:opacity-30 disabled:grayscale transition-all"
              >
                <Send className="w-6 h-6 rotate-45 mr-1 mb-0.5" />
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
