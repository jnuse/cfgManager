import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import WorkspaceTree from '../components/WorkspaceTree';
import TabbedEditor from '../components/TabbedEditor';
import useConfigStore, { Workspace, Config, Theme } from '../stores/configStore';

function Dashboard() {
  const workspaces = useConfigStore(s => s.workspaces);
  const setWorkspaces = useConfigStore(s => s.setWorkspaces);
  const addWorkspace = useConfigStore(s => s.addWorkspace);
  const setConfigs = useConfigStore(s => s.setConfigs);
  const theme = useConfigStore(s => s.theme);
  const setTheme = useConfigStore(s => s.setTheme);

  const themeLabels: Record<Theme, string> = { light: '浅色', dark: '深色', system: '系统' };
  const themeOrder: Theme[] = ['light', 'dark', 'system'];
  const cycleTheme = () => {
    const idx = themeOrder.indexOf(theme);
    setTheme(themeOrder[(idx + 1) % themeOrder.length]);
  };

  const [showAddWsDialog, setShowAddWsDialog] = useState(false);
  const [wsName, setWsName] = useState('');
  const [wsPath, setWsPath] = useState('');

  const [showAddCfgDialog, setShowAddCfgDialog] = useState(false);
  const [cfgWorkspaceId, setCfgWorkspaceId] = useState<number | null>(null);
  const [cfgName, setCfgName] = useState('');
  const [cfgPath, setCfgPath] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [ws, cfgs] = await Promise.all([
        invoke<Workspace[]>('get_all_workspaces'),
        invoke<Config[]>('get_all_configs'),
      ]);
      setWorkspaces(ws);
      setConfigs(cfgs);
    } catch (err) {
      console.error('加载数据失败:', err);
    }
  };

  // --- Add workspace ---
  const handleSelectWsDir = async () => {
    try {
      const selected = await open({ directory: true, multiple: false, title: '选择工作区目录' });
      if (selected) {
        setWsPath(selected as string);
        if (!wsName) {
          const parts = (selected as string).replace(/\\/g, '/').split('/');
          setWsName(parts[parts.length - 1] || '');
        }
      }
    } catch (err) {
      alert('选择目录失败: ' + err);
    }
  };
  const handleAddWorkspace = async () => {
    if (!wsName || !wsPath) {
      alert('请填写工作区名称并选择目录');
      return;
    }
    try {
      const id = await invoke<number>('add_workspace', { name: wsName, rootPath: wsPath });
      addWorkspace({ id, name: wsName, root_path: wsPath });
      setWsName('');
      setWsPath('');
      setShowAddWsDialog(false);
    } catch (err) {
      alert('添加工作区失败: ' + err);
    }
  };

  // --- Add config ---
  const handleSelectCfgFile = async () => {
    if (cfgWorkspaceId == null) {
      alert('请先选择目标工作区');
      return;
    }
    const ws = workspaces.find(w => w.id === cfgWorkspaceId);
    if (!ws) return;

    try {
      const selected = await open({ directory: false, multiple: false, title: '选择配置文件' });
      if (selected) {
        const full = (selected as string).replace(/\\/g, '/');
        const root = ws.root_path.replace(/\\/g, '/');
        const rel = full.startsWith(root + '/') ? full.slice(root.length + 1) : full;
        setCfgPath(rel);
        if (!cfgName) {
          const parts = rel.split('/');
          setCfgName(parts[parts.length - 1] || '');
        }
      }
    } catch (err) {
      alert('选择文件失败: ' + err);
    }
  };

  const handleAddConfig = async () => {
    if (cfgWorkspaceId == null || !cfgName || !cfgPath) {
      alert('请填写完整信息');
      return;
    }
    const ws = workspaces.find(w => w.id === cfgWorkspaceId);
    if (!ws) return;

    try {
      await invoke('add_config', {
        workspaceId: cfgWorkspaceId,
        name: cfgName,
        relativePath: cfgPath,
        workspaceRoot: ws.root_path,
      });
      // Reload all configs
      const cfgs = await invoke<Config[]>('get_all_configs');
      setConfigs(cfgs);
      setCfgWorkspaceId(null);
      setCfgName('');
      setCfgPath('');
      setShowAddCfgDialog(false);
    } catch (err) {
      alert('添加配置失败: ' + err);
    }
  };
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 dark:bg-gray-950 text-white px-4 py-3 flex justify-between items-center flex-shrink-0">
        <h1 className="text-lg font-bold">配置守护者</h1>
        <div className="flex gap-2 items-center">
          <button
            onClick={cycleTheme}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded"
            title="切换主题"
          >
            {themeLabels[theme]}
          </button>
          <button
            onClick={() => setShowAddWsDialog(true)}
            className="px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 rounded"
          >
            添加工作区
          </button>
          <button
            onClick={() => {
              if (workspaces.length === 0) {
                alert('请先添加工作区');
                return;
              }
              setCfgWorkspaceId(workspaces[0].id);
              setShowAddCfgDialog(true);
            }}
            className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 rounded"
          >
            添加配置
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <WorkspaceTree />
        <TabbedEditor />
      </div>

      {/* Add workspace dialog */}
      {showAddWsDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-lg font-bold mb-4 dark:text-gray-100">添加工作区</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">名称</label>
                <input
                  type="text"
                  value={wsName}
                  onChange={e => setWsName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-gray-100"
                  placeholder="例如: 我的项目"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">目录</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={wsPath}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 dark:text-gray-100"
                    placeholder="点击浏览选择目录"
                  />
                  <button
                    onClick={handleSelectWsDir}
                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 rounded dark:text-gray-100"
                  >
                    浏览
                  </button>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setShowAddWsDialog(false); setWsName(''); setWsPath(''); }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 rounded dark:text-gray-100"
                >
                  取消
                </button>
                <button
                  onClick={handleAddWorkspace}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Add config dialog */}
      {showAddCfgDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-lg font-bold mb-4 dark:text-gray-100">添加配置</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">目标工作区</label>
                <select
                  value={cfgWorkspaceId ?? ''}
                  onChange={e => setCfgWorkspaceId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-gray-100"
                >
                  {workspaces.map(ws => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">名称</label>
                <input
                  type="text"
                  value={cfgName}
                  onChange={e => setCfgName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-gray-100"
                  placeholder="例如: 生产环境配置"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">文件路径（相对工作区）</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cfgPath}
                    onChange={e => setCfgPath(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-gray-100"
                    placeholder="例如: config/app.json"
                  />
                  <button
                    onClick={handleSelectCfgFile}
                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 rounded dark:text-gray-100"
                  >
                    浏览
                  </button>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setShowAddCfgDialog(false); setCfgWorkspaceId(null); setCfgName(''); setCfgPath(''); }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 rounded dark:text-gray-100"
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
