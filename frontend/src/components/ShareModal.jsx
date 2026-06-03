import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import './ShareModal.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const ShareModal = ({ doc, users, currentUser, onClose, onShare }) => {
  const [selectedEmail, setSelectedEmail] = useState('');
  const [permission, setPermission] = useState('view');
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    if (!selectedEmail) return;
    
    setLoading(true);
    try {
      await axios.post(`${API_URL}/docs/${doc._id}/share`, {
        userEmail: selectedEmail,
        permission
      }, getAuthConfig());
      
      toast.success(`Document shared with ${selectedEmail}`);
      onShare();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to share');
    } finally {
      setLoading(false);
    }
  };

  const availableUsers = users.filter(u => 
    u.email !== currentUser.email && 
    !doc.sharedWith?.some(s => s.userId?.email === u.email)
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Share Document: {doc.title}</h3>
        
        <div className="share-form">
          <select 
            value={selectedEmail} 
            onChange={(e) => setSelectedEmail(e.target.value)}
          >
            <option value="">Select user to share with</option>
            {availableUsers.map(user => (
              <option key={user.email} value={user.email}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
          
          <select 
            value={permission} 
            onChange={(e) => setPermission(e.target.value)}
          >
            <option value="view">Can view</option>
            <option value="edit">Can edit</option>
          </select>
          
          <button onClick={handleShare} disabled={!selectedEmail || loading}>
            {loading ? 'Sharing...' : 'Share'}
          </button>
        </div>
        
        {doc.sharedWith && doc.sharedWith.length > 0 && (
          <div className="shared-users">
            <h4>Shared with ({doc.sharedWith.length})</h4>
            {doc.sharedWith.map(share => (
              <div key={share.userId?._id || share.userId} className="user-item">
                <div className="user-info-share">
                  <span className="user-name-share">{share.userId?.name || 'User'}</span>
                  <span className="user-email-share">{share.userId?.email || ''}</span>
                </div>
                <span className="permission-badge">{share.permission || 'view'}</span>
              </div>
            ))}
          </div>
        )}
        
        <button className="close-modal" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default ShareModal;