# Aldia Smart Connect · instrucciones para Claude

## Repo y despliegue
- GitHub: `aldiasoftware-sys/SmartConnect` (rama `main`). Local de Guille: `~/Proyectos/SmartConnect`.
- Next.js 14 con `output: "export"` → `npx next build` genera `out/`, que se sube a Cloudflare Pages (aldiasmart.pages.dev). No hay servidor: todo va del navegador a Supabase.
- Supabase: ref `ponniiubkyssgoevgbal` (no está en la cuenta del MCP de Guille). El SQL se pega a mano en el SQL Editor; generar también un PDF en el Escritorio.

## Seguridad (obligatorio)
- Login real con Supabase Auth (`lib/AuthContext.tsx`): sin sesión solo se ve `/login`. No hay registro; las cuentas se crean en Supabase → Authentication → Users.
- RLS: **todas** las tablas usan la política «Solo equipo» (`public.is_team()`, email en `team_access`). La define `seguridad_rls.sql`, que se ejecuta siempre al final.
- Nunca `USING (true)` ni políticas para `anon`. La única excepción es INSERT en `contact_messages`, para el formulario web.
- Al crear una tabla nueva: crearla y volver a ejecutar `seguridad_rls.sql` (le aplica la política sola).

## Quiénes y qué
- **ALDIA Project** (aldiaproject.es): automatización e IA para empresas. Equipo: **Guille** y **Millán**. Lema: «Automatiza hoy. Lidera mañana.»
- Textos públicos SIEMPRE en plural, como empresa («automatizamos», «te decimos»), nunca en primera persona del singular.
- Estilo visual: el de aldiaproject.es (claro, Inter, botones negros, acento verde #00FF88 con moderación).

## Roadmap de arranque (04-11-2026 → 31-01-2027, 12 semanas)
Dos objetivos, un mismo motor: **crear comunidad** y **vender servicios y SaaS**. La comunidad ES el canal comercial.
Atraer → Capturar (palabra clave → DM → email) → Nutrir (newsletter, directos) → Convertir (diagnóstico → auditoría → piloto) → Productizar (SaaS cuando 3 clientes tengan el mismo problema).

| Fase | Fechas | Comunidad | Servicios | SaaS | Hito |
|---|---|---|---|---|---|
| S0 Preparar | 4–8 nov | Perfiles, enlace único, 20 ideas, recurso, newsletter | 2 sectores, oferta de diagnóstico, 30 empresas en CRM | Plantilla de problemas repetidos | Todo listo para publicar el lun 9 |
| S1–S4 Arrancar | 9 nov–6 dic | 4 reels/sem, 2 posts LinkedIn, newsletter quincenal, palabra clave + DM | 10 contactos y 2 diagnósticos/sem, demo sector A | Anotar el problema de cada conversación | 16 reels, 8 diagnósticos, 1ª propuesta |
| S5–S8 Validar | 7 dic–3 ene | 5 reels/sem, YouTube piloto, newsletter semanal, 1er directo | Auditorías de pago, 1–2 pilotos, demo sector B | Elegir candidato, landing + lista de espera | Primeros ingresos y lista de espera |
| S9–S12 Escalar | 4–31 ene | 1 reel/día, 2 vídeos largos/mes, comunidad cerrada 30–50 | Caso de éxito, 1er mantenimiento, alianza con agencia | Demo navegable, 1–3 pilotos o preventas | Revisión trimestral |

**Metas (S4/S8/S12):** reels 16/36/60 · newsletter 50/150/300 · comunidad —/—/30–50 · diagnósticos 8/16/24 · propuestas 1/4/8 · clientes de pago 0–1/2/3–4 · lista de espera SaaS —/20/50.
**Revisiones:** 4-dic, 4-ene (candidato SaaS), 29-ene (trimestral).
**No hacer en 90 días:** SaaS completo, más de 5 canales, proyectos sin alcance cerrado, automatizar la publicación sin estándar de calidad.

**Oferta:** Diagnóstico exprés 30 min (gratis) → Auditoría 1–2 sem (300–600 €, se descuenta) → Piloto 2–4 sem (1.500–4.000 €) → Mantenimiento (150–500 €/mes).
**Rutina comercial:** L 15 empresas al CRM · M–J 10 mensajes + 5 seguimientos · J 3 vídeos de demo · V actualizar pipeline · a diario responder leads en < 24 h.
**SaaS solo si en S12:** ≥3 clientes mismo problema · ≥50 en espera · ≥1 piloto pagado · hay margen. Un solo candidato a la vez.

**Contenido:** L noticia IA · M automatización en 30 s («Comenta PALABRA») · X tutorial · J caso de sector · V construyendo ALDIA · S stories (Pregunta del viernes) · D descanso. Publicación 20:30 (probar 13:30 en S3).
Reel: gancho 0–2 s · contexto 2–8 s · demostración 8–35 s · cierre 35–45 s.
Lotes: L guiones 1 h · M grabación 2 h · X montaje 2 h · J calidad y programación 45 min · V métricas y newsletter 45 min. Diario 1 h.
Métrica principal: **conversaciones con potenciales clientes por semana**.
Reglas: retención 3 s < 60 % → rehacer gancho · visionado medio < 40 % → acortar · visitas al perfil sin seguidores → revisar bio.
Checklist antes de publicar: gancho en 2 s también en texto · una sola idea · subtítulos en zona segura · demostración real · datos con fuente · un único CTA · portada legible · ≤3 hashtags · palabra clave configurada · audio limpio.

| Sem | Lunes | Martes | Miércoles | Jueves |
|---|---|---|---|---|
| S1 9–13 nov | Qué cambia para una pyme | Facturas a mano · FACTURAS | Formulario → WhatsApp en 5 min | 3 tareas que automatizar mañana |
| S2 16–20 nov | Noticia con fuente verificada | WhatsApp 24/7 · WHATSAPP | Tu primer agente con Claude | Lo que aprendimos en un diagnóstico |
| S3 23–27 nov | Noticia (probar 13:30) | Citas para clínicas · CITAS | n8n en 60 s | Cuánto cuesta automatizar |
| S4 30 nov–4 dic | Noticia + resumen del mes | Plazos en expedientes · PLAZOS | Vídeos de ALDIA con IA · SISTEMA | Antes y después (datos reales) |

## Plan de funciones del dashboard (banco de ideas, 05-11)
Prioridad: 1) Contenido · 2) CRM · 3) Cuadro semanal y metas · 4) Registro de problemas (SaaS). ★ = sección nueva.
- ★ **Inicio / Esta semana:** «Semana X de 12» con fase e hito; tareas de la semana; cuenta atrás a revisiones; frases fijas; métrica principal arriba.
- **Tareas:** precargar las 10 tareas de S0; etiqueta por área (Comunidad · Servicios · SaaS · Interno). **Gantt:** 4 fases como barras + hitos (lun 9, S4, S8, S12).
- ★ **Contenido:** banco de ideas (tema, pilar, gancho, palabra, sector, prioridad); calendario por pilar; estados idea → guion → grabado → montado → revisado → programado → publicado; ficha de guion 0–2/2–8/8–35/35–45; checklist de 10 puntos obligatorio para «programado»; una pieza en 5 formatos; vista de lotes; rampa de cadencia; hora 20:30 vs 13:30; S1–S4 precargado; casillas de fuente y permiso del cliente.
- ★ **Palabras clave y recursos:** palabra → recurso, enlace, reel de origen, respuesta automática sí/no; contador comentarios → DMs → emails; biblioteca de recursos.
- **Redes:** + Instagram (YouTube desde S5); métricas por pieza; alertas con las reglas; ganador y perdedor de la semana.
- ★ **Comunidad y newsletter:** suscriptores vs meta; ediciones «ALDIA Intelligence»; directos; comunidad cerrada; rituales; Pregunta del viernes → banco de ideas; regla de 24 h.
- ★ **CRM:** empresa, sector, contacto, problema, etapa, valor, próxima acción con fecha; embudo por escalera de oferta; origen; contadores de rutina comercial; ficha de diagnóstico; generador de propuesta; precios reales; demos por sector; alianzas.
- **Sales/Analítica:** ingresos por escalón (MRR); clientes de pago vs meta; casos de éxito y permisos.
- ★ **SaaS:** problemas repetidos; detector de patrones (≥3 empresas); candidatos puntuados; lista de espera vs 50; semáforo 4 criterios; pilotos y preventas.
- **Check-in → Revisión del viernes:** datos → ganador → perdedor → leads → una decisión; tabla S1–S12 automática; metas verde/ámbar/rojo; registro de cambios.
- **Equipo:** roles Cara y guion / Sistema y montaje / Comunidad y comercial; carga 6–7 h/sem + 1 h/día; checklist diario.

## Banco de ideas de contenido
- Lunes: noticia para pymes · herramienta nueva · resumen del mes · normativa IA.
- Martes (palabra): FACTURAS · WHATSAPP · CITAS · PLAZOS · PRESUPUESTO · RESEÑAS · COBROS · LEADS · INFORME · EMAIL.
- Miércoles: formulario → WhatsApp · primer agente con Claude · n8n en 60 s · SISTEMA · de Sheets a un panel.
- Jueves (datos reales y permiso): 3 tareas · lo aprendido en un diagnóstico · cuánto cuesta · Silva Stylo (de Setmore a su app) · F&T sin reservas duplicadas.
- Viernes: construimos nuestro panel · respuesta automática con n8n · primera semana de números · el error de la semana.
- Recursos: «10 automatizaciones para pymes» · plantillas n8n · calculadora de coste · checklist «¿lista para la IA?».
- Candidatos SaaS: ALDIA Docs / Agents / Monitor; ALDIA Reviews; app de citas (Silva Stylo).

## Pendiente de decidir
- [ ] Los 2 sectores (A y B) y un problema por sector
- [ ] Reels con cara o sin cara
- [ ] ManyChat o flujo propio en n8n
- [ ] Newsletter: Beehiiv o Brevo
- [ ] Responsables de cada rol
