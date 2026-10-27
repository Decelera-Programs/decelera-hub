// Comentarios de los Experience Makers sobre cada equipo (México 2026), solo los más relevantes y resumidos en una idea.
// Fuente: notas "<Startup> - Human - founders" del vault Mexico 2026 (evento 1 a 1 con Experience Makers), que a su vez salen de
// OneOnOneAudioSubmission (transcripts y notas escritas). Curados a mano y traducidos/condensados; NO son citas literales.
// Solo EMs: se dejan fuera las observaciones de miembros del equipo Decelera (Raquel Polgrabia, Diego Navarro, Marcos Martín).
// Se omite lo que su autora pidió descartar (Martha Salinas sobre José María Arellano, CoverCap).
// La clave es el nombre exacto de la startup (Startup.name). Humano Lab no tiene comentarios.

export interface EmComment {
  tone: "pos" | "neg";
  text: string;
  /** Experience Maker que lo dice. */
  who: string;
  /** Founder al que se refiere, si no es el equipo en general. */
  about?: string;
}

const pos = (who: string, text: string, about?: string): EmComment => ({ tone: "pos", who, text, about });
const neg = (who: string, text: string, about?: string): EmComment => ({ tone: "neg", who, text, about });

export const EM_COMMENTS: Record<string, EmComment[]> = {
  "Angela Care": [
    pos("Martha Salinas", "Gran equipo, buena dinámica y misión sólida."),
    pos("Martin Davalos", "Muy complementarios, con energía e ideas muy claras sobre un problema fundamental."),
    pos("Eyal Shats", "El equipo es un claro punto fuerte: experiencia previa en una startup de alto crecimiento y mucha química."),
  ],
  CoverCap: [
    pos("Beth Susanne", "Tienen las skills adecuadas y están muy motivados."),
    pos("Martin Davalos", "Uno de los founders aporta 10 años de experiencia y relaciones en seguros: muy valioso."),
    neg("Martin Davalos", "Dudas sobre la complementariedad: el otro founder no le causó buena impresión."),
    neg("Martin Davalos", "Teme dificultades de liderazgo y ejecución a futuro."),
    neg("Martha Salinas", "No está segura de que invertiría."),
  ],
  Fonder: [
    pos("Martha Salinas", "Llegó muy preparado, curioso y con ganas de escuchar.", "Lucas V."),
    pos("Lucas Mailland", "Emprendedor con potencial enorme: receptivo, inteligente y muy esforzado.", "Lucas V."),
    pos("Lucas Mailland", "Está dispuesto a dejarlo todo y mudarse para crecer: muy valorable.", "Lucas V."),
  ],
  Galo: [
    pos("Martha Salinas", "Gran dinámica de equipo y muy buenas preguntas."),
    pos("Lucas Mailland", "Roles claros y se apoyan entre ellos; el co-founder de producto, espectacular."),
    pos("Lucas Mailland", "Uno de los founders más experimentados del programa: buen líder y muy trabajador.", "Tomás"),
    neg("Rui Fernandes", "Fallas graves de operabilidad y deuda organizacional; falta un process owner."),
    neg("Lucas Mailland", "Para atacar México debe mudarse, no ir y venir.", "Tomás"),
  ],
  Inner: [
    pos("Martha Salinas", "Los dos muy apasionados con su solución."),
    pos("Diego Meller", "Tienen muy claro cuál es el problema."),
    pos("Lucas Mailland", "Muy preparados y receptivos."),
    neg("Martin Davalos", "No convencen: falta visión diferenciada, claridad estratégica y ejecución."),
    neg("Lucas Mailland", "De los menos fuertes para invertir: sin diferencial claro."),
    neg("Martha Salinas (vía Kamil)", "Testarudos con su ICP: siguieron empeñados aunque ella les dijo que no funcionaba."),
  ],
  Kleva: [
    pos("Martha Salinas", "Conoce el tema y su perfil técnico ayuda.", "Ed"),
    pos("Martin Davalos", "Extraordinariamente inteligente, perfil técnico sólido y tracción comercial muy fuerte.", "Ed"),
    pos("Lucas Mailland", "Experto en su negocio: sabe llegar al mercado, operar y levantar capital.", "Ed"),
    neg("Martin Davalos", "Duda de su capacidad para construir organización, delegar y desarrollar talento.", "Ed"),
    neg("Martha Salinas", "No hizo preguntas y daba la impresión de saberlo todo: duda si acepta feedback.", "Ed"),
    neg("Lucas Mailland", "Se pone a la defensiva con el feedback; ya lo está trabajando.", "Ed"),
  ],
  MexinLabs: [
    pos("Martha Salinas", "Gran background y gran dinámica entre los founders."),
    pos("Lucas Mailland", "Mucha pasión: se expusieron para recibir feedback y mejoraron mucho."),
    neg("Martin Davalos", "Mucha energía, pero dudas sobre el product-market fit."),
    neg("Lucas Mailland", "Podrían rendir más con un founder con más experiencia."),
  ],
  Nexcar: [
    pos("Martha Salinas", "Invertiría sin dudarlo: humilde, buenas preguntas y visión.", "Mauricio"),
    pos("Eyal Shats", "Conoce a fondo el problema y su red ya ha dado tracción inicial.", "Mauricio"),
    neg("Eyal Shats", "Debe demostrar que atrae y lidera talento, menos dependiente del founder."),
  ],
  "Prelude Health - Hormony": [
    pos("Martha Salinas", "Un gran producto."),
    neg("Martha Salinas", "Le falta saber venderlo.", "Mayra"),
    neg("Martin Davalos", "Falta claridad de go-to-market y liderazgo comercial; incluso un CEO con más ejecución.", "Mayra"),
    neg("Lucas Mailland", "Muy dispersa en mercados y poco preparada para crecer.", "Mayra"),
  ],
  Signa: [
    pos("Martin Davalos", "Founder excelente, misión muy clara y modelo que puede escalar rápido.", "Daniel"),
    pos("Martha Salinas", "Fantástico founder: gran background y apasionado.", "Daniel"),
    pos("Lucas Mailland", "Una de las startups top del programa; muy enfocado.", "Daniel"),
    neg("Martin Davalos", "Debe depender menos del founder y abrir más verticales y ICP.", "Daniel"),
    neg("Martha Salinas", "Problemas con customer success, pero arreglables con talento y procesos.", "Daniel"),
  ],
  Talentum: [
    pos("Martin Davalos", "Le gustó Martín.", "Martín"),
    neg("Martin Davalos", "Más dudas con el otro founder y con la complementariedad del equipo."),
  ],
  XOUL: [
    pos("Martha Salinas", "Founder inteligente y dispuesto a escuchar.", "Alejo"),
    neg("Lucas Mailland", "Le falta hambre y empuje para crecer rápido y levantar capital en B2C.", "Alejo"),
    neg("Rui Fernandes", "La distribución B2C no es el fuerte del equipo."),
  ],
};
