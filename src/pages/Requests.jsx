import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { 
  Plus, 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle,
  Edit,
  Trash2,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import SimpleChart from '../components/SimpleChart';

const Requests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    quantity: 1,
    estimated_cost: ''
  });
  const [chartData, setChartData] = useState(null);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'procurement':
        return <Package className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'procurement':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'IT Equipment':
        return 'bg-blue-100 text-blue-800';
      case 'Office Furniture':
        return 'bg-purple-100 text-purple-800';
      case 'Office Supplies':
        return 'bg-green-100 text-green-800';
      case 'Maintenance':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { 
        item_name: formData.title, 
        quantity: formData.quantity, 
        reason: formData.description,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
        category: formData.category
      };
      if (editingRequest) {
        await api.patch(`/requests/${editingRequest.id}`, payload);
      } else {
        await api.post('/requests', payload);
      }
      const res = await api.get('/requests/mine');
      setRequests(res.data || []);
      setFormData({ title: '', description: '', category: '', quantity: 1, estimated_cost: '' });
      setShowModal(false);
      setEditingRequest(null);
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to submit');
    }
  };

  const handleEdit = (request) => {
    setEditingRequest(request);
    setFormData({
      title: request.item_name || '',
      description: request.reason || '',
      category: request.category || '',
      quantity: request.quantity || 1,
      estimated_cost: request.estimated_cost ? String(request.estimated_cost) : ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this request?')) return;
    try {
      await api.delete(`/requests/${id}`);
      const res = await api.get('/requests/mine');
      setRequests(res.data || []);
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to delete');
    }
  };
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) return;
      setLoading(true); setError('');
      try {
        const res = await api.get('/requests/mine');
        if (!cancelled) setRequests(res.data || []);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  // Chart data based on current requests
  useEffect(() => {
    if (requests.length > 0) {
      const statusCounts = {
        'pending': requests.filter(r => r.status === 'pending').length,
        'approved': requests.filter(r => r.status === 'approved').length,
        'rejected': requests.filter(r => r.status === 'rejected').length,
        'procurement': requests.filter(r => r.status === 'procurement').length,
      };

      setChartData({
        labels: Object.keys(statusCounts),
        datasets: [
          {
            label: 'Requests by Status',
            data: Object.values(statusCounts),
            backgroundColor: [
              'rgba(245, 158, 11, 0.5)',
              'rgba(16, 185, 129, 0.5)',
              'rgba(239, 68, 68, 0.5)',
              'rgba(59, 130, 246, 0.5)',
            ],
            borderColor: [
              'rgba(245, 158, 11, 1)',
              'rgba(16, 185, 129, 1)',
              'rgba(239, 68, 68, 1)',
              'rgba(59, 130, 246, 1)',
            ],
            borderWidth: 1,
          },
        ],
      });
    }
  }, [requests]);

  const filteredRequests = requests.filter(request => {
    // You can add filtering logic here
    return true;
  });

  const totalEstimatedCost = requests.reduce((sum, req) => sum + (Number(req.estimated_cost) || 0), 0);
  // Personal request statistics
  const approvedCount = requests.filter(r => r.status === 'approved' || r.status === 'procurement').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Item Requests</h1>
          <p className="text-gray-600">Request office equipment, supplies, and other items</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </button>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {requests.filter(r => r.status === 'pending').length}
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
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Approved</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {requests.filter(r => r.status === 'approved').length}
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
                <Package className="h-8 w-8 text-accent-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">In Procurement</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {requests.filter(r => r.status === 'procurement').length}
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
                <DollarSign className="h-8 w-8 text-purple-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Value</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    Rp {(totalEstimatedCost || 0).toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Statistics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="card">
          <div className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Status Breakdown</h3>
            <p className="text-sm text-gray-600">Approved: <span className="font-semibold text-gray-900">{approvedCount}</span></p>
            <p className="text-sm text-gray-600">Rejected: <span className="font-semibold text-gray-900">{rejectedCount}</span></p>
            <p className="text-sm text-gray-600">Waiting: <span className="font-semibold text-gray-900">{pendingCount}</span></p>
          </div>
        </div>
        <div className="card">
          <div className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Total Estimated Cost</h3>
            <p className="text-sm text-gray-600"><span className="font-semibold text-gray-900">${totalEstimatedCost.toLocaleString()}</span></p>
          </div>
        </div>
        <div className="card">
          <div className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Trend Preview</h3>
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

      {/* Request List */}
      <div className="card">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading && <li className="px-6 py-4 text-sm text-gray-500">Loading...</li>}
          {error && <li className="px-6 py-4 text-sm text-red-600">{error}</li>}
          {!loading && !error && filteredRequests.map((request) => (
            <li key={request.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {getStatusIcon(request.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {request.item_name}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(request.category)}`}>
                        {request.category || 'General'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{request.reason}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>Quantity: {request.quantity}</span>
                      <span>Est. Cost: Rp {(Number(request.estimated_cost) || 0).toLocaleString()}</span>
                      <span>Created: {format(new Date(request.created_at), 'MMM dd, yyyy')}</span>
                    </div>
                    {request.admin_notes && (
                      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/30 rounded text-xs text-blue-800 dark:text-blue-300">
                        <strong>Admin Note:</strong> {request.admin_notes}
                      </div>
                    )}
                    {request.procurement_notes && (
                      <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/30 rounded text-xs text-green-800 dark:text-green-300">
                        <strong>Procurement Note:</strong> {request.procurement_notes}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {request.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleEdit(request)}
                        className="text-accent-600 hover:text-accent-800"
                      >
                        <Edit className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(request.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
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
                {editingRequest ? 'Edit Request' : 'New Item Request'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Item Name</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    placeholder="e.g., Laptop untuk development"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reason</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    placeholder="Describe why you need this item..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  >
                    <option value="">Select category</option>
                    <option value="IT Equipment">IT Equipment</option>
                    <option value="Office Furniture">Office Furniture</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value)})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Estimated Cost</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.estimated_cost}
                      onChange={(e) => setFormData({...formData, estimated_cost: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingRequest(null);
                      setFormData({ title: '', description: '', category: '', quantity: 1, estimated_cost: '' });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary px-4 py-2"
                  >
                    {editingRequest ? 'Update' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Requests;

