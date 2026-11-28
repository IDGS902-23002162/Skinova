import PropTypes from "prop-types";
import "../styles/FilterBar.css";

function FilterBar({ tipos, tipoActivo, buscarPor, onSeleccionar,onBuscar }) {
  return (
    <div className="community-filter-controls">
      <section className="search_for">
        <div className="search_box">
          <label className="search_head" htmlFor="buscar_comentario">
            Buscar en la comunidad
          </label>
          <input
            id="buscar_comentario"
            type="search"
            maxLength={100}
            value={buscarPor}
            onChange={(e) => onBuscar(e.target.value)}
            className="buscar_comentario"
            placeholder="Ej. rutina para piel sensible"
          />
        </div>
      </section>
      <section className="filter_bar">
        <span className="filter_head">Explorar por tema</span>

        <div className="filter_options">
          <button
            type="button"
            className={`filter_button ${tipoActivo === "Todos" ? "active" : ""}`}
            onClick={() => onSeleccionar("Todos")}
            aria-pressed={tipoActivo === "Todos"}
          >
            Todos
          </button>

          {tipos
            .filter((tipo) => tipo !== "Todos")
            .map((tipo) => (
              <button
                type="button"
                key={tipo}
                className={`filter_button ${tipoActivo === tipo ? "active" : ""}`}
                onClick={() => onSeleccionar(tipo)}
                aria-pressed={tipoActivo === tipo}
              >
                {tipo}
              </button>
            ))}
        </div>
      </section>
    </div>
  );
}

FilterBar.propTypes = {
  tipos: PropTypes.arrayOf(PropTypes.string).isRequired,
  tipoActivo: PropTypes.string.isRequired,
  onSeleccionar: PropTypes.func.isRequired,
  buscarPor: PropTypes.string.isRequired,
  onBuscar: PropTypes.func.isRequired,  

};

export default FilterBar;
