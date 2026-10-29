# Visor clínico — San Juan de Lurigancho (demo)

```powershell
cd site
npm install
npm run dev
```

Abrir `http://localhost:3000/visor` y escribir `90000001`. En la ficha se mostrarán atenciones, fechas, médicos ficticios, sedes de referencia, resultados y filtros. Con `90000005` se prueba la denegación de consentimiento *simulado*. Para pruebas de dataset, `npm run test:sjl`.

Esta entrega solo mejora el conjunto de datos sintéticos y el visor. **Todavía no tiene autenticación ni autorización segura de médicos y pacientes; no se deben cargar datos personales reales ni desplegar como sistema clínico.** Ver `../MEJORAS_SJL_V1.md`.
