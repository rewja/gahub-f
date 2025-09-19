import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Edit,
  Trash2,
  Users
} from 'lucide-react';
import { format } from 'date-fns';

const Meetings = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [formData, setFormData] = useState({
    room_name: '',
    agenda: '',
    start_time: '',
    end_time: ''
  });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Client-side validation: prevent creating meetings in the past
      if (formData.start_time) {
        const start = new Date(formData.start_time);
        const now = new Date();
        if (start.getTime() < now.getTime()) {
          alert('Start time cannot be in the past');
          return;
        }
      }
      
      if (editingMeeting) {
        // Update existing meeting
        await api.patch(`/meetings/${editingMeeting.id}`, formData);
      } else {
        // Create new meeting
        await api.post('/meetings', formData);
      }
      
      const res = await api.get('/meetings');
      setMeetings(res.data || []);
      setFormData({ room_name: '', agenda: '', start_time: '', end_time: '' });
      setShowModal(false);
      setEditingMeeting(null);
    } catch (e) {
      alert(e?.response?.data?.message || `Failed to ${editingMeeting ? 'update' : 'create'} meeting`);
    }
  };

  const handleEdit = (meeting) => {
    setEditingMeeting(meeting);
    setFormData({
      room_name: meeting.room_name,
      agenda: meeting.agenda,
      start_time: format(new Date(meeting.start_time), "yyyy-MM-dd'T'HH:mm"),
      end_time: format(new Date(meeting.end_time), "yyyy-MM-dd'T'HH:mm")
    });
    setShowModal(true);
  };

  const handleViewDetails = (meeting) => {
    setSelectedMeeting(meeting);
    setShowDetailModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this meeting?')) return;
    try {
      await api.delete(`/meetings/${id}`);
      const res = await api.get('/meetings');
      setMeetings(res.data || []);
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to delete meeting');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      if (newStatus === 'ongoing') {
        await api.patch(`/meetings/${id}/start`);
      } else if (newStatus === 'ended') {
        await api.patch(`/meetings/${id}/end`);
      }
      const res = await api.get('/meetings');
      setMeetings(res.data || []);
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to update status');
    }
  };

  const filteredMeetings = meetings.filter(meeting => {
    // You can add filtering logic here
    return true;
  });

  const upcomingMeetings = meetings.filter(meeting => 
    new Date(meeting.start_time) > new Date() && meeting.status === 'scheduled'
  );

  const ongoingMeetings = meetings.filter(meeting => meeting.status === 'ongoing');
  // Personal meeting statistics
  const meetingsToday = meetings.filter(m => new Date(m.start_time).toDateString() === new Date().toDateString()).length;
  const avgDurationMinutes = (() => {
    const durations = meetings.filter(m => m.status === 'ended').map(m => (new Date(m.end_time) - new Date(m.start_time))/(1000*60));
    if (!durations.length) return 0;
    return Math.round(durations.reduce((a,b)=>a+b,0)/durations.length);
  })();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) return;
      setLoading(true); setError('');
      try {
        const res = await api.get('/meetings');
        if (!cancelled) setMeetings(res.data || []);
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
          <h1 className="text-2xl font-bold text-gray-900">Meeting Room Booking</h1>
          <p className="text-gray-600">Schedule and manage your meetings</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Book Meeting Room
        </button>
      </div>

      {/* Personal Statistics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="card">
          <div className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Meetings Today</h3>
            <p className="text-sm text-gray-600"><span className="font-semibold text-gray-900">{meetingsToday}</span> scheduled</p>
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
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Popular Rooms</h3>
            <p className="text-sm text-gray-600">Coming soon</p>
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
                    {meetings.filter(m => m.status === 'scheduled').length}
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

      {/* Upcoming Meetings */}
      {upcomingMeetings.length > 0 && (
        <div className="card">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Upcoming Meetings
            </h3>
            <div className="space-y-3">
              {upcomingMeetings.slice(0, 3).map((meeting) => (
                <div key={meeting.id} className="flex items-center justify-between p-3 bg-accent-50 dark:bg-accent-900/20 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-accent-600 dark:text-accent-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{meeting.agenda}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">{meeting.room_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {format(new Date(meeting.start_time), 'MMM dd, yyyy')}
                    </p>
                    <p className="text-xs text-gray-600">
                      {format(new Date(meeting.start_time), 'HH:mm')} - {format(new Date(meeting.end_time), 'HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Meeting List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
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
                    className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 border border-blue-300 rounded"
                  >
                    Detail
                  </button>
                  {meeting.status === 'scheduled' && (
                    <select
                      value={meeting.status}
                      onChange={(e) => handleStatusChange(meeting.id, e.target.value)}
                      className="text-xs border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="ongoing">Start Meeting</option>
                    </select>
                  )}

                  {meeting.status === 'ongoing' && (
                    <select
                      value={meeting.status}
                      onChange={(e) => handleStatusChange(meeting.id, e.target.value)}
                      className="text-xs border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="ongoing">Ongoing</option>
                      <option value="ended">End Meeting</option>
                    </select>
                  )}

                  {meeting.status === 'scheduled' && (
                    <>
                      <button
                        onClick={() => handleEdit(meeting)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(meeting.id)}
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingMeeting ? 'Edit Meeting' : 'Book Meeting Room'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Room Name</label>
                  <select
                    required
                    value={formData.room_name}
                    onChange={(e) => setFormData({...formData, room_name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select room</option>
                    <option value="Meeting Room A">Meeting Room A</option>
                    <option value="Meeting Room B">Meeting Room B</option>
                    <option value="Conference Room A">Conference Room A</option>
                    <option value="Conference Room B">Conference Room B</option>
                    <option value="Training Room">Training Room</option>
                    <option value="Board Room">Board Room</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Agenda</label>
                  <input
                    type="text"
                    required
                    value={formData.agenda}
                    onChange={(e) => setFormData({...formData, agenda: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Weekly Team Sync"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.start_time}
                      onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">End Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.end_time}
                      onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingMeeting(null);
                      setFormData({ room_name: '', agenda: '', start_time: '', end_time: '' });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    {editingMeeting ? 'Update' : 'Book Meeting'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
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
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Agenda</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedMeeting.agenda}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Room</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedMeeting.room_name}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Time</label>
                  <p className="mt-1 text-sm text-gray-900">{format(new Date(selectedMeeting.start_time), 'MMM dd, yyyy HH:mm')}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Time</label>
                  <p className="mt-1 text-sm text-gray-900">{format(new Date(selectedMeeting.end_time), 'MMM dd, yyyy HH:mm')}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedMeeting.status)}`}>
                    {selectedMeeting.status}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <p className="mt-1 text-sm text-gray-900">{format(new Date(selectedMeeting.created_at), 'MMM dd, yyyy HH:mm')}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                  <p className="mt-1 text-sm text-gray-900">{format(new Date(selectedMeeting.updated_at), 'MMM dd, yyyy HH:mm')}</p>
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

export default Meetings;

