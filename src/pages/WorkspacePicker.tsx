import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import useConfigStore from '../stores/configStore';

interface WorkspacePickerProps {
  onWorkspaceSelected: (root: string) => void;
}

function WorkspacePicker({ onWorkspaceSelected }: WorkspacePickerProps) {
  const [selectedPath, setSelectedPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setWorkspaceRoot = useConfigStore(state => state.setWorkspaceRoot);

  const handleSelectDirectory = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择工作区目录',
      });

      if (selected) {
        setSelectedPath(selected as string);
        setError(null);
      }
    } catch (err) {
      setError('选择目录失败: ' + err);
    }
  };

  const handleInitWorkspace = async () => {
    if (!selectedPath) {
      setError('请先选择一个目录');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await invoke('init_workspace', { workspaceRoot: selectedPath });
      setWorkspaceRoot(selectedPath);
      onWorkspaceSelected(selectedPath);
    } catch (err) {
      setError('初始化工作区失败: ' + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">配置守护者</h1>
        <p className="text-gray-600 mb-6 text-center">
          选择一个工作区目录来管理你的配置文件
        </p>

        <div className="space-y-4">
          <button
            onClick={handleSelectDirectory}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition"
          >
            选择工作区目录
          </button>

          {selectedPath && (
            <div className="p-3 bg-gray-50 rounded border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">已选择:</p>
              <p className="text-sm font-mono break-all">{selectedPath}</p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            onClick={handleInitWorkspace}
            disabled={!selectedPath || loading}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded transition"
          >
            {loading ? '初始化中...' : '初始化工作区'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default WorkspacePicker;
