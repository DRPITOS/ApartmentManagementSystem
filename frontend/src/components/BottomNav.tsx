import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Gauge, Zap, DoorClosed, Building2 } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const location = useLocation();

  const links = [
    { to: '/', label: 'ภาพรวม', icon: Gauge },
    { to: '/meters', label: 'จดมิเตอร์', icon: Zap },
    { to: '/rooms', label: 'ห้องพัก', icon: DoorClosed },
    { to: '/apartments', label: 'หอพัก', icon: Building2 },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg px-2 py-1 safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-colors ${
                isActive
                  ? 'text-indigo-600 font-bold'
                  : 'text-slate-600 font-medium hover:text-slate-900'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-all ${
                  isActive ? 'bg-indigo-50 scale-110' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-sm mt-0.5 tracking-tight">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
