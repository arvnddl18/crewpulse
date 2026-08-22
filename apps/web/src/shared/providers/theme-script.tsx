/**
 * Inline script that runs before React hydration to set `data-theme`
 * from localStorage, preventing a flash of wrong theme.
 */
export function ThemeScript() {
  const script = `(function(){try{var t=localStorage.getItem("crewpulse-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}})()`
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
