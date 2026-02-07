import { create } from 'zustand';

interface Config {
  id: number;
  name: string;
  path: string;
  original_content: string;
  sanitized_content: string | null;
}

interface ConfigStore {
  workspaceRoot: string | null;
  setWorkspaceRoot: (root: string) => void;
  configs: Config[];
  setConfigs: (configs: Config[]) => void;
  addConfig: (config: Config) => void;
  removeConfig: (id: number) => void;
  updateConfig: (id: number, updates: Partial<Config>) => void;
  selectedConfig: Config | null;
  setSelectedConfig: (config: Config | null) => void;
  originalContent: string;
  sanitizedContent: string;
  setOriginalContent: (content: string) => void;
  setSanitizedContent: (content: string) => void;
  activeTab: 'original' | 'sanitized';
  setActiveTab: (tab: 'original' | 'sanitized') => void;
  showMergeView: boolean;
  mergeData: any;
  setShowMergeView: (show: boolean) => void;
  setMergeData: (data: any) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const useConfigStore = create<ConfigStore>((set) => ({
  workspaceRoot: null,
  setWorkspaceRoot: (root) => set({ workspaceRoot: root }),
  configs: [],
  setConfigs: (configs) => set({ configs }),
  addConfig: (config) => set((state) => ({ configs: [config, ...state.configs] })),
  removeConfig: (id) => set((state) => ({
    configs: state.configs.filter(c => c.id !== id)
  })),
  updateConfig: (id, updates) => set((state) => ({
    configs: state.configs.map(c => c.id === id ? { ...c, ...updates } : c)
  })),
  selectedConfig: null,
  setSelectedConfig: (config) => set({ selectedConfig: config }),
  originalContent: '',
  sanitizedContent: '',
  setOriginalContent: (content) => set({ originalContent: content }),
  setSanitizedContent: (content) => set({ sanitizedContent: content }),
  activeTab: 'original',
  setActiveTab: (tab) => set({ activeTab: tab }),
  showMergeView: false,
  mergeData: null,
  setShowMergeView: (show) => set({ showMergeView: show }),
  setMergeData: (data) => set({ mergeData: data }),
  loading: false,
  setLoading: (loading) => set({ loading }),
  error: null,
  setError: (error) => set({ error }),
}));

export default useConfigStore;
