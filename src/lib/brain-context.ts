/**
 * Conocimiento de negocio sobre cómo se usa el CRM de Decelera, que no se deduce de los nombres de las columnas.
 * Se incluye tal cual en el prompt del Brain. Es texto plano: cualquiera del equipo puede editarlo.
 * Regla: solo hechos confirmados por el equipo. Si un dato cambia en el CRM, se cambia aquí.
 */
export const CRM_CONTEXT = `Cómo funciona el CRM (deals):
- La edición del programa va en historico.deals_live.stage (sin tildes): "Leads Menorca 2026", "Menorca 2026", "Menorca 2027", "Leads Menorca 2027", "Leads Mexico 2026", "Mexico 2026", "Mexico 2027". Los deals de México 2026 son los de stage 'Mexico 2026' y 'Leads Mexico 2026' (usa stage ILIKE '%Mexico 2026%'); igual con Menorca y los años. La columna program NO indica la edición: es otra cosa (Potential Program, Inversión Pre-Program) y casi siempre está vacía. No la uses para filtrar por edición.
- historico.deals_live.status es el estado ACTUAL del deal: Contacted, In play, Qualified, Pre-committee, Invested, Not qualified o Killed.
- El CRM no guarda el historial de cambios de estado, con una excepción: la columna status_6 guarda el ÚLTIMO status que tuvo el deal antes de pasar a Killed. Solo tiene valor en deals Killed (y no en todos: si es null, no se sabe por dónde pasó).
- pre_committee_output es el resultado del precomité (Program, Fast Track o KO). Si está informado, el deal pasó por precomité.
- Por tanto, "deals que han llegado a precomité" = status = 'Pre-committee' (están ahora), más status_6 = 'Pre-committee' (murieron estando en precomité), más los que tienen pre_committee_output informado. Dalo como una sola cifra con ese desglose. Para otras etapas (p. ej. Qualified) aplica el mismo criterio con status y status_6.
- Límite que sí conviene mencionar, en una frase: un deal que pasó por una etapa y hoy está en un estado posterior (p. ej. Invested) o está Killed sin status_6 no deja rastro de esa etapa salvo en pre_committee_output.`;
