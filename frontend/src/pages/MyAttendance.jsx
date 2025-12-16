import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Calendar, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';

function MyAttendance() {
  const [attendance, setAttendance] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, present: 0, late: 0, absent: 0 });

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/classes');
      setClasses(response.data);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const url = selectedClass 
        ? `/attendance/my-attendance?classId=${selectedClass}`
        : '/attendance/my-attendance';
      const response = await api.get(url);
      setAttendance(response.data);

      const present = response.data.filter(a => a.status === 'present').length;
      const late = response.data.filter(a => a.status === 'late').length;
      const absent = response.data.filter(a => a.status === 'absent').length;
      setStats({
        total: response.data.length,
        present,
        late,
        absent
      });
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-5 w-5 text-emerald-400" />;
      case 'late':
        return <Clock className="h-5 w-5 text-yellow-400" />;
      default:
        return <XCircle className="h-5 w-5 text-red-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      present: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20',
      late: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20',
      absent: 'bg-red-500/20 text-red-400 border-red-500/20'
    };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium border ${styles[status] || styles.absent}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Attendance</h1>
        <p className="text-gray-400">View your attendance history</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1f2e] to-[#151928] border border-white/10 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Total</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1f2e] to-[#151928] border border-white/10 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Present</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.present}</p>
            </div>
            <div className="w-11 h-11 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl"></div>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1f2e] to-[#151928] border border-white/10 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Late</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.late}</p>
            </div>
            <div className="w-11 h-11 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-400" />
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-yellow-500/10 rounded-full blur-2xl"></div>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1f2e] to-[#151928] border border-white/10 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Percentage</p>
              <p className="text-2xl font-bold text-cyan-400">
                {stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(0) : 0}%
              </p>
            </div>
            <div className="w-11 h-11 rounded-full bg-cyan-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-cyan-400" />
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-cyan-500/10 rounded-full blur-2xl"></div>
        </div>
      </div>

      {/* Filter */}
      <div className="rounded-2xl bg-[#0d1321] border border-white/5 p-5">
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Filter by Class
        </label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="w-full md:w-72 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
        >
          <option value="" className="bg-[#0d1321]">All Classes</option>
          {classes.map((c) => (
            <option key={c._id} value={c._id} className="bg-[#0d1321]">
              {c.name} ({c.code})
            </option>
          ))}
        </select>
      </div>

      {/* Attendance List */}
      <div className="rounded-2xl bg-[#0d1321] border border-white/5 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-500 border-t-transparent"></div>
          </div>
        ) : attendance.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-gray-500" />
            </div>
            <p className="text-gray-400">No attendance records found</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {attendance.map((record) => (
              <div
                key={record._id}
                className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center">
                    {getStatusIcon(record.status)}
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {record.class?.name || 'Unknown Class'}
                    </p>
                    <p className="text-sm text-gray-400">
                      {new Date(record.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-400 font-mono bg-white/5 px-3 py-1 rounded-lg hidden sm:block">
                    {record.class?.code}
                  </span>
                  {getStatusBadge(record.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyAttendance;
