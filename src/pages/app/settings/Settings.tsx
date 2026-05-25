
import { Tabs, rem } from '@mantine/core';
import { IconBuilding, IconUsersGroup, IconBriefcase, IconHexagons } from '@tabler/icons-react';

// Importe os componentes que você criará para cada aba
import { CompanyProfile } from './CompanyProfile';
import { Sectors } from './Sectors';
import { JobRoles } from './JobRoles';
import { GHEs } from './GHEs';

export function Settings() {
  const iconStyle = { width: rem(16), height: rem(16) };

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Configurações Gerais</h1>
      <Tabs defaultValue="company" variant="pills" orientation="horizontal">
        <Tabs.List>
          <Tabs.Tab value="company" leftSection={<IconBuilding style={iconStyle} />}>
            Empresa
          </Tabs.Tab>
          <Tabs.Tab value="sectors" leftSection={<IconUsersGroup style={iconStyle} />}>
            Setores
          </Tabs.Tab>
          <Tabs.Tab value="roles" leftSection={<IconBriefcase style={iconStyle} />}>
            Cargos
          </Tabs.Tab>
          <Tabs.Tab value="ghes" leftSection={<IconHexagons style={iconStyle} />}>
            GHEs
          </Tabs.Tab>
        </Tabs.List>

        <div className="mt-6">
          <Tabs.Panel value="company">
            <CompanyProfile />
          </Tabs.Panel>

          <Tabs.Panel value="sectors">
            <Sectors />
          </Tabs.Panel>

          <Tabs.Panel value="roles">
            <JobRoles />
          </Tabs.Panel>

          <Tabs.Panel value="ghes">
            <GHEs />
          </Tabs.Panel>
        </div>
      </Tabs>
    </div>
  );
}
