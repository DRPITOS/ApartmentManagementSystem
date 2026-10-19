import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Building2,
  Gauge,
  Zap,
  DoorClosed,
  Settings2,
  LogOut,
  User,
  Plus,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';
import { useApartment } from '../contexts/ApartmentContext.js';

interface NavbarProps {
  onOpenCreateApartmentModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCreateApartmentModal }) => {
  const { owner, logout } = useAuth();
  const { apartments, selectedApartment, setSelectedApartment } = useApartment();
  const location = useLocation();

  const navLinks = [
    { to: '/', label: 'ภาพรวม', icon: Gauge },
    { to: '/meters', label: 'จดมิเตอร์', icon: Zap },
    { to: '/rooms', label: 'ห้องพัก', icon: DoorClosed },
    { to: '/apartments', label: 'ตั้งค่าหอพัก', icon: Settings2 },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-18 py-2 gap-2 sm:gap-4">
          {/* Logo & Apartment Switcher */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link to="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100 group-hover:scale-105 transition-transform shrink-0">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="hidden sm:block text-left">
                <span className="block text-lg sm:text-xl font-bold text-slate-900 leading-tight whitespace-nowrap">
                  Apartment System
                </span>
                <span className="block text-xs sm:text-sm font-medium text-indigo-600 whitespace-nowrap">
                  ระบบบริหารหอพัก & มิเตอร์น้ำไฟ
                </span>
              </div>
            </Link>

            {/* Apartment Selector Dropdown */}
            {apartments.length > 0 && (
              <div className="relative flex items-center">
                <div className="flex items-center bg-indigo-50/80 border border-indigo-200 rounded-2xl px-2.5 py-1.5 sm:px-3.5 sm:py-2">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-700 mr-1.5 shrink-0" />
                  <select
                    className="bg-transparent text-sm sm:text-base lg:text-lg font-bold text-indigo-950 focus:outline-none cursor-pointer max-w-[130px] sm:max-w-[180px] md:max-w-[220px] truncate"
                    value={selectedApartment?.id || ''}
                    onChange={(e) => {
                      const found = apartments.find((a) => a.id === e.target.value);
                      if (found) setSelectedApartment(found);
                    }}
                  >
                    {apartments.map((apt) => (
                      <option key={apt.id} value={apt.id}>
                        {apt.name} {apt.nickname ? `(${apt.nickname})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <button
              onClick={onOpenCreateApartmentModal}
              className="hidden xl:flex items-center gap-1.5 text-sm sm:text-base font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-xl transition-colors whitespace-nowrap"
              title="เพิ่มหอพักใหม่"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มหอพัก</span>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold text-base transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm sm:text-base font-bold text-slate-800 flex items-center justify-end gap-1 whitespace-nowrap">
                <User className="w-4 h-4 text-slate-400 shrink-0" />
                {owner?.name || 'เจ้าของหอพัก'}
              </span>
              <span className="text-xs text-slate-500 max-w-[160px] truncate">{owner?.email}</span>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-semibold text-sm sm:text-base transition-colors shrink-0"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="hidden sm:inline">ออก</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
