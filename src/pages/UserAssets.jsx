import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, fileUrl } from '../lib/api';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Search,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';

const UserAssets = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [statusForm, setStatusForm] = useState({
    status: '',
    notes: '',
    receipt_proof: null,
    repair_proof: null
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'procurement':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'received':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'not_received':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'needs_repair':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'needs_replacement':
        return <AlertCircle className="h-4 w-4 text-purple-500" />;
      default:
        return <Package className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'not_received':
        return 'bg-yellow-100 text-yellow-800';
      case 'received':
        return 'bg-green-100 text-green-800';
      case 'needs_repair':
        return 'bg-orange-100 text-orange-800';
      case 'needs_replacement':
        return 'bg-purple-100 text-purple-800';
      case 'procurement':
        return 'bg-blue-100 text-blue-800';
      case 'repairing':
        return 'bg-orange-100 text-orange-800';
      case 'replacing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'procurement':
        return 'In Procurement';
      case 'not_received':
        return 'Not Received';
      case 'received':
        return 'Received';
      case 'needs_repair':
        return 'Needs Repair';
      case 'needs_replacement':
        return 'Needs Replacement';
      case 'repairing':
        return 'Repairing';
      case 'replacing':
        return 'Replacement In Process';
      default:
        return status;
    }
  };

  const handleViewDetails = (asset) => {
    setSelectedAsset(asset);
    setShowStatusModal(true);
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('status', statusForm.status);
      formData.append('notes', statusForm.notes);
      
      if (statusForm.receipt_proof) {
        formData.append('receipt_proof', statusForm.receipt_proof);
      }
      
      if (statusForm.repair_proof) {
        formData.append('repair_proof', statusForm.repair_proof);
      }

      // Use POST for form-data to avoid issues with some servers handling PATCH + multipart
      await api.post(`/assets/${selectedAsset.id}/user-status`, formData, { isForm: true });
      
      // Reload assets
      const res = await api.get('/assets/mine');
      setAssets(res.data || []);
      
      setShowStatusModal(false);
      setSelectedAsset(null);
      setStatusForm({
        status: '',
        notes: '',
        receipt_proof: null,
        repair_proof: null
      });
      
      alert('Asset status updated successfully');
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to update asset status');
    }
  };

  const filteredAssets = assets.filter(asset => {
    const displayName = (asset.request?.item_name) || asset.category || '';
    const matchesSearch = displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (asset.asset_code || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    return matchesSearch && matchesStatus;
  });


  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/assets/mine');
        if (!cancelled) setAssets(res.data || []);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || 'Failed to load assets');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Assets</h1>
        <p className="text-gray-600">Manage your assigned assets and update their status</p>
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
              placeholder="Search assets by name or code..."
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
              <option value="procurement">In Procurement</option>
              <option value="not_received">Not Received</option>
              <option value="received">Received</option>
              <option value="needs_repair">Needs Repair</option>
              <option value="needs_replacement">Needs Replacement</option>
              <option value="repairing">Repairing</option>
              <option value="replacing">Replacement In Process</option>
            </select>
          </div>
        </div>
      </div>

      {/* Asset List */}
      <div className="card">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading && (
            <li className="px-6 py-4 text-sm text-gray-500">Loading...</li>
          )}
          {error && <li className="px-6 py-4 text-sm text-red-600 bg-red-50">{error}</li>}
          {!loading && !error && filteredAssets.length === 0 && (
            <li className="px-6 py-4 text-sm text-gray-500 text-center">No assets found</li>
          )}
          {!loading && !error && filteredAssets.map((asset) => (
            <li key={asset.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {getStatusIcon(asset.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {(asset.request?.item_name) || asset.category}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(asset.status)}`}>
                        {getStatusText(asset.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Code: {asset.asset_code} | Category: {asset.category}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <div className="flex items-center">
                        <Package className="h-4 w-4 mr-1" />
                        Created: {format(new Date(asset.created_at), 'MMM dd, yyyy')}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleViewDetails(asset)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Update Status
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && selectedAsset && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Update Asset Status</h3>
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleStatusUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Asset</label>
                  <p className="mt-1 text-sm text-gray-900">{(selectedAsset.request?.item_name) || selectedAsset.category} ({selectedAsset.asset_code})</p>
                </div>

                {(selectedAsset.receipt_proof_path || selectedAsset.repair_proof_path) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Existing Proof</label>
                    <div className="mt-1 grid grid-cols-1 gap-2">
                      {selectedAsset.receipt_proof_path && (
                        <img src={fileUrl(selectedAsset.receipt_proof_path)} alt="Receipt proof" className="w-full rounded border" />
                      )}
                      {selectedAsset.repair_proof_path && (
                        <img src={fileUrl(selectedAsset.repair_proof_path)} alt="Repair/Replacement proof" className="w-full rounded border" />
                      )}
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status *</label>
                  <select
                    value={statusForm.status}
                    onChange={(e) => setStatusForm({...statusForm, status: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    required
                  >
                    <option value="">Select Status</option>
                    <option value="received">Received</option>
                    <option value="not_received">Not Received</option>
                    <option value="needs_repair">Needs Repair</option>
                    <option value="needs_replacement">Needs Replacement</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={statusForm.notes}
                    onChange={(e) => setStatusForm({...statusForm, notes: e.target.value})}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    placeholder="Add any notes about the asset status..."
                  />
                </div>
                
                {(statusForm.status === 'received') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Receipt Proof *</label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setStatusForm({...statusForm, receipt_proof: e.target.files[0]})}
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      required
                    />
                  </div>
                )}
                
                {(statusForm.status === 'needs_repair' || statusForm.status === 'needs_replacement') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Repair/Replacement Proof *</label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setStatusForm({...statusForm, repair_proof: e.target.files[0]})}
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      required
                    />
                  </div>
                )}
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowStatusModal(false)}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Update Status
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

export default UserAssets;

