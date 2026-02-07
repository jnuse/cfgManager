import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import ConfigList from '../components/ConfigList';
import TabbedEditor from '../components/TabbedEditor';
import useConfigStore from '../stores/configStore';

interface Config {
  id: number;
  name: string;
  path: string;
  original_content: string;
  sanitized_content: string | null;
}

function Dashboard() {
  const workspaceRoot = useConfigStore(state => state.workspaceRoot);
  const setConfigs = useConfigStore(state => state.setConfigs);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newConfigName, setNewConfigName] = useState('');
  const [newConfigPath, setNewConfigPath] = useState('');

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const configs: Config[] = await invoke('get_all_configs');
      setConfigs(configs);
    } catch (err) {
      console.error('Failed to load configs:', err);
    }
  };

  const handleSelectFile = async () => {
    try {
      const selected = await open({
        directory: false,
        multiple: false,
        title: 'Select Configuration File',
      });

      if (selected && workspaceRoot) {
        // Calculate relative path
        const relativePath = (selected as string).replace(workspaceRoot + '\\', '').replace(workspaceRoot + '/', '');
        setNewConfigPath(relativePath);
      }
    } catch (err) {
      alert('Failed to select file: ' + err);
    }
  };

  const handleAddConfig = async () => {
    if (!newConfigName || !newConfigPath) {
      alert('Please provide both name and path');
      return;
    }

    try {
      await invoke('add_config', {
        name: newConfigName,
        relativePath: newConfigPath,
      });

      // Reload configs
      await loadConfigs();

      // Reset form
      setNewConfigName('');
      setNewConfigPath('');
      setShowAddDialog(false);
    } catch (err) {
      alert('Failed to add config: ' + err);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Config Guardian</h1>
          <p className="text-sm text-gray-300">{workspaceRoot}</p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded"
        >
          Add Config
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <ConfigList />
        <TabbedEditor />
      </div>

      {/* Add config dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Add Configuration</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={newConfigName}
                  onChange={(e) => setNewConfigName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="e.g., Production Config"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Relative Path</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newConfigPath}
                    onChange={(e) => setNewConfigPath(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded"
                    placeholder="e.g., config/app.json"
                  />
                  <button
                    onClick={handleSelectFile}
                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded"
                  >
                    Browse
                  </button>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowAddDialog(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddConfig}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
