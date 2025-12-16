import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { 
  ArrowLeft, 
  QrCode, 
  Users, 
  Calendar, 
  Trash2, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Copy,
  Check
} from 'lucide-react';

function ClassDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [classData, setClassData] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState([]);
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('students');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [copied, setCopied] = useState(false);

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  useEffect(() => {
    fetchClassData();
  }, [id]);

  useEffect(() => {
    if (isTeacher && classData) {
      fetchAttendance();
      fetchStats();
      checkActiveSession();
    }
  }, [classData, selectedDate]);

  const fetchClassData = async () => {
    try {
      const response = await api.get(`/classes/${id}`);
      setClassData(response.data);
    } catch (error) {
      console.error('Error fetching class:', error);
      navigate('/classes');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      const response = await api.get(`/attendance/class/${id}?date=${selectedDate}`);
      setAttendance(response.data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get(`/attendance/stats/${id}`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const checkActiveSession = async () => {
    try {
      const response = await api.get(`/attendance/active-session/${id}`);
      if (response.data.hasActiveSession) {
        setQrData(response.data);
      }
    } catch (error) {
      console.error('Error checking session:', error);
    }
  };

  const generateQR = async () => {
    setGenerating(true);
    try {
      const response = await api.post(`/attendance/generate-qr/${id}`);
      setQrData(response.data);
    } catch (error) {
      console.error('Error generating QR:', error);
    } finally {
      setGenerating(false);
    }
  };

  const deleteClass = async () => {
    if (!window.confirm('Are you sure you want to delete this class?')) return;
    try {
      await api.delete(`/classes/${id}`);
      navigate('/classes');
    } catch (error) {
      console.error('Error deleting class:', error);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(classData.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!classData) return null;

  const getAttendanceStatus = (studentId) => {
    const record = attendance.find(a => a.student._id === studentId);
    return record?.status || 'absent';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/classes')}
          className="p-2.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{classData.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-cyan-400 font-mono">{classData.code}</span>
            <button
              onClick={copyCode}
              className="p-1 text-gray-400 hover:text-cyan-400 transition-colors"
              title="Copy code"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {isTeacher && (
          <button
            onClick={deleteClass}
            className="p-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* QR Code Section (Teachers) */}
      {isTeacher && (
        <div className="rounded-2xl bg-gradient-to-br from-[#1a1f2e] to-[#151928] border border-white/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Attendance QR Code</h2>
            <button
              onClick={generateQR}
              disabled={generating}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50 font-medium"
            >
              {generating ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <QrCode className="h-5 w-5" />
              )}
              {qrData ? 'Regenerate QR' : 'Generate QR'}
            </button>
          </div>

          {qrData ? (
            <div className="flex flex-col items-center">
              <div className="p-4 bg-white rounded-2xl">
                <img 
                  src={qrData.qrImage} 
                  alt="Attendance QR Code" 
                  className="w-64 h-64"
                />
              </div>
              <div className="mt-4 text-center">
                <p className="text-gray-400">
                  Expires at: <span className="text-cyan-400 font-medium">{new Date(qrData.expiresAt).toLocaleTimeString()}</span>
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Students can scan this QR code to mark their attendance
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <QrCode className="h-10 w-10 text-gray-500" />
              </div>
              <p className="text-gray-400">Generate a QR code to start taking attendance</p>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      {isTeacher && (
        <div className="rounded-2xl bg-[#0d1321] border border-white/5 overflow-hidden">
          <div className="flex border-b border-white/5">
            <button
              onClick={() => setActiveTab('students')}
              className={`flex-1 px-4 py-4 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'students'
                  ? 'text-cyan-400 bg-cyan-500/10 border-b-2 border-cyan-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="h-4 w-4" />
              Students ({classData.students?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`flex-1 px-4 py-4 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'attendance'
                  ? 'text-cyan-400 bg-cyan-500/10 border-b-2 border-cyan-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Calendar className="h-4 w-4" />
              Today's Attendance
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 px-4 py-4 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'stats'
                  ? 'text-cyan-400 bg-cyan-500/10 border-b-2 border-cyan-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Statistics
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'students' && (
              <div>
                {classData.students?.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                      <Users className="h-8 w-8 text-gray-500" />
                    </div>
                    <p className="text-gray-400 mb-2">No students enrolled yet</p>
                    <p className="text-sm text-gray-500">
                      Share the class code: <span className="font-mono text-cyan-400">{classData.code}</span>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {classData.students?.map((student) => (
                      <div
                        key={student._id}
                        className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                            <span className="text-cyan-400 font-semibold">
                              {student.name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-white">{student.name}</p>
                            <p className="text-sm text-gray-400">{student.email}</p>
                          </div>
                        </div>
                        {student.studentId && (
                          <span className="text-sm text-gray-400 font-mono bg-white/5 px-3 py-1 rounded-lg">
                            {student.studentId}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'attendance' && (
              <div>
                <div className="mb-6">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                {classData.students?.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">No students enrolled</p>
                ) : (
                  <div className="space-y-3">
                    {classData.students?.map((student) => {
                      const status = getAttendanceStatus(student._id);
                      return (
                        <div
                          key={student._id}
                          className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                              <span className="text-cyan-400 font-semibold">
                                {student.name?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-white">{student.name}</p>
                              <p className="text-sm text-gray-400">{student.studentId}</p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
                            status === 'present' 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' 
                              : status === 'late'
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20'
                              : 'bg-red-500/20 text-red-400 border border-red-500/20'
                          }`}>
                            {status === 'present' && <CheckCircle className="h-4 w-4" />}
                            {status === 'late' && <Clock className="h-4 w-4" />}
                            {status === 'absent' && <XCircle className="h-4 w-4" />}
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stats' && (
              <div>
                {stats.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                      <BarChart3 className="h-8 w-8 text-gray-500" />
                    </div>
                    <p className="text-gray-400">No attendance data yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-4 px-4 font-medium text-gray-400">Student</th>
                          <th className="text-left py-4 px-4 font-medium text-gray-400">ID</th>
                          <th className="text-center py-4 px-4 font-medium text-gray-400">Present</th>
                          <th className="text-center py-4 px-4 font-medium text-gray-400">Total</th>
                          <th className="text-center py-4 px-4 font-medium text-gray-400">Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.map((stat) => (
                          <tr key={stat.student.id} className="border-b border-white/5 last:border-0">
                            <td className="py-4 px-4 text-white">{stat.student.name}</td>
                            <td className="py-4 px-4 font-mono text-sm text-gray-400">{stat.student.studentId}</td>
                            <td className="py-4 px-4 text-center text-emerald-400">{stat.present}</td>
                            <td className="py-4 px-4 text-center text-gray-400">{stat.totalClasses}</td>
                            <td className="py-4 px-4 text-center">
                              <span className={`inline-block px-3 py-1 rounded-lg text-sm font-medium ${
                                stat.percentage >= 75 
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : stat.percentage >= 50
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {stat.percentage}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Student View */}
      {!isTeacher && (
        <div className="rounded-2xl bg-gradient-to-br from-[#1a1f2e] to-[#151928] border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Class Information</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-white/5">
              <span className="text-gray-400">Teacher</span>
              <span className="font-medium text-white">{classData.teacher?.name}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-white/5">
              <span className="text-gray-400">Department</span>
              <span className="font-medium text-white">{classData.department || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-400">Total Students</span>
              <span className="font-medium text-white">{classData.students?.length || 0}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClassDetail;
