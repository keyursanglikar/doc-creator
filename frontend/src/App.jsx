import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import Editor from './components/Editor';
import DocList from './components/DocList';
import ShareModal from './components/ShareModal';
import FileUpload from './components/FileUpload';
import Login from './components/Login';
import './App.css';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [currentDoc, setCurrentDoc] = useState(null);
  const [users, setUsers] = useState([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Setup axios with auth token
  const getAuthConfig = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  // Load user from localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/docs/user/${user.id}`, getAuthConfig());
      setDocuments(res.data.documents);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        toast.error('Session expired. Please login again.');
      } else {
        toast.error('Failed to load documents');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchDocuments();
      fetchUsers();
    }
  }, [user, fetchDocuments]);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/users`, getAuthConfig());
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users');
    }
  };

  const createNewDoc = async () => {
    try {
      const res = await axios.post(`${API_URL}/docs`, {
        title: 'Untitled Document',
        content: '<p>Start writing...</p>'
      }, getAuthConfig());
      
      setDocuments([res.data, ...documents]);
      setCurrentDoc(res.data);
      toast.success('New document created');
    } catch (err) {
      toast.error('Failed to create document');
    }
  };

  const saveDocument = useCallback(async (docId, updates) => {
    try {
      const res = await axios.put(`${API_URL}/docs/${docId}`, updates, getAuthConfig());
      setCurrentDoc(prev => ({ ...res.data, isDirty: false }));
      setDocuments(prev => prev.map(doc => doc._id === docId ? res.data : doc));
      return true;
    } catch (err) {
      toast.error('Failed to save');
      return false;
    }
  }, []);

  const renameDocument = async (docId, newTitle) => {
    if (!newTitle.trim()) return;
    await saveDocument(docId, { title: newTitle });
    toast.success('Document renamed');
  };

  const handleContentChange = (content) => {
    setCurrentDoc(prev => ({ ...prev, content, isDirty: true }));
    
    // Auto-save after 2 seconds of inactivity
    if (window.autoSaveTimeout) clearTimeout(window.autoSaveTimeout);
    window.autoSaveTimeout = setTimeout(() => {
      if (currentDoc && currentDoc.isDirty) {
        saveDocument(currentDoc._id, { content });
        setCurrentDoc(prev => ({ ...prev, isDirty: false }));
      }
    }, 2000);
  };

  const exportAsPDF = async () => {
    if (!currentDoc) return;
    
    setIsExporting(true);
    toast.loading('Preparing PDF...');
    
    try {
      // Create a hidden iframe for printing
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${currentDoc.title}</title>
          <style>
            body {
              font-family: 'Calibri', Arial, sans-serif;
              padding: 40px;
              max-width: 900px;
              margin: 0 auto;
              line-height: 1.6;
            }
            h1 { color: #333; border-bottom: 2px solid #ddd; padding-bottom: 10px; }
            .content { margin-top: 20px; }
            table { border-collapse: collapse; width: 100%; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f5f5f5; }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <h1>${currentDoc.title}</h1>
          <div class="content">${currentDoc.content}</div>
          <p style="margin-top: 40px; font-size: 12px; color: #999; text-align: center;">
            Generated on ${new Date().toLocaleDateString()}
          </p>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      
      toast.dismiss();
      toast.success('PDF export initiated');
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentDoc(null);
    toast.success('Logged out');
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="app">
      <Toaster position="top-right" />
      
      <div className="sidebar">
        <div className="user-info">
          <div className="user-avatar">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <span className="user-name">{user.name}</span>
            <span className="user-email">{user.email}</span>
          </div>
          <button className="logout-btn" onClick={logout}>Logout</button>
        </div>
        
        <button className="new-doc-btn" onClick={createNewDoc}>
          + New Document
        </button>
        
        <FileUpload userId={user.id} onDocumentCreated={(newDoc) => {
          setDocuments([newDoc, ...documents]);
          setCurrentDoc(newDoc);
          toast.success('File uploaded successfully');
        }} />
        
        <DocList 
          documents={documents}
          currentDoc={currentDoc}
          onSelectDoc={setCurrentDoc}
          userId={user.id}
          onDelete={(docId) => {
            setDocuments(documents.filter(d => d._id !== docId));
            if (currentDoc?._id === docId) setCurrentDoc(null);
          }}
          onRename={renameDocument}
        />
      </div>
      
      <div className="editor-area">
        {currentDoc ? (
          <>
            <div className="editor-header">
              <input
                type="text"
                value={currentDoc.title}
                onChange={(e) => renameDocument(currentDoc._id, e.target.value)}
                className="doc-title"
              />
              <div className="editor-actions">
                <span className="word-count">
                  📝 {currentDoc.wordCount || 0} words
                </span>
                {currentDoc.isDirty && (
                  <span className="unsaved-indicator">● Unsaved</span>
                )}
                <button 
                  className="share-btn"
                  onClick={() => setShowShareModal(true)}
                >
                  Share
                </button>
                <button 
                  className="export-btn"
                  onClick={exportAsPDF}
                  disabled={isExporting}
                >
                  📄 Export PDF
                </button>
              </div>
            </div>
            
            <Editor 
              content={currentDoc.content}
              onChange={handleContentChange}
              readOnly={!currentDoc.canEdit}
            />
            
            {showShareModal && (
              <ShareModal
                doc={currentDoc}
                users={users}
                currentUser={user}
                onClose={() => setShowShareModal(false)}
                onShare={() => {
                  fetchDocuments();
                  toast.success('Document shared!');
                }}
              />
            )}
          </>
        ) : (
          <div className="empty-state">
            <h2>Welcome, {user.name}!</h2>
            <p>Select a document or create a new one to get started.</p>
            <button onClick={createNewDoc} className="empty-state-btn">
              Create Your First Document
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;