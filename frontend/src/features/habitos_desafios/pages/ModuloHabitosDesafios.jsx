import { Droplets, Leaf, Moon, Sparkles, Sun } from "lucide-react";
import "./HabitosDesafios.css";

const suggestedHabits = [
  {
    id: "cleanse",
    label: "Limpiar mi rostro con suavidad",
    description: "Un comienzo sencillo para tu rutina.",
    icon: Droplets,
  },
  {
    id: "moisturize",
    label: "Aplicar crema hidratante",
    description: "Un momento para cuidar la barrera de la piel.",
    icon: Sparkles,
  },
  {
    id: "sun-protection",
    label: "Recordar la protección solar",
    description: "Un hábito consciente para el día.",
    icon: Sun,
  },
];

const suggestedChallenges = [
  {
    id: "water",
    title: "Una pausa para hidratarte",
    description:
      "Haz una pausa durante el día para tomar agua y reconectar contigo.",
    duration: "7 días",
    icon: Droplets,
  },
  {
    id: "evening",
    title: "Cierre tranquilo del día",
    description:
      "Regálate unos minutos de cuidado consciente antes de ir a dormir.",
    duration: "5 días",
    icon: Moon,
  },
  {
    id: "consistency",
    title: "Constancia sin presión",
    description:
      "Observa cómo se siente tu piel y mantén una rutina sencilla.",
    duration: "10 días",
    icon: Leaf,
  },
];

export default function ModuloHabitosDesafios() {
  return (
    <div className="habitos-page">
      <header className="habitos-header">
        <div>
          <p className="habitos-eyebrow">PEQUEÑOS PASOS, A TU RITMO</p>
          <h1>Hábitos y desafíos</h1>
          <p className="habitos-intro">
            Ideas sencillas para acompañar tu cuidado diario, sin presión y a tu
            propio ritmo.
          </p>
        </div>
        <div className="habitos-reminder">
          <span>
            <Sparkles size={20} aria-hidden="true" />
          </span>
          <div>
            <strong>Un día a la vez</strong>
            <small>Tu proceso no tiene que ser perfecto</small>
          </div>
        </div>
      </header>

      <section className="habitos-daily-card" aria-labelledby="daily-title">
        <div className="habitos-section-kicker">
          <Sun size={17} aria-hidden="true" />
          <span>IDEAS PARA TU RUTINA</span>
        </div>
        <h2 id="daily-title">Hábitos de cuidado diario</h2>
        <p className="habitos-section-description">
          Pequeñas acciones que puedes adaptar a lo que tu piel necesita.
        </p>

        <div className="habitos-list">
          {suggestedHabits.map((habit) => {
            const Icon = habit.icon;
            return (
              <article className="habitos-list-item" key={habit.id}>
                <span className="habitos-list-icon">
                  <Icon size={19} aria-hidden="true" />
                </span>
                <div>
                  <h3>{habit.label}</h3>
                  <p>{habit.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="habitos-challenges-section" aria-labelledby="challenges-title">
        <div className="habitos-section-heading">
          <div>
            <p className="habitos-eyebrow">INSPIRACIÓN PARA TI</p>
            <h2 id="challenges-title">Desafíos amables</h2>
            <p>Algunas ideas para explorar cuando te apetezca.</p>
          </div>
        </div>

        <div className="habitos-challenge-grid">
          {suggestedChallenges.map((challenge) => {
            const Icon = challenge.icon;
            return (
              <article className="habitos-challenge-card" key={challenge.id}>
                <div className="habitos-challenge-card-heading">
                  <span className="habitos-challenge-icon">
                    <Icon size={21} aria-hidden="true" />
                  </span>
                  <span className="habitos-challenge-duration">
                    {challenge.duration}
                  </span>
                </div>
                <h3>{challenge.title}</h3>
                <p>{challenge.description}</p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
