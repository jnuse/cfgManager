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
        title: 'Select Workspace Directory',
      });

      if (selected) {
        setSelectedPath(selected as string);
        setError(null);
      }
    } catch (err) {
      setError('Failed to select directory: ' + err);
    }
  };

  const handleInitWorkspace = async () => {
    if (!selectedPath) {
      setError('Please select a directory first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await invoke('init_workspace', { workspaceRoot: selectedPath });
      setWorkspaceRoot(selectedPath);
      onWorkspaceSelected(selectedPath);
    } catch (err) {
      setError('Failed to initialize workspace: ' + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">Config Guardian</h1>
        <p className="text-gray-600 mb-6 text-center">
          Select a workspace directory to manage your configuration files
        </p>

        <div className="space-y-4">
          <button
            onClick={handleSelectDirectory}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition"
          >
            Select Workspace Directory
          </button>

          {selectedPath && (
            <div className="p-3 bg-gray-50 rounded border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Selected:</p>
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
            {loading ? 'Initializing...' : 'Initialize Workspace'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default WorkspacePicker;
