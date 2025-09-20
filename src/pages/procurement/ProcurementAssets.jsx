import { useEffect, useState } from "react";
import { api, fileUrl } from "../../lib/api";
import {
  Package,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Eye,
  Wrench,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";

const ProcurementAssets = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

  const getStatusIcon = (status) => {
    switch (status) {
      case "procurement":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "not_received":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "received":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "needs_repair":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "needs_replacement":
        return <RefreshCw className="h-4 w-4 text-red-500" />;
      case "repairing":
        return <Wrench className="h-4 w-4 text-orange-600" />;
      case "replacing":
        return <RotateCcw className="h-4 w-4 text-blue-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "procurement":
        return "bg-blue-100 text-blue-800";
      case "not_received":
        return "bg-yellow-100 text-yellow-800";
      case "received":
        return "bg-green-100 text-green-800";
      case "needs_repair":
        return "bg-orange-100 text-orange-800";
      case "needs_replacement":
        return "bg-red-100 text-red-800";
      case "repairing":
        return "bg-orange-100 text-orange-800";
      case "replacing":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case "IT Equipment":
        return "bg-blue-100 text-blue-800";
      case "Office Furniture":
        return "bg-purple-100 text-purple-800";
      case "Office Supplies":
        return "bg-green-100 text-green-800";
      case "Maintenance":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredAssets = assets.filter((asset) => {
    const displayName = asset.request?.item_name || asset.category || "";
    const matchesSearch =
      displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.asset_code || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (asset.category || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || asset.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleMarkRepaired = async (id) => {
    try {
      // Process repair via user-status endpoint (allowed for procurement)
      await api.post(`/assets/${id}/user-status`, { status: "repairing" });
      // Optimistically update local state so item stays visible
      setAssets(prev => prev.map(a => a.id === id ? { ...a, status: "repairing" } : a));
      // Optional refresh to stay in sync
      const res = await api.get("/assets");
      const filteredAssets = (res.data || []).filter(
        (asset) =>
          asset.status === "procurement" ||
          asset.status === "repairing" ||
          asset.status === "replacing" ||
          asset.status === "needs_repair" ||
          asset.status === "needs_replacement"
      );
      setAssets(filteredAssets);
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to mark as repaired");
    }
  };

  const handleMarkReplaced = async (id) => {
    try {
      await api.post(`/assets/${id}/user-status`, { status: "replacing" });
      // Optimistically update local state
      setAssets(prev => prev.map(a => a.id === id ? { ...a, status: "replacing" } : a));
      // Optional refresh to stay in sync
      const res = await api.get("/assets");
      const filteredAssets = (res.data || []).filter(
        (asset) =>
          asset.status === "procurement" ||
          asset.status === "repairing" ||
          asset.status === "replacing" ||
          asset.status === "needs_repair" ||
          asset.status === "needs_replacement"
      );
      setAssets(filteredAssets);
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to mark as replaced");
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/assets");
        if (!cancelled) {
          // Show assets in procurement pipeline (approved by admin) and in-process ones
          const filteredAssets = (res.data || []).filter(
            (asset) =>
              asset.status === "procurement" ||
              asset.status === "repairing" ||
              asset.status === "replacing" ||
              asset.status === "needs_repair" ||
              asset.status === "needs_replacement"
          );
          setAssets(filteredAssets);
        }
      } catch (e) {
        if (!cancelled)
          setError(e?.response?.data?.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Asset Repair Management
        </h1>
        <p className="text-gray-600">
          Process assets that need repair or replacement
        </p>
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
          {error && <li className="px-6 py-4 text-sm text-red-600">{error}</li>}
          {!loading &&
            !error &&
            filteredAssets.map((asset) => (
              <li key={asset.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getStatusIcon(asset.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {asset.request?.item_name || asset.category}
                        </h3>
                        <span className="text-xs text-gray-500 font-mono">
                          {asset.asset_code}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            asset.status
                          )}`}
                        >
                          {asset.status.replace("_", " ")}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(
                            asset.category
                          )}`}
                        >
                          {asset.category}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        {asset.supplier && (
                          <span>Supplier: {asset.supplier}</span>
                        )}
                        {asset.location && (
                          <span>Location: {asset.location}</span>
                        )}
                        {typeof asset.purchase_cost === "number" && (
                          <span>
                            Cost: Rp {asset.purchase_cost.toLocaleString()}
                          </span>
                        )}
                        {asset.purchase_date && (
                          <span>
                            Date:{" "}
                            {format(
                              new Date(asset.purchase_date),
                              "MMM dd, yyyy"
                            )}
                          </span>
                        )}
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
                      onClick={() => {
                        setSelectedAsset(asset);
                        setShowDetailModal(true);
                      }}
                      className="text-accent-600 hover:text-accent-800"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    {asset.status === "needs_repair" && (
                      <button
                        onClick={() => handleMarkRepaired(asset.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <Wrench className="h-3 w-3 mr-1" />
                        Process Repair
                      </button>
                    )}

                  {(asset.status === "needs_replacement" || asset.status === "procurement") && (
                      <button
                        onClick={() => handleMarkReplaced(asset.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Process Replacement
                      </button>
                    )}

                  {asset.status === "procurement" && (
                    <button
                      onClick={() => handleMarkRepaired(asset.id)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      <Wrench className="h-3 w-3 mr-1" />
                      Process Repair
                    </button>
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
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Asset Details
              </h3>
              <div className="space-y-3 text-sm text-gray-700">
                <div>
                  <strong>Item:</strong>{" "}
                  {selectedAsset.request?.item_name || selectedAsset.category}
                </div>
                <div>
                  <strong>Code:</strong> {selectedAsset.asset_code}
                </div>
                <div>
                  <strong>Category:</strong> {selectedAsset.category}
                </div>
                <div>
                  <strong>Status:</strong>{" "}
                  {selectedAsset.status?.replace("_", " ")}
                </div>
                {selectedAsset.location && (
                  <div>
                    <strong>Location:</strong> {selectedAsset.location}
                  </div>
                )}
                {selectedAsset.purchase_cost && (
                  <div>
                    <strong>Cost:</strong> Rp{" "}
                    {Number(selectedAsset.purchase_cost).toLocaleString()}
                  </div>
                )}
                {selectedAsset.purchase_date && (
                  <div>
                    <strong>Date:</strong>{" "}
                    {format(
                      new Date(selectedAsset.purchase_date),
                      "MMM dd, yyyy"
                    )}
                  </div>
                )}
                {selectedAsset.notes && (
                  <div>
                    <strong>Notes:</strong> {selectedAsset.notes}
                  </div>
                )}
                {(selectedAsset.receipt_proof_path || selectedAsset.repair_proof_path) && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Proof Images</div>
                    {selectedAsset.receipt_proof_path && (
                      <img src={fileUrl(selectedAsset.receipt_proof_path)} alt="Receipt proof" className="w-full rounded border" />
                    )}
                    {selectedAsset.repair_proof_path && (
                      <img src={fileUrl(selectedAsset.repair_proof_path)} alt="Repair/Replacement proof" className="w-full rounded border" />
                    )}
                  </div>
                )}
                {selectedAsset.request && (
                  <div className="pt-2 border-t border-gray-200">
                    <div className="font-semibold text-gray-900 mb-1">
                      Request Info
                    </div>
                    <div>
                      <strong>User ID:</strong> {selectedAsset.request.user_id}
                    </div>
                    <div>
                      <strong>Reason:</strong> {selectedAsset.request.reason}
                    </div>
                    <div>
                      <strong>Quantity:</strong>{" "}
                      {selectedAsset.request.quantity}
                    </div>
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
