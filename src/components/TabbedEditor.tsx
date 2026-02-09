import { useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ask, message } from '@tauri-apps/plugin-dialog';
import Editor from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import useConfigStore from '../stores/configStore';
import { useAutoSave } from '../hooks/useAutoSave';

const LANG_MAP: Record<string, string> = {
  json: 'json', yaml: 'yaml', yml: 'yaml',
  toml: 'ini', ini: 'ini', env: 'ini', properties: 'ini',
  js: 'javascript', ts: 'typescript', jsx: 'javascript', tsx: 'typescript',
  html: 'html', css: 'css', xml: 'xml',
};

function TabbedEditor() {
  const selectedConfig = useConfigStore(s => s.selectedConfig);
  const workspaces = useConfigStore(s => s.workspaces);
  const activeTab = useConfigStore(s => s.activeTab);
  const setActiveTab = useConfigStore(s => s.setActiveTab);
  const theme = useConfigStore(s => s.effectiveTheme);
  const editorLayout = useConfigStore(s => s.editorLayout);
  const setEditorLayout = useConfigStore(s => s.setEditorLayout);
  const autoSanitize = useConfigStore(s => s.autoSanitize);
  const setAutoSanitize = useConfigStore(s => s.setAutoSanitize);

  const { originalContent, sanitizedContent, loading, handleOriginalChange, handleSanitizedChange } =
    useAutoSave(selectedConfig, autoSanitize);

  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs-light';
  const isSplit = editorLayout === 'split';

  const language = selectedConfig
    ? LANG_MAP[selectedConfig.path.split('.').pop()?.toLowerCase() || ''] || 'plaintext'
    : 'plaintext';

  // --- 滚动同步 ---
  const originalEditorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const sanitizedEditorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const isSyncingScroll = useRef(false);
  const scrollDisposers = useRef<Monaco.IDisposable[]>([]);

  const setupScrollSync = useCallback(() => {
    scrollDisposers.current.forEach(d => d.dispose());
    scrollDisposers.current = [];
    const a = originalEditorRef.current;
    const b = sanitizedEditorRef.current;
    if (!a || !b) return;
    scrollDisposers.current.push(
      a.onDidScrollChange((e) => {
        if (isSyncingScroll.current) return;
        isSyncingScroll.current = true;
        b.setScrollTop(e.scrollTop);
        b.setScrollLeft(e.scrollLeft);
        isSyncingScroll.current = false;
      }),
      b.onDidScrollChange((e) => {
        if (isSyncingScroll.current) return;
        isSyncingScroll.current = true;
        a.setScrollTop(e.scrollTop);
        a.setScrollLeft(e.scrollLeft);
        isSyncingScroll.current = false;
      })
    );
  }, []);

  const handleOriginalMount = useCallback((editor: Monaco.editor.IStandaloneCodeEditor) => {
    originalEditorRef.current = editor;
    setupScrollSync();
  }, [setupScrollSync]);

  const handleSanitizedMount = useCallback((editor: Monaco.editor.IStandaloneCodeEditor) => {
    sanitizedEditorRef.current = editor;
    setupScrollSync();
  }, [setupScrollSync]);

  useEffect(() => {
    return () => {
      scrollDisposers.current.forEach(d => d.dispose());
      scrollDisposers.current = [];
      originalEditorRef.current = null;
      sanitizedEditorRef.current = null;
    };
  }, [selectedConfig]);

  // --- 写入文件（合并） ---
  const handleWrite = useCallback(async (type: 'direct' | 'sanitized') => {
    if (!selectedConfig) return;
    const ws = workspaces.find(w => w.id === selectedConfig.workspace_id);
    const root = ws?.root_path;
    if (!root) { await message('找不到所属工作区', { title: '错误', kind: 'error' }); return; }

    const label = type === 'direct' ? '原始' : '脱敏';
    const confirmed = await ask(`确定将${label}内容写入文件吗？`, { title: '写入确认', kind: 'warning' });
    if (!confirmed) return;

    try {
      if (type === 'direct') {
        await invoke('update_original_content', { id: selectedConfig.id, content: originalContent });
        await invoke('write_to_file_direct', { id: selectedConfig.id, workspaceRoot: root });
      } else {
        await invoke('update_sanitized_content', { id: selectedConfig.id, content: sanitizedContent });
        await invoke('write_to_file_sanitized', { id: selectedConfig.id, workspaceRoot: root });
      }
      await message(`${label}文件写入成功`, { title: '写入成功' });
    } catch (err) {
      await message('写入文件失败: ' + err, { title: '错误', kind: 'error' });
    }
  }, [selectedConfig, workspaces, originalContent, sanitizedContent]);

  // --- 编辑器选项 ---
  const editorOptions: Monaco.editor.IStandaloneEditorConstructionOptions = {
    minimap: { enabled: false }, fontSize: 14, automaticLayout: true,
  };
  const readOnlyOptions: Monaco.editor.IStandaloneEditorConstructionOptions = {
    ...editorOptions, readOnly: true,
  };

  // --- 空状态 / 加载 ---
  if (!selectedConfig) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-900">
        <p className="text-gray-400 dark:text-gray-500">选择一个配置文件开始编辑</p>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-900">
        <p className="text-gray-400 dark:text-gray-500">加载中...</p>
      </div>
    );
  }

  // --- 渲染 ---
  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 min-h-0">
      {/* Toolbar */}
      <div className="flex items-center border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        {!isSplit && (
          <>
            <button
              onClick={() => setActiveTab('original')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'original'
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >原始</button>
            <button
              onClick={() => setActiveTab('sanitized')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'sanitized'
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >脱敏</button>
          </>
        )}
        <div className="flex-1" />
        <span className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 self-center truncate max-w-xs" title={selectedConfig.path}>
          {selectedConfig.path}
        </span>
        <button
          onClick={() => setAutoSanitize(!autoSanitize)}
          className={`px-3 py-2 text-xs self-center ${
            autoSanitize ? 'text-green-600 dark:text-green-400' : 'text-orange-500 dark:text-orange-400'
          }`}
          title={autoSanitize ? '当前：自动脱敏（点击切换为手动）' : '当前：手动脱敏（点击切换为自动）'}
        >{autoSanitize ? '自动脱敏' : '手动脱敏'}</button>
        <button
          onClick={() => setEditorLayout(isSplit ? 'tab' : 'split')}
          className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 self-center"
          title={isSplit ? '切换为标签页模式' : '切换为分栏模式'}
        >{isSplit ? '标签页' : '分栏'}</button>
      </div>

      {/* Editor */}
      {isSplit ? (
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700 min-w-0">
            <div className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">原始</div>
            <div className="flex-1 relative">
              <div className="absolute inset-0">
                <Editor height="100%" language={language} value={originalContent} onChange={handleOriginalChange}
                  onMount={handleOriginalMount} theme={monacoTheme} options={editorOptions} />
              </div>
            </div>
          </div>
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              脱敏{autoSanitize ? '（只读）' : ''}
            </div>
            <div className="flex-1 relative">
              <div className="absolute inset-0">
                <Editor height="100%" language={language} value={sanitizedContent} onChange={handleSanitizedChange}
                  onMount={handleSanitizedMount} theme={monacoTheme} options={autoSanitize ? readOnlyOptions : editorOptions} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 relative">
          <div className="absolute inset-0">
            {activeTab === 'original' ? (
              <Editor height="100%" language={language} value={originalContent} onChange={handleOriginalChange}
                theme={monacoTheme} options={editorOptions} />
            ) : (
              <Editor height="100%" language={language} value={sanitizedContent} onChange={handleSanitizedChange}
                theme={monacoTheme} options={autoSanitize ? readOnlyOptions : editorOptions} />
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex gap-2 flex-shrink-0">
        {isSplit ? (
          <>
            <button onClick={() => handleWrite('direct')} className="px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded">
              写入原始
            </button>
            <div className="w-px bg-gray-300 dark:bg-gray-600" />
            <button onClick={() => handleWrite('sanitized')} className="px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded">
              写入脱敏
            </button>
          </>
        ) : (
          <button onClick={() => handleWrite(activeTab === 'original' ? 'direct' : 'sanitized')}
            className="px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded">
            {activeTab === 'original' ? '写入文件' : '写入脱敏文件'}
          </button>
        )}
        <div className="flex-1" />
        <span className="text-xs text-gray-400 dark:text-gray-500 self-center">自动保存已启用</span>
      </div>
    </div>
  );
}

export default TabbedEditor;
