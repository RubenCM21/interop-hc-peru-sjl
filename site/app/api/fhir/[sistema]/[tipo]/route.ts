import { NextResponse } from 'next/server';
// Los sistemas FHIR están disponibles solo desde el agregador del servidor.
// Se retiró el endpoint abierto de demostración que permitía buscar pacientes por DNI.
export async function GET(){return NextResponse.json({error:'Endpoint clínico directo deshabilitado. Use el portal autenticado.'},{status:403,headers:{'Cache-Control':'no-store'}});}
