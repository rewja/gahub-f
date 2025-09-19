import React, { useEffect, useState } from 'react';
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
  Check,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import SimpleChart from '../../components/SimpleChart';
import SkeletonLoader from '../../components/SkeletonLoader';

const AdminAssets = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [chartData, setChartData] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

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

  const generateAssetCode = () => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `GA-${year}${month}${random}`;
  };

  // load assets on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const assetsRes = await api.get('/assets');
        if (!cancelled) {
          setAssets(assetsRes.data || []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.response?.data?.message || 'Failed to load assets');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleViewDetails = (asset) => {
    setSelectedAsset(asset);
    setShowDetailModal(true);
  };

  const handleApprove = async (id) => {
    try {
      await api.patch(`/assets/${id}/status`, { status: 'received' });
      const res = await api.get('/assets');
      setAssets(res.data || []);
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to approve asset');
    }
  };

  const handleReject = async (id) => {
    try {
      await api.patch(`/assets/${id}/status`, { status: 'needs_replacement' });
      const res = await api.get('/assets');
      setAssets(res.data || []);
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to reject asset');
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = (asset.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (asset.asset_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (asset.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalValue = assets.reduce((sum, asset) => sum + (asset.purchase_cost || 0), 0);
  const perStatus = React.useMemo(() => ({
    not_received: assets.filter(a => a.status === 'not_received').length,
    received: assets.filter(a => a.status === 'received').length,
    needs_repair: assets.filter(a => a.status === 'needs_repair').length,
    needs_replacement: assets.filter(a => a.status === 'needs_replacement').length,
  }), [assets]);

  // Generate chart data for status distribution
  useEffect(() => {
    if (assets.length > 0) {
      setChartData({
        labels: ['Not Received', 'Received', 'Needs Repair', 'Needs Replacement'],
        datasets: [
          {
            data: [perStatus.not_received, perStatus.received, perStatus.needs_repair, perStatus.needs_replacement],
            backgroundColor: [
              'rgba(245, 158, 11, 0.5)',
              'rgba(16, 185, 129, 0.5)',
              'rgba(245, 158, 11, 0.5)',
              'rgba(239, 68, 68, 0.5)',
            ],
            borderColor: [
              'rgba(245, 158, 11, 1)',
              'rgba(16, 185, 129, 1)',
              'rgba(245, 158, 11, 1)',
              'rgba(239, 68, 68, 1)',
            ],
            borderWidth: 1,
          },
        ],
      });
    }
  }, [perStatus, assets.length]);

  return (
    <div className="space-y-6">
      {/* Load related Request Items for creation */}
      {/* Fetch on mount */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asset Management</h1>
          <p className="text-gray-600">View and manage asset statuses</p>
        </div>
      </div>

      {/* Global Statistics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="card">
          <div className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Assets per Status</h3>
            <p className="text-xs text-gray-600">Not Received: <span className="font-semibold text-gray-900">{perStatus.not_received}</span></p>
            <p className="text-xs text-gray-600">Received: <span className="font-semibold text-gray-900">{perStatus.received}</span></p>
            <p className="text-xs text-gray-600">Needs Repair: <span className="font-semibold text-gray-900">{perStatus.needs_repair}</span></p>
            <p className="text-xs text-gray-600">Needs Replacement: <span className="font-semibold text-gray-900">{perStatus.needs_replacement}</span></p>
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
        <div className="card">
          <div className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Filters</h3>
            <div className="flex flex-wrap gap-2 text-xs">
              <button className="px-3 py-1 rounded-md bg-primary-600 text-white">Monthly</button>
              <button className="px-3 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">Yearly</button>
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
        {loading ? (
          <>
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
          </>
        ) : (
          <>
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
                      <dd className="text-lg font-medium text-gray-900">
                        {assets.filter(a => a.status === 'received').length}
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
                    <AlertTriangle className="h-8 w-8 text-orange-500" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Needs Repair</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {assets.filter(a => a.status === 'needs_repair').length}
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
                    <Package className="h-8 w-8 text-purple-500" />
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
          </>
        )}
      </div>

      {/* Asset List */}
      <div className="card">
        <ul className="divide-y divide-gray-200">
          {loading && (
            <>
              <SkeletonLoader type="list" lines={3} />
            </>
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
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {asset.name}
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
                    onClick={() => handleViewDetails(asset)}
                    className="text-accent-600 hover:text-accent-800"
                  >
                    <Eye className="h-4 w-4" />
                  </button>

                  {(asset.status === 'needs_repair' || asset.status === 'needs_replacement') && (
                    <>
                      <button
                        onClick={() => handleApprove(asset.id)}
                        className="text-green-600 hover:text-green-800"
                        title="Approve"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleReject(asset.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Reject"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Asset Detail Modal */}
      {showDetailModal && selectedAsset && (
        <div className="fixed inset-0 bg-gray-600/40 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-200 w-96 shadow-sm rounded-xl bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Asset Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Asset Name</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedAsset.name}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Asset Code</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedAsset.asset_code}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedAsset.category}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedAsset.status)}`}>
                    {selectedAsset.status.replace('_', ' ')}
                  </span>
                </div>

                {selectedAsset.supplier && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Supplier</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedAsset.supplier}</p>
                  </div>
                )}

                {selectedAsset.location && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedAsset.location}</p>
                  </div>
                )}

                {selectedAsset.purchase_cost && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Purchase Cost</label>
                    <p className="mt-1 text-sm text-gray-900">Rp {selectedAsset.purchase_cost.toLocaleString()}</p>
                  </div>
                )}

                {selectedAsset.purchase_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Purchase Date</label>
                    <p className="mt-1 text-sm text-gray-900">{format(new Date(selectedAsset.purchase_date), 'MMM dd, yyyy')}</p>
                  </div>
                )}

                {selectedAsset.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedAsset.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedAsset(null);
                  }}
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

export default AdminAssets;

