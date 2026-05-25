import { Table, Badge, Button, Group, Avatar, Text } from '@mantine/core';
import { IconReportMedical } from '@tabler/icons-react';

export interface PCAWorker {
  id: string;
  name: string;
  registration: string;
  role: string;
  lastExamDate: string;
  pcaStatus: 'normal' | 'alerta_msl' | 'painpse' | 'vencido';
}

const getStatusBadge = (status: PCAWorker['pcaStatus']) => {
  switch (status) {
    case 'normal': return <Badge color="teal" variant="light">Normal</Badge>;
    case 'alerta_msl': return <Badge color="yellow" variant="light">Alerta MSL</Badge>;
    case 'painpse': return <Badge color="red" variant="light">PAINPSE Detectado</Badge>;
    case 'vencido': return <Badge color="gray" variant="light">Vencido</Badge>;
    default: return <Badge color="gray" variant="light">Desconhecido</Badge>;
  }
};

interface PCADashboardTableProps {
  data: PCAWorker[];
  onViewRecord: (id: string) => void;
}

export function PCADashboardTable({ data, onViewRecord }: PCADashboardTableProps) {
  const rows = data.map((worker) => (
    <Table.Tr key={worker.id}>
      <Table.Td>
        <Group gap="sm">
          <Avatar color="blue" radius="xl" size="sm">{worker.name.charAt(0)}</Avatar>
          <Text size="sm" fw={500}>{worker.name}</Text>
        </Group>
      </Table.Td>
      <Table.Td>
        <Text size="sm" c="dimmed">{worker.registration}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{worker.role}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{worker.lastExamDate}</Text>
      </Table.Td>
      <Table.Td>
        {getStatusBadge(worker.pcaStatus)}
      </Table.Td>
      <Table.Td align="right">
        <Button 
          variant="light" 
          size="xs" 
          rightSection={<IconReportMedical size={14} />}
          onClick={() => onViewRecord(worker.id)}
        >
          Ver Prontuário Clínico
        </Button>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Table.ScrollContainer minWidth={800}>
      <Table verticalSpacing="sm" striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Trabalhador</Table.Th>
            <Table.Th>Matrícula</Table.Th>
            <Table.Th>Função</Table.Th>
            <Table.Th>Data do Último Exame</Table.Th>
            <Table.Th>Status PCA</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
