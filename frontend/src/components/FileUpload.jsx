import React, { useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import './FileUpload.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const FileUpload = ({ userId, onDocumentCreated }) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef();

  const handleFileUpload = async (file) => {
    if (!file) return;
    
    // Increased to 10MB for DOCX files
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Max 10MB');
      return;
    }
    
    // Validate file type
    const allowedTypes = ['.txt', '.md', '.docx', '.html', '.doc'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(ext)) {
      toast.error(`Please upload: ${allowedTypes.join(', ')}`);
      return;
    }
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    
    try {
      const res = await axios.post(`${API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload progress: ${percentCompleted}%`);
        }
      });
      
      // CRITICAL: Ensure the uploaded document is editable
      const newDoc = {
        ...res.data,
        canEdit: true,  // Force edit permission
        access: 'owner'
      };
      
      onDocumentCreated(newDoc);
      
      if (file.name.endsWith('.docx')) {
        toast.success(`"${file.name}" uploaded. Formatting preserved as much as possible.`);
      } else {
        toast.success(`"${file.name}" uploaded successfully`);
      }
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setDragActive(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  // Inline styles
  const styles = {
    wrapper: {
      padding: '0 16px 16px 16px',
      marginBottom: '8px',
      width: '100%'
    },
    dropzone: {
      border: `2px dashed ${dragActive ? '#6366f1' : '#cbd5e1'}`,
      borderRadius: '12px',
      padding: '20px',
      textAlign: 'center',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      background: dragActive ? '#eef2ff' : '#f8fafc',
      transform: dragActive ? 'scale(1.02)' : 'scale(1)',
      width: '100%',
      boxSizing: 'border-box'
    },
    icon: {
      fontSize: '40px',
      marginBottom: '12px',
      display: 'inline-block'
    },
    text: {
      fontSize: '14px',
      fontWeight: '500',
      color: '#1f2937',
      marginBottom: '6px'
    },
    subtext: {
      fontSize: '11px',
      color: '#6b7280'
    },
    progress: {
      marginTop: '16px',
      padding: '8px',
      background: '#f1f5f9',
      borderRadius: '8px'
    },
    progressBar: {
      height: '4px',
      background: '#e2e8f0',
      borderRadius: '2px',
      overflow: 'hidden',
      marginBottom: '8px'
    },
    progressFill: {
      height: '100%',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      width: '100%',
      animation: 'progressAnimation 1s ease'
    },
    progressText: {
      fontSize: '11px',
      color: '#6b7280',
      textAlign: 'center'
    },
    badges: {
      display: 'flex',
      gap: '8px',
      justifyContent: 'center',
      flexWrap: 'wrap',
      marginTop: '12px'
    },
    badge: {
      fontSize: '10px',
      padding: '4px 10px',
      background: '#f1f5f9',
      border: '1px solid #e2e8f0',
      borderRadius: '20px',
      color: '#475569',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    }
  };

  return (
    <div style={styles.wrapper}>
      <div 
        style={styles.dropzone}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.docx,.html"
          onChange={handleChange}
          style={{ display: 'none' }}
        />
        
        <div style={styles.icon}>
          {uploading ? '⏳' : '📁'}
        </div>
        <div style={styles.text}>
          {uploading ? 'Uploading...' : 'Drag & drop or click to upload'}
        </div>
        <div style={styles.subtext}>
          Supports: TXT, MD, DOCX, HTML (max 10MB)
        </div>
        
        {uploading && (
          <div style={styles.progress}>
            <div style={styles.progressBar}>
              <div style={styles.progressFill}></div>
            </div>
            <div style={styles.progressText}>
              Processing document...
            </div>
          </div>
        )}
      </div>
      
      <div style={styles.badges}>
        <span style={styles.badge}>.txt</span>
        <span style={styles.badge}>.md</span>
        <span style={styles.badge}>.docx</span>
        <span style={styles.badge}>.html</span>
      </div>
    </div>
  );
};

export default FileUpload;