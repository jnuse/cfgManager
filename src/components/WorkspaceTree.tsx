import { invoke } from '@tauri-apps/api/core';
import useConfigStore, { Workspace, Config } from '../stores/configStore';

function WorkspaceTree() {
  const workspaces = useConfigStore(s => s.workspaces);
  const configs = useConfigStore(s => s.configs);
  const selectedConfig = useConfigStore(s => s.selectedConfig);
  const setSelectedConfig = useConfigStore(s => s.setSelectedConfig);
  const expandedWorkspaces = useConfigStore(s => s.expandedWorkspaces);
  const toggleWorkspace = useConfigStore(s => s.toggleWorkspace);
  const removeWorkspace = useConfigStore(s => s.removeWorkspace);
  const removeConfig = useConfigStore(s => s.removeConfig);

  const getConfigsForWorkspace = (wsId: number): Config[] =>
    configs.filter(c => c.workspace_id === wsId);

  const handleSelectConfig = async (config: Config) => {
    setSelectedConfig(config);

    const ws = workspaces.find(w => w.id === config.workspace_id);
    if (!ws) return;

    try {
      const status = await invoke<{ has_external_changes: boolean }>('check_file_status', {
        id: config.id,
        workspaceRoot: ws.root_path,
      });
      if (status.has_external_changes) {
        console.log('文件有外部变更:', config.path);
      }
    } catch (err) {
      console.error('检查文件状态失败:', err);
    }
  };

  const handleDeleteWorkspace = async (ws: Workspace, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`确定要删除工作区「${ws.name}」及其所有配置吗？`)) return;

    try {
      await invoke('delete_workspace', { id: ws.id });
      removeWorkspace(ws.id);
    } catch (err) {
      alert('删除工作区失败: ' + err);
    }
  };

  const handleDeleteConfig = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这个配置吗？')) return;

    try {
      await invoke('delete_config', { id });
      removeConfig(id);
      if (selectedConfig?.id === id) {
        setSelectedConfig(null);
      }
    } catch (err) {
      alert('删除配置失败: ' + err);
    }
  };

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto flex-shrink-0">
      <div className="p-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          工作区
        </h2>

        {workspaces.length === 0 ? (
          <p className="text-sm text-gray-400 px-2">暂无工作区</p>
        ) : (
          <div className="space-y-1">
            {workspaces.map(ws => {
              const expanded = expandedWorkspaces.has(ws.id);
              const wsConfigs = getConfigsForWorkspace(ws.id);

              return (
                <div key={ws.id}>
                  {/* Workspace node */}
                  <div
                    onClick={() => toggleWorkspace(ws.id)}
                    className="flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-200 group"
                  >
                    <span className="text-xs text-gray-400 w-4 text-center flex-shrink-0">
                      {expanded ? '▼' : '▶'}
                    </span>
                    <span className="text-sm font-medium truncate flex-1" title={ws.root_path}>
                      {ws.name}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {wsConfigs.length}
                    </span>
                    <button
                      onClick={(e) => handleDeleteWorkspace(ws, e)}
                      className="text-red-400 hover:text-red-600 text-xs opacity-0 group-hover:opacity-100 flex-shrink-0 ml-1"
                      title="删除工作区"
                    >
                      ×
                    </button>
                  </div>

                  {/* Config list under workspace */}
                  {expanded && (
                    <div className="ml-4 border-l border-gray-200">
                      {wsConfigs.length === 0 ? (
                        <p className="text-xs text-gray-400 pl-3 py-1">暂无配置</p>
                      ) : (
                        wsConfigs.map(config => (
                          <div
                            key={config.id}
                            onClick={() => handleSelectConfig(config)}
                            className={`flex items-center gap-1 pl-3 pr-2 py-1 cursor-pointer group ${
                              selectedConfig?.id === config.id
                                ? 'bg-blue-100 text-blue-700'
                                : 'hover:bg-gray-100 text-gray-700'
                            }`}
                          >
                            <span className="text-xs truncate flex-1" title={config.path}>
                              {config.name}
                            </span>
                            <button
                              onClick={(e) => handleDeleteConfig(config.id, e)}
                              className="text-red-400 hover:text-red-600 text-xs opacity-0 group-hover:opacity-100 flex-shrink-0"
                              title="删除配置"
                            >
                              ×
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkspaceTree;
