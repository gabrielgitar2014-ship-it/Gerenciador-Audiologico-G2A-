import { Alert, Button, Center, LoadingOverlay, Stack, Text, Title } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { ProfileRole } from '../types';

interface ProtectedRouteProps {
  /** Allowed roles. When omitted, any authenticated user passes. */
  requiredRole?: ProfileRole[];
  /** Redirect target when the user is missing the role. Defaults to a "no access" screen. */
  redirectOnDeny?: string;
}

export const ProtectedRoute = ({ requiredRole, redirectOnDeny }: ProtectedRouteProps = {}) => {
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return <LoadingOverlay visible zIndex={1000} overlayProps={{ blur: 2 }} />;

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && requiredRole.length > 0) {
    const role = profile?.role;
    const allowed = role ? requiredRole.includes(role) : false;
    if (!allowed) {
      if (redirectOnDeny) return <Navigate to={redirectOnDeny} replace />;
      return (
        <Center mih="60vh" px="lg">
          <Stack align="center" gap="md" maw={420}>
            <IconLock size={56} className="text-slate-300" />
            <Title order={3} c="slate.700">Acesso restrito</Title>
            <Alert color="orange" variant="light" w="100%">
              <Text size="sm">
                Esta área é exclusiva para os papéis:{' '}
                <strong>{requiredRole.join(', ')}</strong>.
              </Text>
              {role && (
                <Text size="xs" c="dimmed" mt={4}>
                  Seu papel atual: <strong>{role}</strong>
                </Text>
              )}
            </Alert>
            <Button variant="light" onClick={() => navigate(-1)}>Voltar</Button>
          </Stack>
        </Center>
      );
    }
  }

  return <Outlet />;
};
