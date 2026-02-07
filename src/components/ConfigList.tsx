import { invoke } from '@tauri-apps/api/core';
import useConfigStore from '../stores/configStore';

interface Config {
  id: number;
  name: string;
  path: string;
  original_content: string;
  sanitized_content: string | null;
}

function ConfigList() {
  const configs = useConfigStore(state => state.configs);
  const selectedConfig = useConfigStore(state => state.selectedConfig);
  const setSelectedConfig = useConfigStore(state => state.setSelectedConfig);
  const setConfigs = useConfigStore(state => state.setConfigs);
  const removeConfig = useConfigStore(state => state.removeConfig);

  const handleSelectConfig = async (config: Config) => {
    setSelectedConfig(config);

    // Check for external changes
    try {
      const status: any = await invoke('check_file_status', { id: config.id });
      if (status.has_external_changes) {
        // Show merge view or notification
        console.log('File has external changes');
      }
    } catch (err) {
      console.error('Failed to check file status:', err);
    }
  };

  const handleDeleteConfig = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this configuration?')) {
      return;
    }

    try {
      await invoke('delete_config', { id });
      removeConfig(id);
      if (selectedConfig?.id === id) {
        setSelectedConfig(null);
      }
    } catch (err) {
      alert('Failed to delete config: ' + err);
    }
  };

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Configurations</h2>

        {configs.length === 0 ? (
          <p className="text-sm text-gray-500">No configurations yet</p>
        ) : (
          <div className="space-y-2">
            {configs.map(config => (
              <div
                key={config.id}
                onClick={() => handleSelectConfig(config)}
                className={`p-3 rounded cursor-pointer transition ${
                  selectedConfig?.id === config.id
                    ? 'bg-blue-100 border-blue-300'
                    : 'bg-white hover:bg-gray-100 border-gray-200'
                } border`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{config.name}</p>
                    <p className="text-xs text-gray-500 truncate">{config.path}</p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConfig(config.id, e)}
                    className="ml-2 text-red-500 hover:text-red-700 text-xs"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ConfigList;
