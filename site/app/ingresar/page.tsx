import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { session } from '@/lib/server/auth';
import { LoginForm } from '@/components/portal/login';
export const metadata:Metadata={title:'Acceso seguro · Demo SJL'};
export default async function Login(){const u=await session();if(u)redirect(u.role==='medico'?'/medico':'/paciente');return <LoginForm/>;}
