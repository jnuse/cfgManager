import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Editor from '@monaco-editor/react';
import useConfigStore from '../stores/configStore';

function TabbedEditor() {
  const selectedConfig = useConfigStore(state => state.selectedConfig);
  const activeTab = useConfigStore(state => state.activeTab);
  const setActiveTab = useConfigStore(state => state.setActiveTab);
  const [originalContent, setOriginalContent] = useState('');
  const [sanitizedContent, setSanitizedContent] = useState('');
  const [loading, setLoading] = useState(false);

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

      // Load sanitized preview
      const sanitized: string = await invoke('get_sanitized_preview', { id: selectedConfig.id });
      setSanitizedContent(sanitized);
    } catch (err) {
      console.error('Failed to load content:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOriginalChange = (value: string | undefined) => {
    setOriginalContent(value || '');
  };

  const handleSanitizedChange = (value: string | undefined) => {
    setSanitizedContent(value || '');
  };

  const handleSaveOriginal = async () => {
    if (!selectedConfig) return;

    try {
      await invoke('update_original_content', {
        id: selectedConfig.id,
        content: originalContent,
      });
      alert('Original content saved');
    } catch (err) {
      alert('Failed to save: ' + err);
    }
  };

  const handleSaveSanitized = async () => {
    if (!selectedConfig) return;

    try {
      await invoke('update_sanitized_content', {
        id: selectedConfig.id,
        content: sanitizedContent,
      });
      alert('Sanitized content saved');
    } catch (err) {
      alert('Failed to save: ' + err);
    }
  };

  const handleWriteDirect = async () => {
    if (!selectedConfig) return;

    if (!confirm('Write original content to file?')) return;

    try {
      await invoke('write_to_file_direct', { id: selectedConfig.id });
      alert('File written successfully');
    } catch (err) {
      alert('Failed to write file: ' + err);
    }
  };

  const handleWriteSanitized = async () => {
    if (!selectedConfig) return;

    if (!confirm('Write sanitized content to file?')) return;

    try {
      await invoke('write_to_file_sanitized', { id: selectedConfig.id });
      alert('Sanitized file written successfully');
    } catch (err) {
      alert('Failed to write file: ' + err);
    }
  };

  const getLanguage = () => {
    if (!selectedConfig) return 'plaintext';
    const ext = selectedConfig.path.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'toml',
      'env': 'shell',
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
    };
    return langMap[ext] || 'plaintext';
  };

  if (!selectedConfig) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <p className="text-gray-500">Select a configuration to edit</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('original')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'original'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Original
        </button>
        <button
          onClick={() => setActiveTab('sanitized')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'sanitized'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Sanitized
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1">
        {activeTab === 'original' ? (
          <Editor
            height="100%"
            language={getLanguage()}
            value={originalContent}
            onChange={handleOriginalChange}
            theme="vs-light"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
            }}
          />
        ) : (
          <Editor
            height="100%"
            language={getLanguage()}
            value={sanitizedContent}
            onChange={handleSanitizedChange}
            theme="vs-light"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
            }}
          />
        )}
      </div>

      {/* Action buttons */}
      <div className="p-4 border-t border-gray-200 flex gap-2">
        {activeTab === 'original' ? (
          <>
            <button
              onClick={handleSaveOriginal}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
            >
              Save to DB
            </button>
            <button
              onClick={handleWriteDirect}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
            >
              Write to File
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleSaveSanitized}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
            >
              Save Manual Sanitized
            </button>
            <button
              onClick={handleWriteSanitized}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
            >
              Write Sanitized to File
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default TabbedEditor;
