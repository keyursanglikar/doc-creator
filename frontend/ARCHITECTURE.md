
---

## 2. ARCHITECTURE.md

```markdown
# Architecture Decision Document

## Overview
This document outlines the architectural decisions for the Collaborative Document Editor, prioritizing working functionality within the time constraint while maintaining clean separation of concerns.

## Technology Stack Decisions

### Why MERN Stack?
| Component | Choice | Reason |
|-----------|--------|--------|
| Database | MongoDB | Document model aligns with document storage |
| Backend | Express.js | Fast API development, minimal boilerplate |
| Frontend | React | Component-based, huge ecosystem |
| Runtime | Node.js | JavaScript everywhere, async I/O |

### Editor Choice: TipTap
- Production-ready rich text editor
- 10+ built-in extensions
- HTML output (easy storage)
- ProseMirror under the hood

### Authentication: JWT + bcrypt
- Stateless authentication
- 7-day token expiration
- Password hashing for security

## Database Schema Design

### User Collection
```javascript
{
  _id: ObjectId,
  email: String (unique),
  name: String,
  password: String (hashed),
  role: ['user', 'admin'],
  isActive: Boolean,
  createdAt: Date
}