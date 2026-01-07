import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useActiveBars, Bar } from '@/hooks/useBars';

interface BarContextType {
  activeBar: Bar | null;
  setActiveBar: (bar: Bar | null) => void;
  bars: Bar[];
  isLoading: boolean;
}

const BarContext = createContext<BarContextType | undefined>(undefined);

export function BarProvider({ children }: { children: ReactNode }) {
  const [activeBar, setActiveBar] = useState<Bar | null>(null);
  const { data: bars = [], isLoading } = useActiveBars();

  // Auto-select first bar if none selected
  useEffect(() => {
    if (!activeBar && bars.length > 0) {
      // Check localStorage for previously selected bar
      const savedBarId = localStorage.getItem('activeBarId');
      const savedBar = savedBarId ? bars.find(b => b.id === savedBarId) : null;
      setActiveBar(savedBar || bars[0]);
    }
  }, [bars, activeBar]);

  // Save selected bar to localStorage
  const handleSetActiveBar = (bar: Bar | null) => {
    setActiveBar(bar);
    if (bar) {
      localStorage.setItem('activeBarId', bar.id);
    } else {
      localStorage.removeItem('activeBarId');
    }
  };

  return (
    <BarContext.Provider 
      value={{ 
        activeBar, 
        setActiveBar: handleSetActiveBar, 
        bars, 
        isLoading 
      }}
    >
      {children}
    </BarContext.Provider>
  );
}

export function useBarContext() {
  const context = useContext(BarContext);
  if (context === undefined) {
    throw new Error('useBarContext must be used within a BarProvider');
  }
  return context;
}
