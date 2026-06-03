import React from 'react';
import axios from 'axios';
import './DocList.css';

const API_URL = 'http://localhost:5000/api';

const DocList = ({ documents, currentDoc, onSelectDoc, userId, onDelete }) => {
  const ownedDocs = documents.filter(doc => doc.ownerId === userId);
  const sharedDocs = documents.filter(doc => doc.ownerId !== userId);

  const deleteDoc = async (docId, e) => {
    e.stopPropagation();
    if (window.confirm('Delete this document?')) {
      try {
        await axios.delete(`${API_URL}/docs/${docId}`, {
          data: { userId }
        });
        if (onDelete) onDelete(docId);
        if (currentDoc?._id === docId && onSelectDoc) {
          onSelectDoc(null);
        }
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  return (
    <div className="doc-list">
      {ownedDocs.length > 0 && (
        <div className="doc-section">
          <h3>My Documents ({ownedDocs.length})</h3>
          {ownedDocs.map(doc => (
            <div
              key={doc._id}
              className={`doc-item ${currentDoc?._id === doc._id ? 'active' : ''}`}
              onClick={() => onSelectDoc(doc)}
            >
              <div className="doc-info">
                <span className="doc-title-list">📄 {doc.title}</span>
                <span className="doc-date">
                  {new Date(doc.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <button 
                className="delete-doc" 
                onClick={(e) => deleteDoc(doc._id, e)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {sharedDocs.length > 0 && (
        <div className="doc-section">
          <h3>Shared with me ({sharedDocs.length})</h3>
          {sharedDocs.map(doc => (
            <div
              key={doc._id}
              className={`doc-item shared ${currentDoc?._id === doc._id ? 'active' : ''}`}
              onClick={() => onSelectDoc(doc)}
            >
              <div className="doc-info">
                <span className="doc-title-list">🔗 {doc.title}</span>
                <span className="doc-owner">
                  Owner: {typeof doc.ownerId === 'object' ? doc.ownerId.name : 'Unknown'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {documents.length === 0 && (
        <div className="doc-list-empty">
          <p>No documents yet</p>
          <p style={{ fontSize: '12px', color: '#999' }}>
            Click "New Document" to get started
          </p>
        </div>
      )}
    </div>
  );
};

export default DocList;