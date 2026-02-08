import { useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import useConfigStore from "./stores/configStore";

function App() {
  const theme = useConfigStore(s => s.theme);
  const setEffectiveTheme = useConfigStore(s => s.setEffectiveTheme);

  useEffect(() => {
    const apply = (dark: boolean) => {
      document.documentElement.classList.toggle('dark', dark);
      setEffectiveTheme(dark ? 'dark' : 'light');
    };

    if (theme === 'dark') {
      apply(true);
    } else if (theme === 'light') {
      apply(false);
    } else {
      // system
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      apply(mq.matches);
      const handler = (e: MediaQueryListEvent) => apply(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme]);

  return <Dashboard />;
}

export default App;
