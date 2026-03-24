import { User as UserProfile, Camera, MapPin, Home, Briefcase, Trash2, Lock } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useState, useEffect } from 'react';

interface SettingsTabProps {
  user: any;
  handleUpdateImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUpdatingProfile: boolean;
  profileData: { firstName: string; lastName: string };
  setProfileData: (v: { firstName: string; lastName: string }) => void;
  handleUpdateProfile: () => void;
  isAddingAddress: boolean;
  setIsAddingAddress: (v: boolean) => void;
  addressFormData: { label: string; address: string };
  setAddressFormData: (v: { label: string; address: string }) => void;
  handleAddAddress: () => void;
  handleDeleteAddress: (idx: number) => void;
  securityData: any;
  setSecurityData: (v: any) => void;
  handleChangePassword: () => void;
}

export function SettingsTab(props: SettingsTabProps) {
  const {
    user,
    handleUpdateImage,
    isUpdatingProfile,
    profileData,
    setProfileData,
    handleUpdateProfile,
    isAddingAddress,
    setIsAddingAddress,
    addressFormData,
    setAddressFormData,
    handleAddAddress,
    handleDeleteAddress,
    securityData,
    setSecurityData,
    handleChangePassword
  } = props;

  return (
    <div className="flex-1 bg-slate-50 p-12 overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-black text-[#0A192F] mb-12 tracking-tight">Account Settings</h1>
        <div className="bg-white rounded-[40px] shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-10 border-b border-slate-100 flex items-center gap-10">
            <div className="relative group/photo">
              <div className="w-32 h-32 rounded-[40px] bg-[#0A192F] overflow-hidden border-4 border-[#FFD700]/10 shadow-2xl relative">
                {user?.profilePhoto ? (
                  <Image src={user.profilePhoto} alt="Profile" width={128} height={128} className="object-cover" unoptimized={true} />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-white">
                    <UserProfile className="w-12 h-12 opacity-30" />
                  </div>
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#FFD700] text-[#0A192F] rounded-2xl flex items-center justify-center shadow-xl cursor-pointer hover:bg-[#E6C200] transition-all transform hover:scale-110 border-4 border-white">
                <Camera className="w-5 h-5" />
                <input type="file" className="hidden" accept="image/*" onChange={handleUpdateImage} />
              </label>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-black text-[#0A192F] mb-1">{user?.name}</h2>
              <p className="text-slate-400 font-bold mb-4">{user?.email}</p>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0A192F]/5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-black uppercase text-[#0A192F] tracking-widest">{user?.role} ACCOUNT</span>
              </div>
            </div>
          </div>
          
          <div className="p-10 space-y-10">
            <div className="grid grid-cols-2 gap-8">
              <Input label="First Name" value={profileData.firstName} onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })} />
              <Input label="Last Name" value={profileData.lastName} onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })} />
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={handleUpdateProfile} loading={isUpdatingProfile}>Save Name Changes</Button>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black text-[#0A192F] uppercase tracking-widest">Registered Addresses</h3>
                {!isAddingAddress && (
                  <Button size="sm" variant="ghost" className="!h-auto !p-0 text-[#FFD700]" onClick={() => setIsAddingAddress(true)}>+ Add New</Button>
                )}
              </div>
              
              {isAddingAddress && (
                <div className="p-8 bg-slate-50 rounded-[32px] border-2 border-[#FFD700]/20 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Label</label>
                      <select className="w-full h-14 px-5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-[#0A192F]" value={addressFormData.label} onChange={(e) => setAddressFormData({ ...addressFormData, label: e.target.value })}>
                        <option value="Home">Home</option>
                        <option value="Office">Office</option>
                        <option value="Gym">Gym</option>
                        <option value="Friend">Friend</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <Input label="Complete Address" placeholder="Street, City, Building..." value={addressFormData.address} onChange={(e) => setAddressFormData({ ...addressFormData, address: e.target.value })} />
                  </div>
                  <div className="flex justify-end gap-4">
                    <Button variant="secondary" size="md" onClick={() => setIsAddingAddress(false)}>Cancel</Button>
                    <Button variant="primary" size="md" onClick={handleAddAddress} loading={isUpdatingProfile}>Save Location</Button>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-6">
                {(user?.addresses || []).map((addr: any, idx: number) => (
                  <div key={idx} className="p-6 bg-slate-50 rounded-3xl border-2 border-[#FFD700]/10 flex flex-col gap-3 group relative">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 bg-[#0A192F] text-[#FFD700] rounded-xl flex items-center justify-center shadow-lg">
                        {addr.label === 'Home' ? <Home className="w-5 h-5" /> : addr.label === 'Office' ? <Briefcase className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteAddress(idx); }} className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 rounded-lg">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs font-bold text-[#0A192F] leading-relaxed">{addr.address}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="pt-8 border-t border-slate-100 space-y-6">
              <h3 className="text-xs font-black text-[#0A192F] uppercase tracking-widest px-1">Security & Password</h3>
              <div className="grid grid-cols-3 gap-6 items-end">
                <Input type="password" label="Current Password" placeholder="********" leftIcon={<Lock className="w-4 h-4" />} value={securityData.oldPassword} onChange={(e) => setSecurityData({ ...securityData, oldPassword: e.target.value })} />
                <Input type="password" label="New Password" placeholder="********" leftIcon={<Lock className="w-4 h-4" />} value={securityData.newPassword} onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })} />
                <Input type="password" label="Confirm New" placeholder="********" leftIcon={<Lock className="w-4 h-4" />} value={securityData.confirmPassword} onChange={(e) => setSecurityData({ ...securityData, confirmPassword: e.target.value })} />
              </div>
              <div className="flex justify-end">
                <Button variant="primary" onClick={handleChangePassword} loading={isUpdatingProfile} className="!px-12">
                  Update Password
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
