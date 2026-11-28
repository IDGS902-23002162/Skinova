import { Droplets, Leaf, Moon, Sparkles, Sun } from "lucide-react";

export const careCategories = [
  { id: "face", label: "Cara" },
  { id: "hair", label: "Cabello" },
  { id: "beard", label: "Barba" },
  { id: "feet", label: "Pies" },
];

export const suggestedHabits = {
  face: [
    { id: "cleanse", label: "Limpiar mi rostro con suavidad", description: "Retira la suciedad del día con tu limpiador habitual.", icon: Droplets },
    { id: "moisturize", label: "Aplicar crema hidratante", description: "Usa la crema que ya forma parte de tu rutina facial.", icon: Sparkles },
    { id: "sun-protection", label: "Recordar la protección solar", description: "Incluye el protector solar en tu rutina de mañana.", icon: Sun },
    { id: "remove-makeup", label: "Retirar el maquillaje antes de dormir", description: "Si usaste maquillaje, retíralo al terminar el día.", icon: Moon },
  ],
  hair: [
    { id: "detangle-hair", label: "Desenredar el cabello con suavidad", description: "Desenreda con cuidado y evita los tirones.", icon: Leaf },
    { id: "wash-scalp", label: "Lavar el cabello y enjuagar bien", description: "Registra un lavado en el día que prefieras de tu rutina.", icon: Droplets, frequency: "weekly" },
    { id: "condition-hair", label: "Usar acondicionador en el lavado", description: "Aplícalo según las indicaciones del envase.", icon: Sparkles, frequency: "weekly" },
    { id: "clean-hairbrush", label: "Limpiar el cepillo o peine", description: "Retira el cabello y limpia la herramienta según su material.", icon: Leaf, frequency: "weekly" },
  ],
  beard: [
    { id: "wash-beard", label: "Lavar la barba", description: "Limpia la barba y la piel de debajo con suavidad.", icon: Droplets },
    { id: "brush-beard", label: "Cepillar la barba", description: "Acomoda la barba con tu peine o cepillo habitual.", icon: Leaf },
    { id: "condition-beard", label: "Aplicar acondicionador para barba", description: "Usa tu acondicionador, aceite o bálsamo según el envase.", icon: Sparkles },
    { id: "clean-trimmer", label: "Limpiar el peine o la recortadora", description: "Limpia tus herramientas siguiendo sus instrucciones.", icon: Leaf, frequency: "weekly" },
  ],
  feet: [
    { id: "wash-feet", label: "Lavar y secar los pies", description: "Al secarlos, presta atención a los espacios entre los dedos.", icon: Droplets },
    { id: "moisturize-heels", label: "Hidratar los talones", description: "Aplica tu crema habitual sobre los talones.", icon: Sparkles },
    { id: "change-socks", label: "Cambiarme los calcetines", description: "Ponte un par limpio y seco.", icon: Sun },
    { id: "check-footwear", label: "Revisar y ventilar el calzado", description: "Deja que se seque antes de volver a usarlo.", icon: Leaf, frequency: "weekly" },
  ],
};

export const suggestedChallenges = {
  face: [
    { id: "face-morning", title: "Protección solar por la mañana", description: "Registra cada mañana que incluyas protector solar en tu rutina.", days: 7, icon: Sun },
    { id: "face-evening", title: "Limpieza facial al cerrar el día", description: "Completa una limpieza suave al final del día y regístrala.", days: 5, icon: Moon },
    { id: "face-hydration", title: "Constancia con mi hidratante facial", description: "Registra cada día que uses tu hidratante habitual.", days: 10, icon: Droplets },
  ],
  hair: [
    { id: "hair-wash", title: "Registrar mis días de lavado", description: "Registra cada día de lavado de tu rutina habitual.", days: 3, icon: Droplets },
    { id: "hair-condition", title: "Acondicionador en mis lavados", description: "Registra cada lavado en que uses acondicionador.", days: 3, icon: Sparkles },
    { id: "hair-detangle", title: "Desenredar sin tirones", description: "Marca cada día que desenredes tu cabello con suavidad.", days: 5, icon: Leaf },
  ],
  beard: [
    { id: "beard-wash", title: "Limpieza de barba con constancia", description: "Registra cada día que laves y enjuagues tu barba.", days: 7, icon: Droplets },
    { id: "beard-brush", title: "Cepillar mi barba cada mañana", description: "Marca cada mañana que dediques un momento a cepillarla.", days: 5, icon: Sun },
    { id: "beard-condition", title: "Incorporar mi bálsamo para barba", description: "Registra cada vez que lo uses en un día distinto.", days: 5, icon: Sparkles },
  ],
  feet: [
    { id: "feet-dry", title: "Pies limpios y bien secos", description: "Registra los días en que laves y seques bien tus pies.", days: 7, icon: Droplets },
    { id: "feet-heel", title: "Cuidar mis talones por la noche", description: "Registra cada noche que apliques tu crema habitual en los talones.", days: 5, icon: Moon },
    { id: "feet-socks", title: "Calcetines limpios cada día", description: "Marca cada día que empieces con un par limpio y seco.", days: 7, icon: Sun },
  ],
};
