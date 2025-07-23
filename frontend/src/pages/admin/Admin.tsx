import React, { useEffect, useState } from 'react';
import { FaShieldAlt, FaUsers, FaGamepad, FaChartBar, FaTrash, FaEdit, FaSave } from 'react-icons/fa';
import { useAdmin } from '../../contexts/AdminContext';
import AdminGameTools from '../../components/game/AdminGameTools';

import type { AdminUser } from '../../services/admin';
export const Admin: React.FC = () => {
  const [tab, setTab] = useState<'dashboard'|'users'|'games'|'settings'>('dashboard');
  const [userEdit, setUserEdit] = useState<{[id:string]: {role?: AdminUser['role']; isActive?: boolean}}>({});
  const [userEditId, setUserEditId] = useState<string | null>(null);
  const [settingsEdit, setSettingsEdit] = useState<any>(null);
  const {
    stats, users, userPage, userTotalPages, games, gamePage, gameTotalPages, settings, loading, error,
    fetchStats, fetchUsers, fetchGames, fetchSettings, updateUser, deleteUser, updateSettings
  } = useAdmin();

  // Tab-based data loading
  useEffect(() => { if (tab==='dashboard') fetchStats(); }, [tab, fetchStats]);
  useEffect(() => { if (tab==='users') fetchUsers(); }, [tab, fetchUsers]);
  useEffect(() => { if (tab==='games') fetchGames(); }, [tab, fetchGames]);
  useEffect(() => { if (tab==='settings') { fetchSettings(); setSettingsEdit(settings); } }, [tab, fetchSettings, settings]);

  // Handlers
  const handleUserEdit = (id: string, field: 'role'|'isActive', value: any) => {
    setUserEdit(edit => {
      let v = value;
      if (field === 'role' && v && !['user','moderator','admin'].includes(v)) v = 'user';
      return {...edit, [id]: {...edit[id], [field]: v}};
    });
  };
  const handleUserSave = async (id: string) => {
    if (!userEdit[id]) return;
    await updateUser(id, userEdit[id]);
    setUserEditId(null);
    setUserEdit(edit => { const e = {...edit}; delete e[id]; return e; });
  };
  const handleUserDelete = async (id: string) => {
    if (!window.confirm('Delete this user?')) return;
    await deleteUser(id);
  };
  const handleSettingsChange = (field: keyof typeof settingsEdit, value: any) => {
    setSettingsEdit((edit: any) => edit ? {...edit, [field]: value} : edit);
  };
  const handleSettingsSave = async () => {
    if (!settingsEdit) return;
    await updateSettings(settingsEdit);
  };

  // UI
  return (
    <div className="h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <FaShieldAlt className="mr-3" />
            Admin Dashboard
          </h1>
          <p className="text-red-100 mt-1">Manage users, games, and system settings</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">{error}</div>}
        {loading && <div className="text-center text-gray-500">Loading...</div>}

        {/* Dashboard Tab */}
        {tab==='dashboard' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <FaUsers className="mx-auto text-4xl text-blue-600 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Users</h3>
              <p className="text-gray-600 text-sm">Total: {stats.totalUsers} | Active: {stats.activeUsers}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <FaGamepad className="mx-auto text-4xl text-green-600 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Games</h3>
              <p className="text-gray-600 text-sm">Total: {stats.totalGames} | In Progress: {stats.gamesInProgress}</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-center">
              <FaChartBar className="mx-auto text-4xl text-purple-600 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">System Health</h3>
              <p className="text-gray-600 text-sm">DB: {stats.systemHealth.database}, Redis: {stats.systemHealth.redis}, WS: {stats.systemHealth.websockets}</p>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {tab==='users' && (
          <div>
            <h2 className="text-xl font-bold mb-4">User Management</h2>
            <table className="min-w-full bg-white border rounded">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2">Username</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Role</th>
                  <th className="p-2">Active</th>
                  <th className="p-2">Verified</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b">
                    <td className="p-2">{user.username}</td>
                    <td className="p-2">{user.email}</td>
                    <td className="p-2">
                      {userEditId===user.id ? (
                        <select value={userEdit[user.id]?.role || user.role} onChange={e=>handleUserEdit(user.id, 'role', e.target.value)}>
                          <option value="user">User</option>
                          <option value="moderator">Moderator</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : user.role}
                    </td>
                    <td className="p-2">
                      {userEditId===user.id ? (
                        <select value={(userEdit[user.id]?.isActive ?? user.isActive) ? 'true' : 'false'} onChange={e=>handleUserEdit(user.id, 'isActive', e.target.value==='true')}>
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      ) : (user.isActive ? 'Yes' : 'No')}
                    </td>
                    <td className="p-2">{user.isVerified ? 'Yes' : 'No'}</td>
                    <td className="p-2 flex gap-2">
                      {userEditId===user.id ? (
                        <button className="text-green-600" onClick={()=>handleUserSave(user.id)} title="Save"><FaSave /></button>
                      ) : (
                        <button className="text-blue-600" onClick={()=>{setUserEditId(user.id); setUserEdit(edit=>({...edit, [user.id]: {role: user.role, isActive: user.isActive}}));}} title="Edit"><FaEdit /></button>
                      )}
                      <button className="text-red-600" onClick={()=>handleUserDelete(user.id)} title="Delete"><FaTrash /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between mt-4">
              <button disabled={userPage<=1} onClick={()=>fetchUsers(userPage-1)} className="px-3 py-1 rounded bg-gray-200">Prev</button>
              <span>Page {userPage} of {userTotalPages}</span>
              <button disabled={userPage>=userTotalPages} onClick={()=>fetchUsers(userPage+1)} className="px-3 py-1 rounded bg-gray-200">Next</button>
            </div>
          </div>
        )}

        {/* Games Tab */}
        {tab==='games' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Game Management</h2>
            <table className="min-w-full bg-white border rounded">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2">Game ID</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Players</th>
                  <th className="p-2">Winner</th>
                  <th className="p-2">Created</th>
                  <th className="p-2">Completed</th>
                </tr>
              </thead>
              <tbody>
                {games.map(game => (
                  <tr key={game.id} className="border-b">
                    <td className="p-2">{game.id}</td>
                    <td className="p-2">{game.status}</td>
                    <td className="p-2">{game.players.map(p=>p.username).join(', ')}</td>
                    <td className="p-2">{game.winner || '-'}</td>
                    <td className="p-2">{new Date(game.createdAt).toLocaleString()}</td>
                    <td className="p-2">{game.completedAt ? new Date(game.completedAt).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between mt-4">
              <button disabled={gamePage<=1} onClick={()=>fetchGames(gamePage-1)} className="px-3 py-1 rounded bg-gray-200">Prev</button>
              <span>Page {gamePage} of {gameTotalPages}</span>
              <button disabled={gamePage>=gameTotalPages} onClick={()=>fetchGames(gamePage+1)} className="px-3 py-1 rounded bg-gray-200">Next</button>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {tab==='settings' && settingsEdit && (
          <div>
            <h2 className="text-xl font-bold mb-4">System Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium">Maintenance Mode</label>
                <select value={settingsEdit.maintenanceMode ? 'true' : 'false'} onChange={e=>handleSettingsChange('maintenanceMode', e.target.value==='true')} className="w-full p-2 border rounded">
                  <option value="false">Off</option>
                  <option value="true">On</option>
                </select>
              </div>
              <div>
                <label className="block font-medium">Registration Enabled</label>
                <select value={settingsEdit.registrationEnabled ? 'true' : 'false'} onChange={e=>handleSettingsChange('registrationEnabled', e.target.value==='true')} className="w-full p-2 border rounded">
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
              <div>
                <label className="block font-medium">Max Concurrent Games</label>
                <input type="number" value={settingsEdit.maxConcurrentGames} onChange={e=>handleSettingsChange('maxConcurrentGames', Number(e.target.value))} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block font-medium">Default Game Timeout (sec)</label>
                <input type="number" value={settingsEdit.defaultGameTimeout} onChange={e=>handleSettingsChange('defaultGameTimeout', Number(e.target.value))} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block font-medium">Chat Enabled</label>
                <select value={settingsEdit.chatEnabled ? 'true' : 'false'} onChange={e=>handleSettingsChange('chatEnabled', e.target.value==='true')} className="w-full p-2 border rounded">
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
              <div>
                <label className="block font-medium">Social Login Enabled</label>
                <select value={settingsEdit.socialLoginEnabled ? 'true' : 'false'} onChange={e=>handleSettingsChange('socialLoginEnabled', e.target.value==='true')} className="w-full p-2 border rounded">
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
            </div>
            <button className="mt-6 px-6 py-2 bg-green-600 text-white rounded" onClick={handleSettingsSave}><FaSave className="inline mr-2" />Save Settings</button>
          </div>
        )}
        {tab === 'dashboard' && <AdminGameTools />}
      </div>
    </div>
  );
};


