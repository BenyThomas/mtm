import React, { useCallback, useRef, useState } from 'react';
import Button from './Button';
import Card from './Card';

const DocumentUpload = ({ onUpload, uploading }) => {
    const [files, setFiles] = useState([]);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const inputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);

    const onPick = (e) => setFiles(Array.from(e.target.files || []));
    const onDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        const dropped = Array.from(e.dataTransfer.files || []);
        setFiles(dropped);
    }, []);

    const submit = async (e) => {
        e.preventDefault();
        if (!files.length) return;
        await onUpload({ files, name: name.trim(), description: description.trim() });
        setFiles([]);
        if (inputRef.current) inputRef.current.value = '';
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <Card>
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                    className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition
            ${dragOver ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-300 dark:border-gray-700'}`}
                    onClick={() => inputRef.current?.click()}
                >
                    <div className="text-sm">
                        {files.length ? (
                            <>
                                <div className="font-semibold mb-1">{files.length} file(s) selected</div>
                                <div className="text-xs text-gray-500">Click to change or drag more files here</div>
                            </>
                        ) : (
                            <>
                                <div className="font-semibold mb-1">Drag & drop files here</div>
                                <div className="text-xs text-gray-500">or click to choose from your computer</div>
                            </>
                        )}
                    </div>
                    <input
                        ref={inputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={onPick}
                    />
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div>
                        <label className="block text-sm font-medium">Name (optional)</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="If empty, file name is used"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Description (optional)</label>
                        <input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Short description…"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                </div>
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={uploading || !files.length}>
                    {uploading ? 'Uploading…' : `Upload${files.length ? ` (${files.length})` : ''}`}
                </Button>
            </div>
        </form>
    );
};

export default DocumentUpload;
