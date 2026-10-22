import { Heart, MessageCircle, UsersRound } from "lucide-react";
import "./ComunidadForo.css";

const samplePosts = [
  {
    id: 1,
    author: "Mariana R.",
    initials: "MR",
    time: "Hace 20 min",
    topic: "Rutinas",
    title: "¿Cómo hacen para mantener una rutina sencilla?",
    content:
      "Estoy tratando de no usar demasiados productos. ¿Qué pasos sienten que son los esenciales para empezar el día?",
  },
  {
    id: 2,
    author: "Sofía L.",
    initials: "SL",
    time: "Hace 1 h",
    topic: "Piel sensible",
    title: "Aprendiendo a escuchar mi piel",
    content:
      "He empezado a introducir los productos de uno en uno y a observar cómo responde mi piel. Me está ayudando a conocerla mejor.",
  },
  {
    id: 3,
    author: "Daniela M.",
    initials: "DM",
    time: "Ayer",
    topic: "Recomendaciones",
    title: "Un recordatorio amable sobre el protector solar",
    content:
      "Dejé mi protector junto a las llaves y ahora me resulta más fácil acordarme antes de salir.",
  },
];

export default function ModuloComunidadForo() {
  return (
    <div className="comunidad-page">
      <header className="comunidad-header">
        <div>
          <p className="comunidad-eyebrow">UN ESPACIO PARA COMPARTIR</p>
          <h1>Comunidad Skinova</h1>
          <p className="comunidad-intro">
            Conversaciones cercanas para aprender y acompañarnos en el cuidado
            de la piel.
          </p>
        </div>
        <div className="comunidad-members">
          <UsersRound size={19} aria-hidden="true" />
          <span>Un espacio de apoyo y respeto</span>
        </div>
      </header>

      <div className="comunidad-layout">
        <main className="comunidad-feed">
          <section className="comunidad-feed-heading">
            <div>
              <h2>Conversaciones</h2>
              <p>Experiencias compartidas con respeto y sin juicios.</p>
            </div>
          </section>

          <div className="comunidad-post-list">
            {samplePosts.map((post) => (
              <article className="comunidad-post-card" key={post.id}>
                <header className="comunidad-post-author">
                  <div className="comunidad-avatar">{post.initials}</div>
                  <div>
                    <p>{post.author}</p>
                    <span>{post.time}</span>
                  </div>
                  <span className="comunidad-post-topic">{post.topic}</span>
                </header>
                <h3>{post.title}</h3>
                <p className="comunidad-post-content">{post.content}</p>
                <footer className="comunidad-post-footer">
                  <span>
                    <Heart size={17} aria-hidden="true" />
                    Una conversación para acompañarnos
                  </span>
                  <span>
                    <MessageCircle size={17} aria-hidden="true" />
                    Comparte con respeto
                  </span>
                </footer>
              </article>
            ))}
          </div>
        </main>

        <aside className="comunidad-guidelines">
          <span className="comunidad-guidelines-icon">
            <Heart size={20} aria-hidden="true" />
          </span>
          <h2>Un espacio amable</h2>
          <p>
            Cada piel y cada experiencia son distintas. Compartimos para
            acompañarnos, no para juzgar ni sustituir una consulta profesional.
          </p>
          <ul>
            <li>Habla desde tu experiencia.</li>
            <li>Respeta los procesos de cada persona.</li>
            <li>Evita recomendar diagnósticos o tratamientos.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
