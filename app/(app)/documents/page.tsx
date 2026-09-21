import { FileText } from 'lucide-react';
export default function DocumentsPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Documents</h1>
      <p className="text-gray-500 mb-8">Les documents sont accessibles depuis chaque dossier client.</p>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-400">Ouvrez un dossier pour accéder à ses documents</p>
      </div>
    </div>
  );
}
