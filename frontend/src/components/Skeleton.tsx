import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200/80 rounded-xl ${className}`} />
);

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    {/* Header Banner Skeleton */}
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-3 flex-1">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-72 rounded-lg" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-8 w-32 rounded-xl" />
          <Skeleton className="h-8 w-36 rounded-xl" />
          <Skeleton className="h-8 w-28 rounded-xl" />
        </div>
      </div>
      <Skeleton className="h-14 w-full md:w-64 rounded-2xl" />
    </div>

    {/* 4 KPI Cards Skeleton */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-24 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-2xl" />
          </div>
          <Skeleton className="h-9 w-32 rounded-xl" />
          <Skeleton className="h-4 w-28 rounded-md" />
        </div>
      ))}
    </div>

    {/* Quick Action Skeleton */}
    <div className="bg-slate-200/60 rounded-3xl p-6 sm:p-8 h-28" />

    {/* Table Skeleton */}
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <Skeleton className="h-7 w-48 rounded-lg" />
        <Skeleton className="h-6 w-32 rounded-lg" />
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-none">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-2xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-4 w-32 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-6 w-20 rounded-md hidden sm:block" />
          <Skeleton className="h-6 w-24 rounded-md hidden md:block" />
          <Skeleton className="h-6 w-24 rounded-md hidden md:block" />
          <Skeleton className="h-7 w-20 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
      ))}
    </div>
  </div>
);

export const RoomGridSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    {/* Header Skeleton */}
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-44 rounded-xl" />
        <Skeleton className="h-4 w-64 rounded-md" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-12 w-36 rounded-2xl" />
        <Skeleton className="h-12 w-40 rounded-2xl" />
      </div>
    </div>

    {/* Filter bar Skeleton */}
    <div className="bg-white rounded-2xl p-4 border border-slate-200 flex justify-between gap-3">
      <Skeleton className="h-11 w-72 rounded-xl" />
      <Skeleton className="h-11 w-40 rounded-xl" />
    </div>

    {/* Cards Grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-2xl" />
              <div className="space-y-1">
                <Skeleton className="h-6 w-20 rounded-md" />
                <Skeleton className="h-4 w-12 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Skeleton className="h-9 w-20 rounded-xl" />
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const MeterReadingSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 flex flex-col md:flex-row justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-4 w-60 rounded-md" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-12 w-48 rounded-2xl" />
        <Skeleton className="h-12 w-36 rounded-2xl" />
      </div>
    </div>

    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-2xl" />
              <div className="space-y-1">
                <Skeleton className="h-6 w-24 rounded-md" />
                <Skeleton className="h-4 w-40 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const ApartmentListSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 flex justify-between items-center">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56 rounded-xl" />
        <Skeleton className="h-4 w-72 rounded-md" />
      </div>
      <Skeleton className="h-12 w-48 rounded-2xl" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[1, 2].map((i) => (
        <div key={i} className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 space-y-5">
          <div className="flex justify-between items-start">
            <div className="flex gap-3">
              <Skeleton className="h-14 w-14 rounded-2xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-7 w-40 rounded-lg" />
                <Skeleton className="h-4 w-52 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
          <div className="flex justify-between pt-3 border-t border-slate-100">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-36 rounded-xl" />
              <Skeleton className="h-10 w-10 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const FullAppSkeleton: React.FC = () => (
  <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
    {/* Mock Navbar */}
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-3">
            <Skeleton className="w-11 h-11 rounded-2xl" />
            <Skeleton className="h-7 w-40 rounded-xl" />
          </div>
          <div className="hidden lg:flex items-center gap-3">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-36 rounded-2xl" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
      </div>
    </header>

    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-10">
      <DashboardSkeleton />
    </main>
  </div>
);
