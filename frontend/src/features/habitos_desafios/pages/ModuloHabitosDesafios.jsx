import { useEffect, useState } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import Fade from "@mui/material/Fade";
import Grow from "@mui/material/Grow";
import Slide from "@mui/material/Slide";
import Snackbar from "@mui/material/Snackbar";
import { CircleCheck, Sparkles, Sun } from "lucide-react";
import { useApi } from "../../../shared/hooks/useApi";
import { useMotionDuration } from "../../../shared/hooks/useMotionDuration";
import { careCategories, suggestedHabits, suggestedChallenges } from "../suggestions";
import "./HabitosDesafios.css";

const MODULE_PATH = "/habitos-desafios";
const FOCUS_OPTIONS = [{ id: "general", label: "General" }, ...careCategories];
const HABIT_UNITS = ["veces", "minutos", "sesiones", "rutinas", "lavados", "aplicaciones", "vasos"];
const CHALLENGE_UNITS = ["días", "sesiones", "rutinas", "lavados", "aplicaciones"];

function focusLabel(focus) {
  return FOCUS_OPTIONS.find((option) => option.id === focus)?.label || "General";
}

function FocusSelect({ value = "general" }) {
  return (
    <label>Enfoque
      <select name="focus" defaultValue={value}>
        {FOCUS_OPTIONS.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
      </select>
    </label>
  );
}

function UnitSelect({ units, value = units[0] }) {
  return (
    <label>Unidad
      <select name="unit" defaultValue={value}>
        {!units.includes(value) && <option value={value}>{value}</option>}
        {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
      </select>
    </label>
  );
}

async function readJson(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.error || "No se pudo completar la solicitud.");
  return data;
}

function ChallengeProgress({ challenge }) {
  const total = Math.max(1, challenge.duration_days || 1);
  const days = Math.min(total, Math.max(0, challenge.days_done || 0));
  const percent = Math.floor((days * 100) / total);

  return (
    <div className="habitos-progress-ring"
      role="progressbar" aria-label={`Progreso de ${challenge.title}`}
      aria-valuemin={0} aria-valuemax={total} aria-valuenow={days}
      aria-valuetext={`${days} de ${total} ${challenge.unit || "días"}, ${percent}%`}>
      <CircularProgress variant="determinate" value={percent} size={64} thickness={5}
        color="inherit" aria-hidden="true" />
      <span className="habitos-progress-label" aria-hidden="true">{percent}%</span>
    </div>
  );
}

function RoutineCard({ change, removing, timeout, complete, onRemoved, children }) {
  return (
    <Collapse in={!removing} timeout={timeout} onExited={onRemoved}>
      <Grow in appear={Boolean(change)} timeout={timeout}>
        <article className="habitos-list-item habitos-progress-row" data-complete={complete}>{children}</article>
      </Grow>
    </Collapse>
  );
}

function CareCategoryFilter({ value, onChange, label }) {
  return (
    <div className="habitos-category-filter" role="group" aria-label={label}>
      {careCategories.map((category) => (
        <button type="button" key={category.id} data-category={category.id} aria-pressed={category.id === value}
          onClick={() => onChange(category.id)}>{category.label}</button>
      ))}
    </div>
  );
}

function HabitForm({ habit, disabled, onSave, onCancel }) {
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const saved = await onSave({
      title: values.get("title"),
      description: values.get("description"),
      frequency: values.get("frequency"),
      target_value: Number(values.get("target")),
      unit: values.get("unit"),
      focus: values.get("focus"),
    });
    if (saved && !habit) form.reset();
  }

  return (
    <form onSubmit={submit}>
      <label>Nombre<input name="title" defaultValue={habit?.title || ""} maxLength={150} required /></label>
      <label>Descripción (opcional)<textarea name="description" defaultValue={habit?.description || ""} maxLength={500} rows={2} /></label>
      <div className="habitos-form-row">
        <label>Frecuencia
          <select name="frequency" defaultValue={habit?.frequency === "weekly" ? "weekly" : "daily"}>
            <option value="daily">Diaria</option>
            <option value="weekly">Semanal</option>
          </select>
        </label>
        <label>Meta<input type="number" name="target" defaultValue={habit?.target_value || 1} min={1} max={10000} required /></label>
        <UnitSelect units={HABIT_UNITS} value={habit?.unit || "veces"} />
      </div>
      <FocusSelect value={habit?.focus} />
      <div className="habitos-actions habitos-form-actions">
        <button type="submit" disabled={disabled}>{habit ? "Guardar cambios" : "Guardar hábito"}</button>
        {onCancel && <button type="button" disabled={disabled} className="habitos-secondary" onClick={onCancel}>Cancelar</button>}
      </div>
    </form>
  );
}

function ChallengeForm({ challenge, disabled, onSave, onCancel }) {
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const saved = await onSave({
      title: values.get("title"),
      description: values.get("description"),
      duration_days: Number(values.get("duration")),
      unit: values.get("unit"),
      focus: values.get("focus"),
    });
    if (saved && !challenge) form.reset();
  }

  return (
    <form onSubmit={submit}>
      <label>Nombre<input name="title" defaultValue={challenge?.title || ""} maxLength={150} required /></label>
      <label>Descripción (opcional)<textarea name="description" defaultValue={challenge?.description || ""} maxLength={500} rows={2} /></label>
      <div className="habitos-form-row">
        <label>Meta<input type="number" name="duration" defaultValue={challenge?.duration_days || 7} min={1} max={365} required /></label>
        <UnitSelect units={CHALLENGE_UNITS} value={challenge?.unit} />
        <FocusSelect value={challenge?.focus} />
      </div>
      <small>Cada registro suma una unidad por día.</small>
      <div className="habitos-actions habitos-form-actions">
        <button type="submit" disabled={disabled}>{challenge ? "Guardar cambios" : "Guardar desafío"}</button>
        {onCancel && <button type="button" disabled={disabled} className="habitos-secondary" onClick={onCancel}>Cancelar</button>}
      </div>
    </form>
  );
}

export default function ModuloHabitosDesafios() {
  const { fetchConAuth } = useApi();
  const [habits, setHabits] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState("habits");
  const [editingHabitId, setEditingHabitId] = useState(null);
  const [editingChallengeId, setEditingChallengeId] = useState(null);
  const [cardChange, setCardChange] = useState(null);
  const [removingCard, setRemovingCard] = useState(null);
  const [announcement, setAnnouncement] = useState("");
  const [addFeedback, setAddFeedback] = useState(null);
  const [habitCategory, setHabitCategory] = useState("face");
  const [challengeCategory, setChallengeCategory] = useState("face");
  const motionDuration = useMotionDuration(280);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const [habitData, challengeData] = await Promise.all(["habitos", "retos"].map(async (path) =>
          readJson(await fetchConAuth(`${MODULE_PATH}/${path}`, { signal: controller.signal }))));
        if (controller.signal.aborted) return;
        setHabits(habitData.items);
        setChallenges(challengeData.items);
      } catch (err) {
        if (!controller.signal.aborted) setLoadError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [fetchConAuth]);

  async function save(kind, method, path, data) {
    if (busy || removingCard || loading || loadError) return false;
    setBusy(true);
    setError("");
    setAnnouncement("");
    try {
      const response = await readJson(await fetchConAuth(`${MODULE_PATH}/${kind}${path}`, {
        method,
        body: data ? JSON.stringify(data) : undefined,
      }));
      const setter = kind === "habitos" ? setHabits : setChallenges;
      const itemType = kind === "habitos" ? "Hábito" : "Desafío";
      if (method === "DELETE") {
        setRemovingCard({ kind, id: path.slice(1) });
        return true;
      } else if (method === "POST" || (method === "PUT" && !path.endsWith("/progreso"))) {
        const added = method === "POST";
        setCardChange({ id: response.id });
        if (added) {
          setAddFeedback({ id: response.id, kind, title: response.title, open: true });
        } else {
          setAnnouncement(`${itemType} actualizado.`);
        }
      }
      setter((current) => {
        if (method === "POST") return [response, ...current];
        return current.map((item) => item.id === response.id ? response : item);
      });
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  function finishRemoval() {
    if (!removingCard) return;
    const { kind, id } = removingCard;
    const setItems = kind === "habitos" ? setHabits : setChallenges;
    setItems((items) => items.filter((item) => item.id !== id));
    setRemovingCard(null);
    setAnnouncement(kind === "habitos" ? "Hábito retirado de tu lista." : "Desafío retirado de tu lista.");
  }

  function removeFromRoutine(kind, item) {
    const type = kind === "habitos" ? "hábito" : "desafío";
    if (window.confirm(`¿Quitar el ${type} «${item.title}»? Se conservará el progreso registrado.`)) {
      return save(kind, "DELETE", `/${item.id}`);
    }
  }

  const disabled = busy || loading || Boolean(loadError) || Boolean(removingCard);

  return (
    <div className="habitos-page" data-view={view}>
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

      <div className="habitos-view-switch" role="group" aria-label="Elegir vista de seguimiento">
        <button type="button" aria-controls="habitos-personal habitos-propuestas" aria-pressed={view === "habits"}
          onClick={() => setView("habits")}>
          <Sun size={21} aria-hidden="true" /> Hábitos
        </button>
        <button type="button" aria-controls="desafios-personal desafios-propuestas" aria-pressed={view === "challenges"}
          onClick={() => setView("challenges")}>
          <Sparkles size={21} aria-hidden="true" /> Desafíos
        </button>
      </div>

      {loading && <p role="status">Cargando tu progreso…</p>}
      {loadError && <p className="habitos-error" role="alert">{loadError}</p>}
      {error && <p className="habitos-error" role="alert">{error}</p>}
      <span className="habitos-live-status" role="status">{announcement}</span>
      {addFeedback && (
        <Snackbar key={addFeedback.id} open={addFeedback.open} autoHideDuration={4400}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          slots={{ transition: Slide }} slotProps={{ transition: { direction: "up" } }}
          transitionDuration={motionDuration}
          onClose={(_, reason) => {
            if (reason !== "clickaway") setAddFeedback((current) => current && { ...current, open: false });
          }}>
          <div className="habitos-add-feedback" role="status" data-kind={addFeedback.kind}>
            <span className="habitos-add-feedback-icon" aria-hidden="true"><CircleCheck size={23} /></span>
            <div>
              <strong>{addFeedback.kind === "habitos" ? "Hábito agregado" : "Desafío iniciado"}</strong>
              <span>{addFeedback.title}</span>
            </div>
          </div>
        </Snackbar>
      )}
      {!loading && !loadError && (
        <Fade in={view === "habits"} timeout={motionDuration}>
          <section id="habitos-personal" className="habitos-daily-card habitos-tracker" aria-labelledby="my-habits-title"
            hidden={view !== "habits"}>
            <h2 id="my-habits-title">Mis hábitos</h2>
            {habits.length === 0 && <p className="habitos-section-description">Agrega una sugerencia o crea tu propio hábito.</p>}
            <div className="habitos-list">
              {habits.map((habit) => {
                if (editingHabitId === habit.id) {
                  return (
                    <article className="habitos-list-item habitos-create habitos-edit-item" key={habit.id}>
                      <h3>Modificar hábito</h3>
                      <HabitForm habit={habit} disabled={disabled} onCancel={() => setEditingHabitId(null)}
                        onSave={async (data) => {
                          const saved = await save("habitos", "PUT", `/${habit.id}`, data);
                          if (saved) setEditingHabitId(null);
                          return saved;
                        }} />
                    </article>
                  );
                }
                const target = habit.target_value > 0 ? habit.target_value : 1;
                const unit = habit.unit || "veces";
                const weekly = habit.frequency === "weekly";
                const progress = habit.period_value;
                return (
                  <RoutineCard key={habit.id} change={cardChange?.id === habit.id}
                    removing={removingCard?.id === habit.id} timeout={motionDuration}
                    complete={progress >= target} onRemoved={finishRemoval}>
                    <div>
                      <h3>{habit.title}</h3>
                      <p className="habitos-focus-label">{focusLabel(habit.focus)}</p>
                      {habit.description && <p>{habit.description}</p>}
                      <p>{weekly ? "Esta semana" : "Hoy"} · {progress} de {target} {unit}{progress >= target ? " · Meta cumplida" : ""}</p>
                      <progress aria-label={`Progreso de ${habit.title}`} value={Math.min(progress, target)} max={target} />
                    </div>
                    <div className="habitos-actions">
                      {target === 1 && !weekly ? (
                        <button type="button" disabled={disabled} aria-pressed={habit.today_value > 0}
                          onClick={() => save("habitos", "PUT", `/${habit.id}/progreso`, { value: habit.today_value ? 0 : 1 })}>
                          {habit.today_value ? "Desmarcar hoy" : "Completar hoy"}
                        </button>
                      ) : (
                        <>
                          <span>Hoy · {habit.today_value}</span>
                          <button type="button" disabled={disabled || habit.today_value === 0} aria-label={`Restar a ${habit.title}`}
                            onClick={() => save("habitos", "PUT", `/${habit.id}/progreso`, { value: habit.today_value - 1 })}>−</button>
                          <button type="button" disabled={disabled || habit.today_value >= 10000} aria-label={`Sumar a ${habit.title}`}
                            onClick={() => save("habitos", "PUT", `/${habit.id}/progreso`, { value: habit.today_value + 1 })}>+</button>
                        </>
                      )}
                      <button type="button" className="habitos-secondary" disabled={disabled}
                        aria-label={`Modificar ${habit.title}`} onClick={() => setEditingHabitId(habit.id)}>Modificar</button>
                      <button type="button" className="habitos-secondary" disabled={disabled}
                        aria-label={`Quitar ${habit.title} de mi rutina`}
                        onClick={() => removeFromRoutine("habitos", habit)}>Quitar de mi rutina</button>
                    </div>
                  </RoutineCard>
                );
              })}
            </div>
            <details className="habitos-create">
              <summary>Crear hábito</summary>
              <HabitForm disabled={disabled} onSave={(data) => save("habitos", "POST", "", data)} />
            </details>
          </section>
        </Fade>
      )}

      {!loading && !loadError && (
        <Fade in={view === "challenges"} timeout={motionDuration}>
          <section id="desafios-personal" className="habitos-daily-card habitos-tracker" aria-labelledby="my-challenges-title"
            hidden={view !== "challenges"}>
            <h2 id="my-challenges-title">Mis desafíos</h2>
            {challenges.length === 0 && <p className="habitos-section-description">Empieza un desafío sugerido o crea el tuyo.</p>}
            <div className="habitos-list">
              {challenges.map((challenge) => editingChallengeId === challenge.id ? (
                <article className="habitos-list-item habitos-create habitos-edit-item" key={challenge.id}>
                  <h3>Modificar desafío</h3>
                  <ChallengeForm challenge={challenge} disabled={disabled} onCancel={() => setEditingChallengeId(null)}
                    onSave={async (data) => {
                      const saved = await save("retos", "PUT", `/${challenge.id}`, data);
                      if (saved) setEditingChallengeId(null);
                      return saved;
                    }} />
                </article>
              ) : (
                <RoutineCard key={challenge.id} change={cardChange?.id === challenge.id}
                  removing={removingCard?.id === challenge.id} timeout={motionDuration}
                  complete={challenge.status === "completed"} onRemoved={finishRemoval}>
                  <div className="habitos-challenge-progress">
                    <ChallengeProgress challenge={challenge} />
                    <div>
                      <h3>{challenge.title}</h3>
                      <p className="habitos-focus-label">{focusLabel(challenge.focus)}</p>
                      {challenge.description && <p>{challenge.description}</p>}
                      <p>{challenge.days_done} de {challenge.duration_days} {challenge.unit || "días"}
                        {challenge.status === "completed" ? " · Completado" : challenge.status === "active" ? "" : " · Inactivo"}</p>
                    </div>
                  </div>
                  <div className="habitos-actions">
                    {(challenge.status === "active" || challenge.done_today) && (
                      <button type="button" disabled={disabled} aria-pressed={challenge.done_today}
                        onClick={() => save("retos", "PUT", `/${challenge.id}/progreso`, { done: !challenge.done_today })}>
                        {challenge.done_today ? "Desmarcar hoy" : "Registrar hoy"}
                      </button>
                    )}
                    <button type="button" className="habitos-secondary" disabled={disabled}
                      aria-label={`Modificar desafío ${challenge.title}`}
                      onClick={() => setEditingChallengeId(challenge.id)}>Modificar</button>
                    <button type="button" className="habitos-secondary" disabled={disabled}
                      aria-label={`Quitar desafío ${challenge.title}`}
                      onClick={() => removeFromRoutine("retos", challenge)}>Quitar desafío</button>
                  </div>
                </RoutineCard>
              ))}
            </div>
            <details className="habitos-create">
              <summary>Crear desafío</summary>
              <ChallengeForm disabled={disabled} onSave={(data) => save("retos", "POST", "", data)} />
            </details>
          </section>
        </Fade>
      )}

      <Fade in={view === "habits"} timeout={motionDuration}>
        <section id="habitos-propuestas" className="habitos-daily-card" aria-labelledby="daily-title"
          data-category={habitCategory} hidden={view !== "habits"}>
          <div className="habitos-section-kicker">
            <Sun size={17} aria-hidden="true" />
            <span>IDEAS PARA TU RUTINA</span>
          </div>
          <h2 id="daily-title">Hábitos sugeridos</h2>
          <CareCategoryFilter value={habitCategory} onChange={setHabitCategory} label="Filtrar hábitos por zona de cuidado" />

          <div className="habitos-list">
            {suggestedHabits[habitCategory].map((habit) => {
              const Icon = habit.icon;
              const added = habits.some((item) => item.title === habit.label);
              return (
                <Grow in key={habit.id} timeout={motionDuration}>
                  <article className="habitos-list-item">
                    <span className="habitos-list-icon">
                      <Icon size={19} aria-hidden="true" />
                    </span>
                    <div>
                      <h3>{habit.label}</h3>
                      <p>{habit.description}</p>
                      <p>{habit.frequency === "weekly" ? "Semanal" : "Diario"}</p>
                    </div>
                    <div className="habitos-actions">
                      <button type="button" disabled={disabled || added}
                        onClick={() => save("habitos", "POST", "", {
                          title: habit.label, description: habit.description,
                          frequency: habit.frequency || "daily", focus: habitCategory,
                        })}>
                        {added ? "Agregado" : "Agregar"}
                      </button>
                    </div>
                  </article>
                </Grow>
              );
            })}
          </div>
        </section>
      </Fade>

      <Fade in={view === "challenges"} timeout={motionDuration}>
        <section id="desafios-propuestas" className="habitos-challenges-section" aria-labelledby="challenges-title"
          data-category={challengeCategory} hidden={view !== "challenges"}>
          <div className="habitos-section-heading">
            <div>
              <h2 id="challenges-title">Desafíos sugeridos</h2>
            </div>
          </div>
          <CareCategoryFilter value={challengeCategory} onChange={setChallengeCategory} label="Filtrar desafíos por zona de cuidado" />

          <div className="habitos-challenge-grid">
            {suggestedChallenges[challengeCategory].map((challenge) => {
              const Icon = challenge.icon;
              const started = challenges.some((item) => item.title === challenge.title && item.status === "active");
              return (
                <Grow in key={challenge.id} timeout={motionDuration}>
                  <article className="habitos-challenge-card">
                    <div className="habitos-challenge-card-heading">
                      <span className="habitos-challenge-icon">
                        <Icon size={21} aria-hidden="true" />
                      </span>
                      <span className="habitos-challenge-duration">
                        {challenge.days} días
                      </span>
                    </div>
                    <h3>{challenge.title}</h3>
                    <p>{challenge.description}</p>
                    <div className="habitos-actions">
                      <button type="button" disabled={disabled || started}
                        onClick={() => save("retos", "POST", "", {
                          title: challenge.title, description: challenge.description,
                          duration_days: challenge.days, focus: challengeCategory,
                        })}>
                        {started ? "En progreso" : "Empezar desafío"}
                      </button>
                    </div>
                  </article>
                </Grow>
              );
            })}
          </div>
        </section>
      </Fade>
    </div>
  );
}
