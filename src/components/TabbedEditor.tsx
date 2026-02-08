import { useEffect, useRef, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ask, message } from '@tauri-apps/plugin-dialog';
import Editor from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import useConfigStore from '../stores/configStore';

const AUTO_SAVE_DELAY = 1500;
const AUTO_SANITIZE_DELAY = 800;

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

  const [originalContent, setOriginalContent] = useState('');
  const [sanitizedContent, setSanitizedContent] = useState('');
  const [loading, setLoading] = useState(false);

  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs-light';
  const isSplit = editorLayout === 'split';

  // 编辑器实例引用
  const originalEditorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const sanitizedEditorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const isSyncingScroll = useRef(false);

  // 自动保存定时器
  const autoSaveOriginalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveSanitizedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSanitizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 跟踪当前配置 id，防止异步竞态
  const currentConfigId = useRef<number | null>(null);
  // 标记是否为初始加载（不触发自动保存）
  const isInitialLoad = useRef(true);

  const getWorkspaceRoot = (): string | null => {
    if (!selectedConfig) return null;
    const ws = workspaces.find(w => w.id === selectedConfig.workspace_id);
    return ws?.root_path ?? null;
  };

  // --- 加载内容 ---
  useEffect(() => {
    if (selectedConfig) {
      currentConfigId.current = selectedConfig.id;
      isInitialLoad.current = true;
      loadConfigContent();
    } else {
      currentConfigId.current = null;
      setOriginalContent('');
      setSanitizedContent('');
    }
  }, [selectedConfig]);

  const loadConfigContent = async () => {
    if (!selectedConfig) return;
    setLoading(true);
    setSanitizedContent('');
    setOriginalContent('');
    try {
      setOriginalContent(selectedConfig.original_content);
      const sanitized = await invoke<string>('get_sanitized_preview', { id: selectedConfig.id });
      if (currentConfigId.current === selectedConfig.id) {
        setSanitizedContent(sanitized);
      }
    } catch (err) {
      console.error('加载内容失败:', err);
      if (currentConfigId.current === selectedConfig.id) {
        setSanitizedContent(selectedConfig.original_content);
      }
    } finally {
      setLoading(false);
      // 延迟一帧再解除初始加载标记，避免 setState 触发的 onChange 被当作用户编辑
      requestAnimationFrame(() => { isInitialLoad.current = false; });
    }
  };

  // --- 自动保存原始内容 ---
  const doAutoSaveOriginal = useCallback(async (id: number, content: string) => {
    try {
      await invoke('update_original_content', { id, content });
    } catch (err) {
      console.error('自动保存原始内容失败:', err);
    }
  }, []);

  const handleOriginalChange = useCallback((value: string | undefined) => {
    const v = value || '';
    setOriginalContent(v);
    if (isInitialLoad.current || !currentConfigId.current) return;
    const id = currentConfigId.current;

    // debounce 自动保存
    if (autoSaveOriginalTimer.current) clearTimeout(autoSaveOriginalTimer.current);
    autoSaveOriginalTimer.current = setTimeout(() => doAutoSaveOriginal(id, v), AUTO_SAVE_DELAY);

    // debounce 自动脱敏
    if (autoSanitize) {
      if (autoSanitizeTimer.current) clearTimeout(autoSanitizeTimer.current);
      autoSanitizeTimer.current = setTimeout(async () => {
        try {
          // 先保存再获取预览，确保后端用最新内容
          await invoke('update_original_content', { id, content: v });
          const sanitized = await invoke<string>('get_sanitized_preview', { id });
          if (currentConfigId.current === id) {
            setSanitizedContent(sanitized);
          }
        } catch (err) {
          console.error('自动脱敏失败:', err);
        }
      }, AUTO_SANITIZE_DELAY);
    }
  }, [autoSanitize, doAutoSaveOriginal]);

  // --- 自动保存脱敏内容（手动模式） ---
  const doAutoSaveSanitized = useCallback(async (id: number, content: string) => {
    try {
      await invoke('update_sanitized_content', { id, content });
    } catch (err) {
      console.error('自动保存脱敏内容失败:', err);
    }
  }, []);

  const handleSanitizedChange = useCallback((value: string | undefined) => {
    const v = value || '';
    setSanitizedContent(v);
    if (isInitialLoad.current || !currentConfigId.current || autoSanitize) return;
    const id = currentConfigId.current;

    if (autoSaveSanitizedTimer.current) clearTimeout(autoSaveSanitizedTimer.current);
    autoSaveSanitizedTimer.current = setTimeout(() => doAutoSaveSanitized(id, v), AUTO_SAVE_DELAY);
  }, [autoSanitize, doAutoSaveSanitized]);

  // 切换自动脱敏时，如果开启则立即刷新脱敏预览
  useEffect(() => {
    if (autoSanitize && selectedConfig) {
      invoke<string>('get_sanitized_preview', { id: selectedConfig.id })
        .then(s => {
          if (currentConfigId.current === selectedConfig.id) setSanitizedContent(s);
        })
        .catch(err => console.error('刷新脱敏预览失败:', err));
    }
  }, [autoSanitize]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (autoSaveOriginalTimer.current) clearTimeout(autoSaveOriginalTimer.current);
      if (autoSaveSanitizedTimer.current) clearTimeout(autoSaveSanitizedTimer.current);
      if (autoSanitizeTimer.current) clearTimeout(autoSanitizeTimer.current);
    };
  }, [selectedConfig]);

  // --- 写入文件操作 ---
  const handleWriteDirect = async () => {
    if (!selectedConfig) return;
    const root = getWorkspaceRoot();
    if (!root) { await message('找不到所属工作区', { title: '错误', kind: 'error' }); return; }
    const confirmed = await ask('确定将原始内容写入文件吗？', { title: '写入确认', kind: 'warning' });
    if (!confirmed) return;
    try {
      await invoke('update_original_content', { id: selectedConfig.id, content: originalContent });
      await invoke('write_to_file_direct', { id: selectedConfig.id, workspaceRoot: root });
      await message('文件写入成功', { title: '写入成功' });
    } catch (err) {
      await message('写入文件失败: ' + err, { title: '错误', kind: 'error' });
    }
  };

  const handleWriteSanitized = async () => {
    if (!selectedConfig) return;
    const root = getWorkspaceRoot();
    if (!root) { await message('找不到所属工作区', { title: '错误', kind: 'error' }); return; }
    const confirmed = await ask('确定将脱敏内容写入文件吗？', { title: '写入确认', kind: 'warning' });
    if (!confirmed) return;
    try {
      await invoke('update_sanitized_content', { id: selectedConfig.id, content: sanitizedContent });
      await invoke('write_to_file_sanitized', { id: selectedConfig.id, workspaceRoot: root });
      await message('脱敏文件写入成功', { title: '写入成功' });
    } catch (err) {
      await message('写入文件失败: ' + err, { title: '错误', kind: 'error' });
    }
  };

  // --- 滚动同步 ---
  const scrollDisposers = useRef<Monaco.IDisposable[]>([]);

  const setupScrollSync = () => {
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
  };

  const handleOriginalMount = (editor: Monaco.editor.IStandaloneCodeEditor) => {
    originalEditorRef.current = editor;
    setupScrollSync();
  };
  const handleSanitizedMount = (editor: Monaco.editor.IStandaloneCodeEditor) => {
    sanitizedEditorRef.current = editor;
    setupScrollSync();
  };

  // --- ResizeObserver ---
  const observerRef = useRef<ResizeObserver | null>(null);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    observerRef.current = new ResizeObserver(() => {
      originalEditorRef.current?.layout();
      sanitizedEditorRef.current?.layout();
    });
    if (editorContainerRef.current) {
      observerRef.current.observe(editorContainerRef.current);
    }
    return () => { observerRef.current?.disconnect(); };
  }, []);

  const setEditorContainerRef = (node: HTMLDivElement | null) => {
    if (editorContainerRef.current) observerRef.current?.unobserve(editorContainerRef.current);
    editorContainerRef.current = node;
    if (node) observerRef.current?.observe(node);
  };

  // 切换配置或卸载时清理编辑器引用
  useEffect(() => {
    return () => {
      scrollDisposers.current.forEach(d => d.dispose());
      scrollDisposers.current = [];
      originalEditorRef.current = null;
      sanitizedEditorRef.current = null;
    };
  }, [selectedConfig]);

  const getLanguage = () => {
    if (!selectedConfig) return 'plaintext';
    const ext = selectedConfig.path.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
      json: 'json', yaml: 'yaml', yml: 'yaml',
      toml: 'ini', ini: 'ini', env: 'ini', properties: 'ini',
      js: 'javascript', ts: 'typescript',
      jsx: 'javascript', tsx: 'typescript',
      html: 'html', css: 'css', xml: 'xml',
    };
    return langMap[ext] || 'plaintext';
  };

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

  const editorOptions: Monaco.editor.IStandaloneEditorConstructionOptions = {
    minimap: { enabled: false }, fontSize: 14, automaticLayout: false,
  };
  const readOnlyOptions: Monaco.editor.IStandaloneEditorConstructionOptions = {
    ...editorOptions, readOnly: true,
  };

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
            >
              原始
            </button>
            <button
              onClick={() => setActiveTab('sanitized')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'sanitized'
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              脱敏
            </button>
          </>
        )}
        <div className="flex-1" />
        <span className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 self-center truncate max-w-xs" title={selectedConfig.path}>
          {selectedConfig.path}
        </span>
        <button
          onClick={() => setAutoSanitize(!autoSanitize)}
          className={`px-3 py-2 text-xs self-center ${
            autoSanitize
              ? 'text-green-600 dark:text-green-400'
              : 'text-orange-500 dark:text-orange-400'
          }`}
          title={autoSanitize ? '当前：自动脱敏（点击切换为手动）' : '当前：手动脱敏（点击切换为自动）'}
        >
          {autoSanitize ? '自动脱敏' : '手动脱敏'}
        </button>
        <button
          onClick={() => setEditorLayout(isSplit ? 'tab' : 'split')}
          className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 self-center"
          title={isSplit ? '切换为标签页模式' : '切换为分栏模式'}
        >
          {isSplit ? '标签页' : '分栏'}
        </button>
      </div>

      {/* Editor */}
      {isSplit ? (
        <div ref={setEditorContainerRef} className="flex-1 flex min-h-0">
          <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700 min-w-0">
            <div className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">原始</div>
            <div className="flex-1 relative overflow-hidden">
              <Editor
                height="100%"
                language={getLanguage()}
                value={originalContent}
                onChange={handleOriginalChange}
                onMount={handleOriginalMount}
                theme={monacoTheme}
                options={editorOptions}
              />
            </div>
          </div>
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              脱敏{autoSanitize ? '（只读）' : ''}
            </div>
            <div className="flex-1 relative overflow-hidden">
              <Editor
                height="100%"
                language={getLanguage()}
                value={sanitizedContent}
                onChange={handleSanitizedChange}
                onMount={handleSanitizedMount}
                theme={monacoTheme}
                options={autoSanitize ? readOnlyOptions : editorOptions}
              />
            </div>
          </div>
        </div>
      ) : (
        <div ref={setEditorContainerRef} className="flex-1 relative overflow-hidden">
          {activeTab === 'original' ? (
            <Editor
              height="100%"
              language={getLanguage()}
              value={originalContent}
              onChange={handleOriginalChange}
              theme={monacoTheme}
              options={editorOptions}
            />
          ) : (
            <Editor
              height="100%"
              language={getLanguage()}
              value={sanitizedContent}
              onChange={handleSanitizedChange}
              theme={monacoTheme}
              options={autoSanitize ? readOnlyOptions : editorOptions}
            />
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex gap-2 flex-shrink-0">
        {isSplit ? (
          <>
            <button onClick={handleWriteDirect} className="px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded">
              写入原始
            </button>
            <div className="w-px bg-gray-300 dark:bg-gray-600" />
            <button onClick={handleWriteSanitized} className="px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded">
              写入脱敏
            </button>
          </>
        ) : activeTab === 'original' ? (
          <button onClick={handleWriteDirect} className="px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded">
            写入文件
          </button>
        ) : (
          <button onClick={handleWriteSanitized} className="px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded">
            写入脱敏文件
          </button>
        )}
        <div className="flex-1" />
        <span className="text-xs text-gray-400 dark:text-gray-500 self-center">自动保存已启用</span>
      </div>
    </div>
  );
}

export default TabbedEditor;
