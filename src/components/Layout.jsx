import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Home, 
  CheckSquare, 
  Package, 
  Calendar, 
  Users, 
  Settings, 
  LogOut,
  Menu,
  X,
  User,
  ShoppingCart,
  Building,
  Sun,
  Moon
} from 'lucide-react';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavigationItems = () => {
    const baseItems = [
      { name: 'Dashboard', href: '/dashboard', icon: Home },
    ];

    if (user?.role === 'user') {
      return [
        ...baseItems,
        { name: 'To-Do List', href: '/todos', icon: CheckSquare },
        { name: 'Request Item', href: '/requests', icon: Package },
        { name: 'My Assets', href: '/assets', icon: Building },
        { name: 'Meeting Room', href: '/meetings', icon: Calendar },
      ];
    }

    if (user?.role === 'admin') {
      return [
        ...baseItems,
        { name: 'User Management', href: '/admin/users', icon: Users },
        { name: 'All To-Dos', href: '/admin/todos', icon: CheckSquare },
        { name: 'Request Items', href: '/admin/requests', icon: Package },
        { name: 'Asset Management', href: '/admin/assets', icon: Building },
        { name: 'Meetings', href: '/admin/meetings', icon: Calendar },
        { name: 'Visitors', href: '/admin/visitors', icon: User },
      ];
    }

    if (user?.role === 'procurement') {
      return [
        ...baseItems,
        { name: 'Procurement', href: '/procurement/requests', icon: ShoppingCart },
        { name: 'Assets', href: '/procurement/assets', icon: Building },
      ];
    }

    return baseItems;
  };

  const navigationItems = getNavigationItems();

  return (
    <div className="min-h-screen bg-light-gradient dark:bg-dark-gradient transition-colors duration-300">
      {/* Mobile sidebar */}
        <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600/75 dark:bg-gray-900/75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white dark:bg-gray-900 shadow-xl border-r border-gray-200 dark:border-gray-800">
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">GA System</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-4">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                    className={`mb-2 flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 border border-primary-100 dark:bg-primary-900/20 dark:text-primary-300 dark:border-primary-900'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
          <div className="flex flex-grow flex-col overflow-y-auto bg-white dark:bg-gray-900 shadow-lg border-r border-gray-200 dark:border-gray-800">
          <div className="flex h-16 items-center px-4 border-b border-gray-200 dark:border-gray-800">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">GA System</h1>
          </div>
          <nav className="flex-1 px-4 py-4">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`mb-2 flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 border border-primary-100 dark:bg-primary-900/20 dark:text-primary-300 dark:border-primary-900'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 items-center justify-between bg-white/80 dark:bg-gray-900/80 backdrop-blur px-4 shadow-sm border-b border-gray-200 dark:border-gray-800 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex items-center space-x-4">
            
            <div className="text-sm">
              <p className="font-medium text-gray-900">{user?.name}</p>
              <p className="text-gray-500 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center rounded-lg px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 hover:text-primary-800 dark:text-primary-300 dark:hover:bg-primary-900/20 dark:hover:text-primary-200 transition-colors duration-200"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 lg:p-6 bg-transparent min-h-screen transition-colors duration-300">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
