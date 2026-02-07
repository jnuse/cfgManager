import { create } from 'zustand';

const useConfigStore = create((set) => ({
  // Workspace
  workspaceRoot: null,
  setWorkspaceRoot: (root) => set({ workspaceRoot: root }),

  // Configs
  configs: [],
  setConfigs: (configs) => set({ configs }),
  addConfig: (config) => set((state) => ({ configs: [config, ...state.configs] })),
  removeConfig: (id) => set((state) => ({
    configs: state.configs.filter(c => c.id !== id)
  })),
  updateConfig: (id, updates) => set((state) => ({
    configs: state.configs.map(c => c.id === id ? { ...c, ...updates } : c)
  })),

  // Selected config
  selectedConfig: null,
  setSelectedConfig: (config) => set({ selectedConfig: config }),

  // Editor state
  originalContent: '',
  sanitizedContent: '',
  setOriginalContent: (content) => set({ originalContent: content }),
  setSanitizedContent: (content) => set({ sanitizedContent: content }),

  // UI state
  activeTab: 'original', // 'original' | 'sanitized'
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Merge state
  showMergeView: false,
  mergeData: null,
  setShowMergeView: (show) => set({ showMergeView: show }),
  setMergeData: (data) => set({ mergeData: data }),

  // Loading states
  loading: false,
  setLoading: (loading) => set({ loading }),
  error: null,
  setError: (error) => set({ error }),
}));

export default useConfigStore;
