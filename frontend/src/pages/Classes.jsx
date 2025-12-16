import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Plus, Users, BookOpen, X, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

function Classes() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const [newClass, setNewClass] = useState({
    name: '',
    code: '',
    department: ''
  });
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/classes');
      setClasses(response.data);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/classes', newClass);
      setShowCreateModal(false);
      setNewClass({ name: '', code: '', department: '' });
      setSuccess('Class created successfully!');
      fetchClasses();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create class');
    }
  };

  const handleJoinClass = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/classes/join/${joinCode}`);
      setShowJoinModal(false);
      setJoinCode('');
      setSuccess('Successfully joined the class!');
      fetchClasses();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join class');
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Classes</h1>
          <p className="text-gray-400">
            {isTeacher ? 'Manage your classes' : 'View your enrolled classes'}
          </p>
        </div>
        <button
          onClick={() => isTeacher ? setShowCreateModal(true) : setShowJoinModal(true)}
          className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all font-medium"
        >
          <Plus className="h-5 w-5" />
          {isTeacher ? 'Create Class' : 'Join Class'}
        </button>
      </div>

      {/* Success Message */}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center text-emerald-400">
          <CheckCircle className="h-5 w-5 mr-3" />
          {success}
        </div>
      )}

      {/* Classes Grid */}
      {classes.length === 0 ? (
        <div className="rounded-2xl bg-[#0d1321] border border-white/5 p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
            <BookOpen className="h-10 w-10 text-gray-500" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No classes yet</h3>
          <p className="text-gray-400 mb-6 max-w-sm mx-auto">
            {isTeacher 
              ? 'Create your first class to start managing attendance' 
              : 'Join a class using the code provided by your teacher'}
          </p>
          <button
            onClick={() => isTeacher ? setShowCreateModal(true) : setShowJoinModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all font-medium"
          >
            <Plus className="h-5 w-5" />
            {isTeacher ? 'Create Class' : 'Join Class'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classes.map((classItem) => (
            <Link
              key={classItem._id}
              to={`/classes/${classItem._id}`}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1f2e] to-[#151928] border border-white/10 p-6 hover:border-cyan-500/30 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-cyan-400" />
                </div>
                <span className="px-3 py-1.5 bg-white/5 text-cyan-400 text-sm font-mono rounded-lg border border-white/10">
                  {classItem.code}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-cyan-400 transition-colors">{classItem.name}</h3>
              {classItem.department && (
                <p className="text-sm text-gray-400 mb-3">{classItem.department}</p>
              )}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                <div className="flex items-center text-sm text-gray-400">
                  <Users className="h-4 w-4 mr-2" />
                  {classItem.students?.length || 0} students
                </div>
                <ArrowRight className="h-5 w-5 text-gray-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
              </div>
              <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-all"></div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1321] border border-white/10 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Create New Class</h2>
              <button 
                onClick={() => { setShowCreateModal(false); setError(''); }}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center text-red-400">
                <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Class Name
                </label>
                <input
                  type="text"
                  value={newClass.name}
                  onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                  className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                  placeholder="e.g., Data Structures"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Class Code
                </label>
                <input
                  type="text"
                  value={newClass.code}
                  onChange={(e) => setNewClass({ ...newClass, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono"
                  placeholder="e.g., CS201"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Department (Optional)
                </label>
                <input
                  type="text"
                  value={newClass.department}
                  onChange={(e) => setNewClass({ ...newClass, department: e.target.value })}
                  className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                  placeholder="e.g., Computer Science"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setError(''); }}
                  className="flex-1 px-4 py-3.5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all font-medium"
                >
                  Create Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Class Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1321] border border-white/10 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Join a Class</h2>
              <button 
                onClick={() => { setShowJoinModal(false); setError(''); }}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center text-red-400">
                <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleJoinClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Class Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono text-center text-xl tracking-widest"
                  placeholder="ENTER CODE"
                  required
                />
                <p className="text-sm text-gray-400 mt-3 text-center">
                  Ask your teacher for the class code
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowJoinModal(false); setError(''); }}
                  className="flex-1 px-4 py-3.5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all font-medium"
                >
                  Join Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Classes;
