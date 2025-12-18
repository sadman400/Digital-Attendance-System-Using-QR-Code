import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { 
  LayoutDashboard, 
  BookOpen, 
  QrCode, 
  ClipboardList, 
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  ChevronRight,
  Users,
  Calendar
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ classes: [], students: [] });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef(null);

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search functionality
  useEffect(() => {
    const searchData = async () => {
      if (!searchQuery.trim()) {
        setSearchResults({ classes: [], students: [] });
        setSearchOpen(false);
        return;
      }

      setSearchLoading(true);
      setSearchOpen(true);

      try {
        const response = await api.get('/classes');
        const classes = response.data;
        const query = searchQuery.toLowerCase();

        // Filter classes by name or code
        const filteredClasses = classes.filter(c => 
          c.name.toLowerCase().includes(query) || 
          c.code.toLowerCase().includes(query)
        );

        // For teachers, also search students within their classes
        let filteredStudents = [];
        if (isTeacher) {
          classes.forEach(c => {
            if (c.students) {
              c.students.forEach(student => {
                if (
                  student.name?.toLowerCase().includes(query) ||
                  student.email?.toLowerCase().includes(query) ||
                  student.studentId?.toLowerCase().includes(query)
                ) {
                  // Avoid duplicates
                  if (!filteredStudents.find(s => s._id === student._id)) {
                    filteredStudents.push({ ...student, className: c.name, classId: c._id });
                  }
                }
              });
            }
          });
        }

        setSearchResults({ classes: filteredClasses.slice(0, 5), students: filteredStudents.slice(0, 5) });
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearchLoading(false);
      }
    };

    const debounce = setTimeout(searchData, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, isTeacher]);

  const handleSearchSelect = (type, item) => {
    setSearchQuery('');
    setSearchOpen(false);
    if (type === 'class') {
      navigate(`/classes/${item._id}`);
    } else if (type === 'student') {
      navigate(`/classes/${item.classId}`);
    }
  };

  // Generate notifications based on user role
  useEffect(() => {
    const generateNotifications = () => {
      const now = new Date();
      if (isTeacher) {
        setNotifications([
          {
            id: 1,
            type: 'info',
            title: 'Welcome to AttendQR',
            message: 'Create your first class to start tracking attendance',
            time: new Date(now - 1000 * 60 * 5), // 5 mins ago
            read: false
          },
          {
            id: 2,
            type: 'success',
            title: 'System Ready',
            message: 'QR code generation is ready to use',
            time: new Date(now - 1000 * 60 * 30), // 30 mins ago
            read: false
          },
          {
            id: 3,
            type: 'tip',
            title: 'Pro Tip',
            message: 'QR codes expire after 5 minutes for security',
            time: new Date(now - 1000 * 60 * 60), // 1 hour ago
            read: true
          }
        ]);
      } else {
        setNotifications([
          {
            id: 1,
            type: 'info',
            title: 'Welcome to AttendQR',
            message: 'Join a class using the code from your teacher',
            time: new Date(now - 1000 * 60 * 5),
            read: false
          },
          {
            id: 2,
            type: 'tip',
            title: 'Quick Tip',
            message: 'Use Scan QR to mark your attendance quickly',
            time: new Date(now - 1000 * 60 * 60),
            read: true
          }
        ]);
      }
    };
    generateNotifications();
  }, [isTeacher]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Classes', href: '/classes', icon: BookOpen },
    ...(isTeacher ? [] : [
      { name: 'Scan QR', href: '/scan', icon: QrCode },
      { name: 'My Attendance', href: '/my-attendance', icon: ClipboardList },
    ]),
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-72 bg-[#0d1321] border-r border-white/5 transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0 flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between h-20 px-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <QrCode className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">AttendQR</span>
          </div>
          <button 
            className="lg:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 mt-8 px-4">
          <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Main Menu
          </p>
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`
                flex items-center gap-3 px-4 py-3.5 mb-2 rounded-xl transition-all duration-200
                ${isActive(item.href) 
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/20' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <item.icon className={`h-5 w-5 ${isActive(item.href) ? 'text-cyan-400' : ''}`} />
              <span className="font-medium">{item.name}</span>
              {isActive(item.href) && (
                <ChevronRight className="h-4 w-4 ml-auto" />
              )}
            </Link>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 mb-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-3 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-20 flex items-center justify-between px-4 lg:px-8 border-b border-white/5 bg-[#0d1321]/95 backdrop-blur-xl sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden text-gray-400 hover:text-white"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-400">
              <span>Pages</span>
              <span>/</span>
              <span className="text-white font-medium">
                {navigation.find(n => isActive(n.href))?.name || 'Dashboard'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative" ref={searchRef}>
              <div className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl">
                <Search className="h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder={isTeacher ? "Search classes, students..." : "Search classes..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery && setSearchOpen(true)}
                  className="bg-transparent text-sm text-white placeholder-gray-500 outline-none w-48"
                />
                {searchLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border border-cyan-500 border-t-transparent"></div>
                )}
              </div>

              {/* Search Results Dropdown */}
              {searchOpen && (searchResults.classes.length > 0 || searchResults.students.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#151928] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[300px]">
                  {/* Classes Results */}
                  {searchResults.classes.length > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-white/5 border-b border-white/10">
                        <p className="text-xs font-semibold text-gray-400 uppercase">Classes</p>
                      </div>
                      {searchResults.classes.map((classItem) => (
                        <button
                          key={classItem._id}
                          onClick={() => handleSearchSelect('class', classItem)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                        >
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                            <BookOpen className="h-4 w-4 text-cyan-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{classItem.name}</p>
                            <p className="text-xs text-gray-400 font-mono">{classItem.code}</p>
                          </div>
                          <span className="text-xs text-gray-500">
                            <Users className="h-3 w-3 inline mr-1" />
                            {classItem.students?.length || 0}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Students Results (Teachers only) */}
                  {isTeacher && searchResults.students.length > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-white/5 border-b border-white/10">
                        <p className="text-xs font-semibold text-gray-400 uppercase">Students</p>
                      </div>
                      {searchResults.students.map((student) => (
                        <button
                          key={student._id}
                          onClick={() => handleSearchSelect('student', student)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                        >
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center">
                            <span className="text-emerald-400 font-semibold text-sm">
                              {student.name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{student.name}</p>
                            <p className="text-xs text-gray-400">{student.studentId || student.email}</p>
                          </div>
                          <span className="text-xs text-gray-500 truncate max-w-[80px]">
                            {student.className}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* No Results */}
              {searchOpen && searchQuery && !searchLoading && searchResults.classes.length === 0 && searchResults.students.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#151928] border border-white/10 rounded-xl shadow-2xl z-50 p-6 text-center min-w-[300px]">
                  <Search className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No results found for "{searchQuery}"</p>
                </div>
              )}
            </div>
            
            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2.5 text-gray-400 hover:text-white bg-white/5 border border-white/10 rounded-xl transition-colors"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cyan-400 rounded-full"></span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {notificationsOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setNotificationsOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 bg-[#151928] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-white/10">
                      <h3 className="font-semibold text-white">Notifications</h3>
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllAsRead}
                          className="text-xs text-cyan-400 hover:text-cyan-300"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center">
                          <Bell className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                          <p className="text-gray-400 text-sm">No notifications</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            onClick={() => markAsRead(notification.id)}
                            className={`p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${
                              !notification.read ? 'bg-cyan-500/5' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                notification.type === 'success' ? 'bg-emerald-400' :
                                notification.type === 'tip' ? 'bg-yellow-400' : 'bg-cyan-400'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white">{notification.title}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{notification.message}</p>
                                <p className="text-xs text-gray-500 mt-1">{getTimeAgo(notification.time)}</p>
                              </div>
                              {!notification.read && (
                                <div className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="p-3 border-t border-white/10">
                      <button 
                        onClick={() => setNotificationsOpen(false)}
                        className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {/* User Avatar (mobile) */}
            <div className="lg:hidden w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <span className="text-white font-bold">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
