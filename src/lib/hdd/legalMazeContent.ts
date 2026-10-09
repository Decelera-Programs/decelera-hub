// Contenido del Legal Maze según el doc "26MEX Legal maze v3 DEF" (Google Doc 1CR6dVkqQIwiP7twzxVntBQN4uC5dns3N9xNhvxUoh9I).
// Orden de opciones verificado contra legal-maze-forms/server/dilemmas.js: choice 0 = A = opción 1, 1 = B, 2 = C.
// "positive" y "negative" son la lectura del doc: explicación del facilitador, NO puntuación. Sin imports (lo carga Node en los tests).

export interface LegalOptionContent {
  letter: "A" | "B" | "C";
  /** Resumen corto de la opción. */
  short: string;
  /** Texto completo, igual que en el formulario. */
  text: string;
  /** Lectura "Positivo" del doc, tal cual. */
  positive: string;
  /** Lectura "Negativo" del doc, tal cual. */
  negative: string;
}
export interface LegalDilemmaContent {
  id: "D1" | "D2" | "D3" | "D4" | "D5";
  title: string;
  /** Tema (Socios, Inversionista...). */
  theme: string;
  kpiLabel: string;
  /** Subtítulo del doc tras el KPI. */
  hook: string;
  options: [LegalOptionContent, LegalOptionContent, LegalOptionContent];
}

export const LEGAL_MAZE_CONTENT: LegalDilemmaContent[] = [
  {
    id: "D1", title: "Dilema 1 — Socios", theme: "Socios", kpiLabel: "Integridad", hook: "El cliff que no existe en papel",
    options: [
      {
        letter: "A", short: "Formaliza ahora, con fechas que lo dejan fuera",
        text: "Formalizas el acuerdo ahora, con fechas que lo dejan fuera, y se lo dices cuando ya está firmado.",
        positive: "Ordenas el cap table antes de que el fondo lo pida.",
        negative: "Usas el papel como emboscada contra alguien que confió sin papeles.",
      },
      {
        letter: "B", short: "Espera a que él proponga la fecha de salida",
        text: "Esperas a que él proponga la fecha de salida y ves si se da cuenta solo.",
        positive: "Evitas la conversación difícil y técnicamente no mientes.",
        negative: "Deshonestidad pasiva. Parece prudencia y es espera calculada.",
      },
      {
        letter: "C", short: "Le dice hoy que el acuerdo nunca se firmó",
        text: "Le dices hoy que el acuerdo nunca se firmó, qué implica, y deciden a partir de ahí.",
        positive: "Le entrega justo la información que le da ventaja a él.",
        negative: "Abre una negociación incómoda con una ronda encima.",
      },
    ],
  },
  {
    id: "D2", title: "Dilema 2 — Inversionista", theme: "Inversionista", kpiLabel: "Ambición", hook: "El term sheet único",
    options: [
      {
        letter: "A", short: "Rechaza y deja que la empresa muera",
        text: "Rechazas y dejas que la empresa muera con los términos intactos.",
        positive: "No entrega control ni firma algo irreversible.",
        negative: "Confunde principios con parálisis. La cláusula que evitó nunca se iba a ejecutar.",
      },
      {
        letter: "B", short: "Firma sin cuestionar",
        text: "Firmas sin cuestionar. Lo urgente es sobrevivir; ya renegociarás en la siguiente.",
        positive: "Liquidez inmediata y continuidad para el equipo.",
        negative: "Compromete cinco años de cap table por dos meses de caja.",
      },
      {
        letter: "C", short: "Reduce burn con los cofounders y busca alternativas",
        text: "Hablas con tus cofounders, reducen burn —lo que conlleva reducir sueldos— y buscan otras alternativas para sacar a flote la compañía.",
        positive: "Compra tiempo con lo único que controla de verdad, y reparte el sacrificio empezando por su propio sueldo.",
        negative: "Recortar no consigue el millón. Si en dos meses no aparece otra alternativa, vuelve al mismo fondo con menos caja y menos poder.",
      },
    ],
  },
  {
    id: "D3", title: "Dilema 3 — Cliente", theme: "Cliente", kpiLabel: "Confianza", hook: "El cliente que paga tres veces más",
    options: [
      {
        letter: "A", short: "Ajusta el pricing al resto de clientes",
        text: "Entiendes que el valor de tu producto es mayor y ajustas el pricing al resto de clientes, con la posibilidad de que cancelen.",
        positive: "Lee el dato como lo que es: una prueba de mercado que alguien ya pagó durante seis meses.",
        negative: "Sube el precio a todos a partir de una sola cuenta, y puede perder clientes que sí estaban bien valorados.",
      },
      {
        letter: "B", short: "Avisa al cliente, asumiendo el riesgo",
        text: "Avisas, asumiendo el riesgo de que puedas perder a ese cliente grande.",
        positive: "Pone la relación por delante del ingreso y la deja limpia antes de la renovación.",
        negative: "Nadie le pidió el descuento. Regala 40k al año y le enseña al cliente que su precio era inventado.",
      },
      {
        letter: "C", short: "Renueva y no dice nada",
        text: "Renuevas y no dices nada.",
        positive: "40k más al año sin mover un dedo, y el cliente está satisfecho con lo que recibe.",
        negative: "El día que hable con otro cliente del sector —y va a pasar— no pierde 40k: pierde la cuenta y la referencia.",
      },
    ],
  },
  {
    id: "D4", title: "Dilema 4 — Comprador", theme: "Comprador", kpiLabel: "Pensamiento no convencional", hook: "La oferta que deja a tu socio fuera",
    options: [
      {
        letter: "A", short: "Una reunión más antes de contarle",
        text: "Aceptas una reunión más para entender mejor antes de contarle.",
        positive: "Consigues información antes de abrir algo que puede romper la sociedad.",
        negative: "Una reunión más es la entrada. Cada junta hace más difícil contarlo.",
      },
      {
        letter: "B", short: "Dice que no y no se lo menciona",
        text: "Dices que no de inmediato y no se lo mencionas, para no meterle ruido.",
        positive: "Lealtad instantánea y sin costo emocional para él.",
        negative: "Decide por los dos. Protegerlo de una decisión no es respetarlo.",
      },
      {
        letter: "C", short: "Se lo cuenta esa misma tarde y deciden juntos",
        text: "Se lo cuentas esa misma tarde, completo, y deciden juntos.",
        positive: "Trata la sociedad como lo que es.",
        negative: "Entrega el control de la decisión y puede costar el deal.",
      },
    ],
  },
  {
    id: "D5", title: "Dilema 5 — Socios", theme: "Socios", kpiLabel: "Integridad", hook: "El socio ausente, versión secundario",
    options: [
      {
        letter: "A", short: "Toma los 800k él o ella",
        text: "Tomas los 800k tú. Llevas cuatro años sosteniendo esto y un founder con la cabeza tranquila rinde más que uno ahogado. Lo de tu socio se resuelve después de la ronda.",
        positive: "El desgaste financiero del founder operativo es real y el fondo lo entiende perfectamente.",
        negative: "Usa un argumento verdadero sobre la compañía para resolver un problema propio, y deja el tema del socio para cuando la ventana ya se cerró.",
      },
      {
        letter: "B", short: "Le compra su parte con los 800k",
        text: "Le ofreces comprarle su parte con esos 800k, a la valoración de la ronda anterior, porque es lo justo considerando que lleva tres meses sin aportar.",
        positive: "Él sale con liquidez en un momento en que la necesita, y el cap table queda limpio antes de que el fondo pregunte.",
        negative: "La trampa cómoda. Parece generosidad y es comprar barato aprovechando que está débil, decidiendo por los dos qué vale su trabajo de cuatro años.",
      },
      {
        letter: "C", short: "Pone el tema sobre la mesa antes de repartir",
        text: "Pones el tema sobre la mesa con él y con el fondo antes de repartir nada: qué pasa con su rol, y el secundario se decide después de esa conversación.",
        positive: "Separa la pregunta de la sociedad de la pregunta del dinero, que es la única forma de que ninguna contamine a la otra.",
        negative: "Abre una conversación que puede enfriar la ronda a tres semanas del cierre.",
      },
    ],
  },
];
