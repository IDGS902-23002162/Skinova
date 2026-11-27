import { useEffect, useId, useRef, useState } from "react";
import Fade from "@mui/material/Fade";
import { ImagePlus, X } from "lucide-react";
import { useMotionDuration } from "../../../shared/hooks/useMotionDuration";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

export default function ReplyImagePicker({ disabled }) {
  const inputRef = useRef(null);
  const hintId = useId();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const motionDuration = useMotionDuration();

  useEffect(() => {
    const input = inputRef.current;
    const form = input.form;
    function reset() {
      input.setCustomValidity("");
      setFile(null);
      setError("");
    }
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, []);

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function chooseImage(event) {
    const input = event.currentTarget;
    const selected = input.files[0];
    const message = selected && (!IMAGE_TYPES.includes(selected.type) || selected.size > MAX_SIZE)
      ? "Elige una imagen JPG, PNG o WebP de hasta 5 MB."
      : "";
    if (message) input.value = "";
    input.setCustomValidity(message);
    setError(message);
    setFile(message ? null : selected || null);
  }

  function clearImage() {
    inputRef.current.value = "";
    inputRef.current.setCustomValidity("");
    setFile(null);
    setError("");
    inputRef.current.focus();
  }

  return (
    <div className="comunidad-reply-image">
      <div className={`comunidad-image-picker comunidad-reply-image-picker${error ? " comunidad-image-picker-error" : ""}`}>
        <input ref={inputRef} name="image" type="file" accept={IMAGE_TYPES.join(",")} disabled={disabled}
          aria-label="Adjuntar imagen a la respuesta" aria-describedby={hintId} aria-invalid={Boolean(error)}
          onChange={chooseImage} />
        <span className="comunidad-image-picker-icon" aria-hidden="true"><ImagePlus size={21} /></span>
        <span className="comunidad-image-picker-copy">
          <strong>{file ? "Cambiar imagen" : "Adjuntar imagen"}</strong>
          <span id={hintId} title={file?.name}>{file?.name || "Opcional · JPG, PNG o WebP · hasta 5 MB"}</span>
        </span>
      </div>
      {preview && file && (
        <Fade in timeout={motionDuration}>
          <img className="comunidad-reply-image-preview" src={preview} alt="Vista previa de la imagen adjunta" />
        </Fade>
      )}
      {error && <p role="alert" className="comunidad-form-error">{error}</p>}
      {(file || error) && (
        <button type="button" className="comunidad-reply-image-clear" disabled={disabled} onClick={clearImage}>
          <X size={15} aria-hidden="true" /> Quitar imagen
        </button>
      )}
    </div>
  );
}
