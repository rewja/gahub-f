import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { 
  Plus, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Edit, 
  Trash2, 
  Upload,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';

const Todos = () => {
  const { user } = useAuth();
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    target_start_at: '',
    target_end_at: ''
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'not_started':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'in_progress':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'checking':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
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
        return 'bg-orange-100 text-orange-800';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTodo) {
        await api.patch(`/todos/${editingTodo.id}`, formData);
      } else {
        await api.post('/todos', formData);
      }
      const res = await api.get('/todos');
      setTodos(res.data.data || res.data);
      setFormData({ title: '', description: '', priority: 'medium', due_date: '', target_start_at: '', target_end_at: '' });
      setShowModal(false);
      setEditingTodo(null);
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to save');
    }
  };

  const handleEdit = (todo) => {
    setEditingTodo(todo);
    setFormData({
      title: todo.title,
      description: todo.description,
      priority: todo.priority,
      due_date: todo.due_date ? format(new Date(todo.due_date), 'yyyy-MM-dd') : '',
      target_start_at: todo.target_start_at_raw ? new Date(todo.target_start_at_raw).toISOString().slice(0,16) : '',
      target_end_at: todo.target_end_at_raw ? new Date(todo.target_end_at_raw).toISOString().slice(0,16) : ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this todo?')) return;
    try {
      await api.delete(`/todos/${id}`);
      const res = await api.get('/todos');
      setTodos(res.data.data || res.data);
    } catch (e) {
      alert('Failed to delete');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      if (newStatus === 'in_progress') {
        await api.patch(`/todos/${id}/start`);
      } else if (newStatus === 'checking') {
        alert('Please upload evidence to submit for checking.');
        return;
      } else {
        await api.patch(`/todos/${id}`, { status: newStatus });
      }
      const res = await api.get('/todos');
      setTodos(res.data.data || res.data);
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to update status');
    }
  };

  const handleFileUpload = async (id, file) => {
    try {
      const form = new FormData();
      form.append('evidence', file);
      await api.post(`/todos/${id}/submit`, form, { isForm: true });
      const res = await api.get('/todos');
      setTodos(res.data.data || res.data);
    } catch (e) {
      alert(e?.response?.data?.message || 'Upload failed');
    }
  };

  const handleViewEvidence = (todo) => {
    setSelectedTodo(todo);
    setShowEvidenceModal(true);
  };

  const handleViewDetails = (todo) => {
    setSelectedTodo(todo);
    setShowDetailModal(true);
  };

  const filteredTodos = todos.filter(todo => {
    // You can add filtering logic here
    return true;
  });

  // Personal statistics
  const completedToday = todos.filter(t => t.status === 'completed' && t.submitted_at && new Date(t.submitted_at).toDateString() === new Date().toDateString()).length;
  const completedThisMonth = todos.filter(t => t.status === 'completed' && t.submitted_at && new Date(t.submitted_at).getMonth() === new Date().getMonth()).length;
  const averageDurationMinutes = (() => {
    const durations = todos.filter(t => typeof t.total_work_time === 'number').map(t => t.total_work_time);
    if (!durations.length) return 0;
    return Math.round(durations.reduce((a,b)=>a+b,0) / durations.length);
  })();

  const averageRating = (() => {
    const rated = todos.filter(t => typeof t.rating === 'number');
    if (!rated.length) return null;
    const sum = rated.reduce((acc, t) => acc + t.rating, 0);
    return Math.round(sum / rated.length);
  })();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) return;
      setLoading(true); setError('');
      try {
        const res = await api.get('/todos');
        if (!cancelled) setTodos(res.data.data || res.data);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My To-Do List</h1>
          <p className="text-gray-600">Manage your tasks and track progress</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Todo
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="card">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
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
      </div>

      {/* Personal Statistics - Only show if there's data */}
      {(completedToday > 0 || completedThisMonth > 0 || averageDurationMinutes > 0 || averageRating !== null) && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {(completedToday > 0 || completedThisMonth > 0) && (
            <div className="card">
              <div className="p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Todos Completed</h3>
                <p className="text-sm text-gray-600">Today: <span className="font-semibold text-gray-900">{completedToday}</span></p>
                <p className="text-sm text-gray-600">This Month: <span className="font-semibold text-gray-900">{completedThisMonth}</span></p>
              </div>
            </div>
          )}
          {averageDurationMinutes > 0 && (
            <div className="card">
              <div className="p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Avg Completion Duration</h3>
                <p className="text-sm text-gray-600"><span className="font-semibold text-gray-900">{averageDurationMinutes}</span> minutes</p>
              </div>
            </div>
          )}
          {averageRating !== null && (
            <div className="card">
              <div className="p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Performance Points</h3>
                <p className="text-sm text-gray-600"><span className="font-semibold text-gray-900">{averageRating}</span> / 100</p>
              </div>
            </div>
          )}
        </div>
      )}

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
                        {String(todo.status).replace('_', ' ')}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(todo.priority)}`}>
                        {todo.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{todo.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>Created: {todo.formatted_created_at || todo.created_at || ''}</span>
                      {todo.formatted_due_date && (<span>Due: {todo.formatted_due_date}</span>)}
                      {todo.target_start_at && (<span>Start: {todo.target_start_at}</span>)}
                      {todo.target_end_at && (<span>End: {todo.target_end_at}</span>)}
                      {todo.formatted_started_at && (<span>Started: {todo.formatted_started_at}</span>)}
                      {todo.formatted_submitted_at && (<span>Submitted: {todo.formatted_submitted_at}</span>)}
                      {todo.total_work_time && (<span>Duration: {todo.total_work_time}</span>)}
                    </div>
                    {todo.admin_notes && (
                      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/30 rounded text-xs text-blue-800 dark:text-blue-300">
                        <strong>Admin Note:</strong> {todo.admin_notes}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleViewDetails(todo)}
                    className="text-blue-600 hover:text-blue-900"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>

                  
                  {todo.status === 'in_progress' && (
                    <label className="cursor-pointer text-accent-600 hover:text-accent-800">
                      <Upload className="h-4 w-4" />
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(todo.id, e.target.files[0])}
                      />
                    </label>
                  )}

                  {todo.status !== 'completed' && (
                    <select
                      value={todo.status}
                      onChange={(e) => handleStatusChange(todo.id, e.target.value)}
                    className="text-xs border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="checking">Checking</option>
                      <option value="completed">Completed</option>
                    </select>
                  )}

                  <button
                    onClick={() => handleEdit(todo)}
                    className="text-accent-600 hover:text-accent-800"
                  >
                    <Edit className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(todo.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600/40 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-200 w-96 shadow-sm rounded-xl bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingTodo ? 'Edit Todo' : 'Add New Todo'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Target Start</label>
                  <input
                    type="datetime-local"
                    value={formData.target_start_at}
                    onChange={(e) => setFormData({...formData, target_start_at: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Target End</label>
                  <input
                    type="datetime-local"
                    value={formData.target_end_at}
                    onChange={(e) => setFormData({...formData, target_end_at: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingTodo(null);
                      setFormData({ title: '', description: '', priority: 'medium', due_date: '' });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary px-4 py-2"
                  >
                    {editingTodo ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedTodo && (
        <div className="fixed inset-0 bg-gray-600/40 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-200 w-4/5 max-w-4xl shadow-sm rounded-xl bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Todo Details: {selectedTodo.title}
              </h3>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600"><strong>Title:</strong> {selectedTodo.title}</p>
                      <p className="text-gray-600"><strong>Description:</strong> {selectedTodo.description || 'N/A'}</p>
                      <p className="text-gray-600"><strong>Priority:</strong> 
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedTodo.priority)}`}>
                          {selectedTodo.priority}
                        </span>
                      </p>
                      <p className="text-gray-600"><strong>Status:</strong> 
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTodo.status)}`}>
                          {selectedTodo.status.replace('_', ' ')}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600"><strong>Created:</strong> {selectedTodo.formatted_created_at || 'N/A'}</p>
                      <p className="text-gray-600"><strong>Due Date:</strong> {selectedTodo.formatted_due_date || 'N/A'}</p>
                      <p className="text-gray-600"><strong>Started:</strong> {selectedTodo.formatted_started_at || 'N/A'}</p>
                      <p className="text-gray-600"><strong>Submitted:</strong> {selectedTodo.formatted_submitted_at || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Timeline & Duration</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600"><strong>Target Start:</strong> {selectedTodo.target_start_at || 'N/A'}</p>
                      <p className="text-gray-600"><strong>Target End:</strong> {selectedTodo.target_end_at || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600"><strong>Work Duration:</strong> {selectedTodo.total_work_time || 'N/A'}</p>
                      <p className="text-gray-600"><strong>Last Updated:</strong> {selectedTodo.updated_at || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {selectedTodo.rating !== null && selectedTodo.rating !== undefined && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Performance Rating</h4>
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl font-bold text-blue-600">{selectedTodo.rating}/100</div>
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${selectedTodo.rating}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTodo.warnings && selectedTodo.warnings.report && selectedTodo.warnings.report.points && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Warning Report</h4>
                    <div className="text-sm">
                      <p className="text-gray-600"><strong>Points:</strong> {selectedTodo.warnings.report.points}</p>
                      <p className="text-gray-600"><strong>Level:</strong> {selectedTodo.warnings.report.level}</p>
                      <p className="text-gray-600"><strong>Note:</strong> {selectedTodo.warnings.report.note || 'N/A'}</p>
                      <p className="text-gray-600"><strong>Published:</strong> {selectedTodo.warnings.report.published_at || 'N/A'}</p>
                    </div>
                  </div>
                )}

                {selectedTodo.notes && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Admin Notes</h4>
                    <p className="text-sm text-gray-600">{selectedTodo.notes}</p>
                  </div>
                )}

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

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Close
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
                    <p>Priority: {selectedTodo.priority}</p>
                    <p>Status: {selectedTodo.status}</p>
                    <p>Submitted: {selectedTodo.submitted_at || 'N/A'}</p>
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
                    <h4 className="font-medium text-gray-900 mb-2">Evidence</h4>
                    {/\.(jpg|jpeg|png|gif)$/i.test(selectedTodo.evidence_path) ? (
                      <a href={`/storage/${selectedTodo.evidence_path}`} target="_blank" rel="noopener noreferrer">
                        <img src={`/storage/${selectedTodo.evidence_path}`} alt="Evidence" className="w-full max-h-64 object-contain rounded" />
                      </a>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Eye className="h-4 w-4 text-blue-500" />
                        <a href={`/storage/${selectedTodo.evidence_path}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                          View Evidence File
                        </a>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowEvidenceModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Close
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

export default Todos;

