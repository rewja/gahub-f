import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { CheckSquare, Package, Calendar, Users, Building, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SimpleChart from '../components/SimpleChart';
import SkeletonLoader from '../components/SkeletonLoader';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let timeoutId;
    
    async function load() {
      if (!user) return;
      setLoading(true);
      setError('');
      
      // Set a maximum loading time of 3 seconds
      timeoutId = setTimeout(() => {
        if (!cancelled) {
          setLoading(false);
        }
      }, 3000);
      
      try {
        if (user.role === 'user') {
          const [todoStats, myReqs, meetings] = await Promise.all([
            api.get('/todos/stats'),
            api.get('/requests/mine'),
            api.get('/meetings')
          ]);
          const cards = [
            {
              name: 'My To-Dos',
              value: (todoStats.data?.daily?.[0]?.total ?? 0) + ' today',
              icon: CheckSquare,
              color: 'bg-blue-500',
              description: `${todoStats.data?.daily?.[0]?.completed ?? 0} completed today`
            },
            {
              name: 'Avg Duration',
              value: `${todoStats.data?.avg_duration_minutes ? Math.round(todoStats.data.avg_duration_minutes) : 0} min`,
              icon: TrendingUp,
              color: 'bg-yellow-500',
              description: 'Average completion time'
            },
            {
              name: 'My Requests',
              value: (myReqs.data?.length ?? 0),
              icon: Package,
              color: 'bg-green-500',
              description: 'Total requests'
            },
            {
              name: 'My Meetings',
              value: (meetings.data?.length ?? 0),
              icon: Calendar,
              color: 'bg-purple-500',
              description: 'Scheduled/ongoing'
            }
          ];
          if (!cancelled) {
            clearTimeout(timeoutId);
            setStats(cards);
            setLoading(false);
          }
        } else if (user.role === 'admin') {
          const [userStats, todoStats, assetStats, meetingStats] = await Promise.all([
            api.get('/users/stats/global'),
            api.get('/todos/stats/global'),
            api.get('/assets/stats').catch(() => ({ data: { by_status: [] } })),
            api.get('/meetings/stats').catch(() => ({ data: { avg_duration_minutes: 0 } }))
          ]);
          const cards = [
            {
              name: 'New Users (mo)',
              value: userStats.data?.monthly?.[0]?.total ?? 0,
              icon: Users,
              color: 'bg-blue-500',
              description: 'This month'
            },
            {
              name: 'Todos Completed (mo)',
              value: todoStats.data?.monthly?.[0]?.completed ?? 0,
              icon: AlertCircle,
              color: 'bg-yellow-500',
              description: 'This month'
            },
            {
              name: 'Assets',
              value: (assetStats.data?.by_status?.reduce((a,c)=>a+Number(c.total||0),0)) || 0,
              icon: Building,
              color: 'bg-green-500',
              description: 'All assets'
            },
            {
              name: 'Avg Meeting (min)',
              value: meetingStats.data?.avg_duration_minutes ? Math.round(meetingStats.data.avg_duration_minutes) : 0,
              icon: Calendar,
              color: 'bg-purple-500',
              description: 'Average duration'
            }
          ];
          if (!cancelled) {
            clearTimeout(timeoutId);
            setStats(cards);
            setLoading(false);
          }
        } else if (user.role === 'procurement') {
          const [procStats, assetStats] = await Promise.all([
            api.get('/procurements/stats'),
            api.get('/assets/stats').catch(() => ({ data: { by_status: [] } }))
          ]);
          const cards = [
            {
              name: 'Procurements (mo)',
              value: procStats.data?.monthly?.count?.[0]?.total ?? 0,
              icon: Package,
              color: 'bg-blue-500',
              description: 'This month'
            },
            {
              name: 'Spend (mo)',
              value: procStats.data?.monthly?.amount?.[0]?.total_amount ?? 0,
              icon: TrendingUp,
              color: 'bg-purple-500',
              description: 'Total amount'
            },
            {
              name: 'Assets',
              value: (assetStats.data?.by_status?.reduce((a,c)=>a+Number(c.total||0),0)) || 0,
              icon: Building,
              color: 'bg-green-500',
              description: 'Managed assets'
            }
          ];
          if (!cancelled) {
            clearTimeout(timeoutId);
            setStats(cards);
            setLoading(false);
          }
        }
      } catch (e) {
        if (!cancelled) {
          clearTimeout(timeoutId);
          setError(e?.response?.data?.message || 'Failed to load');
          setLoading(false);
        }
      }
    }
    load();
    return () => { 
      cancelled = true; 
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user]);

  const getRecentActivity = () => {
    // Return empty array - we'll hide the section if no data
    return [];
  };

  const handleQuickAction = (action) => {
    switch (action) {
      case 'create-todo':
        navigate('/todos');
        break;
      case 'request-item':
        navigate('/requests');
        break;
      case 'book-meeting':
        navigate('/meetings');
        break;
      case 'my-assets':
        navigate('/assets');
        break;
      case 'manage-users':
        navigate('/admin/users');
        break;
      case 'manage-assets':
        navigate('/admin/assets');
        break;
      case 'manage-requests':
        navigate('/admin/requests');
        break;
      case 'manage-todos':
        navigate('/admin/todos');
        break;
      case 'manage-visitors':
        navigate('/admin/visitors');
        break;
      case 'manage-meetings':
        navigate('/admin/meetings');
        break;
      case 'procurement-requests':
        navigate('/procurement/requests');
        break;
      case 'procurement-assets':
        navigate('/procurement/assets');
        break;
      default:
        break;
    }
  };

  const now = new Date();
  const recentActivity = getRecentActivity();
  const [chartData, setChartData] = useState(null);

  // Generate chart data based on user role and stats
  useEffect(() => {
    if (stats.length > 0) {
      const labels = stats.map(stat => stat.name);
      const values = stats.map(stat => {
        // Extract numeric value from stat.value
        const match = stat.value.toString().match(/\d+/);
        return match ? parseInt(match[0]) : 0;
      });

      setChartData({
        labels,
        datasets: [
          {
            label: 'Overview',
            data: values,
            backgroundColor: [
              'rgba(59, 130, 246, 0.5)',
              'rgba(16, 185, 129, 0.5)',
              'rgba(245, 158, 11, 0.5)',
              'rgba(139, 92, 246, 0.5)',
            ],
            borderColor: [
              'rgba(59, 130, 246, 1)',
              'rgba(16, 185, 129, 1)',
              'rgba(245, 158, 11, 1)',
              'rgba(139, 92, 246, 1)',
            ],
            borderWidth: 1,
          },
        ],
      });
    }
  }, [stats]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-base">
          Here's what's happening in your {user?.role === 'user' ? 'work' : 'management'} dashboard.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading && (
          <>
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
          </>
        )}
        {error && <div className="col-span-full text-sm text-red-600 bg-red-50 p-4 rounded-lg">{error}</div>}
        {!loading && !error && stats.length === 0 && (
          <div className="col-span-full text-sm text-gray-600 bg-gray-50 p-4 rounded-lg text-center">
            No data yet for the selected period.
          </div>
        )}
        {!loading && !error && stats.map((stat) => (
          <div key={stat.name} className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-lg bg-primary-50 dark:bg-blue-900/30">
                    <stat.icon className="h-5 w-5 text-primary-700 dark:text-blue-400" />
                  </div>
                </div>
                <div className="ml-4 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-xl font-semibold text-gray-900 dark:text-white mt-1">
                      {stat.value}
                    </dd>
                    <dd className="text-sm text-gray-600 dark:text-gray-400">
                      {stat.description}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Overview Chart */}
      <div className="grid grid-cols-1 gap-5">
        <div className="card">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Overview</h3>
            </div>
            <div className="h-24">
              {loading ? (
                <SkeletonLoader type="chart" className="h-24" />
              ) : chartData ? (
                <SimpleChart type="bar" data={chartData} height={96} />
              ) : (
                <div className="h-24 bg-gray-50 rounded-lg flex items-center justify-center text-gray-500">
                  <span className="text-xs">No data available</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity - Only show if there's data */}
      {recentActivity.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-6">
            <h3 className="text-lg leading-6 font-semibold text-gray-900 dark:text-white mb-6">
              Recent Activity
            </h3>
            <div className="flow-root">
              <ul className="-mb-8">
                {recentActivity.map((activity, index) => (
                  <li key={index}>
                    <div className="relative pb-8">
                      {index !== recentActivity.length - 1 && (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                          aria-hidden="true"
                        />
                      )}
                      <div className="relative flex space-x-4">
                        <div>
                          <span className={`h-10 w-10 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-gray-800 ${
                            activity.type === 'todo' ? 'bg-accent-600' :
                            activity.type === 'request' ? 'bg-primary-600' :
                            activity.type === 'meeting' ? 'bg-accent-700' :
                            activity.type === 'user' ? 'bg-primary-700' :
                            activity.type === 'asset' ? 'bg-accent-500' :
                            activity.type === 'visitor' ? 'bg-primary-500' :
                            'bg-gray-500'
                          }`}>
                            <Clock className="h-5 w-5 text-white" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-2 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{activity.message}</p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                            {activity.time}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-6">
          <h3 className="text-lg leading-6 font-semibold text-gray-900 dark:text-white mb-6">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {user?.role === 'user' && (
              <>
                <button 
                  onClick={() => handleQuickAction('create-todo')}
                  className="relative group bg-gray-50 dark:bg-gray-700 p-5 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-md cursor-pointer"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                      <CheckSquare className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-base font-medium text-gray-900 dark:text-white">
                      <span className="absolute inset-0" aria-hidden="true" />
                      Create New To-Do
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Add a new task to your to-do list
                    </p>
                  </div>
                </button>
                <button 
                  onClick={() => handleQuickAction('request-item')}
                  className="relative group bg-gray-50 dark:bg-gray-700 p-5 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-md cursor-pointer"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                      <Package className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-base font-medium text-gray-900 dark:text-white">
                      <span className="absolute inset-0" aria-hidden="true" />
                      Request Item
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Request office equipment or supplies
                    </p>
                  </div>
                </button>
                <button 
                  onClick={() => handleQuickAction('book-meeting')}
                  className="relative group bg-gray-50 dark:bg-gray-700 p-5 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-md cursor-pointer"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                      <Calendar className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-base font-medium text-gray-900 dark:text-white">
                      <span className="absolute inset-0" aria-hidden="true" />
                      Book Meeting Room
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Schedule a meeting room
                    </p>
                  </div>
                </button>
                <button 
                  onClick={() => handleQuickAction('my-assets')}
                  className="relative group bg-gray-50 dark:bg-gray-700 p-5 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-md cursor-pointer"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                      <Building className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-base font-medium text-gray-900 dark:text-white">
                      <span className="absolute inset-0" aria-hidden="true" />
                      My Assets
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      View and manage my assigned assets
                    </p>
                  </div>
                </button>
              </>
            )}

            {user?.role === 'admin' && (
              <>
                <button 
                  onClick={() => handleQuickAction('manage-users')}
                  className="relative group bg-gray-50 dark:bg-gray-700 p-5 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-md cursor-pointer"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                      <Users className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-base font-medium text-gray-900 dark:text-white">
                      <span className="absolute inset-0" aria-hidden="true" />
                      Manage Users
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Add, edit, or remove users
                    </p>
                  </div>
                </button>
                <button 
                  onClick={() => handleQuickAction('manage-assets')}
                  className="relative group bg-gray-50 dark:bg-gray-700 p-5 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-md cursor-pointer"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                      <Building className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-base font-medium text-gray-900 dark:text-white">
                      <span className="absolute inset-0" aria-hidden="true" />
                      Manage Assets
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Track and manage company assets
                    </p>
                  </div>
                </button>
                <button 
                  onClick={() => handleQuickAction('manage-requests')}
                  className="relative group bg-gray-50 dark:bg-gray-700 p-5 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-md cursor-pointer"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                      <Package className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-base font-medium text-gray-900 dark:text-white">
                      <span className="absolute inset-0" aria-hidden="true" />
                      Manage Requests
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Approve or reject item requests
                    </p>
                  </div>
                </button>
                <button 
                  onClick={() => handleQuickAction('manage-todos')}
                  className="relative group bg-gray-50 dark:bg-gray-700 p-5 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-md cursor-pointer"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                      <CheckSquare className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-base font-medium text-gray-900 dark:text-white">
                      <span className="absolute inset-0" aria-hidden="true" />
                      Manage To-Dos
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Monitor and evaluate all tasks
                    </p>
                  </div>
                </button>
                <button 
                  onClick={() => handleQuickAction('manage-visitors')}
                  className="relative group bg-gray-50 dark:bg-gray-700 p-5 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-md cursor-pointer"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                      <Users className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-base font-medium text-gray-900 dark:text-white">
                      <span className="absolute inset-0" aria-hidden="true" />
                      Manage Visitors
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Track visitor check-ins and check-outs
                    </p>
                  </div>
                </button>
                <button 
                  onClick={() => handleQuickAction('manage-meetings')}
                  className="relative group bg-gray-50 dark:bg-gray-700 p-5 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-md cursor-pointer"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                      <Calendar className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-base font-medium text-gray-900 dark:text-white">
                      <span className="absolute inset-0" aria-hidden="true" />
                      Manage Meetings
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Monitor and manage all meetings
                    </p>
                  </div>
                </button>
              </>
            )}

            {user?.role === 'procurement' && (
              <>
                <button 
                  onClick={() => handleQuickAction('procurement-requests')}
                  className="relative group bg-gray-50 dark:bg-gray-700 p-5 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-md cursor-pointer"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                      <Package className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-base font-medium text-gray-900 dark:text-white">
                      <span className="absolute inset-0" aria-hidden="true" />
                      Procurement Requests
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Process approved requests
                    </p>
                  </div>
                </button>
                <button 
                  onClick={() => handleQuickAction('procurement-assets')}
                  className="relative group bg-gray-50 dark:bg-gray-700 p-5 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-md cursor-pointer"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                      <Building className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-base font-medium text-gray-900 dark:text-white">
                      <span className="absolute inset-0" aria-hidden="true" />
                      Procurement Assets
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Manage procured assets
                    </p>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
