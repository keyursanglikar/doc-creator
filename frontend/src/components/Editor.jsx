// import React, { useEffect } from 'react';
// import { useEditor, EditorContent } from '@tiptap/react';
// import StarterKit from '@tiptap/starter-kit';
// import Placeholder from '@tiptap/extension-placeholder';
// import './Editor.css';

// const MenuBar = ({ editor }) => {
//   if (!editor) return null;
  
//   return (
//     <div className="menu-bar">
//       <button
//         onClick={() => editor.chain().focus().toggleBold().run()}
//         className={editor.isActive('bold') ? 'is-active' : ''}
//         title="Bold (Ctrl+B)"
//       >
//         <strong>B</strong>
//       </button>
//       <button
//         onClick={() => editor.chain().focus().toggleItalic().run()}
//         className={editor.isActive('italic') ? 'is-active' : ''}
//         title="Italic (Ctrl+I)"
//       >
//         <em>I</em>
//       </button>
//       <button
//         onClick={() => editor.chain().focus().toggleUnderline().run()}
//         className={editor.isActive('underline') ? 'is-active' : ''}
//         title="Underline (Ctrl+U)"
//       >
//         <u>U</u>
//       </button>
      
//       <span className="divider"></span>
      
//       <button
//         onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
//         className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
//       >
//         H1
//       </button>
//       <button
//         onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
//         className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
//       >
//         H2
//       </button>
//       <button
//         onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
//         className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
//       >
//         H3
//       </button>
      
//       <span className="divider"></span>
      
//       <button
//         onClick={() => editor.chain().focus().toggleBulletList().run()}
//         className={editor.isActive('bulletList') ? 'is-active' : ''}
//       >
//         • List
//       </button>
//       <button
//         onClick={() => editor.chain().focus().toggleOrderedList().run()}
//         className={editor.isActive('orderedList') ? 'is-active' : ''}
//       >
//         1. List
//       </button>
      
//       <span className="divider"></span>
      
//       <button
//         onClick={() => editor.chain().focus().setHorizontalRule().run()}
//       >
//         ― Line
//       </button>
//       <button
//         onClick={() => editor.chain().focus().undo().run()}
//         disabled={!editor.can().undo()}
//       >
//         ↶ Undo
//       </button>
//       <button
//         onClick={() => editor.chain().focus().redo().run()}
//         disabled={!editor.can().redo()}
//       >
//         ↷ Redo
//       </button>
      
//       <div className="menu-info">
//         <span className="word-count">
//           📝 {editor.storage.characterCount?.words() || 0} words
//         </span>
//       </div>
//     </div>
//   );
// };

// const Editor = ({ content, onChange, readOnly = false }) => {
//   const editor = useEditor({
//     extensions: [
//       StarterKit.configure({
//         heading: {
//           levels: [1, 2, 3]
//         },
//       }),
//       Placeholder.configure({
//         placeholder: 'Start writing your document...'
//       }),
//     ],
//     content: content,
//     editable: !readOnly,
//     onUpdate: ({ editor }) => {
//       const html = editor.getHTML();
//       onChange(html);
//     },
//   });

//   useEffect(() => {
//     if (editor && content !== editor.getHTML()) {
//       editor.commands.setContent(content);
//     }
//   }, [content, editor]);

//   return (
//     <div className="editor-wrapper">
//       {!readOnly && <MenuBar editor={editor} />}
//       <div className="editor-container-custom">
//         <div className="editor-paper-custom">
//           <EditorContent editor={editor} />
//         </div>
//       </div>
//       {readOnly && (
//         <div className="readonly-badge-custom">
//           🔒 View Only Mode
//         </div>
//       )}
//     </div>
//   );
// };

// export default Editor;










import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import './Editor.css';

const MenuBar = ({ editor }) => {
  if (!editor) return null;

  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div className="editor-toolbar">
      <div className="toolbar-group">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'active' : ''}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'active' : ''}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'active' : ''}
          title="Underline (Ctrl+U)"
        >
          <u>U</u>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'active' : ''}
          title="Strikethrough"
        >
          <s>S</s>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={editor.isActive('code') ? 'active' : ''}
          title="Code"
        >
          &lt;/&gt;
        </button>
      </div>

      <div className="toolbar-divider"></div>

      <div className="toolbar-group">
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'active' : ''}
          title="Heading 1"
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'active' : ''}
          title="Heading 2"
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive('heading', { level: 3 }) ? 'active' : ''}
          title="Heading 3"
        >
          H3
        </button>
        <button
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={editor.isActive('paragraph') ? 'active' : ''}
          title="Paragraph"
        >
          ¶
        </button>
      </div>

      <div className="toolbar-divider"></div>

      <div className="toolbar-group">
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'active' : ''}
          title="Bullet List"
        >
          • List
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'active' : ''}
          title="Numbered List"
        >
          1. List
        </button>
      </div>

      <div className="toolbar-divider"></div>

      <div className="toolbar-group">
        <button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Line"
        >
          ―
        </button>
        <button onClick={addImage} title="Insert Image">
          🖼
        </button>
        <button
          onClick={() => editor.chain().focus().setBlockquote().run()}
          className={editor.isActive('blockquote') ? 'active' : ''}
          title="Quote"
        >
          "
        </button>
        <button
          onClick={() => editor.chain().focus().setCodeBlock().run()}
          className={editor.isActive('codeBlock') ? 'active' : ''}
          title="Code Block"
        >
          {'{ }'}
        </button>
      </div>

      <div className="toolbar-divider"></div>

      <div className="toolbar-group">
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (Ctrl+Z)"
        >
          ↶
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (Ctrl+Y)"
        >
          ↷
        </button>
      </div>

      <div className="toolbar-group-right">
        <span className="editor-stats">
          📝 {editor.getText().split(/\s+/).filter(w => w.length > 0).length} words
        </span>
      </div>
    </div>
  );
};

const Editor = ({ content, onChange, readOnly = false }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing your document... Click here to begin typing'
      })
    ],
    content: content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg focus:outline-none max-w-none',
        style: 'min-height: 600px; padding: 20px;'
      }
    }
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className="editor-full-container">
      {!readOnly && <MenuBar editor={editor} />}
      
      <div className="editor-scroll-container">
        <div className="editor-paper">
          <div className="editor-content-wrapper">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
      
      {readOnly && (
        <div className="readonly-banner">
          <span>🔒 View Only Mode - You cannot edit this document</span>
        </div>
      )}
    </div>
  );
};

export default Editor;