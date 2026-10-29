import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { session,publicUser } from '@/lib/server/auth';
import { PortalMedico } from '@/components/portal/medico';
export const metadata:Metadata={title:'Portal del médico · Demo SJL'};
export default async function Medico(){const u=await session();if(!u)redirect('/ingresar');if(u.role!=='medico')redirect('/paciente');return <PortalMedico user={publicUser(u)}/>;}
