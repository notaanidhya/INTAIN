import React, { createContext, useContext, useState } from 'react';
import type { UserRole } from '../types';

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  roleName: string;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>(() => {
    return (localStorage.getItem('intain_active_role') as UserRole) || 'REVIEWER';
  });

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem('intain_active_role', newRole);
  };

  const getRoleName = (r: UserRole) => {
    switch (r) {
      case 'DATA_OPERATOR':
        return 'Data Operator (Ingestion)';
      case 'REVIEWER':
        return 'QC Reviewer (Exceptions & AI)';
      case 'DATA_CONSUMER':
        return 'Data Consumer / Auditor';
    }
  };

  return (
    <RoleContext.Provider value={{ role, setRole, roleName: getRoleName(role) }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
