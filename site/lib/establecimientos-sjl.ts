/** Nombres proporcionados por el equipo y contrastados parcialmente con directorios MINSA.
 * NO implica conexión, convenio ni disponibilidad real de servicios.
 * Para usar como identidad institucional de producción, consultar RENIPRESS actualizado.
 */
export type RedSJL = 'minsa' | 'essalud' | 'municipal' | 'privada';
export interface SedeSJL { id: string; nombre: string; red: RedSJL; tipo: string; evidencia: 'minsa' | 'equipo'; }
export const SEDES_SJL: SedeSJL[] = [
  {id:'hos-sjl',nombre:'Hospital San Juan de Lurigancho',red:'minsa',tipo:'Hospital',evidencia:'equipo'},
  {id:'hos-essalud-adu',nombre:'Hospital EsSalud Aurelio Díaz Ufano',red:'essalud',tipo:'Hospital',evidencia:'equipo'},
  {id:'sis-sjl',nombre:'Hospital Sisol Salud San Juan de Lurigancho',red:'municipal',tipo:'Establecimiento municipal',evidencia:'equipo'},
  ...[
    ['clinica-san-juan-bautista','Clínica San Juan Bautista'],
    ['clinica-san-miguel','Clínica San Miguel Arcángel'],
    ['clinica-limatambo','Clínica Limatambo'],
    ['clinica-san-marcos','Clínica San Marcos'],
    ['clinica-la-luz','Clínica La Luz SJL'],
    ['santa-rosa-salud','SANTA ROSA SALUD'],
    ['clinica-san-martin','Clínica San Martín del Este'],
    ['clinica-santa-elizabeth','Clínica Santa Elizabeth'],
    ['villa-salud','Villa Salud - Sede San Juan de Lurigancho'],
    ['clinica-corazon','La Clínica del Corazón'],
    ['clinica-san-jose','Clínica San José'],
    ['sanna-sjl','SANNA - Sede San Juan de Lurigancho'],
    ['policlinico-las-lomas','Policlínico Las Lomas - Zárate'],
    ['policlinico-de-jesus','Policlínico De Jesús'],
  ].map(([id,nombre])=>({id,nombre,red:'privada' as const,tipo: nombre.startsWith('Policlínico') ? 'Policlínico' : 'Establecimiento privado',evidencia:'equipo' as const})),
  ...[
    ['campoy','Centro de Salud Campoy'],['zarate','Centro de Salud Zárate'],
    ['mangomarca','Centro de Salud Mangomarca'],['caja-agua','Centro de Salud Caja de Agua'],
    ['piedra-liza','Centro de Salud Piedra Liza'],['chacarilla','Centro de Salud Chacarilla de Otero'],
    ['san-fernando','Centro de Salud San Fernando'],['10-octubre','Centro de Salud 10 de Octubre'],
    ['15-enero','Puesto de Salud 15 de Enero'],['bayovar','Centro de Salud Bayóvar'],
    ['ayacucho','Puesto de Salud Ayacucho'],['la-libertad','Centro de Salud La Libertad'],
    ['jaime-zubieta','Centro de Salud Jaime Zubieta'],['azcarrunz','Puesto de Salud Azcarrunz Alto'],
    ['daniel-carrion','Puesto de Salud Daniel Alcides Carrión'],
  ].map(([id,nombre])=>({id,nombre,red:'minsa' as const,tipo:nombre.startsWith('Puesto')?'Puesto de salud':'Centro de salud',evidencia: (['campoy','zarate','mangomarca','caja-agua','piedra-liza','chacarilla','san-fernando','15-enero','bayovar','ayacucho','la-libertad','azcarrunz','daniel-carrion'].includes(id) ? 'minsa' : 'equipo') as 'minsa'|'equipo'})),
];
export function sedesPorRed(red: RedSJL): SedeSJL[] { return SEDES_SJL.filter(s=>s.red===red); }
