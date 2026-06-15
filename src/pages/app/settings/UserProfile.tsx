import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Avatar,
  Badge,
  Button,
  Divider,
  Group,
  LoadingOverlay,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconStethoscope, IconUser } from '@tabler/icons-react';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import type { ProfileRole, ProfileStatus } from '../../../types';

const profileSchema = z.object({
  full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres.'),
  specialization: z.string().nullable().optional(),
  crfa_numero: z.string().nullable().optional(),
  crfa_regiao: z.string().nullable().optional(),
  crm_numero: z.string().nullable().optional(),
  crm_regiao: z.string().nullable().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const ROLE_LABEL: Record<ProfileRole, { label: string; color: string }> = {
  admin: { label: 'Administrador', color: 'red' },
  medico: { label: 'Médico', color: 'blue' },
  fonoaudiologo: { label: 'Fonoaudiólogo(a)', color: 'teal' },
  professional: { label: 'Profissional', color: 'gray' },
};

const STATUS_COLOR: Record<ProfileStatus, string> = {
  ativo: 'teal',
  inativo: 'gray',
  bloqueado: 'red',
};

export function UserProfile() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (profile) {
      reset({
        full_name: profile.full_name,
        specialization: profile.specialization ?? '',
        crfa_numero: profile.crfa_numero ?? '',
        crfa_regiao: profile.crfa_regiao ?? '',
        crm_numero: profile.crm_numero ?? '',
        crm_regiao: profile.crm_regiao ?? '',
      });
    }
  }, [profile, reset]);

  const mutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      if (!user?.id) throw new Error('Usuário não autenticado.');
      const payload = {
        ...data,
        specialization: data.specialization || null,
        crfa_numero: data.crfa_numero || null,
        crfa_regiao: data.crfa_regiao || null,
        crm_numero: data.crm_numero || null,
        crm_regiao: data.crm_regiao || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success('Perfil atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    mutation.mutate(data);
  };

  if (!profile) {
    return (
      <Paper p="lg" withBorder shadow="sm">
        <Text c="dimmed">Carregando perfil…</Text>
      </Paper>
    );
  }

  const roleInfo = ROLE_LABEL[profile.role] ?? ROLE_LABEL.professional;
  const isMedico = profile.role === 'medico' || profile.role === 'admin';
  const isFono = profile.role === 'fonoaudiologo' || profile.role === 'admin';

  return (
    <Paper shadow="sm" p="lg" withBorder pos="relative">
      <LoadingOverlay visible={mutation.isPending} overlayProps={{ radius: 'sm', blur: 2 }} />

      <Group justify="space-between" align="center" mb="xl">
        <Group>
          <Avatar size="lg" radius="xl" color={roleInfo.color} src={profile.avatar_url ?? undefined}>
            {profile.full_name?.[0]?.toUpperCase() ?? <IconUser size={20} />}
          </Avatar>
          <div>
            <Title order={3} c="slate.700" lh={1.1}>{profile.full_name}</Title>
            <Text size="sm" c="dimmed" mt={2}>{user?.email}</Text>
          </div>
        </Group>
        <Stack gap={4} align="flex-end">
          <Badge size="lg" color={roleInfo.color} variant="light">{roleInfo.label}</Badge>
          <Badge size="sm" color={STATUS_COLOR[profile.status] ?? 'gray'} variant="dot">
            {profile.status}
          </Badge>
        </Stack>
      </Group>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Title order={5} c="slate.600" mb="sm">Dados Profissionais</Title>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <TextInput
            label="Nome Completo"
            {...register('full_name')}
            error={errors.full_name?.message}
            required
          />
          <TextInput
            label="Especialização"
            placeholder="Ex: Audiologia Ocupacional"
            leftSection={<IconStethoscope size={14} />}
            {...register('specialization')}
          />
        </SimpleGrid>

        {isFono && (
          <>
            <Divider my="lg" label="Registro Profissional — CRFa (Fonoaudiologia)" labelPosition="left" />
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <TextInput
                label="CRFa — Número"
                placeholder="Ex: 12345"
                {...register('crfa_numero')}
              />
              <TextInput
                label="CRFa — Região"
                placeholder="Ex: 6"
                maxLength={3}
                {...register('crfa_regiao')}
              />
            </SimpleGrid>
          </>
        )}

        {isMedico && (
          <>
            <Divider my="lg" label="Registro Profissional — CRM (Medicina)" labelPosition="left" />
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <TextInput
                label="CRM — Número"
                placeholder="Ex: 54321"
                {...register('crm_numero')}
              />
              <TextInput
                label="CRM — UF / Região"
                placeholder="Ex: SP"
                maxLength={3}
                {...register('crm_regiao')}
              />
            </SimpleGrid>
          </>
        )}

        <Group justify="flex-end" mt="xl">
          <Button type="submit" loading={mutation.isPending} disabled={!isDirty}>
            Salvar Perfil
          </Button>
        </Group>
      </form>
    </Paper>
  );
}
