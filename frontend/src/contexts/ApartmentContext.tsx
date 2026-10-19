import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api.js';
import type { Apartment } from '../types/index.js';
import { useAuth } from './AuthContext.js';

interface ApartmentContextType {
  apartments: Apartment[];
  selectedApartment: Apartment | null;
  isLoading: boolean;
  isInitialized: boolean;
  setSelectedApartment: (apartment: Apartment | null) => void;
  selectApartmentById: (id: string) => void;
  fetchApartments: () => Promise<void>;
}

const ApartmentContext = createContext<ApartmentContextType | undefined>(undefined);

export const ApartmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { owner } = useAuth();

  // Load cached apartments from localStorage for instant display without flash
  const [apartments, setApartments] = useState<Apartment[]>(() => {
    try {
      const cached = localStorage.getItem('cachedApartments');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(() => {
    try {
      const cached = localStorage.getItem('cachedApartments');
      const list: Apartment[] = cached ? JSON.parse(cached) : [];
      const savedId = localStorage.getItem('selectedApartmentId');
      const existing = list.find((a) => a.id === savedId);
      return existing || (list.length > 0 ? list[0] : null);
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const fetchApartments = async () => {
    if (!owner) {
      setApartments([]);
      setSelectedApartment(null);
      setIsLoading(false);
      setIsInitialized(true);
      return;
    }

    try {
      const res = await api.get('/apartments');
      const list: Apartment[] = res.data;
      setApartments(list);
      localStorage.setItem('cachedApartments', JSON.stringify(list));

      const savedId = localStorage.getItem('selectedApartmentId');
      const existing = list.find((a) => a.id === savedId);
      if (existing) {
        setSelectedApartment(existing);
      } else if (list.length > 0) {
        setSelectedApartment(list[0]);
        localStorage.setItem('selectedApartmentId', list[0].id);
      } else {
        setSelectedApartment(null);
        localStorage.removeItem('selectedApartmentId');
      }
    } catch (err) {
      console.error('Failed to fetch apartments:', err);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  };

  useEffect(() => {
    if (owner) {
      fetchApartments();
    } else {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [owner?.id]);

  const selectApartmentById = (id: string) => {
    const found = apartments.find((a) => a.id === id);
    if (found) {
      setSelectedApartment(found);
      localStorage.setItem('selectedApartmentId', found.id);
    }
  };

  const handleSetSelectedApartment = (apt: Apartment | null) => {
    setSelectedApartment(apt);
    if (apt) {
      localStorage.setItem('selectedApartmentId', apt.id);
    } else {
      localStorage.removeItem('selectedApartmentId');
    }
  };

  return (
    <ApartmentContext.Provider
      value={{
        apartments,
        selectedApartment,
        isLoading,
        isInitialized,
        setSelectedApartment: handleSetSelectedApartment,
        selectApartmentById,
        fetchApartments,
      }}
    >
      {children}
    </ApartmentContext.Provider>
  );
};

export const useApartment = () => {
  const context = useContext(ApartmentContext);
  if (!context) {
    throw new Error('useApartment must be used within an ApartmentProvider');
  }
  return context;
};
