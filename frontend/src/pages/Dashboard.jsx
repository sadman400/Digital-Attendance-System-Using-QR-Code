import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { BookOpen, Users, QrCode, CheckCircle, Clock, TrendingUp, ArrowUpRight, Sparkles, Plus } from 'lucide-react';

function Dashboard() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [stats, setStats] = useState({ totalClasses: 0, totalStudents: 0, todayAttendance: 0 });
  const [loading, setLoading] = useState(true);

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const classesRes = await api.get('/classes');
      setClasses(classesRes.data);

      if (isTeacher) {
        const totalStudents = classesRes.data.reduce((acc, c) => acc + (c.students?.length || 0), 0);
        setStats({
          totalClasses: classesRes.data.length,
          totalStudents,
          todayAttendance: 0
        });
      } else {
        const attendanceRes = await api.get('/attendance/my-attendance');
        setStats({
          totalClasses: classesRes.data.length,
          totalAttendance: attendanceRes.data.length,
          presentCount: attendanceRes.data.filter(a => a.status === 'present').length
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Classes */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1f2e] to-[#151928] border border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Total Classes</p>
              <p className="text-3xl font-bold text-white">{stats.totalClasses}</p>
              <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                Active
              </p>
            </div>
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
              <BookOpen className="h-7 w-7 text-cyan-400" />
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl"></div>
        </div>

        {/* Total Students / Present Days */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1f2e] to-[#151928] border border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">{isTeacher ? 'Total Students' : 'Present Days'}</p>
              <p className="text-3xl font-bold text-white">{isTeacher ? stats.totalStudents : (stats.presentCount || 0)}</p>
              <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                {isTeacher ? 'Enrolled' : 'Marked'}
              </p>
            </div>
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center">
              {isTeacher ? <Users className="h-7 w-7 text-emerald-400" /> : <CheckCircle className="h-7 w-7 text-emerald-400" />}
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
        </div>

        {/* Active Sessions / Attendance Rate */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1f2e] to-[#151928] border border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">{isTeacher ? 'Active Sessions' : 'Attendance Rate'}</p>
              <p className="text-3xl font-bold text-white">
                {isTeacher ? '0' : stats.totalAttendance > 0 
                  ? `${((stats.presentCount / stats.totalAttendance) * 100).toFixed(0)}%` 
                  : 'N/A'}
              </p>
              <p className="text-xs text-cyan-400 mt-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {isTeacher ? 'Live now' : 'Overall'}
              </p>
            </div>
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
              <TrendingUp className="h-7 w-7 text-cyan-400" />
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl"></div>
        </div>

        {/* Quick Action Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f2744] to-[#0a1628] p-6 border border-cyan-500/10">
          <div className="flex flex-col h-full justify-between relative z-[1]">
            <div>
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center mb-3">
                <Sparkles className="h-5 w-5 text-cyan-400" />
              </div>
              <p className="text-white font-semibold">{isTeacher ? 'Create New Class' : 'Scan QR Code'}</p>
              <p className="text-gray-400 text-sm mt-1">{isTeacher ? 'Start teaching today' : 'Mark attendance now'}</p>
            </div>
            <Link 
              to={isTeacher ? '/classes' : '/scan'}
              className="mt-4 inline-flex items-center gap-2 text-white font-medium text-sm hover:gap-3 transition-all"
            >
              Get Started <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Welcome Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1a1f2e] to-[#0d1321] border border-white/10 p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <p className="text-gray-400 text-sm mb-1">Welcome back,</p>
            <h1 className="text-3xl font-bold text-white mb-2">{user?.name}</h1>
            <p className="text-gray-400 max-w-md">
              {isTeacher 
                ? 'Manage your classes, generate QR codes, and track student attendance in real-time.' 
                : 'Scan QR codes to mark your attendance and track your progress across all classes.'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex w-32 h-32 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-white/10 items-center justify-center">
              <div className="w-full h-full rounded-2xl bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSJ0cmFuc3BhcmVudCIvPgo8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMiIvPgo8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIyNSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4=')] bg-cover opacity-50"></div>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl"></div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl bg-[#0d1321] border border-white/5 p-6">
        <h2 className="text-lg font-semibold text-white mb-5">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isTeacher ? (
            <>
              <Link
                to="/classes"
                className="group flex items-center gap-4 p-5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-cyan-500/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">Manage Classes</p>
                  <p className="text-sm text-gray-400">Create or view classes</p>
                </div>
              </Link>
              <Link
                to="/classes"
                className="group flex items-center gap-4 p-5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-emerald-500/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <QrCode className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">Generate QR</p>
                  <p className="text-sm text-gray-400">Start attendance session</p>
                </div>
              </Link>
              <Link
                to="/classes"
                className="group flex items-center gap-4 p-5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-cyan-500/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">View Students</p>
                  <p className="text-sm text-gray-400">Check enrolled students</p>
                </div>
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/scan"
                className="group flex items-center gap-4 p-5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-cyan-500/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <QrCode className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">Scan QR Code</p>
                  <p className="text-sm text-gray-400">Mark your attendance</p>
                </div>
              </Link>
              <Link
                to="/my-attendance"
                className="group flex items-center gap-4 p-5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-emerald-500/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">View Attendance</p>
                  <p className="text-sm text-gray-400">Check your records</p>
                </div>
              </Link>
              <Link
                to="/classes"
                className="group flex items-center gap-4 p-5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-cyan-500/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">Join Class</p>
                  <p className="text-sm text-gray-400">Enter class code</p>
                </div>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Recent Classes */}
      <div className="rounded-2xl bg-[#0d1321] border border-white/5 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Your Classes</h2>
          <Link to="/classes" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
            View All
          </Link>
        </div>
        {classes.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-gray-500" />
            </div>
            <p className="text-gray-400">
              {isTeacher ? 'No classes created yet. Create your first class!' : 'Not enrolled in any classes yet.'}
            </p>
            <Link 
              to="/classes"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {isTeacher ? 'Create Class' : 'Join Class'}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.slice(0, 6).map((classItem) => (
              <Link
                key={classItem._id}
                to={`/classes/${classItem._id}`}
                className="group block p-5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-cyan-500/30 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-cyan-400" />
                  </div>
                  <span className="px-2 py-1 text-xs font-mono text-cyan-400 bg-cyan-500/10 rounded-md">
                    {classItem.code}
                  </span>
                </div>
                <h3 className="font-semibold text-white mb-1 group-hover:text-cyan-400 transition-colors">{classItem.name}</h3>
                <p className="text-sm text-gray-400">
                  {classItem.students?.length || 0} students enrolled
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
