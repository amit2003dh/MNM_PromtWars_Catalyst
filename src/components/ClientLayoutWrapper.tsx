'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useCare } from '@/context/CareContext';
import DoubleDoseWarningModal from './DoubleDoseWarningModal';
import EmergencyActionModal from './EmergencyActionModal';

const PROTECTED_ROUTES = [
  '/dashboard',
  '/schedule',
  '/medications',
  '/care-circle',
  '/appointments',
  '/health-journal',
  '/reports',
  '/settings',
];

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    conflictModalData,
    closeConflictModal,
    emergencyAlertActive,
    clearEmergencyAlert,
    isAuthenticated,
    isLoading,
  } = useCare();

  // 1. Client-side route guard: redirect unauthenticated users to /login
  useEffect(() => {
    const isProtected = PROTECTED_ROUTES.some(
      (r) => pathname === r || pathname.startsWith(`${r}/`)
    );

    if (isProtected && !isLoading && !isAuthenticated) {
      if (typeof window !== 'undefined') {
        const localAuth = localStorage.getItem('carenest_is_authenticated') === 'true';
        if (!localAuth) {
          window.location.replace('/login');
        }
      }
    }
  }, [pathname, isAuthenticated, isLoading]);

  // 2. bfcache (Back-Forward Cache) defense:
  // When browser restores an in-memory page from history, verify authentication
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      const isProtected = PROTECTED_ROUTES.some(
        (r) => pathname === r || pathname.startsWith(`${r}/`)
      );

      if (isProtected && typeof window !== 'undefined') {
        const isAuth = localStorage.getItem('carenest_is_authenticated') === 'true';
        if (!isAuth) {
          window.location.replace('/login');
        }
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [pathname]);

  return (
    <>
      <main className="flex-1 flex flex-col">{children}</main>

      {conflictModalData?.isOpen && (
        <DoubleDoseWarningModal
          isOpen={conflictModalData.isOpen}
          doseName={conflictModalData.doseName}
          administeredByName={conflictModalData.administeredByName}
          recordedAt={conflictModalData.recordedAt}
          onClose={closeConflictModal}
        />
      )}

      {emergencyAlertActive && (
        <EmergencyActionModal
          isOpen={emergencyAlertActive}
          onClose={clearEmergencyAlert}
        />
      )}
    </>
  );
}
