const sentAtFormat = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Mexico_City",
});

export default function ForumSentAt({ value }) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return <time dateTime={value} className="comunidad-sent-at">{sentAtFormat.format(date)}</time>;
}
