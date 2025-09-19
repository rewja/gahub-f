import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { 
  User, 
  Clock, 
  CheckCircle, 
  Search,
  Plus,
  Edit,
  Trash,
  Building,
  Calendar,
  Eye,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import SimpleChart from '../../components/SimpleChart';

const AdminVisitors = () => {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    purpose: '',
    meet_with: '',
    origin: '',
    ktp_image: null,
    face_image: null
  });
  const [pagination, setPagination] = useState({ page: 1, per_page: 15, total: 0 });
  const [chartData, setChartData] = useState(null);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'in_building':
        return <Clock className="h-4 w-4 text-green-500" />;
      case 'checked_out':
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'in_building':
        return 'bg-green-100 text-green-800';
      case 'checked_out':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      // Append only changed fields when editing
      const should = (key) => !editingVisitor || (formData[key] !== undefined && formData[key] !== (editingVisitor[key] || ''));
      if (should('name')) fd.append('name', formData.name);
      if (should('meet_with')) fd.append('meet_with', formData.meet_with);
      if (should('purpose')) fd.append('purpose', formData.purpose);
      if (should('origin') && formData.origin) fd.append('origin', formData.origin);
      if (!editingVisitor || formData.ktp_image) fd.append('ktp_image', formData.ktp_image);
      if (!editingVisitor || formData.face_image) fd.append('face_image', formData.face_image);

      if (editingVisitor) {
        // method spoofing for multipart
        fd.append('_method', 'PATCH');
        await api.post(`/visitors/${editingVisitor.id}`, fd, { isForm: true });
      } else {
        await api.post('/visitors', fd, { isForm: true });
      }
      await loadVisitors(pagination.page);
      setFormData({ name: '', purpose: '', meet_with: '', origin: '', ktp_image: null, face_image: null });
      setShowModal(false);
      setEditingVisitor(null);
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to record visitor');
    }
  };

  const handleEdit = (visitor) => {
    setEditingVisitor(visitor);
    setFormData({
      name: visitor.name || '',
      purpose: visitor.purpose || '',
      meet_with: visitor.meet_with || visitor.person_to_meet || '',
      origin: visitor.origin || '',
      ktp_image: null,
      face_image: null
    });
    setShowModal(true);
  };

  const handleViewDetails = (visitor) => {
    setSelectedVisitor(visitor);
    setShowDetailModal(true);
  };

  const handleCheckOut = async (id) => {
    try {
      await api.post(`/visitors/${id}/check-out`);
      await loadVisitors(pagination.page);
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to check out');
    }
  };

  const filteredVisitors = visitors.filter(visitor => {
    const derivedStatus = visitor.check_out ? 'checked_out' : 'in_building';
    const matchesSearch = (visitor.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (visitor.origin || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (visitor.meet_with || visitor.person_to_meet || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || derivedStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const inBuildingCount = visitors.filter(v => (v.status || (v.check_out ? 'checked_out' : 'checked_in')) === 'checked_in').length;
  const todayVisitors = visitors.filter(v => 
    new Date(v.check_in).toDateString() === new Date().toDateString()
  ).length;
  const monthlyVisitors = visitors.filter(v => new Date(v.check_in).getMonth() === new Date().getMonth()).length;

  const loadVisitors = async (page = 1) => {
    setLoading(true); setError('');
    try {
      const res = await api.get(`/visitors?per_page=${pagination.per_page}&page=${page}`);
      // Laravel resource collection pagination shape
      const collection = res.data;
      const items = Array.isArray(collection?.data) ? collection.data : (Array.isArray(collection) ? collection : []);
      setVisitors(items);
      if (collection?.meta) {
        setPagination({ page: collection.meta.current_page, per_page: collection.meta.per_page, total: collection.meta.total });
      } else if (collection?.current_page) {
        setPagination({ page: collection.current_page, per_page: collection.per_page, total: collection.total });
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVisitors(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load trend chart
  // Chart data based on current visitors
  useEffect(() => {
    if (visitors.length > 0) {
      const statusCounts = {
        'in_building': visitors.filter(v => v.status === 'in_building').length,
        'checked_out': visitors.filter(v => v.status === 'checked_out').length,
      };

      setChartData({
        labels: Object.keys(statusCounts),
        datasets: [
          {
            label: 'Visitors by Status',
            data: Object.values(statusCounts),
            backgroundColor: [
              'rgba(16, 185, 129, 0.5)',
              'rgba(59, 130, 246, 0.5)',
            ],
            borderColor: [
              'rgba(16, 185, 129, 1)',
              'rgba(59, 130, 246, 1)',
            ],
            borderWidth: 1,
          },
        ],
      });
    }
  }, [visitors]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visitor Management</h1>
          <p className="text-gray-600">Manage visitor check-ins and check-outs</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Check In Visitor
        </button>
      </div>

      {/* Global Statistics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="card">
          <div className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Monthly Visitors</h3>
            <p className="text-sm text-gray-600"><span className="font-semibold text-gray-900">{monthlyVisitors}</span></p>
          </div>
        </div>
        <div className="card">
          <div className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Trend</h3>
            <div className="h-24">
              {chartData ? (
                <SimpleChart type="bar" data={chartData} height={96} />
              ) : (
                <div className="h-24 bg-gray-50 rounded-lg flex items-center justify-center text-gray-500 text-xs">No data</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name, origin, or meet with..."
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
              <option value="in_building">In Building</option>
              <option value="checked_out">Checked Out</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="card">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <User className="h-8 w-8 text-accent-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Visitors</dt>
                  <dd className="text-lg font-medium text-gray-900">{visitors.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-primary-700" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">In Building</dt>
                  <dd className="text-lg font-medium text-gray-900">{inBuildingCount}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Today</dt>
                  <dd className="text-lg font-medium text-gray-900">{todayVisitors}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visitor List */}
      <div className="card">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading && <li className="px-6 py-4 text-sm text-gray-500">Loading...</li>}
          {error && <li className="px-6 py-4 text-sm text-red-600">{error}</li>}
          {!loading && !error && filteredVisitors.map((visitor) => (
            <li key={visitor.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {getStatusIcon(visitor.check_out ? 'checked_out' : 'in_building')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {visitor.name}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(visitor.check_out ? 'checked_out' : 'in_building')}`}>
                        {(visitor.check_out ? 'checked_out' : 'in_building').replace('_', ' ')}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Building className="h-4 w-4 mr-1" />
                        {visitor.origin}
                      </div>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        Meet: {visitor.meet_with || visitor.person_to_meet}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{visitor.purpose}</p>
                    <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                      {visitor.check_in && <span>Check-in: {format(new Date(visitor.check_in), 'MMM dd, yyyy HH:mm')}</span>}
                      {visitor.check_out && (
                        <span>Check-out: {format(new Date(visitor.check_out), 'MMM dd, yyyy HH:mm')}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {(visitor.status || (visitor.check_out ? 'checked_out' : 'checked_in')) === 'checked_in' && (
                    <button
                      onClick={() => handleCheckOut(visitor.id)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Check Out
                    </button>
                  )}

                  <button
                    onClick={() => handleViewDetails(visitor)}
                    className="text-blue-600 hover:text-blue-800"
                    title="View Details"
                  >
                    <User className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleEdit(visitor)}
                    className="text-accent-600 hover:text-accent-800"
                  >
                    <Edit className="h-4 w-4" />
                  </button>

                  <button
                    onClick={async () => {
                      if (!confirm('Delete this visitor?')) return;
                      try {
                        await api.delete(`/visitors/${visitor.id}`);
                        await loadVisitors(pagination.page);
                      } catch (e) {
                        alert(e?.response?.data?.message || 'Failed to delete');
                      }
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash className="h-4 w-4" />
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
                {editingVisitor ? 'Edit Visitor' : 'Check In Visitor'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Visitor Name</label>
                  <input
                    type="text"
                    required={!editingVisitor}
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Origin</label>
                  <input
                    type="text"
                    required={false}
                    value={formData.origin}
                    onChange={(e) => setFormData({...formData, origin: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Purpose</label>
                  <input
                    type="text"
                    required={!editingVisitor}
                    value={formData.purpose}
                    onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    placeholder="e.g., Meeting with IT Team"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Meet With</label>
                  <input
                    type="text"
                    required={!editingVisitor}
                    value={formData.meet_with}
                    onChange={(e) => setFormData({...formData, meet_with: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    placeholder="e.g., John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">KTP Image (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData({ ...formData, ktp_image: e.target.files?.[0] || null })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Face Image (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData({ ...formData, face_image: e.target.files?.[0] || null })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingVisitor(null);
                      setFormData({ name: '', purpose: '', meet_with: '', origin: '', ktp_image: null, face_image: null });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary px-4 py-2"
                  >
                    {editingVisitor ? 'Update' : 'Check In'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Visitor Detail Modal */}
      {showDetailModal && selectedVisitor && (
        <div className="fixed inset-0 bg-gray-600/40 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-200 w-96 shadow-sm rounded-xl bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Visitor Details</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Visitor Name</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedVisitor.name || 'N/A'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Origin</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedVisitor.origin || 'Not specified'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Purpose</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedVisitor.purpose || 'N/A'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Meet With</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedVisitor.meet_with || selectedVisitor.person_to_meet || 'N/A'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedVisitor.check_out ? 'checked_out' : 'in_building')}`}>
                    {(selectedVisitor.check_out ? 'checked_out' : 'in_building').replace('_', ' ')}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Check-in Time</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedVisitor.check_in ? format(new Date(selectedVisitor.check_in), 'MMM dd, yyyy HH:mm') : 'Not available'}
                  </p>
                </div>
                
                {selectedVisitor.check_out && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Check-out Time</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {format(new Date(selectedVisitor.check_out), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Visit Duration</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedVisitor.visit_time || 'Not calculated'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Visitor ID</label>
                  <p className="mt-1 text-sm text-gray-900">#{selectedVisitor.id || 'N/A'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Sequence</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedVisitor.sequence || 'N/A'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Face Verification</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedVisitor.face_verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedVisitor.face_verified ? 'Verified' : 'Not Verified'}
                  </span>
                </div>
                
                {selectedVisitor.ktp_ocr && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">KTP OCR Data</label>
                    <div className="mt-1 p-2 bg-gray-50 rounded text-xs">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(selectedVisitor.ktp_ocr, null, 2)}</pre>
                    </div>
                  </div>
                )}
                
                {selectedVisitor.ktp_image && selectedVisitor.ktp_image.exists && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">KTP Image</label>
                    <div className="mt-1">
                      <img 
                        src={selectedVisitor.ktp_image.url} 
                        alt="KTP" 
                        className="h-32 w-auto object-contain border border-gray-300 rounded"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}
                
                {selectedVisitor.face_image && selectedVisitor.face_image.exists && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Face Image</label>
                    <div className="mt-1">
                      <img 
                        src={selectedVisitor.face_image.url} 
                        alt="Face" 
                        className="h-32 w-auto object-contain border border-gray-300 rounded"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedVisitor.created_at ? format(new Date(selectedVisitor.created_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
                  </p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
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
      )}
    </div>
  );
};

export default AdminVisitors;

