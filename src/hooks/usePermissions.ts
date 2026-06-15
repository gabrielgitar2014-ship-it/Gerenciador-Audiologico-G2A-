import { useAuth } from '../contexts/AuthContext';
import type { ProfileRole } from '../types';

export interface Permissions {
  role: ProfileRole | null;
  isAdmin: boolean;
  isMedico: boolean;
  isFono: boolean;
  isProfessional: boolean;
  isActive: boolean;
  canManageUsers: boolean;
  canManageCompany: boolean;
  canEditExams: boolean;
  canViewExams: boolean;
  canSignExams: boolean;
  canViewReports: boolean;
  canManagePCA: boolean;
  canViewPCA: boolean;
  canManageEPI: boolean;
  canViewEPI: boolean;
  canManageEmployees: boolean;
  canViewEmployees: boolean;
  canManageTrainings: boolean;
  canViewAuditLog: boolean;
}

const ROLE_FONO: ProfileRole[] = ['fonoaudiologo', 'admin'];
const ROLE_MEDICAL: ProfileRole[] = ['medico', 'admin'];
const ROLE_CLINICAL: ProfileRole[] = ['fonoaudiologo', 'medico', 'admin'];
const ROLE_OPERATIONAL: ProfileRole[] = ['admin', 'professional'];
const ROLE_ANY: ProfileRole[] = ['fonoaudiologo', 'medico', 'admin', 'professional'];

function has(role: ProfileRole | null, allowed: ProfileRole[]): boolean {
  return !!role && allowed.includes(role);
}

export function usePermissions(): Permissions {
  const { profile } = useAuth();
  const role = profile?.role ?? null;
  const isActive = profile?.status === 'ativo';

  return {
    role,
    isAdmin: role === 'admin',
    isMedico: role === 'medico',
    isFono: role === 'fonoaudiologo',
    isProfessional: role === 'professional',
    isActive,
    canManageUsers: role === 'admin',
    canManageCompany: role === 'admin',
    canEditExams: has(role, ROLE_CLINICAL),
    canViewExams: has(role, ROLE_ANY),
    canSignExams: role === 'medico',
    canViewReports: has(role, ROLE_CLINICAL),
    canManagePCA: has(role, ROLE_FONO),
    canViewPCA: has(role, ROLE_ANY),
    canManageEPI: has(role, ROLE_OPERATIONAL),
    canViewEPI: has(role, ROLE_ANY),
    canManageEmployees: has(role, ROLE_FONO),
    canViewEmployees: has(role, ROLE_ANY),
    canManageTrainings: has(role, ROLE_OPERATIONAL),
    canViewAuditLog: role === 'admin',
  };
}
