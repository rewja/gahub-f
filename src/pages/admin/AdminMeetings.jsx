import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Search,
  Users,
  User,
  Power,
  Eye,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import SkeletonLoader from '../../components/SkeletonLoader';

const AdminMeetings = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roomUsage, setRoomUsage] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);

  const formatDateTime = (value) => {
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return String(value || '');
      return format(d, 'MMM dd, yyyy HH:mm');
    } catch (_) {
      return String(value || '');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'ongoing':
        return <Clock className="h-4 w-4 text-green-500" />;
      case 'ended':
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'ongoing':
        return 'bg-green-100 text-green-800';
      case 'ended':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUserName = (userId, user) => {
    if (user && user.name) {
      return user.name;
    }
    return `User ${userId}`;
  };

  const handleForceEnd = async (id) => {
    if (!window.confirm('Are you sure you want to force end this meeting?')) return;
    try {
      await api.patch(`/meetings/${id}/force-end`);
      const res = await api.get('/meetings');
      setMeetings(res.data || []);
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to force end');
    }
  };

  const handleViewDetails = (meeting) => {
    setSelectedMeeting(meeting);
    setShowDetailModal(true);
  };

  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch = meeting.agenda.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         meeting.room_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getUserName(meeting.user_id, meeting.user).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || meeting.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const ongoingMeetings = meetings.filter(meeting => meeting.status === 'ongoing');
  const scheduledMeetings = meetings.filter(meeting => meeting.status === 'scheduled');
  const endedMeetings = meetings.filter(meeting => meeting.status === 'ended');
  const avgDurationMinutes = (() => {
    const durations = meetings.filter(m => m.status === 'ended').map(m => (new Date(m.end_time) - new Date(m.start_time))/(1000*60));
    if (!durations.length) return 0;
    return Math.round(durations.reduce((a,b)=>a+b,0)/durations.length);
  })();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError('');
      try {
        const [meetingsRes, statsRes] = await Promise.all([
          api.get('/meetings'),
          api.get('/meetings/stats').catch(() => ({ data: { top_rooms: [] } }))
        ]);
        if (!cancelled) {
          setMeetings(meetingsRes.data || []);
          setRoomUsage(statsRes.data?.top_rooms || []);
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
        <h1 className="text-2xl font-bold text-gray-900">Meeting Management</h1>
        <p className="text-gray-600">Monitor and manage all meetings</p>
      </div>

      {/* Global Statistics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {loading ? (
          <>
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
          </>
        ) : (
          <>
            <div className="card">
              <div className="p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Meetings Ended</h3>
                <p className="text-sm text-gray-600"><span className="font-semibold text-gray-900">{endedMeetings.length}</span></p>
              </div>
            </div>
            <div className="card">
              <div className="p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Avg Duration</h3>
                <p className="text-sm text-gray-600"><span className="font-semibold text-gray-900">{avgDurationMinutes}</span> minutes</p>
              </div>
            </div>
            <div className="card">
              <div className="p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Room Usage</h3>
                {roomUsage.length > 0 ? (
                  <div className="space-y-2">
                    {roomUsage.slice(0, 3).map((room, index) => (
                      <div key={room.room_name} className="flex justify-between items-center text-xs">
                        <span className="text-gray-600">{room.room_name}</span>
                        <span className="font-semibold text-gray-900">{room.total}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-20 bg-gray-50 rounded-lg flex items-center justify-center text-gray-500 text-xs">
                    No room usage data
                  </div>
                )}
              </div>
            </div>
          </>
        )}
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
              placeholder="Search meetings by agenda, room, or user..."
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
              <option value="scheduled">Scheduled</option>
              <option value="ongoing">Ongoing</option>
              <option value="ended">Ended</option>
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
                <Calendar className="h-8 w-8 text-accent-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Scheduled</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {scheduledMeetings.length}
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
                <Clock className="h-8 w-8 text-primary-700" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Ongoing</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {ongoingMeetings.length}
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
                <CheckCircle className="h-8 w-8 text-gray-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {meetings.filter(m => m.status === 'ended').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ongoing Meetings Alert */}
      {ongoingMeetings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Active Meetings
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>There are {ongoingMeetings.length} meeting(s) currently in progress:</p>
                <ul className="mt-1 list-disc list-inside">
                  {ongoingMeetings.map(meeting => (
                    <li key={meeting.id}>
                      {meeting.agenda} in {meeting.room_name} by {getUserName(meeting.user_id, meeting.user)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Meeting List */}
      <div className="card">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading && <li className="px-6 py-4 text-sm text-gray-500">Loading...</li>}
          {error && <li className="px-6 py-4 text-sm text-red-600">{error}</li>}
          {!loading && !error && filteredMeetings.map((meeting) => (
            <li key={meeting.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {getStatusIcon(meeting.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {meeting.agenda}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(meeting.status)}`}>
                        {meeting.status}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {meeting.room_name}
                      </div>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {getUserName(meeting.user_id, meeting.user)}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {format(new Date(meeting.start_time), 'MMM dd, yyyy HH:mm')} - {format(new Date(meeting.end_time), 'HH:mm')}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Created: {format(new Date(meeting.created_at), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleViewDetails(meeting)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View Details
                  </button>
                  {meeting.status === 'ongoing' && (
                    <button
                      onClick={() => handleForceEnd(meeting.id)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <Power className="h-3 w-3 mr-1" />
                      Force End
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Meeting Detail Modal */}
      {showDetailModal && selectedMeeting && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Meeting Details</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Agenda</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedMeeting.agenda || 'N/A'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Room</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedMeeting.room_name || 'N/A'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Time</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedMeeting.start_time ? formatDateTime(selectedMeeting.start_time) : 'N/A'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Time</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedMeeting.end_time ? formatDateTime(selectedMeeting.end_time) : 'N/A'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedMeeting.status)}`}>
                    {selectedMeeting.status || 'N/A'}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Organizer</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedMeeting.user ? selectedMeeting.user.name : `User ${selectedMeeting.user_id || 'N/A'}`}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedMeeting.created_at ? formatDateTime(selectedMeeting.created_at) : 'N/A'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedMeeting.updated_at ? formatDateTime(selectedMeeting.updated_at) : 'N/A'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Meeting ID</label>
                  <p className="mt-1 text-sm text-gray-900">#{selectedMeeting.id || 'N/A'}</p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
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

export default AdminMeetings;

