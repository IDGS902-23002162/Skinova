export default function FloatButton({ onClick }) {
  return (
    <button className="float-button comunidad-create-button" type="button" onClick={onClick}
      aria-label="Agregar una publicación" title="Agregar una publicación">
      <span aria-hidden="true">+</span>
      <span className="comunidad-create-label">Publicar</span>
    </button>
  );
}
