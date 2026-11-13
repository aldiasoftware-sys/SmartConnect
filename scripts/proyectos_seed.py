#!/usr/bin/env python3
"""Genera proyectos_setup.sql: tablas de Proyectos + paso de Planificación (gantt_items) + plan «Renovación app F&T».

Uso: python3 scripts/proyectos_seed.py  (escribe ../proyectos_setup.sql)
El plan sale del PDF «Renovación app F&T» (reunión del 13-11-2026) contrastado con el código de
~/Desktop/Varios/reservas-app (rama github-main) ese mismo día.
"""
import json, os

def q(v):
    if v is None or v == "":
        return "NULL"
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"

# ---------------------------------------------------------------- áreas
AREAS = [
    dict(name="Cimientos: roles, menú y legal", color="#1e3a8a", start="2026-11-13", end="2026-11-27",
         goal="Lo que todo lo demás necesita: roles nuevos, permisos por pestaña, un solo menú y la base legal."),
    dict(name="RRHH", color="#12a26b", start="2026-11-23", end="2026-12-18",
         goal="Fichar al entrar, mis fichajes, documentos, ausencias y la vista administrativa reorganizada."),
    dict(name="Reseñas y primas", color="#d6336c", start="2026-11-30", end="2026-12-18",
         goal="Todo dentro de la app de F&T, con predicción de guía por IA y una interfaz más viva."),
    dict(name="Liquidaciones", color="#e8590c", start="2026-12-09", end="2026-12-23",
         goal="Precios, cuentas y ajustes cuadrados con la realidad y validados por Manu."),
    dict(name="KPIs", color="#6c5ce7", start="2027-01-04", end="2027-01-15",
         goal="Cinco páginas de KPIs (reservas, liquidaciones, objetivos, reseñas, RRHH) exportables a PDF."),
    dict(name="Mensajes", color="#0a66c2", start="2027-01-11", end="2027-01-22",
         goal="Chat multidispositivo tipo WhatsApp: notificaciones, adjuntos, grupos y respuestas rápidas."),
    dict(name="Reservas, flota y ajustes", color="#0b7285", start="2027-01-18", end="2027-01-29",
         goal="Lavado de interfaz de Reservas y repaso de la maqueta 3D de la flota."),
    dict(name="Lanzamiento", color="#0b1324", start="2027-01-25", end="2027-02-05",
         goal="Avisos a empleados, pruebas por rol, formación y despliegue."),
    dict(name="A futuro", color="#8b95aa",
         goal="Ideas apuntadas sin fecha: se planifican cuando acabe la renovación."),
]
A = {i + 1: a["name"] for i, a in enumerate(AREAS)}

# ---------------------------------------------------------------- tareas
# (área, tipo, título, detalle, prioridad, responsable, esperando, inicio, fin, estado, progreso)
T = []
def t(area, title, detail="", prio="media", start=None, end=None, owner="Guille", wait=None, status="pendiente", progress=0, kind="tarea"):
    T.append(dict(area=A[area], kind=kind, title=title, detail=detail, priority=prio, owner=owner, waiting_on=wait,
                  start_date=start, end_date=end or start, status=status, progress=100 if status == "hecho" else progress))
def hito(area, title, date, detail=""):
    t(area, title, detail, "alta", date, date, "Ambos", kind="hito")

# 1 · Cimientos
t(1, "Reunión de renovación y notas (PDF «Renovación app F&T»)", "Notas de la reunión en ~/Desktop/lol+.pdf: 9 bloques + roles + avisos legales.", "alta", "2026-11-13", owner="Ambos", status="hecho")
t(1, "Contrastar el PDF con el código actual", "Hecho el 13-11 sobre reservas-app (github-main). Resumen en Notas › Análisis.", "alta", "2026-11-13", status="hecho")
t(1, "Subir a producción los 2 commits pendientes de github-main", "e6490ee (Millán en Asistente y Primas) y b1f02d1 (copia diaria) van por delante de origin/main. Subirlos antes de abrir la renovación para no mezclar.", "alta", "2026-11-16")
t(1, "Arreglo rápido: el menú lateral hace scroll", ".sidebar tiene height:100vh y position:sticky sin overflow (src/styles/app.css:102-113): si no cabe, se corta. Añadir overflow-y:auto.", "alta", "2026-11-16")
t(1, "Arreglo rápido: centrar el contenido en pantallas anchas", ".main tiene max-width:1360px sin margin:auto (app.css:292-297), por eso los KPIs quedan pegados a la izquierda.", "alta", "2026-11-16")
t(1, "Cerrar la matriz de roles con Manu", "Admin · Desarrollo · RRHH · Administración · Guías · Conductores. Propuesta en la pestaña Roles; resolver las casillas «?».", "alta", "2026-11-16", "2026-11-20", "Ambos", "Manu")
t(1, "Pasar los roles actuales a los nuevos y asignar rol a cada usuario", "Hoy: admin, operador, guia, lectura, empleado (src/lib/types.ts:98-117). Decidir a qué rol nuevo va cada uno.", "alta", "2026-11-18", "2026-11-24")
t(1, "Permisos por pestaña con los roles nuevos", "Ampliar el sistema que ya existe (10 secciones con no/ver/editar, Ajustes › Permisos, Guard en App.tsx). «RRHH vista trabajador» obligatoria para todos.", "alta", "2026-11-19", "2026-11-25")
t(1, "Asistente y Primas por rol, no por lista de correos", "ASISTENTE_EMAILS y PRIMAS_EMAILS están fijos y repetidos en types.ts, primas.sql y primas-asignar.mts.", "media", "2026-11-23", "2026-11-25")
t(1, "Un solo menú: Reseñas y RRHH cuelgan del aside principal", "Hoy cada una tiene su propio aside con «Volver a la app» (Shell.tsx:48-119). Pasan a ser grupos desplegables del menú principal.", "alta", "2026-11-23", "2026-11-27")
t(1, "«Equipo» se llama «Recursos humanos» (rol RRHH) o «Documentos» (resto)", "", "media", "2026-11-24", "2026-11-26")
t(1, "Base legal: información RGPD para empleados", "Texto informativo de geolocalización al fichar (art. 90 LOPDGDD), documentos y datos que se tratan; revisar el registro de actividades de tratamiento con la asesoría de F&T.", "alta", "2026-11-18", "2026-11-27", "Guille", "Asesoría F&T")
hito(1, "Matriz de roles aprobada", "2026-11-20")
hito(1, "Menú único y roles nuevos en producción", "2026-11-27")

# 2 · RRHH
t(2, "Inicio: botón de fichar arriba del todo; hasta fichar no se ve lo demás", "Hoy el fichaje (con zonas y mapa) vive en /fichar (src/pages/Fichar.tsx). Moverlo al Inicio y mantener debajo los paneles actuales.", "alta", "2026-11-23", "2026-11-26")
t(2, "Fichar como Oficina o Teletrabajo (Oficina por defecto)", "El teletrabajo hoy solo existe como tipo de solicitud (src/lib/rrhh/tipos.ts:111).", "alta", "2026-11-23", "2026-11-25")
t(2, "Avisos en Inicio: fuera de la oficina, boletín, cumpleaños y días importantes", "El boletín de noticias se deja preparado y vacío de momento.", "media", "2026-11-25", "2026-11-30")
t(2, "Mis fichajes: semana y mes, ajustes y banco de horas mensual", "El saldo anual y la vista semana/mes ya existen. Falta el banco mensual y que cada ajuste quede registrado (quién, cuándo y por qué).", "alta", "2026-11-30", "2026-12-03")
t(2, "Calendario personal: fichajes, días importantes y notas propias", "Vista semanal y mensual.", "media", "2026-12-01", "2026-12-04")
t(2, "Mis documentos y Documentos de la empresa en 7 carpetas", "Contrato · cuestionarios · justificantes de ausencia · candidatura · modelo 145 · nóminas y onboarding · personales (DNI, NSS…). El reparto por DNI ya existe; falta ordenarlo así.", "alta", "2026-11-30", "2026-12-04")
t(2, "Ausencias y vacaciones: panel de días y de horas", "Días generados / disponibles / usados; horas de ausencias puntuales generadas / disponibles / usadas; ausencias próximas, actuales y pasadas.", "alta", "2026-12-02", "2026-12-09")
t(2, "Formulario de ausencia con 9 tipos y el horario de cada trabajador", "Asuntos propios · enfermedad · enfermedad de un familiar · maternidad/paternidad · permiso puentes · viaje laboral · vacaciones · visita médica · otro. Varios días seguidos. Hoy descuenta festivos y avisa de solapes, pero NO comprueba el horario: no dejar pedir un sábado a quien no trabaja sábados.", "alta", "2026-12-03", "2026-12-09")
t(2, "Datos personales: el trabajador pide el cambio y RRHH lo valida", "Hoy solo RRHH edita la ficha y el empleado solo su foto.", "media", "2026-12-07", "2026-12-10")
t(2, "KPI personal de desempeño", "Rendimiento, puntualidad, horas. Empezar sencillo.", "baja", "2026-12-10", "2026-12-14")
t(2, "Notificaciones de RRHH", "Ausencia aprobada, documento nuevo (p. ej. nómina), cambios en tus datos. Primero dentro de la app; el push llega con Mensajes.", "alta", "2026-12-09", "2026-12-14")
t(2, "Personal: registro de TODOS los trabajadores, usen o no la app", "RRHH, Manu y Desarrollo meten, editan y borran sus documentos. Plantilla.tsx ya tiene fichas con foto: separar Personal de Usuarios.", "alta", "2026-11-30", "2026-12-04")
t(2, "Usuarios: solo RRHH, Manu y Desarrollo, con roles nuevos y fotos", "", "media", "2026-12-07", "2026-12-09")
t(2, "Ficha de guía editable por RRHH o Manu con datos privados", "Documentos fiscales y las mismas carpetas que ve el trabajador.", "media", "2026-12-09", "2026-12-11")
t(2, "Documentos RRHH: envío privado o a todos, con aviso", "A la carpeta de un trabajador o general (documento o post). A todos les llega la notificación de documento nuevo.", "alta", "2026-12-09", "2026-12-14")
t(2, "Conectar Solicitudes con el formulario nuevo de ausencia", "Solicitudes ya aprueba/rechaza con nota y admite adjunto.", "media", "2026-12-10", "2026-12-11")
t(2, "Exportar a Excel el cuadrante y las ausencias", "Ninguno de los dos exporta hoy (el registro de jornada sí).", "media", "2026-12-14", "2026-12-15")
t(2, "Quitar Turnos", "Decidido en la reunión.", "baja", "2026-12-14")
t(2, "Quitar el listado general de Registro de jornada", "Cada uno ve su registro en su perfil. OJO: el registro es obligatorio y se conserva 4 años; RRHH mantiene la exportación para la Inspección.", "media", "2026-12-14", "2026-12-15")
t(2, "Plantilla: rehacer la cabecera y la interfaz", "La funcionalidad está bien; arriba a la izquierda se ve pobre.", "media", "2026-12-15", "2026-12-17")
hito(2, "RRHH renovado en producción", "2026-12-18")

# 3 · Reseñas y primas
t(3, "Reseñas 100 % dentro de la app de F&T", "Detalle de la reserva, responder, generar con IA y publicar sin salir. Propuesta: ALDIA Reviews sigue siendo el motor (misma base de datos y extensión), la interfaz pasa a F&T.", "alta", "2026-11-30", "2026-12-11")
t(3, "Quitar el enlace a ALDIA Reviews del menú y de la cabecera", "Shell.tsx:69-72 y Resenas.tsx:81.", "media", "2026-11-30")
t(3, "Primas: al aceptar el guía de una reseña, que se le sume", "Hoy la IA asigna directa y la corrección manual (manual:true, Primas.tsx:131-134) recalcula con lo guardado. Reproducir el caso en que no suma.", "alta", "2026-11-30", "2026-12-02")
t(3, "Predicción de guía: botón rápido con el sugerido y el resto debajo", "Si la IA cree que es de Óscar, sale «Óscar» destacado; los demás nombres siguen debajo por si se equivoca.", "alta", "2026-12-02", "2026-12-04")
t(3, "Las reseñas atendidas cambian de color o se marcan «completada»", "Hoy solo desaparecen del filtro «Dudosas».", "media", "2026-12-07", "2026-12-09")
t(3, "Filtro «Hoy» para ir al día", "Hoy hay 30/90 días/Todo en Reseñas y Dudosas/Con guía/Sin guía en Primas.", "media", "2026-12-07")
t(3, "Interfaz de reseñas menos monótona", "", "media", "2026-12-07", "2026-12-11")
t(3, "Reseñas › Guías con fotos reales y estrellas", "Mismo estilo que Equipo › Guías. Las fotos ya están en el bucket rrhh-fotos (hoy en Reseñas sale el mismo dibujo para todos).", "media", "2026-12-09", "2026-12-11")
t(3, "Registro de quién atiende cada reseña y cuándo", "Lo necesita el KPI de vigilancia («cuántas reseñas no ha atendido hoy»).", "media", "2026-12-14", "2026-12-16")
t(3, "Quitar Informes de Reseñas (pasan a KPIs)", "", "baja", "2026-12-16")
hito(3, "Reseñas dentro de F&T", "2026-12-18")

# 4 · Liquidaciones
t(4, "Confirmar precios con Manu", "Tarifas de autocar, autocar extra, van y tramos por plazas (Liquidaciones › Tarifas).", "alta", "2026-12-09", "2026-12-11", "Guille", "Manu")
t(4, "Comparar las cuentas con el entorno real", "Excel de liquidación de Dropbox (/Pozo/Tours/<año>/<mes>) contra la app, mes a mes.", "alta", "2026-12-09", "2026-12-15")
t(4, "Guías: revisión a fondo, datos que faltan e interfaz", "", "media", "2026-12-14", "2026-12-17", "Guille", "Manu")
t(4, "Sobres: nueva interfaz con el gasto más detallado", "", "media", "2026-12-15", "2026-12-18")
t(4, "Ajustes: revisarlos con datos reales y que Manu los valide", "", "alta", "2026-12-16", "2026-12-22", "Guille", "Manu")
t(4, "Dar acceso a una persona que compruebe que todo cuadra", "Del bloque Ajustes del PDF: alguien de F&T revisa ajustes y números.", "media", "2026-12-21", "2026-12-23", "Guille", "Manu")
hito(4, "Liquidaciones validadas por Manu", "2026-12-23")

# 5 · KPIs
t(5, "Decidir quién ve cada página de KPIs", "Propuesta en la matriz de roles.", "alta", "2027-01-04", wait="Manu")
t(5, "KPIs de reservas: repaso de la página actual", "", "media", "2027-01-04", "2027-01-05")
t(5, "KPIs de liquidaciones", "", "alta", "2027-01-05", "2027-01-07")
t(5, "KPIs de objetivos: cómo va la cosa", "Hacen falta los objetivos de F&T (los pone Manu).", "alta", "2027-01-06", "2027-01-08", "Guille", "Manu")
t(5, "KPIs de reseñas y de vigilancia", "Notas, volumen y, por persona, cuántas reseñas no ha atendido hoy.", "alta", "2027-01-08", "2027-01-12")
t(5, "KPIs de RRHH (solo rol RRHH)", "Ausencias, vacaciones, faltas, retrasos y días cumplidos.", "alta", "2027-01-11", "2027-01-14")
t(5, "Exportar a PDF con el sistema de diseño de F&T", "Hoy no existe (solo window.print en 3 pantallas). Pedir manual de marca o tomar colores y tipografía de la web.", "alta", "2027-01-11", "2027-01-14", "Guille", "Manual de marca F&T")
hito(5, "KPIs completos con PDF", "2027-01-15")

# 6 · Mensajes
t(6, "Notificaciones push en todos los dispositivos", "Web push en la PWA (public/sw.js no tiene push hoy). En iPhone solo funciona con la app añadida a pantalla de inicio (iOS 16.4+).", "alta", "2027-01-11", "2027-01-14")
t(6, "Adjuntos de todo tipo", "Hoy solo texto de hasta 4000 caracteres (supabase/mensajes.sql:26).", "alta", "2027-01-12", "2027-01-14")
t(6, "Grupos por departamento", "Los grupos ya existen; crearlos solos según rol.", "media", "2027-01-14", "2027-01-15")
t(6, "Guías: llamar o escribir por WhatsApp a sus clientes asignados", "Solo los de su subgrupo y el día del servicio (datos personales de clientes: RGPD).", "media", "2027-01-15", "2027-01-19")
t(6, "Plantillas de respuesta rápida", "", "media", "2027-01-18", "2027-01-19")
t(6, "Interfaz lo más parecida a WhatsApp", "", "media", "2027-01-18", "2027-01-22")
hito(6, "Mensajes 2.0", "2027-01-22")

# 7 · Reservas, flota y ajustes
t(7, "Reservas: lavado de interfaz", "", "media", "2027-01-18", "2027-01-22")
t(7, "Flota: repaso a fondo de la maqueta 3D", "Mejorar la experiencia; comprobar que todo funciona.", "media", "2027-01-19", "2027-01-22")
t(7, "Flota: mejoras del autocar y prueba completa", "La cabina del autocar está bastante bien; pulir.", "baja", "2027-01-25", "2027-01-27")
t(7, "Ajustes y Ayuda: actualizar la ayuda a los cambios", "Se quedan como están; solo actualizar los textos de ayuda.", "baja", "2027-01-27", "2027-01-29")

# 8 · Lanzamiento
t(8, "Avisar a los empleados de lo que se les va a pedir y de los datos que se tratan", "Aviso previo y por escrito, con el texto de la base legal.", "alta", "2027-01-25", "2027-01-27", "Ambos")
t(8, "Pruebas completas entrando con cada rol", "Admin, Desarrollo, RRHH, Administración, Guía y Conductor; en móvil y ordenador.", "alta", "2027-01-25", "2027-01-29")
t(8, "Formación y guía rápida por rol", "", "media", "2027-01-27", "2027-02-02", "Ambos")
t(8, "Despliegue y seguimiento de la primera semana", "", "alta", "2027-02-01", "2027-02-05")
hito(8, "App de F&T renovada", "2027-02-05")

# 9 · A futuro
t(9, "Chatbot en Mensajes", "", "baja")
t(9, "Buzones de correo redirigidos a la app", "", "baja")
t(9, "Stock (rol Administración)", "", "baja")

# ---------------------------------------------------------------- notas
N = [
    dict(kind="reunion", pinned=True, author="Guille", title="Reunión de renovación · 13 nov",
         body="Repaso de toda la app con F&T. Bloques: Reservas, Liquidaciones, KPI, Reseñas/Primas, Mensajes, RRHH, Ajustes, Roles y avisos legales. El PDF original está en el Escritorio (lol+.pdf); todo lo que dice está repartido en Tareas y en la pestaña Roles."),
    dict(kind="analisis", pinned=True, author="Guille", title="Contraste con la app actual (13 nov)",
         body="Mucho de lo pedido ya existe y es REORGANIZAR, no construir:\n• RRHH: fichaje con zonas y mapa, saldo de horas, documentos con reparto por DNI, ausencias con convenio y festivos, solicitudes, cuadrante, registro de jornada con Excel, ajustes y ayuda.\n• Liquidaciones: guías, sobres, tarifas configurables, ajustes por salida y cierre de mes. La rama liquidaciones-v5 ya está desplegada.\n• Roles: ya hay permisos por pestaña (10 secciones, no/ver/editar). Se amplía, no se rehace.\n• Mensajes: chat en tiempo real con grupos y no leídos.\n\nLo que NO existe: exportar a PDF (KPIs), notificaciones push, adjuntos y plantillas en el chat, exportar cuadrante y ausencias a Excel, validar ausencias con el horario de cada uno, fichar como teletrabajo, filtro «Hoy» en reseñas y fotos reales en Reseñas › Guías.\n\nProblemas detectados: el menú no hace scroll (falta overflow), el contenido no se centra (falta margin:auto) y github-main va 2 commits por delante de producción."),
    dict(kind="analisis", author="Guille", title="Por qué este orden",
         body="1) Roles y menú primero: RRHH, KPIs, Reseñas y Mensajes dependen de quién ve qué.\n2) RRHH antes que KPIs: el KPI de RRHH sale de sus datos.\n3) Reseñas: el registro de quién atiende cada reseña alimenta el KPI de vigilancia.\n4) Liquidaciones en diciembre porque depende de Manu (precios y ajustes).\n5) KPIs en enero, cuando ya hay datos de todo.\n6) Mensajes después: el push sirve también para los avisos de RRHH.\nDel 24 dic al 3 ene no hay nada planificado."),
    dict(kind="riesgo", author="Guille", title="Registro de jornada: es obligatorio",
         body="Quitar el listado general está bien, pero la empresa debe guardar el registro 4 años y enseñarlo a la Inspección y a la representación de los trabajadores (art. 34.9 ET). RRHH conserva la exportación y cada ajuste de fichaje deja rastro de quién, cuándo y por qué."),
    dict(kind="riesgo", author="Guille", title="Geolocalización al fichar",
         body="Solo en el momento de fichar, nunca seguimiento continuo, e informando antes y por escrito (art. 90 LOPDGDD). Encaja con la nota del PDF: avisar a los empleados de todo lo que se les vaya a pedir."),
    dict(kind="riesgo", author="Guille", title="Teléfonos de clientes en manos de los guías",
         body="Llamar o escribir por WhatsApp solo a los clientes asignados y el día del servicio; sin exportar ni copiar listados. Si no, es una cesión de datos difícil de justificar."),
    dict(kind="riesgo", author="Guille", title="Push en iPhone",
         body="Las notificaciones web solo llegan en iPhone si la app está añadida a la pantalla de inicio (iOS 16.4 o posterior). Hay que explicarlo en la formación."),
    dict(kind="pregunta", author="Guille", title="Rol Admin: «a petición, IA 100 % suya»",
         body="¿Quién es Admin (Manu, Millán…)? ¿Qué quiere decir «IA 100 % suya»: el Asistente solo para él, o una IA con acceso a todo?"),
    dict(kind="pregunta", author="Guille", title="Manu: ¿Admin o RRHH?",
         body="El PDF repite «RRHH o Manu» en Usuarios, Personal y Guías. Si Manu es Admin, ya lo ve todo; confirmar."),
    dict(kind="pregunta", author="Guille", title="Administración ve «KPIs todos», pero los de RRHH son solo para RRHH",
         body="Contradicción en el PDF. Propuesta: Administración ve todos los KPIs menos los de RRHH."),
    dict(kind="pregunta", author="Guille", title="¿Mensajes para el rol RRHH?",
         body="El PDF no se lo da a RRHH, pero sí a guías, conductores y administración. Lo lógico es que lo tengan todos."),
    dict(kind="pregunta", author="Guille", title="¿A qué rol pasan operador, lectura y empleado?",
         body="Los roles de hoy no coinciden con los nuevos. Hace falta la lista de usuarios con su rol nuevo."),
    dict(kind="pregunta", author="Guille", title="Reseñas sin ALDIA Reviews: ¿solo la interfaz o todo?",
         body="Propuesta: ALDIA Reviews sigue siendo el motor (misma base de datos, extensión y publicación) y la app de F&T solo cambia la puerta. Rehacer el motor en F&T sería duplicar trabajo."),
    dict(kind="pregunta", author="Guille", title="¿Cuántas horas de ausencias puntuales genera el convenio?",
         body="Necesario para el panel de horas generadas / disponibles / usadas."),
    dict(kind="pregunta", author="Guille", title="Stock (rol Administración)",
         body="¿Qué stock es: material, entradas, merchandising? Queda en «A futuro» hasta saberlo."),
    dict(kind="pregunta", author="Guille", title="Sistema de diseño de F&T para los PDF",
         body="¿Hay manual de marca (colores, tipografías, logotipos)? Si no, se toma de la web."),
    dict(kind="decision", author="Guille", title="Decidido en la reunión",
         body="• Turnos fuera.\n• El registro de jornada como listado general fuera: cada uno lo ve en su perfil.\n• Ajustes y Ayuda de RRHH se quedan como están.\n• Usuarios (cuentas de la app) y Personal (todos los trabajadores) son cosas distintas.\n• La vista de trabajador de RRHH la tiene todo el mundo.\n• Informes de reseñas pasan a KPIs."),
]

# ---------------------------------------------------------------- matriz de roles
COLS = ["Admin", "Desarrollo", "RRHH", "Administración", "Guías", "Conductores"]
ROWS = [
    ("Reservas (operativa)", "Reservas, salidas y flota del día", ["editar", "editar", "no", "ver", "ver", "ver"]),
    ("Liquidaciones y primas", "Tarifas, guías, sobres, ajustes y primas", ["editar", "editar", "editar", "no", "no", "no"]),
    ("Reseñas", "Responder, generar con IA y asignar guía", ["editar", "editar", "no", "editar", "no", "no"]),
    ("KPIs de reservas, liquidaciones y objetivos", "", ["ver", "ver", "?", "ver", "no", "no"]),
    ("KPIs de reseñas y vigilancia", "", ["ver", "ver", "no", "ver", "no", "no"]),
    ("KPIs de RRHH", "Ausencias, retrasos, días cumplidos", ["ver", "ver", "ver", "?", "no", "no"]),
    ("RRHH · vista trabajador", "Fichar, mis fichajes, documentos, ausencias. OBLIGATORIA para todos", ["propio", "propio", "propio", "propio", "propio", "propio"]),
    ("RRHH · vista administrativa", "Personal, cuadrante, solicitudes, documentos RRHH", ["editar", "editar", "editar", "no", "no", "no"]),
    ("Usuarios y Personal", "Cuentas de la app y ficha de todos los trabajadores", ["editar", "editar", "editar", "no", "no", "no"]),
    ("Mensajes", "Chat, grupos por departamento, contacto con clientes", ["editar", "editar", "?", "editar", "editar", "editar"]),
    ("Información propia", "Mis datos, mis guías asignadas, mis salidas", ["propio", "propio", "propio", "propio", "propio", "propio"]),
    ("Asistente IA", "«IA 100 % suya» en Admin", ["editar", "editar", "no", "no", "no", "no"]),
    ("Ajustes", "Revisión de que todos los números cuadren", ["editar", "editar", "?", "?", "no", "no"]),
    ("Stock (futuro)", "", ["editar", "editar", "no", "editar", "no", "no"]),
]
MATRIX = dict(
    title="Roles y permisos",
    intro="Propuesta sacada del PDF. Cuando se cierre, se pasan los roles a los usuarios y después los permisos a cada pestaña. Las casillas «?» son contradicciones o huecos a decidir con Manu.",
    cols=COLS, rows=[dict(name=n, desc=d, cells=c) for n, d, c in ROWS],
    foot="Admin: acceso total a lo que le interese, a petición. Desarrollo: todo.",
)

META = dict(
    areas=AREAS, matrix=MATRIX, source="PDF «Renovación app F&T» (lol+.pdf, 13-11-2026) contrastado con reservas-app (github-main)",
    remarks=[
        "Leyes y temas jurídicos: a salvo de todo, siempre.",
        "Avisar a los empleados de todo lo que se les vaya a pedir y de los datos que se traten.",
        "Todo se hace desde la app de F&T: nada lleva a ALDIA Reviews ni a otra web.",
        "Un solo menú: ninguna sección tiene su propio menú lateral.",
        "La vista de trabajador de RRHH la tiene todo el mundo, sea cual sea su rol.",
    ],
)

PROJECT = dict(
    slug="ft-renovacion", name="Renovación app F&T", client="Fun & Tickets", status="en_curso", color="#e8590c", owner="Guille",
    start_date="2026-11-13", end_date="2027-02-05", sort=1,
    summary="Control Center de F&T: un solo menú, roles nuevos, RRHH completo para el trabajador, reseñas dentro de la app, liquidaciones validadas, KPIs por área con PDF y mensajería tipo WhatsApp.",
)

# ---------------------------------------------------------------- SQL
out = []
w = out.append
w("""-- =====================================================================
-- ALDIA SMART CONNECT · PROYECTOS (sustituye a «Planificación»)
-- Ejecutar ENTERO en Supabase → SQL Editor. Se puede repetir sin duplicar nada.
-- Generado por scripts/proyectos_seed.py: si cambia el plan, editar allí y regenerar.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tablas ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE,
  name TEXT NOT NULL,
  client TEXT,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'planificado',  -- idea | planificado | en_curso | pausa | terminado
  color TEXT,
  owner TEXT,
  start_date DATE,
  end_date DATE,
  sort INTEGER DEFAULT 0,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,      -- áreas, principios, matriz de roles
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  area TEXT,
  kind TEXT NOT NULL DEFAULT 'tarea',           -- tarea | hito
  title TEXT NOT NULL,
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'pendiente',     -- pendiente | en_curso | revision | esperando | hecho | descartado
  priority TEXT NOT NULL DEFAULT 'media',       -- alta | media | baja
  owner TEXT,
  waiting_on TEXT,
  start_date DATE,
  end_date DATE,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  sort INTEGER DEFAULT 0,
  done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_tasks_project_idx ON project_tasks(project_id);

CREATE TABLE IF NOT EXISTS project_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES project_tasks(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'nota',            -- nota | decision | pregunta | riesgo | reunion | analisis
  title TEXT,
  body TEXT NOT NULL,
  author TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_notes_project_idx ON project_notes(project_id);

-- 2. Seguridad: lo mismo que seguridad_rls.sql, solo para estas tres tablas
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['projects', 'project_tasks', 'project_notes'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', tbl);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Solo equipo" ON public.%I', tbl);
    EXECUTE format('CREATE POLICY "Solo equipo" ON public.%I FOR ALL TO authenticated USING (public.is_team()) WITH CHECK (public.is_team())', tbl);
  END LOOP;
END $$;

-- 3. Lo que había en Planificación (gantt_items) pasa a un proyecto «Equipo ALDIA · Interno»
--    (gantt_items no se borra: se queda como copia)
DO $$
DECLARE pid UUID;
BEGIN
  IF to_regclass('public.gantt_items') IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM projects WHERE slug = 'aldia-interno') THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM gantt_items) THEN RETURN; END IF;
  INSERT INTO projects (slug, name, client, summary, status, color, owner, start_date, end_date, sort, meta)
  SELECT 'aldia-interno', 'Equipo ALDIA · Interno', 'ALDIA', 'Las tareas que había en Planificación.', 'en_curso', '#1e3a8a', 'Ambos',
         min(start_date), max(end_date), 2,
         jsonb_build_object('areas', (SELECT coalesce(jsonb_agg(DISTINCT jsonb_build_object('name', coalesce(category, 'Interno'),
           'color', CASE coalesce(category, 'Interno') WHEN 'Contenido' THEN '#fe2c55' WHEN 'Clientes' THEN '#0a66c2' WHEN 'Ventas' THEN '#12a26b' WHEN 'Producto' THEN '#e8590c' ELSE '#6c5ce7' END)), '[]'::jsonb) FROM gantt_items))
  FROM gantt_items
  RETURNING id INTO pid;
  INSERT INTO project_tasks (project_id, area, kind, title, detail, status, priority, owner, start_date, end_date, progress, done_at, created_at)
  SELECT pid, coalesce(category, 'Interno'), 'tarea', title, notes,
         CASE WHEN progress >= 100 THEN 'hecho' WHEN progress > 0 THEN 'en_curso' ELSE 'pendiente' END,
         'media', owner, start_date, end_date, progress, CASE WHEN progress >= 100 THEN now() END, created_at
  FROM gantt_items;
END $$;
""")

meta_json = json.dumps(META, ensure_ascii=False)
w("-- 4. Plan «Renovación app F&T» (solo si aún no está cargado)")
w("DO $$\nDECLARE pid UUID;\nBEGIN")
w("  IF EXISTS (SELECT 1 FROM projects WHERE slug = 'ft-renovacion') THEN RETURN; END IF;")
p = PROJECT
w(f"  INSERT INTO projects (slug, name, client, summary, status, color, owner, start_date, end_date, sort, meta) VALUES ({q(p['slug'])}, {q(p['name'])}, {q(p['client'])}, {q(p['summary'])}, {q(p['status'])}, {q(p['color'])}, {q(p['owner'])}, {q(p['start_date'])}, {q(p['end_date'])}, {p['sort']}, {q(meta_json)}::jsonb) RETURNING id INTO pid;")
w("  INSERT INTO project_tasks (project_id, area, kind, title, detail, status, priority, owner, waiting_on, start_date, end_date, progress, sort, done_at) VALUES")
rows = []
for i, x in enumerate(T):
    done = "'2026-11-13 18:00+01'" if x["status"] == "hecho" else "NULL"
    rows.append(f"    (pid, {q(x['area'])}, {q(x['kind'])}, {q(x['title'])}, {q(x['detail'])}, {q(x['status'])}, {q(x['priority'])}, {q(x['owner'])}, {q(x['waiting_on'])}, {q(x['start_date'])}, {q(x['end_date'])}, {x['progress']}, {i + 1}, {done})")
w(",\n".join(rows) + ";")
w("  INSERT INTO project_notes (project_id, kind, title, body, author, pinned, created_at) VALUES")
rows = []
for i, n in enumerate(N):
    rows.append(f"    (pid, {q(n['kind'])}, {q(n['title'])}, {q(n['body'])}, {q(n.get('author'))}, {q(bool(n.get('pinned')))}, '2026-11-13 19:00+01'::timestamptz + interval '{len(N) - i} seconds')")
w(",\n".join(rows) + ";")
w("END $$;\n")
w("-- 5. Comprobación\nSELECT p.name, count(t.id) AS tareas, (SELECT count(*) FROM project_notes n WHERE n.project_id = p.id) AS notas\nFROM projects p LEFT JOIN project_tasks t ON t.project_id = p.id GROUP BY p.id, p.name ORDER BY p.sort;")

path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "proyectos_setup.sql")
open(path, "w").write("\n".join(out) + "\n")
print(f"{len(T)} tareas · {len(N)} notas · {len(AREAS)} áreas → {os.path.normpath(path)}")
