'use client';

import React from 'react';
import { useCare } from '@/context/CareContext';
import DoubleDoseWarningModal from './DoubleDoseWarningModal';

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { conflictModalData, closeConflictModal } = useCare();

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
    </>
  );
}
