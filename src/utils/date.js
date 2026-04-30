export function formatDate(iso) {
  if (!iso) return "-";

  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function getLogDateParts(iso) {
  if (!iso) return { day: "-", month: "-", time: "-" };

  const date = new Date(iso);

  return {
    day: date.toLocaleDateString("id-ID", { day: "2-digit" }),
    month: date.toLocaleDateString("id-ID", { month: "short" }),
    time: date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}
