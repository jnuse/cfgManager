import { create } from 'zustand';

export interface Workspace {
  id: number;
  name: string;
  root_path: string;
}

export interface Config {
  id: number;
  workspace_id: number;
  name: string;
  path: string;
  original_content: string;
  sanitized_content: string | null;
}

interface ConfigStore {
  workspaces: Workspace[];
  setWorkspaces: (workspaces: Workspace[]) => void;
  addWorkspace: (workspace: Workspace) => void;
  removeWorkspace: (id: number) => void;

  configs: Config[];
  setConfigs: (configs: Config[]) => void;
  removeConfig: (id: number) => void;

  selectedConfig: Config | null;
  setSelectedConfig: (config: Config | null) => void;

  expandedWorkspaces: Set<number>;
  toggleWorkspace: (id: number) => void;

  activeTab: 'original' | 'sanitized';
  setActiveTab: (tab: 'original' | 'sanitized') => void;
}

const useConfigStore = create<ConfigStore>((set) => ({
  workspaces: [],
  setWorkspaces: (workspaces) => set({ workspaces }),
  addWorkspace: (workspace) => set((state) => ({
    workspaces: [...state.workspaces, workspace],
  })),
  removeWorkspace: (id) => set((state) => ({
    workspaces: state.workspaces.filter((w) => w.id !== id),
    configs: state.configs.filter((c) => c.workspace_id !== id),
    selectedConfig: state.selectedConfig?.workspace_id === id ? null : state.selectedConfig,
  })),

  configs: [],
  setConfigs: (configs) => set({ configs }),
  removeConfig: (id) => set((state) => ({
    configs: state.configs.filter((c) => c.id !== id),
    selectedConfig: state.selectedConfig?.id === id ? null : state.selectedConfig,
  })),

  selectedConfig: null,
  setSelectedConfig: (config) => set({ selectedConfig: config }),

  expandedWorkspaces: new Set<number>(),
  toggleWorkspace: (id) => set((state) => {
    const next = new Set(state.expandedWorkspaces);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return { expandedWorkspaces: next };
  }),

  activeTab: 'original',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));

export default useConfigStore;
