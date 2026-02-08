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
        title: '选择配置文件',
      });

      if (selected && workspaceRoot) {
        // Calculate relative path
        const relativePath = (selected as string).replace(workspaceRoot + '\\', '').replace(workspaceRoot + '/', '');
        setNewConfigPath(relativePath);
      }
    } catch (err) {
      alert('选择文件失败: ' + err);
    }
  };

  const handleAddConfig = async () => {
    if (!newConfigName || !newConfigPath) {
      alert('请填写名称和路径');
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
      alert('添加配置失败: ' + err);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">配置守护者</h1>
          <p className="text-sm text-gray-300">{workspaceRoot}</p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded"
        >
          添加配置
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
            <h2 className="text-xl font-bold mb-4">添加配置</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">名称</label>
                <input
                  type="text"
                  value={newConfigName}
                  onChange={(e) => setNewConfigName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="例如: 生产环境配置"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">相对路径</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newConfigPath}
                    onChange={(e) => setNewConfigPath(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded"
                    placeholder="例如: config/app.json"
                  />
                  <button
                    onClick={handleSelectFile}
                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded"
                  >
                    浏览
                  </button>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowAddDialog(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
                >
                  取消
                </button>
                <button
                  onClick={handleAddConfig}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
                >
                  添加
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
