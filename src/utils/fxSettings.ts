// Visual FX Preference Manager with localStorage Sync

export const FX_CHANGE_EVENT = "coup_fx_settings_change";

export function getHighFxSetting(): boolean {
  try {
    const saved = localStorage.getItem("coup_high_fx");
    if (saved !== null) {
      return saved === "true";
    }
  } catch {}
  return true; // Default high FX enabled
}

export function setHighFxSetting(enabled: boolean): void {
  try {
    localStorage.setItem("coup_high_fx", String(enabled));
  } catch {}
  window.dispatchEvent(new CustomEvent(FX_CHANGE_EVENT, { detail: { highFx: enabled } }));
}

