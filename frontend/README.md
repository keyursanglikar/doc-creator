# 📄 Collaborative Document Editor - MERN Stack

A full-stack collaborative document editor inspired by Google Docs, built with MERN stack (MongoDB, Express, React, Node.js).

## 🚀 Live Demo

- **Frontend**: [Your Netlify/Vercel URL]
- **Backend API**: [Your Render URL]
- **Test Credentials**:
  - Email: `test@example.com` | Password: `123456`
  - Email: `alice@example.com` | Password: `123456`
  - Email: `bob@example.com` | Password: `123456`

## ✨ Features

### Core Features (All Working)
- ✅ Create, edit, rename, delete documents
- ✅ Rich text editor (Bold, Italic, Underline, Headings, Lists)
- ✅ Auto-save functionality (2-second debounce)
- ✅ File upload support (.txt, .md, .docx)
- ✅ Share documents with other users (view/edit permissions)
- ✅ Owner vs Shared documents visual distinction
- ✅ MongoDB persistence (survives refresh)
- ✅ User authentication (Register/Login with JWT)
- ✅ Export documents as HTML
- ✅ Responsive design

### Technical Features
- ✅ JWT authentication with bcrypt password hashing
- ✅ RESTful API with Express
- ✅ MongoDB Atlas cloud database
- ✅ TipTap rich text editor
- ✅ Drag & drop file upload
- ✅ Toast notifications
- ✅ Loading states & error handling
- ✅ Automated tests (Jest)

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, TipTap, Axios |
| Backend | Node.js, Express.js, MongoDB, JWT |
| Database | MongoDB Atlas |
| Styling | Custom CSS (No frameworks) |
| Testing | Jest, Supertest, Vitest |

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- MongoDB Atlas account (free) or local MongoDB
- Git

### Setup Instructions

#### 1. Clone the repository
```bash
git clone https://github.com/yourusername/doc-collab-editor.git
cd doc-collab-editor