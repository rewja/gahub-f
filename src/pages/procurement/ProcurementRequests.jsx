import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { 
  Package, 
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Eye,
  MessageSquare,
  User,
  DollarSign,
  ShoppingCart,
  Wrench,
  RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';

const ProcurementRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    purchase_date: '',
    actual_cost: '',
    quantity_purchased: '',
    supplier: '',
    notes: ''
  });
  const [assetsByRequestId, setAssetsByRequestId] = useState({});

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'procurement':
        return <Package className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'repairing':
        return <Wrench className="h-4 w-4 text-orange-600" />;
      case 'replacing':
        return <RotateCcw className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-yellow-100 text-yellow-800';
      case 'procurement':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'repairing':
        return 'bg-orange-100 text-orange-800';
      case 'replacing':
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

  const getUserName = (userId) => `User ${userId}`;

  const handleStartProcurement = async (request) => {
    try {
      // One-click start procurement using approved request data
      const today = new Date();
      const payload = {
        request_items_id: request.id,
        purchase_date: today.toISOString().slice(0,10), // YYYY-MM-DD
        amount: Number(request.estimated_cost) || 0,
        notes: request.reason || ''
      };
      await api.post('/procurements', payload);
      // After purchasing, status becomes 'not_received' (awaiting user receipt)
      setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'not_received' } : r));
      // Refresh assets to get latest status
      try {
        const assetsRes = await api.get('/assets');
        const map = (assetsRes.data || []).reduce((acc, a) => {
          acc[a.request_items_id] = a;
          return acc;
        }, {});
        setAssetsByRequestId(map);
      } catch {}
      alert('Procurement started');
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to start procurement');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!selectedRequest) return;
      const payload = {
        request_items_id: selectedRequest.id,
        purchase_date: formData.purchase_date,
        amount: parseFloat(formData.actual_cost),
        notes: formData.notes
      };
      await api.post('/procurements', payload);
      // Reload the data
      const [procRes, reqRes] = await Promise.all([
        api.get('/procurements'),
        api.get('/requests')
      ]);
      
      const approvedRequests = (reqRes.data || []).filter(r => r.status === 'approved');
      const procurements = (procRes.data || []).map(proc => ({
        ...proc,
        status: 'completed',
        title: proc.request?.item_name || 'Unknown Item',
        description: proc.request?.reason || '',
        category: 'General',
        quantity: proc.request?.quantity || 1,
        estimated_cost: proc.amount,
        actual_cost: proc.amount,
        purchase_date: proc.purchase_date,
        procurement_notes: proc.notes,
        user_id: proc.user_id || proc.request?.user_id,
        created_at: proc.created_at
      }));
      
      const allItems = [...approvedRequests, ...procurements];
      setRequests(allItems);
      setShowModal(false);
      setSelectedRequest(null);
      setFormData({ purchase_date: '', actual_cost: '', quantity_purchased: '', supplier: '', notes: '' });
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to record procurement');
    }
  };

  const handleComplete = (id) => {
    // Mark as completed locally once asset is received by user
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'completed' } : r));
    alert('Marked as completed.');
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = (request.item_name || request.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (request.reason || request.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getUserName(request.user_id || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || (request.category || 'General') === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const monthlyCount = requests.length; // simplified counter for this month

  const getDisplayStatus = (request) => {
    const asset = assetsByRequestId[request.id];
    if (!asset) return request.status;
    if (asset.status === 'received') return 'received';
    if (asset.status === 'repairing') return 'repairing';
    if (asset.status === 'replacing') return 'replacing';
    if (asset.status === 'not_received') return 'not_received';
    return request.status;
  };

  useEffect(() => {
    if (!user || user.role !== 'procurement') return;
    let cancelled = false;
    async function load() {
      setLoading(true); setError('');
      try {
        // For procurement role, show requests in procurement pipeline
        const reqRes = await api.get('/procurements/approved-requests');
        const list = Array.isArray(reqRes.data?.data) ? reqRes.data.data : (reqRes.data || []);
        const pipeline = list.filter(r => r.status === 'procurement' || r.status === 'not_received' || r.status === 'completed');
        // Load assets to map request -> asset status
        const assetsRes = await api.get('/assets');
        const map = (assetsRes.data || []).reduce((acc, a) => {
          acc[a.request_items_id] = a;
          return acc;
        }, {});
        if (!cancelled) {
          setRequests(pipeline);
          setAssetsByRequestId(map);
        }
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  // Poll periodically so procurement view reflects user "received" updates
  useEffect(() => {
    if (!user || user.role !== 'procurement') return;
    let cancelled = false;
    const intervalId = setInterval(async () => {
      try {
        const [reqRes, assetsRes] = await Promise.all([
          api.get('/procurements/approved-requests'),
          api.get('/assets')
        ]);
        const list = Array.isArray(reqRes.data?.data) ? reqRes.data.data : (reqRes.data || []);
        const pipeline = list.filter(r => r.status === 'procurement' || r.status === 'not_received' || r.status === 'completed');
        const map = (assetsRes.data || []).reduce((acc, a) => {
          acc[a.request_items_id] = a;
          return acc;
        }, {});
        if (!cancelled) {
          setRequests(pipeline);
          setAssetsByRequestId(map);
        }
      } catch (e) {
        // ignore transient polling errors
      }
    }, 5000);
    return () => { cancelled = true; clearInterval(intervalId); };
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Procurement Management</h1>
        <p className="text-gray-600">Manage approved requests and procurement process</p>
      </div>

      {/* Procurement This Month only */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-1">
        <div className="card">
          <div className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Procurements This Month</h3>
            <p className="text_sm text-gray-600"><span className="font-semibold text-gray-900">{monthlyCount}</span></p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search requests by title, description, or user..."
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
              <option value="approved">Approved</option>
              <option value="procurement">In Procurement</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
            >
              <option value="all">All Categories</option>
              <option value="IT Equipment">IT Equipment</option>
              <option value="Office Furniture">Office Furniture</option>
              <option value="Office Supplies">Office Supplies</option>
              <option value="Maintenance">Maintenance</option>
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
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {requests.filter(r => r.status === 'completed').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Total Value removed as requested */}
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
                    {getStatusIcon(getDisplayStatus(request))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {request.item_name || request.title}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(getDisplayStatus(request))}`}>
                        {getDisplayStatus(request)}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(request.category)}`}>
                        {request.category || 'General'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{request.reason || request.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {getUserName(request.user_id)}
                      </div>
                      <span>Quantity: {request.quantity}</span>
                      {typeof request.estimated_cost === 'number' && (
                        <span>Est. Cost: Rp {request.estimated_cost.toLocaleString()}</span>
                      )}
                      {request.actual_cost && (
                        <span>Actual Cost: Rp {request.actual_cost.toLocaleString()}</span>
                      )}
                      <span>Created: {format(new Date(request.created_at), 'MMM dd, yyyy')}</span>
                    </div>
                    {request.procurement_notes && (
                      <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-800">
                        <strong>Procurement Note:</strong> {request.procurement_notes}
                      </div>
                    )}
                    {request.purchase_date && (
                      <div className="mt-1 text-xs text-gray-500">
                        Purchase Date: {format(new Date(request.purchase_date), 'MMM dd, yyyy')}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {request.status === 'procurement' && (
                    <button
                      onClick={() => handleStartProcurement(request)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <ShoppingCart className="h-3 w-3 mr-1" />
                      Purchase
                    </button>
                  )}

                  {getDisplayStatus(request) === 'received' && (
                    <button
                      onClick={() => handleComplete(request.id)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-accent-600 hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Mark Complete
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600/40 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-200 w-96 shadow-sm rounded-xl bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Start Procurement: {selectedRequest.item_name || selectedRequest.title}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Purchase Date</label>
                  <input
                    type="date"
                    required
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Actual Cost</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formData.actual_cost}
                      onChange={(e) => setFormData({...formData, actual_cost: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity Purchased</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.quantity_purchased}
                      onChange={(e) => setFormData({...formData, quantity_purchased: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Supplier</label>
                  <input
                    type="text"
                    required
                    value={formData.supplier}
                    onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    placeholder="Add procurement notes..."
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setSelectedRequest(null);
                      setFormData({ purchase_date: '', actual_cost: '', quantity_purchased: '', supplier: '', notes: '' });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary px-4 py-2"
                  >
                    Start Procurement
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

export default ProcurementRequests;

