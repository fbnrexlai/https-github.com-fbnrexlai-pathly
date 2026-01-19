import React from 'react';
import { SupabaseSetupModal } from '../SupabaseSetupModal';
import { ConfirmModal } from '../ConfirmModal';
import { Toast } from '../Toast';

interface GlobalModalsProps {
  setup: { isOpen: boolean; onClose: () => void };
  confirm: { isOpen: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void; isDanger?: boolean };
  toast: { message: string; visible: boolean; onClose: () => void };
}

export const GlobalModals: React.FC<GlobalModalsProps> = ({ setup, confirm, toast }) => (
  <>
    <SupabaseSetupModal isOpen={setup.isOpen} onClose={setup.onClose} />
    <ConfirmModal 
      isOpen={confirm.isOpen} 
      title={confirm.title} 
      message={confirm.message} 
      onConfirm={confirm.onConfirm} 
      onCancel={confirm.onCancel} 
      isDanger={confirm.isDanger} 
    />
    <Toast message={toast.message} isVisible={toast.visible} onClose={toast.onClose} />
  </>
);