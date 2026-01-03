import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LayoutDashboard, Calendar, CalendarDays, BookOpen, LogOut, Menu, X, Sun, Moon, Monitor, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

const MainLayout = () => {
  const { logout, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Timetable', path: '/timetable', icon: CalendarDays },
    { label: 'Attendance', path: '/today', icon: Calendar },
    { label: 'Subjects', path: '/subjects', icon: BookOpen },
    { label: 'Calendar', path: '/calendar', icon: CalendarDays },
  ];

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
            <div className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 p-1.5 rounded-lg">
                <Sparkles className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Attendance</h1>
        </div>
        <button onClick={toggleMobileMenu} className="md:hidden text-muted-foreground hover:text-foreground">
            <X className="w-6 h-6" />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={clsx(
                "flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-4">
          {/* Theme Toggle */}
          <div className="p-1 bg-muted rounded-lg flex">
              {['light', 'dark'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={clsx(
                        "flex-1 flex items-center justify-center py-1.5 rounded-md text-xs font-medium transition-all",
                        theme === t
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                      {t === 'light' && <Sun className="w-4 h-4" />}
                      {t === 'dark' && <Moon className="w-4 h-4" />}
                      {t === 'system' && <Monitor className="w-4 h-4" />}
                  </button>
              ))}
          </div>

          <div className="flex items-center px-2">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold mr-3 text-foreground">
                  {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="overflow-hidden flex-1">
                  <p className="text-sm font-medium truncate text-foreground">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <button
                  onClick={logout}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                  title="Logout"
              >
                  <LogOut className="w-4 h-4" />
              </button>
          </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background text-foreground font-sans transition-colors duration-300">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-card/80 backdrop-blur-xl border-r border-border hidden md:block">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-card/80 backdrop-blur-lg border-b border-border z-40 px-4 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <div className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 p-1.5 rounded-lg">
                <Sparkles className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">Attendance</h1>
        </div>
        <button onClick={toggleMobileMenu} className="p-2 text-foreground">
            <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-16 md:pt-0 pb-20 md:pb-0 relative scroll-smooth">
         {/* Background Decoration */}
         <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
             <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-200/20 dark:bg-purple-900/10 rounded-full blur-[100px]" />
             <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-sky-200/20 dark:bg-sky-900/10 rounded-full blur-[100px]" />
         </div>

         <div className="max-w-7xl mx-auto p-4 md:p-8 pb-6 md:pb-8 relative z-10 w-full">
            <Outlet />
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleMobileMenu}
              className="fixed inset-0 bg-black/50 z-50 md:hidden backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-3/4 max-w-xs bg-card z-50 md:hidden shadow-2xl"
            >
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation - Glass Design */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
        <div className="bg-card/95 backdrop-blur-xl border-t border-border shadow-2xl">
          <div className="flex items-center justify-around px-2 py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 min-w-[64px] active:scale-95",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={clsx(
                    "w-5 h-5 transition-transform",
                    isActive && "scale-110"
                  )} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default MainLayout;
