import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { 
  CheckSquare, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  Search,
  Eye,
  MessageSquare,
  User,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import SimpleChart from '../../components/SimpleChart';

const AdminTodos = () => {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [selectedTodo, setSelectedTodo] = useState(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [note, setNote] = useState('');
  const [tempRatings, setTempRatings] = useState({});
  const [chartData, setChartData] = useState(null);
  const [evaluationData, setEvaluationData] = useState({
    action: 'approve',
    notes: '',
    warningPoints: 0,
    warningNote: ''
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'not_started':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'in_progress':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'checking':
        return <Eye className="h-4 w-4 text-purple-500" />;
      case 'evaluating':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'reworked':
        return <RefreshCw className="h-4 w-4 text-indigo-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'not_started':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'checking':
        return 'bg-purple-100 text-purple-800';
      case 'evaluating':
        return 'bg-orange-100 text-orange-800';
      case 'reworked':
        return 'bg-indigo-100 text-indigo-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUserName = (userId) => `User ${userId}`;

  const handleApprove = async (id) => {
    try {
      await api.post(`/todos/${id}/evaluate`, { 
        action: 'approve', 
        type: 'individual',
        notes: '',
        warning_points: 0,
        warning_note: ''
      });
      const res = await api.get('/todos/all');
      setTodos(res.data.data || res.data);
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to approve');
    }
  };

  const handleRework = async (id) => {
    try {
      await api.post(`/todos/${id}/evaluate`, { 
        action: 'rework', 
        type: 'individual',
        notes: '',
        warning_points: 0,
        warning_note: ''
      });
      const res = await api.get('/todos/all');
      setTodos(res.data.data || res.data);
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to request rework');
    }
  };

  const handleAddNote = (todo) => {
    setSelectedTodo(todo);
    setNote(todo.admin_notes || '');
    setShowNoteModal(true);
  };

  const handleViewEvidence = (todo) => {
    setSelectedTodo(todo);
    setShowEvidenceModal(true);
  };

  const handleEvaluate = (todo) => {
    setSelectedTodo(todo);
    setEvaluationData({
      action: 'approve',
      notes: '',
      warningPoints: 0,
      warningNote: ''
    });
    setShowEvaluationModal(true);
  };

  const handleSubmitEvaluation = async () => {
    if (!selectedTodo) return;
    try {
      await api.post(`/todos/${selectedTodo.id}/evaluate`, {
        action: evaluationData.action,
        type: 'individual',
        notes: evaluationData.notes,
        warning_points: evaluationData.warningPoints,
        warning_note: evaluationData.warningNote
      });
      const res = await api.get('/todos/all');
      setTodos(res.data.data || res.data);
      setShowEvaluationModal(false);
      setSelectedTodo(null);
      setEvaluationData({
        action: 'approve',
        notes: '',
        warningPoints: 0,
        warningNote: ''
      });
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to evaluate');
    }
  };

  const handleSaveNote = async () => {
    if (!selectedTodo) return;
    try {
      await api.patch(`/todos/${selectedTodo.id}/note`, { notes: note });
      const res = await api.get('/todos/all');
      setTodos(res.data.data || res.data);
      setShowNoteModal(false);
      setSelectedTodo(null);
      setNote('');
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to save note');
    }
  };


  const filteredTodos = todos.filter(todo => {
    const matchesSearch = todo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         todo.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getUserName(todo.user_id).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || todo.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || todo.priority === priorityFilter;
    const matchesUser = userFilter === 'all' || todo.user_id.toString() === userFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesUser;
  });

  const getDuration = (todo) => {
    if (todo.total_work_time) {
      return todo.total_work_time;
    }
    if (todo.started_at && todo.submitted_at) {
      const start = new Date(todo.started_at);
      const end = new Date(todo.submitted_at);
      const diffMs = end - start;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${diffHours}h ${diffMinutes}m`;
    }
    return '-';
  };

  const handleRatingChange = (todoId, value) => {
    const numeric = Math.max(0, Math.min(100, Number(value) || 0));
    setTempRatings({ ...tempRatings, [todoId]: numeric });
  };

  const handleSaveRating = (todoId) => {
    const ratingValue = tempRatings[todoId];
    if (typeof ratingValue !== 'number') return;
    setTodos(todos.map(todo =>
      todo.id === todoId
        ? { ...todo, rating: ratingValue }
        : todo
    ));
  };

  const completedToday = todos.filter(t => t.status === 'completed' && t.formatted_submitted_at && new Date(t.formatted_submitted_at).toDateString() === new Date().toDateString()).length;
  const distribution = React.useMemo(() => ({
    not_started: todos.filter(t => t.status === 'not_started').length,
    in_progress: todos.filter(t => t.status === 'in_progress').length,
    completed: todos.filter(t => t.status === 'completed').length,
  }), [todos]);

  // Generate chart data for status distribution
  useEffect(() => {
    if (todos.length > 0) {
      setChartData({
        labels: ['Not Started', 'In Progress', 'Completed'],
        datasets: [
          {
            data: [distribution.not_started, distribution.in_progress, distribution.completed],
            backgroundColor: [
              'rgba(245, 158, 11, 0.5)',
              'rgba(59, 130, 246, 0.5)',
              'rgba(16, 185, 129, 0.5)',
            ],
            borderColor: [
              'rgba(245, 158, 11, 1)',
              'rgba(59, 130, 246, 1)',
              'rgba(16, 185, 129, 1)',
            ],
            borderWidth: 1,
          },
        ],
      });
    }
  }, [distribution, todos.length]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError('');
      try {
        const res = await api.get('/todos/all');
        if (!cancelled) setTodos(res.data.data || res.data);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">All To-Do Management</h1>
        <p className="text-gray-600">Monitor and manage all employee tasks</p>
      </div>

      {/* Global Statistics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="card">
          <div className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Completed Today</h3>
            <p className="text-sm text-gray-600"><span className="font-semibold text-gray-900">{completedToday}</span></p>
          </div>
        </div>
        <div className="card">
          <div className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Status Distribution</h3>
            <p className="text-xs text-gray-600">Not Started: <span className="font-semibold text-gray-900">{distribution.not_started}</span></p>
            <p className="text-xs text-gray-600">In Progress: <span className="font-semibold text-gray-900">{distribution.in_progress}</span></p>
            <p className="text-xs text-gray-600">Completed: <span className="font-semibold text-gray-900">{distribution.completed}</span></p>
          </div>
        </div>
        <div className="card">
          <div className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Status Distribution</h3>
            <div className="h-20">
              {chartData ? (
                <SimpleChart type="bar" data={chartData} height={80} />
              ) : (
                <div className="h-20 bg-gray-50 rounded-lg flex items-center justify-center text-gray-500 text-xs">
                  Loading chart...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search todos by title, description, or user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
            >
              <option value="all">All Status</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="checking">Checking</option>
              <option value="evaluating">Evaluating</option>
              <option value="reworked">Reworked</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
            >
              <option value="all">All Users</option>
              {Array.from(new Set(todos.map(t => t.user_id))).map(userId => (
                <option key={userId} value={userId.toString()}>
                  {getUserName(userId)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="card">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Not Started</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {todos.filter(t => t.status === 'not_started').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-8 w-8 text-accent-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">In Progress</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {todos.filter(t => t.status === 'in_progress').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-primary-700" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {todos.filter(t => t.status === 'completed').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckSquare className="h-8 w-8 text-purple-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Tasks</dt>
                  <dd className="text-lg font-medium text-gray-900">{todos.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Todo List */}
      <div className="card">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading && <li className="px-6 py-4 text-sm text-gray-500">Loading...</li>}
          {error && <li className="px-6 py-4 text-sm text-red-600">{error}</li>}
          {!loading && !error && filteredTodos.map((todo) => (
            <li key={todo.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {getStatusIcon(todo.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {todo.title}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(todo.status)}`}>
                        {todo.status.replace('_', ' ')}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(todo.priority)}`}>
                        {todo.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{todo.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {getUserName(todo.user_id)}
                      </div>
                      <span>Created: {format(new Date(todo.created_at), 'MMM dd, yyyy')}</span>
                      {todo.due_date && (
                        <span>Due: {format(new Date(todo.due_date), 'MMM dd, yyyy')}</span>
                      )}
                      <span>Duration: {getDuration(todo)}</span>
                    </div>
                    {todo.admin_notes && (
                      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/30 rounded text-xs text-blue-800 dark:text-blue-300">
                        <strong>Admin Note:</strong> {todo.admin_notes}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {(todo.status === 'checking' && (todo.evidence_files?.length > 0 || todo.evidence_path)) && (
                    <button
                      onClick={() => handleViewEvidence(todo)}
                      className="text-blue-600 hover:text-blue-900"
                      title="View Evidence"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  )}

                  <button
                    onClick={() => handleAddNote(todo)}
                    className="text-accent-600 hover:text-accent-800"
                    title="Add note"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>

                  {todo.status === 'checking' && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEvaluate(todo)}
                        className="text-green-600 hover:text-green-900 text-xs px-2 py-1 border border-green-300 rounded"
                        title="Evaluate Task"
                      >
                        Evaluate
                      </button>
                    </div>
                  )}
                  
                  {/* Removed duplicate rating bar per request */}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-gray-600/40 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-200 w-96 shadow-sm rounded-xl bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Add Note for: {selectedTodo?.title}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Admin Note</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={4}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    placeholder="Add your note here..."
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNoteModal(false);
                      setSelectedTodo(null);
                      setNote('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNote}
                    className="btn-primary px-4 py-2"
                  >
                    Save Note
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Modal */}
      {showEvidenceModal && selectedTodo && (
        <div className="fixed inset-0 bg-gray-600/40 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-200 w-4/5 max-w-4xl shadow-sm rounded-xl bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Evidence for: {selectedTodo.title}
              </h3>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Task Details</h4>
                  <p className="text-sm text-gray-600 mb-2">{selectedTodo.description}</p>
                  <div className="text-xs text-gray-500">
                    <p>User: {getUserName(selectedTodo.user_id)}</p>
                    <p>Submitted: {selectedTodo.formatted_submitted_at || 'N/A'}</p>
                    <p>Duration: {getDuration(selectedTodo)}</p>
                  </div>
                </div>
                
                {selectedTodo.evidence_files && selectedTodo.evidence_files.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Evidence Files</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedTodo.evidence_files.map((file, index) => (
                        <div key={index} className="border rounded-lg overflow-hidden bg-white">
                          {/\.(jpg|jpeg|png|gif)$/i.test(file.path || file.url) ? (
                            <a href={file.url} target="_blank" rel="noopener noreferrer">
                              <img src={file.url} alt={file.name || `Evidence ${index+1}`} className="w-full h-40 object-cover" />
                            </a>
                          ) : (
                            <div className="p-3 flex items-center space-x-2">
                              <Eye className="h-4 w-4 text-blue-500" />
                              <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                                {file.name || `Evidence File ${index + 1}`}
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedTodo.evidence_path && !selectedTodo.evidence_files && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Evidence File</h4>
                    <div className="flex items-center space-x-2">
                      <Eye className="h-4 w-4 text-blue-500" />
                      <a
                        href={`/storage/${selectedTodo.evidence_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        View Evidence File
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEvidenceModal(false);
                      setSelectedTodo(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowEvidenceModal(false);
                      handleEvaluate(selectedTodo);
                    }}
                    className="btn-primary px-4 py-2"
                  >
                    Evaluate Task
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Evaluation Modal */}
      {showEvaluationModal && selectedTodo && (
        <div className="fixed inset-0 bg-gray-600/40 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-200 w-96 shadow-sm rounded-xl bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Evaluate Task: {selectedTodo.title}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Action</label>
                  <select
                    value={evaluationData.action}
                    onChange={(e) => setEvaluationData({...evaluationData, action: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  >
                    <option value="approve">Approve</option>
                    <option value="rework">Request Rework</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={evaluationData.notes}
                    onChange={(e) => setEvaluationData({...evaluationData, notes: e.target.value})}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    placeholder="Add evaluation notes..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Warning Points (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={evaluationData.warningPoints}
                    onChange={(e) => setEvaluationData({...evaluationData, warningPoints: parseInt(e.target.value) || 0})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Warning Note</label>
                  <textarea
                    value={evaluationData.warningNote}
                    onChange={(e) => setEvaluationData({...evaluationData, warningNote: e.target.value})}
                    rows={2}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    placeholder="Warning details (if any)..."
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEvaluationModal(false);
                      setSelectedTodo(null);
                      setEvaluationData({
                        action: 'approve',
                        notes: '',
                        warningPoints: 0,
                        warningNote: ''
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitEvaluation}
                    className="btn-primary px-4 py-2"
                  >
                    Submit Evaluation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTodos;

