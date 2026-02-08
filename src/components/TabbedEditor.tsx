import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Editor from '@monaco-editor/react';
import useConfigStore from '../stores/configStore';

function TabbedEditor() {
  const selectedConfig = useConfigStore(s => s.selectedConfig);
  const workspaces = useConfigStore(s => s.workspaces);
  const activeTab = useConfigStore(s => s.activeTab);
  const setActiveTab = useConfigStore(s => s.setActiveTab);
  const [originalContent, setOriginalContent] = useState('');
  const [sanitizedContent, setSanitizedContent] = useState('');
  const [loading, setLoading] = useState(false);

  const getWorkspaceRoot = (): string | null => {
    if (!selectedConfig) return null;
    const ws = workspaces.find(w => w.id === selectedConfig.workspace_id);
    return ws?.root_path ?? null;
  };

  useEffect(() => {
    if (selectedConfig) {
      loadConfigContent();
    }
  }, [selectedConfig]);

  const loadConfigContent = async () => {
    if (!selectedConfig) return;
    setLoading(true);
    try {
      setOriginalContent(selectedConfig.original_content);
      const sanitized = await invoke<string>('get_sanitized_preview', { id: selectedConfig.id });
      setSanitizedContent(sanitized);
    } catch (err) {
      console.error('加载内容失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOriginal = async () => {
    if (!selectedConfig) return;
    try {
      await invoke('update_original_content', { id: selectedConfig.id, content: originalContent });
      alert('原始内容已保存');
    } catch (err) {
      alert('保存失败: ' + err);
    }
  };
  const handleSaveSanitized = async () => {
    if (!selectedConfig) return;
    try {
      await invoke('update_sanitized_content', { id: selectedConfig.id, content: sanitizedContent });
      alert('脱敏内容已保存');
    } catch (err) {
      alert('保存失败: ' + err);
    }
  };

  const handleWriteDirect = async () => {
    if (!selectedConfig) return;
    const root = getWorkspaceRoot();
    if (!root) { alert('找不到所属工作区'); return; }
    if (!confirm('确定将原始内容写入文件吗？')) return;
    try {
      await invoke('write_to_file_direct', { id: selectedConfig.id, workspaceRoot: root });
      alert('文件写入成功');
    } catch (err) {
      alert('写入文件失败: ' + err);
    }
  };

  const handleWriteSanitized = async () => {
    if (!selectedConfig) return;
    const root = getWorkspaceRoot();
    if (!root) { alert('找不到所属工作区'); return; }
    if (!confirm('确定将脱敏内容写入文件吗？')) return;
    try {
      await invoke('write_to_file_sanitized', { id: selectedConfig.id, workspaceRoot: root });
      alert('脱敏文件写入成功');
    } catch (err) {
      alert('写入文件失败: ' + err);
    }
  };

  const getLanguage = () => {
    if (!selectedConfig) return 'plaintext';
    const ext = selectedConfig.path.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
      json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'toml',
      env: 'shell', js: 'javascript', ts: 'typescript',
      jsx: 'javascript', tsx: 'typescript',
    };
    return langMap[ext] || 'plaintext';
  };

  if (!selectedConfig) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <p className="text-gray-400">选择一个配置文件开始编辑</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <p className="text-gray-400">加载中...</p>
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 flex-shrink-0">
        <button
          onClick={() => setActiveTab('original')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'original'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          原始
        </button>
        <button
          onClick={() => setActiveTab('sanitized')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'sanitized'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          脱敏
        </button>
        <div className="flex-1" />
        <span className="px-3 py-2 text-xs text-gray-400 self-center truncate max-w-xs" title={selectedConfig.path}>
          {selectedConfig.path}
        </span>
      </div>

      {/* Editor */}
      <div className="flex-1">
        {activeTab === 'original' ? (
          <Editor
            height="100%"
            language={getLanguage()}
            value={originalContent}
            onChange={v => setOriginalContent(v || '')}
            theme="vs-light"
            options={{ minimap: { enabled: false }, fontSize: 14 }}
          />
        ) : (
          <Editor
            height="100%"
            language={getLanguage()}
            value={sanitizedContent}
            onChange={v => setSanitizedContent(v || '')}
            theme="vs-light"
            options={{ minimap: { enabled: false }, fontSize: 14 }}
          />
        )}
      </div>

      {/* Action buttons */}
      <div className="px-4 py-2 border-t border-gray-200 flex gap-2 flex-shrink-0">
        {activeTab === 'original' ? (
          <>
            <button onClick={handleSaveOriginal} className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded">
              保存到数据库
            </button>
            <button onClick={handleWriteDirect} className="px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded">
              写入文件
            </button>
          </>
        ) : (
          <>
            <button onClick={handleSaveSanitized} className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded">
              保存手动脱敏
            </button>
            <button onClick={handleWriteSanitized} className="px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded">
              写入脱敏文件
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default TabbedEditor;
