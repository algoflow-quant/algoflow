'use client';

import dynamic from 'next/dynamic';

const DatalayerNotebook = dynamic(
  () => import('./notebook-editor').then((mod) => mod.NotebookEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading Jupyter notebook...</p>
        </div>
      </div>
    ),
  }
);

interface JupyterNotebookWrapperProps {
  projectId: string;
  filePath: string;
  content: string;
  onChange?: (content: string) => void;
}

export function JupyterNotebookWrapper(props: JupyterNotebookWrapperProps) {
  return <DatalayerNotebook {...props} />;
}
