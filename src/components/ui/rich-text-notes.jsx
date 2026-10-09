import React, { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Eraser, Highlighter,
  ImagePlus, Italic, Link2, List, ListOrdered, Maximize2, Minimize2, Redo2,
  RemoveFormatting, Strikethrough, UnderlineIcon, Undo2, Unlink,
} from 'lucide-react';
import api from '@/utils/common/serve';
import tradeApi from '@/utils/api/tradeApi';
import { Card } from './card';
import { ImageViewerModal } from './image-viewer-modal';

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };
const extensions = [
  StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false, underline: false }),
  Underline,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Link.configure({ openOnClick: false, defaultProtocol: 'https', HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' } }),
  Image.configure({ allowBase64: false }),
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  Placeholder.configure({ placeholder: 'Write your trading notes…' }),
];

function ToolButton({ active = false, label, onClick, disabled = false, children }) {
  return (
    <button
      type="button"
      className={`inline-flex min-w-[27px] h-[27px] items-center justify-center px-1.5 border border-transparent rounded-md text-[var(--text-primary)] hover:border-[var(--border-medium)] hover:bg-[var(--bg-hover)] cursor-pointer transition-colors disabled:opacity-35 disabled:cursor-default ${
        active ? 'text-[var(--accent-success-strong)] bg-[var(--bg-hover)] border-[var(--border-medium)]' : ''
      }`}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );
}

export function RichTextNotes({ uniqueId, selectedDate, className = '' }) {
  const [tab, setTab] = useState('trade');
  const [status, setStatus] = useState('loading');
  const [uploading, setUploading] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [previewImage, setPreviewImage] = useState(null);

  const activeKey = tab === 'trade' ? `trade:${uniqueId}` : `daily:${selectedDate}`;
  const activeKeyRef = useRef(activeKey);
  const draftsRef = useRef(new Map());
  const timersRef = useRef(new Map());
  const versionsRef = useRef(new Map());
  const fileRef = useRef(null);
  const sectionRef = useRef(null);
  const loadingRef = useRef(false);
  const loadedKeyRef = useRef('');

  const parseNotes = (raw) => {
    if (!raw) return EMPTY_DOC;
    try {
      const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return p?.type === 'doc' ? p : { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: String(raw) }] }] };
    } catch {
      return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: String(raw) }] }] };
    }
  };

  const save = async (key, content, version) => {
    if (activeKeyRef.current === key) setStatus('saving');
    try {
      if (key.startsWith('trade:')) {
        await tradeApi.update(key.slice(6), { notes: JSON.stringify(content) });
      } else {
        localStorage.setItem(`journal_${key}`, JSON.stringify(content));
      }
      if (versionsRef.current.get(key) !== version) return;
      draftsRef.current.delete(key);
      if (activeKeyRef.current === key) setStatus('saved');
    } catch {
      if (activeKeyRef.current === key) setStatus('error');
    }
  };

  const scheduleSave = (key, content) => {
    const version = (versionsRef.current.get(key) || 0) + 1;
    versionsRef.current.set(key, version);
    draftsRef.current.set(key, content);
    window.clearTimeout(timersRef.current.get(key));
    timersRef.current.set(key, window.setTimeout(() => save(key, content, version), 1000));
    if (activeKeyRef.current === key) setStatus('saving');
  };

  const editor = useEditor({
    extensions,
    content: EMPTY_DOC,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor: currentEditor }) => {
      if (!loadingRef.current) scheduleSave(activeKeyRef.current, currentEditor.getJSON());
    },
  });

  useEffect(() => {
    activeKeyRef.current = activeKey;
    if (!editor || !uniqueId || !selectedDate) return undefined;
    if (loadedKeyRef.current === activeKey) return undefined;
    loadedKeyRef.current = activeKey;
    let current = true;
    loadingRef.current = true;
    editor.commands.setContent(EMPTY_DOC, { emitUpdate: false });
    loadingRef.current = false;
    setStatus('loading');

    const draft = draftsRef.current.get(activeKey);
    if (draft) {
      loadingRef.current = true;
      editor.commands.setContent(draft, { emitUpdate: false });
      loadingRef.current = false;
      setStatus('saving');
      return undefined;
    }

    if (activeKey.startsWith('trade:')) {
      tradeApi.getById(activeKey.slice(6)).then((res) => {
        if (!current || activeKeyRef.current !== activeKey) return;
        loadingRef.current = true;
        editor.commands.setContent(parseNotes(res?.trade?.notes), { emitUpdate: false });
        loadingRef.current = false;
        setStatus('saved');
      }).catch(() => {
        if (current && activeKeyRef.current === activeKey) setStatus('error');
      });
    } else {
      const cached = localStorage.getItem(`journal_${activeKey}`);
      editor.commands.setContent(parseNotes(cached), { emitUpdate: false });
      setStatus('saved');
    }

    return () => { current = false; };
  }, [activeKey, editor, reloadToken, selectedDate, uniqueId]);

  useEffect(() => () => timersRef.current.forEach((timer) => window.clearTimeout(timer)), []);

  useEffect(() => {
    const syncFullscreen = () => setFullscreen(document.fullscreenElement === sectionRef.current);
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  if (!editor) return null;

  const chain = () => editor.chain().focus();
  const headingValue = [1, 2, 3].find((level) => editor.isActive('heading', { level }));
  const setHeading = (value) => value === 'paragraph'
    ? chain().setParagraph().run()
    : chain().toggleHeading({ level: Number(value.slice(1)) }).run();

  const editLink = () => {
    const href = window.prompt('Link URL', editor.getAttributes('link').href || 'https://');
    if (href === null) return;
    if (!href.trim()) chain().unsetLink().run();
    else chain().extendMarkRange('link').setLink({ href: href.trim() }).run();
  };

  const insertImageUrl = () => {
    const src = window.prompt('HTTPS image URL', 'https://');
    if (src?.startsWith('https://')) chain().setImage({ src }).run();
  };

  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append('image', file);
      const { data } = await api.post('/notes/images', body);
      if (!data?.url) throw new Error('Upload failed');
      chain().setImage({ src: data.url, alt: file.name }).run();
    } catch {
      setStatus('error');
    } finally {
      setUploading(false);
    }
  };

  const retry = () => {
    const draft = draftsRef.current.get(activeKey);
    if (draft) scheduleSave(activeKey, draft);
    else setReloadToken((value) => value + 1);
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await sectionRef.current?.requestFullscreen();
  };

  const handleEditorClick = (e) => {
    if (e.target && e.target.tagName === 'IMG' && e.target.src) {
      setPreviewImage(e.target.src);
    }
  };

  return (
    <>
      <Card
        variant="default"
        padding="none"
        className={`flex flex-col min-h-0 h-full overflow-hidden [&:fullscreen]:w-screen [&:fullscreen]:h-screen [&:fullscreen]:p-6 [&:fullscreen]:rounded-none [&:fullscreen]:border-0 ${className}`.trim()}
        ref={sectionRef}
      >
        <div className="flex items-center justify-between min-h-[42px] px-3 border-b border-[var(--divider-strong)] bg-[var(--bg-card)]">
          <div className="flex items-stretch gap-1 self-stretch" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'trade'}
              className={`px-3.5 border-b-2 font-bold text-xs cursor-pointer transition-colors bg-transparent border-0 ${
                tab === 'trade'
                  ? 'border-b-2 !border-[var(--accent-success-strong)] text-[var(--text-primary)] bg-[var(--accent-success-soft)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              onClick={() => setTab('trade')}
            >
              Trade Note
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'daily'}
              className={`px-3.5 border-b-2 font-bold text-xs cursor-pointer transition-colors bg-transparent border-0 ${
                tab === 'daily'
                  ? 'border-b-2 !border-[var(--accent-success-strong)] text-[var(--text-primary)] bg-[var(--accent-success-soft)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              onClick={() => setTab('daily')}
            >
              Daily Journal
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className={`border-0 bg-transparent text-[11px] font-bold ${
                status === 'saved'
                  ? 'text-[var(--accent-success-strong)]'
                  : status === 'error'
                  ? 'text-[var(--accent-danger)] cursor-pointer'
                  : 'text-[var(--text-secondary)]'
              }`}
              onClick={status === 'error' ? retry : undefined}
            >
              {status === 'loading'
                ? 'Loading…'
                : status === 'saving'
                ? 'Saving…'
                : status === 'error'
                ? 'Save failed · Retry'
                : 'Saved'}
            </button>
            <button
              type="button"
              className="inline-flex w-7 h-7 items-center justify-center p-0 border border-[var(--border-light)] rounded-md text-[var(--text-secondary)] bg-transparent hover:text-[var(--accent-ink)] hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
              onClick={toggleFullscreen}
              title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              aria-label={fullscreen ? 'Exit notes fullscreen' : 'Open notes fullscreen'}
            >
              {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-[var(--divider-strong)] bg-[var(--bg-secondary)]" role="toolbar" aria-label="Note formatting">
          <ToolButton label="Undo" onClick={() => chain().undo().run()} disabled={!editor.can().undo()}>
            <Undo2 className="w-3.5 h-3.5" />
          </ToolButton>
          <ToolButton label="Redo" onClick={() => chain().redo().run()} disabled={!editor.can().redo()}>
            <Redo2 className="w-3.5 h-3.5" />
          </ToolButton>
          <select
            className="w-[92px] h-[27px] px-1 text-xs border border-[var(--border-light)] rounded-md bg-[var(--bg-card)] text-[var(--text-primary)] outline-none cursor-pointer"
            value={headingValue ? `h${headingValue}` : 'paragraph'}
            onChange={(event) => setHeading(event.target.value)}
            aria-label="Text style"
          >
            <option value="paragraph">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
          </select>
          <ToolButton label="Bold" active={editor.isActive('bold')} onClick={() => chain().toggleBold().run()}>
            <Bold className="w-3.5 h-3.5" />
          </ToolButton>
          <ToolButton label="Italic" active={editor.isActive('italic')} onClick={() => chain().toggleItalic().run()}>
            <Italic className="w-3.5 h-3.5" />
          </ToolButton>
          <ToolButton label="Underline" active={editor.isActive('underline')} onClick={() => chain().toggleUnderline().run()}>
            <UnderlineIcon className="w-3.5 h-3.5" />
          </ToolButton>
          <ToolButton label="Strikethrough" active={editor.isActive('strike')} onClick={() => chain().toggleStrike().run()}>
            <Strikethrough className="w-3.5 h-3.5" />
          </ToolButton>
          <ToolButton label="Bullet list" active={editor.isActive('bulletList')} onClick={() => chain().toggleBulletList().run()}>
            <List className="w-3.5 h-3.5" />
          </ToolButton>
          <ToolButton label="Numbered list" active={editor.isActive('orderedList')} onClick={() => chain().toggleOrderedList().run()}>
            <ListOrdered className="w-3.5 h-3.5" />
          </ToolButton>
          <ToolButton label="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => chain().setTextAlign('left').run()}>
            <AlignLeft className="w-3.5 h-3.5" />
          </ToolButton>
          <ToolButton label="Align center" active={editor.isActive({ textAlign: 'center' })} onClick={() => chain().setTextAlign('center').run()}>
            <AlignCenter className="w-3.5 h-3.5" />
          </ToolButton>
          <ToolButton label="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => chain().setTextAlign('right').run()}>
            <AlignRight className="w-3.5 h-3.5" />
          </ToolButton>
          <ToolButton label="Justify" active={editor.isActive({ textAlign: 'justify' })} onClick={() => chain().setTextAlign('justify').run()}>
            <AlignJustify className="w-3.5 h-3.5" />
          </ToolButton>

          <label
            className="relative inline-flex min-w-[27px] h-[27px] items-center justify-center px-1.5 border border-transparent rounded-md hover:border-[var(--border-medium)] hover:bg-[var(--bg-hover)] text-xs font-bold cursor-pointer"
            title="Text color"
          >
            <span>A</span>
            <input
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              type="color"
              value={editor.getAttributes('textStyle').color || '#111827'}
              onChange={(event) => chain().setColor(event.target.value).run()}
              aria-label="Text color"
            />
          </label>

          <label
            className="relative inline-flex min-w-[27px] h-[27px] items-center justify-center px-1.5 border border-transparent rounded-md hover:border-[var(--border-medium)] hover:bg-[var(--bg-hover)] text-xs font-bold cursor-pointer"
            title="Highlight"
          >
            <Highlighter className="w-3.5 h-3.5" />
            <input
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              type="color"
              value={editor.getAttributes('highlight').color || '#facc15'}
              onChange={(event) => chain().setHighlight({ color: event.target.value }).run()}
              aria-label="Highlight color"
            />
          </label>

          <ToolButton label="Add or edit link" active={editor.isActive('link')} onClick={editLink}>
            <Link2 className="w-3.5 h-3.5" />
          </ToolButton>
          <ToolButton label="Remove link" onClick={() => chain().unsetLink().run()} disabled={!editor.isActive('link')}>
            <Unlink className="w-3.5 h-3.5" />
          </ToolButton>
          <ToolButton label="Insert image URL" onClick={insertImageUrl}>
            <ImagePlus className="w-3.5 h-3.5" />
          </ToolButton>
          <ToolButton label="Upload image" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? (
              <span className="w-3 h-3 border-2 border-[var(--border-medium)] border-t-[var(--accent-success-strong)] rounded-full animate-spin" />
            ) : (
              <ImagePlus className="w-3.5 h-3.5" />
            )}
          </ToolButton>
          <ToolButton label="Clear formatting" onClick={() => chain().unsetAllMarks().clearNodes().run()}>
            <RemoveFormatting className="w-3.5 h-3.5" />
          </ToolButton>
          <ToolButton label="Remove colors" onClick={() => chain().unsetColor().unsetHighlight().run()}>
            <Eraser className="w-3.5 h-3.5" />
          </ToolButton>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadImage} hidden />
        </div>

        <div className="flex-1 min-h-0 overflow-auto bg-[var(--bg-card)]" onClick={handleEditorClick}>
          <EditorContent
            editor={editor}
            className="w-full h-full [&_.tiptap]:min-h-[150px] [&_.tiptap]:p-3.5 [&_.tiptap]:text-[var(--text-primary)] [&_.tiptap]:text-xs [&_.tiptap]:leading-relaxed [&_.tiptap]:outline-none [&_.tiptap_p]:mb-2 [&_.tiptap_h1]:text-xl [&_.tiptap_h1]:font-bold [&_.tiptap_h1]:my-2 [&_.tiptap_h2]:text-lg [&_.tiptap_h2]:font-bold [&_.tiptap_h2]:my-1.5 [&_.tiptap_h3]:text-base [&_.tiptap_h3]:font-bold [&_.tiptap_h3]:my-1 [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-5 [&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-5 [&_.tiptap_img]:max-w-[240px] [&_.tiptap_img]:max-h-[150px] [&_.tiptap_img]:object-cover [&_.tiptap_img]:inline-block [&_.tiptap_img]:border [&_.tiptap_img]:border-[var(--border-medium)] [&_.tiptap_img]:rounded-lg [&_.tiptap_img]:my-2 [&_.tiptap_img]:cursor-pointer [&_.tiptap_img]:transition-transform [&_.tiptap_img]:hover:scale-[1.02] [&_.tiptap_a]:text-[var(--accent-success-strong)] [&_.tiptap_a]:underline [&_.tiptap_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child]:before:text-[var(--text-muted,#9ca3af)] [&_.tiptap_p.is-editor-empty:first-child]:before:float-left [&_.tiptap_p.is-editor-empty:first-child]:before:pointer-events-none"
          />
        </div>
      </Card>

      <ImageViewerModal
        isOpen={Boolean(previewImage)}
        src={previewImage}
        alt="Note Image Preview"
        onClose={() => setPreviewImage(null)}
      />
    </>
  );
}

export default RichTextNotes;
