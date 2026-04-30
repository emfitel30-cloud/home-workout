export function getUserIcon(gender) {
  if (gender === "female") {
    return `
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="5" stroke="currentColor" stroke-width="2.2"/>
        <path d="M12 13v8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M8.5 17.5h7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M15 4h5v5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M20 4l-6.2 6.2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="9" cy="15" r="5" stroke="currentColor" stroke-width="2.2"/>
    </svg>
  `;
}

export function trashIcon() {
  return `
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18" aria-hidden="true">
      <path d="M4 7h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M10 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M6 7l1 14h10l1-14" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <path d="M9 7V4h6v3" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    </svg>
  `;
}
