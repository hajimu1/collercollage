import { EditorShell } from './components/layout/EditorShell';
import { useFabricEditor } from './hooks/useFabricEditor';
import { useProjectStorage } from './hooks/useProjectStorage';

function App() {
  const editor = useFabricEditor();
  const projectStorage = useProjectStorage(editor);

  return <EditorShell editor={editor} projectStorage={projectStorage} />;
}

export default App;
