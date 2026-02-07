import WorkspacePicker from "./pages/WorkspacePicker";
import Dashboard from "./pages/Dashboard";
import useConfigStore from "./stores/configStore";

function App() {
  const workspaceRoot = useConfigStore(state => state.workspaceRoot);

  const handleWorkspaceSelected = (root: string) => {
    console.log('Workspace selected:', root);
  };

  return (
    <div className="h-screen">
      {!workspaceRoot ? (
        <WorkspacePicker onWorkspaceSelected={handleWorkspaceSelected} />
      ) : (
        <Dashboard />
      )}
    </div>
  );
}

export default App;
