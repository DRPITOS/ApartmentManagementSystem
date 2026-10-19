import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar.js';
import { BottomNav } from './BottomNav.js';
import { CreateApartmentModal } from './CreateApartmentModal.js';
import { useApartment } from '../contexts/ApartmentContext.js';
import { Building2, PlusCircle } from 'lucide-react';
import { DashboardSkeleton } from './Skeleton.js';

export const Layout: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { apartments, isLoading, isInitialized } = useApartment();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Navbar */}
      <Navbar onOpenCreateApartmentModal={() => setIsCreateModalOpen(true)} />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
        {(isLoading || !isInitialized) && apartments.length === 0 ? (
          /* Skeleton Loading during initial load to prevent empty flash */
          <DashboardSkeleton />
        ) : isInitialized && !isLoading && apartments.length === 0 ? (
          /* Actual Empty State: only when confirmed empty */
          <div className="bg-white rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto my-12 border border-slate-200 shadow-sm">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Building2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">
              ยินดีต้อนรับสู่ระบบบริหารหอพัก
            </h2>
            <p className="text-base sm:text-lg text-slate-600 mb-8 leading-relaxed">
              คุณยังไม่มีโครงการหอพักในระบบ เริ่มต้นสร้างหอพักแรกของคุณ
              เพื่อกำหนดราคาค่าน้ำ ค่าไฟ และเพิ่มห้องพักได้เลย
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-indigo-600 text-white font-bold text-lg hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all hover:scale-102"
            >
              <PlusCircle className="w-6 h-6" />
              <span>สร้างหอพักแรกของคุณ</span>
            </button>
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      {/* Mobile Sticky Bottom Navigation */}
      <BottomNav />

      {/* Modal to create new apartment */}
      <CreateApartmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};
