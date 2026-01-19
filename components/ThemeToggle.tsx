
import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg border transition-all duration-300 
                 bg-white dark:bg-slate-800 
                 border-slate-200 dark:border-slate-700 
                 text-slate-400 dark:text-yellow-400 
                 hover:bg-slate-50 dark:hover:bg-slate-700
                 shadow-sm"
      title={theme === 'dark' ? "切換至亮色模式" : "切換至深色模式"}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4" />
      ) : (
        <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
      )}
    </button>
  );
};
