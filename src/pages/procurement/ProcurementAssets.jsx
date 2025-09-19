import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { 
  Building, 
  Package, 
  CheckCircle, 
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Eye,
  DollarSign,
  Wrench,
  RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';

const ProcurementAssets = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'not_received':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'received':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'needs_repair':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'needs_replacement':
        return <RefreshCw className="h-4 w-4 text-red-500" />;
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
        return 'bg-red-100 text-red-800';
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

  const filteredAssets = assets.filter(asset => {
    const displayName = (asset.request?.item_name) || asset.category || '';
    const matchesSearch = displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (asset.asset_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (asset.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalValue = assets.reduce((sum, asset) => sum + (asset.purchase_cost || 0), 0);
  const receivedAssets = assets.filter(a => a.status === 'received').length;
  const pendingAssets = assets.filter(a => a.status === 'not_received').length;
  const handleMarkRepaired = async (id) => {
    try {
      await api.patch(`/assets/${id}/status`, { status: 'received' });
      const res = await api.get('/assets');
      const filteredAssets = (res.data || []).filter(asset => 
        asset.status === 'needs_repair' || asset.status === 'needs_replacement'
      );
      setAssets(filteredAssets);
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to mark as repaired');
    }
  };

  const handleMarkReplaced = async (id) => {
    try {
      await api.patch(`/assets/${id}/status`, { status: 'received' });
      const res = await api.get('/assets');
      const filteredAssets = (res.data || []).filter(asset => 
        asset.status === 'needs_repair' || asset.status === 'needs_replacement'
      );
      setAssets(filteredAssets);
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to mark as replaced');
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError('');
      try {
        const res = await api.get('/assets');
        if (!cancelled) {
          // Filter to only show assets that need repair after approval
          const filteredAssets = (res.data || []).filter(asset => 
            asset.status === 'needs_repair' || asset.status === 'needs_replacement'
          );
          setAssets(filteredAssets);
        }
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
        <h1 className="text-2xl font-bold text-gray-900">Asset Repair Management</h1>
        <p className="text-gray-600">Process assets that need repair or replacement</p>
      </div>

      {/* Header Statistics (simplified for repair management) */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="card">
          <div className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Assets Needing Repair</h3>
            <p className="text-sm text-gray-600"><span className="font-semibold text-gray-900">{assets.filter(a => a.status === 'needs_repair').length}</span></p>
          </div>
        </div>
        {/* Removed monthly/yearly placeholders */}
        <div className="card">
          <div className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Assets Needing Replacement</h3>
            <p className="text-sm text-gray-600"><span className="font-semibold text-gray-900">{assets.filter(a => a.status === 'needs_replacement').length}</span></p>
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
              placeholder="Search assets by name, code, or category..."
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
              <option value="not_received">Not Received</option>
              <option value="received">Received</option>
              <option value="needs_repair">Needs Repair</option>
              <option value="needs_replacement">Needs Replacement</option>
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
                <Building className="h-8 w-8 text-accent-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Assets</dt>
                  <dd className="text-lg font-medium text-gray-900">{assets.length}</dd>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Received</dt>
                  <dd className="text-lg font-medium text-gray-900">{receivedAssets}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                  <dd className="text-lg font-medium text-gray-900">{pendingAssets}</dd>
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
                    Rp {totalValue.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Asset List */}
      <div className="card">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading && <li className="px-6 py-4 text-sm text-gray-500">Loading...</li>}
          {error && <li className="px-6 py-4 text-sm text-red-600">{error}</li>}
          {!loading && !error && filteredAssets.map((asset) => (
            <li key={asset.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {getStatusIcon(asset.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {(asset.request?.item_name) || asset.category}
                      </h3>
                      <span className="text-xs text-gray-500 font-mono">
                        {asset.asset_code}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(asset.status)}`}>
                        {asset.status.replace('_', ' ')}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(asset.category)}`}>
                        {asset.category}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                      {asset.supplier && <span>Supplier: {asset.supplier}</span>}
                      {asset.location && <span>Location: {asset.location}</span>}
                      {typeof asset.purchase_cost === 'number' && <span>Cost: Rp {asset.purchase_cost.toLocaleString()}</span>}
                      {asset.purchase_date && <span>Date: {format(new Date(asset.purchase_date), 'MMM dd, yyyy')}</span>}
                    </div>
                    {asset.notes && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
                        <strong>Notes:</strong> {asset.notes}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => { setSelectedAsset(asset); setShowDetailModal(true); }}
                    className="text-accent-600 hover:text-accent-800"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  
                  {asset.status === 'needs_repair' && (
                    <button
                      onClick={() => handleMarkRepaired(asset.id)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      <Wrench className="h-3 w-3 mr-1" />
                      Mark Repaired
                    </button>
                  )}
                  
                  {asset.status === 'needs_replacement' && (
                    <button
                      onClick={() => handleMarkReplaced(asset.id)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Mark Replaced
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Category Breakdown */}
      <div className="card">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Assets by Category
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {['IT Equipment', 'Office Furniture', 'Office Supplies', 'Maintenance'].map((category) => {
              const categoryAssets = assets.filter(a => a.category === category);
              const categoryValue = categoryAssets.reduce((sum, a) => sum + (a.purchase_cost||0), 0);
              
              return (
                <div key={category} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{category}</p>
                      <p className="text-xs text-gray-500">{categoryAssets.length} assets</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        Rp {categoryValue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Asset Detail Modal */}
      {showDetailModal && selectedAsset && (
        <div className="fixed inset-0 bg-gray-600/40 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-200 w-96 shadow-sm rounded-xl bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Asset Details</h3>
              <div className="space-y-3 text-sm text-gray-700">
                <div><strong>Item:</strong> {(selectedAsset.request?.item_name) || selectedAsset.category}</div>
                <div><strong>Code:</strong> {selectedAsset.asset_code}</div>
                <div><strong>Category:</strong> {selectedAsset.category}</div>
                <div><strong>Status:</strong> {selectedAsset.status?.replace('_',' ')}</div>
                {selectedAsset.location && (<div><strong>Location:</strong> {selectedAsset.location}</div>)}
                {selectedAsset.purchase_cost && (<div><strong>Cost:</strong> Rp {Number(selectedAsset.purchase_cost).toLocaleString()}</div>)}
                {selectedAsset.purchase_date && (<div><strong>Date:</strong> {format(new Date(selectedAsset.purchase_date), 'MMM dd, yyyy')}</div>)}
                {selectedAsset.notes && (<div><strong>Notes:</strong> {selectedAsset.notes}</div>)}
                {selectedAsset.request && (
                  <div className="pt-2 border-t border-gray-200">
                    <div className="font-semibold text-gray-900 mb-1">Request Info</div>
                    <div><strong>User ID:</strong> {selectedAsset.request.user_id}</div>
                    <div><strong>Reason:</strong> {selectedAsset.request.reason}</div>
                    <div><strong>Quantity:</strong> {selectedAsset.request.quantity}</div>
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  type="button"
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

export default ProcurementAssets;

