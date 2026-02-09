import { useEffect, useRef, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Config } from '../stores/configStore';

const AUTO_SAVE_DELAY = 1500;
const AUTO_SANITIZE_DELAY = 800;

export function useAutoSave(selectedConfig: Config | null, autoSanitize: boolean) {
  const [originalContent, setOriginalContent] = useState('');
  const [sanitizedContent, setSanitizedContent] = useState('');
  const [loading, setLoading] = useState(false);

  const configIdRef = useRef<number | null>(null);
  const isInitialLoad = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sanitizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    if (sanitizeTimer.current) { clearTimeout(sanitizeTimer.current); sanitizeTimer.current = null; }
  }, []);

  // 加载内容
  useEffect(() => {
    clearTimers();
    if (!selectedConfig) {
      configIdRef.current = null;
      setOriginalContent('');
      setSanitizedContent('');
      return;
    }
    configIdRef.current = selectedConfig.id;
    isInitialLoad.current = true;
    setLoading(true);
    setOriginalContent(selectedConfig.original_content);
    setSanitizedContent('');

    invoke<string>('get_sanitized_preview', { id: selectedConfig.id })
      .then(s => {
        if (configIdRef.current === selectedConfig.id) setSanitizedContent(s);
      })
      .catch(() => {
        if (configIdRef.current === selectedConfig.id) setSanitizedContent(selectedConfig.original_content);
      })
      .finally(() => {
        setLoading(false);
        requestAnimationFrame(() => { isInitialLoad.current = false; });
      });

    return clearTimers;
  }, [selectedConfig, clearTimers]);

  // 切换自动脱敏时，立即刷新预览
  useEffect(() => {
    if (autoSanitize && selectedConfig && configIdRef.current === selectedConfig.id) {
      invoke<string>('get_sanitized_preview', { id: selectedConfig.id })
        .then(s => { if (configIdRef.current === selectedConfig.id) setSanitizedContent(s); })
        .catch(() => {});
    }
  }, [autoSanitize, selectedConfig]);

  // 原始内容变更：统一 debounce 链路，保存 + 脱敏走同一个 timer 消除竞态
  const handleOriginalChange = useCallback((value: string | undefined) => {
    const v = value || '';
    setOriginalContent(v);
    if (isInitialLoad.current || !configIdRef.current) return;
    const id = configIdRef.current;

    // 清掉所有 pending timer，避免双写
    clearTimers();

    if (autoSanitize) {
      // 自动脱敏模式：只用一个 timer，先保存再脱敏
      sanitizeTimer.current = setTimeout(async () => {
        try {
          await invoke('update_original_content', { id, content: v });
          const s = await invoke<string>('get_sanitized_preview', { id });
          if (configIdRef.current === id) setSanitizedContent(s);
        } catch {}
      }, AUTO_SANITIZE_DELAY);
    } else {
      // 手动脱敏模式：只保存
      saveTimer.current = setTimeout(async () => {
        try { await invoke('update_original_content', { id, content: v }); } catch {}
      }, AUTO_SAVE_DELAY);
    }
  }, [autoSanitize, clearTimers]);

  // 脱敏内容变更（仅手动模式有效）
  const handleSanitizedChange = useCallback((value: string | undefined) => {
    const v = value || '';
    setSanitizedContent(v);
    if (isInitialLoad.current || !configIdRef.current || autoSanitize) return;
    const id = configIdRef.current;

    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    saveTimer.current = setTimeout(async () => {
      try { await invoke('update_sanitized_content', { id, content: v }); } catch {}
    }, AUTO_SAVE_DELAY);
  }, [autoSanitize]);

  return { originalContent, sanitizedContent, loading, handleOriginalChange, handleSanitizedChange };
}
