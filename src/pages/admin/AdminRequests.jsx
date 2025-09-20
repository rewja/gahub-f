import { useEffect, useState } from 'react';
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
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import SkeletonLoader from '../../components/SkeletonLoader';

const AdminRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [note, setNote] = useState('');

  const getStatusIcon = (status) => {
    const display = status === 'procurement' ? 'approved' : status;
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    const display = status === 'procurement' ? 'approved' : status;
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
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

  const getUserName = (userId) => `User ${userId}`;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/requests');
        if (!cancelled) setRequests(res.data || []);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleApprove = async (id) => {
    try {
      await api.patch(`/requests/${id}/approve`, { 
        ga_note: note || undefined
      });
      // Update the local state instead of refetching
      setRequests(prev => prev.map(req => 
        req.id === id ? { ...req, status: 'procurement', ga_note: note || undefined } : req
      ));
      alert('Request approved and asset created successfully!');
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to approve');
    }
  };

  const handleApproveWithModal = (request) => {
    setSelectedRequest(request);
    setShowApproveModal(true);
  };

  const handleSubmitApprove = async () => {
    if (selectedRequest) {
      await handleApprove(selectedRequest.id);
      setShowApproveModal(false);
      setSelectedRequest(null);
      setNote('');
    }
  };

  const handleReject = async (id) => {
    try {
      await api.patch(`/requests/${id}/reject`, { ga_note: note || undefined });
      // Update the local state instead of refetching
      setRequests(prev => prev.map(req => 
        req.id === id ? { ...req, status: 'rejected', ga_note: note || undefined } : req
      ));
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to reject');
    }
  };

  const handleAddNote = (request) => {
    setSelectedRequest(request);
    setNote(request.ga_note || '');
    setShowNoteModal(true);
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  const handleSaveNote = async () => {
    if (!selectedRequest) return;
    try {
      // save note by reusing approve without changing status is not ideal; keeping modal for UX only
      await api.patch(`/requests/${selectedRequest.id}/${selectedRequest.status === 'rejected' ? 'reject' : 'approve'}`, { ga_note: note });
      // Update the local state instead of refetching
      setRequests(prev => prev.map(req => 
        req.id === selectedRequest.id ? { ...req, ga_note: note } : req
      ));
      setShowNoteModal(false);
      setSelectedRequest(null);
      setNote('');
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to save note');
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = (request.item_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (request.reason || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getUserName(request.user_id).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalValue = requests.reduce((sum, req) => sum + (Number(req.estimated_cost) || 0), 0);


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Request Items Management</h1>
        <p className="text-gray-600">Review and approve employee requests</p>
      </div>

      {/* Global Statistics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="card">
          <div className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Request Summary</h3>
            <p className="text-sm text-gray-600">Total Requests: <span className="font-semibold text-gray-900">{requests.length}</span></p>
            <p className="text-sm text-gray-600">Pending: <span className="font-semibold text-gray-900">{requests.filter(r => r.status === 'pending').length}</span></p>
            <p className="text-sm text-gray-600">Approved: <span className="font-semibold text-gray-900">{requests.filter(r => r.status === 'approved' || r.status === 'procurement').length}</span></p>
            <p className="text-sm text-gray-600">Rejected: <span className="font-semibold text-gray-900">{requests.filter(r => r.status === 'rejected').length}</span></p>
          </div>
        </div>
        <div className="card">
          <div className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Total Value</h3>
            <p className="text-sm text-gray-600">Estimated Cost: <span className="font-semibold text-gray-900">Rp {totalValue.toLocaleString()}</span></p>
            <p className="text-sm text-gray-600">Average per Request: <span className="font-semibold text-gray-900">Rp {requests.length ? Math.round(totalValue / requests.length).toLocaleString() : 0}</span></p>
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
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
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

      {/* Request List */}
      <div className="card">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading && (
            <>
              <SkeletonLoader type="list" lines={3} />
            </>
          )}
          {error && <li className="px-6 py-4 text-sm text-red-600 bg-red-50">{error}</li>}
          {!loading && !error && filteredRequests.length === 0 && (
            <li className="px-6 py-4 text-sm text-gray-500 text-center">No requests found</li>
          )}
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
                        {request.status === 'procurement' ? 'approved' : request.status}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(request.category || 'General')}`}>
                        {request.category || 'General'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{request.reason || 'No reason provided'}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {getUserName(request.user_id)}
                      </div>
                      <span>Quantity: {request.quantity}</span>
                      {request.estimated_cost && (
                        <span>Est. Cost: Rp {request.estimated_cost.toLocaleString()}</span>
                      )}
                      <span>Created: {format(new Date(request.created_at), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleViewDetails(request)}
                    className="text-blue-600 hover:text-blue-800"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleAddNote(request)}
                    className="text-accent-600 hover:text-accent-800"
                    title="Add note"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>

                  {request.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApproveWithModal(request)}
                        className="text-green-600 hover:text-green-900 text-xs px-2 py-1 border border-green-300 rounded"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        className="text-red-600 hover:text-red-900 text-xs px-2 py-1 border border-red-300 rounded"
                      >
                        Reject
                      </button>
                    </>
                  )}
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
                Add Note for: {selectedRequest?.item_name}
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
                      setSelectedRequest(null);
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

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600/40 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-200 w-4/5 max-w-4xl shadow-sm rounded-xl bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Request Details: {selectedRequest.item_name}
              </h3>
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Item Name</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedRequest.item_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Quantity</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedRequest.quantity}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Category</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedRequest.category || 'General'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedRequest.status)}`}>
                        {selectedRequest.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Request Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Request Details</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Reason</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedRequest.reason || 'No reason provided'}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Requested By</label>
                        <p className="mt-1 text-sm text-gray-900">{getUserName(selectedRequest.user_id)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Request Date</label>
                        <p className="mt-1 text-sm text-gray-900">{format(new Date(selectedRequest.created_at), 'MMM dd, yyyy HH:mm')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cost Information */}
                {selectedRequest.estimated_cost && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Cost Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Estimated Cost</label>
                        <p className="mt-1 text-sm text-gray-900">Rp {selectedRequest.estimated_cost.toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Total Cost</label>
                        <p className="mt-1 text-sm text-gray-900">Rp {(selectedRequest.estimated_cost * selectedRequest.quantity).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin Notes */}
                {selectedRequest.ga_note && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">GA Notes</h4>
                    <p className="text-sm text-gray-900">{selectedRequest.ga_note}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedRequest(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      handleAddNote(selectedRequest);
                    }}
                    className="px-4 py-2 bg-accent-600 text-white rounded-md text-sm font-medium hover:bg-accent-700"
                  >
                    Add Note
                  </button>
                  {selectedRequest.status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          setShowDetailModal(false);
                          handleApprove(selectedRequest.id);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setShowDetailModal(false);
                          handleReject(selectedRequest.id);
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Approve Request</h3>
                <button
                  onClick={() => setShowApproveModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Item</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedRequest.item_name}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedRequest.quantity}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Asset Category</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedRequest.category || 'General'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Admin Notes</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    placeholder="Add any notes about this approval..."
                  />
                </div>
                
                <div className="bg-blue-50 p-3 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Approving this request will create an asset with code AST-{String(selectedRequest.id).padStart(6, '0')} and make it available for procurement. The asset category will follow the request's category automatically.
                  </p>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowApproveModal(false)}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitApprove}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Approve & Create Asset
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

export default AdminRequests;

