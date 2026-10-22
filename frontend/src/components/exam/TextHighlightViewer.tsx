import React, { useState, useRef, useEffect } from 'react';

interface TextHighlightViewerProps {
  content: string;
  title?: string;
}

export default function TextHighlightViewer({ content, title = 'Reading Passage' }: TextHighlightViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null);
  const [selectedRange, setSelectedRange] = useState<Range | null>(null);
  const [highlightCount, setHighlightCount] = useState(0);

  // Lắng nghe sự kiện bôi đen văn bản để hiển thị Floating Toolbar
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setToolbarPos(null);
      setSelectedRange(null);
      return;
    }

    // Kiểm tra xem vùng chọn có nằm trong container bài đọc không
    if (containerRef.current && containerRef.current.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      setSelectedRange(range.cloneRange());
      setToolbarPos({
        top: rect.top - containerRect.top - 42,
        left: Math.max(10, rect.left - containerRect.left + rect.width / 2 - 80)
      });
    } else {
      setToolbarPos(null);
      setSelectedRange(null);
    }
  };

  // Áp dụng Highlight vàng cho vùng đã chọn
  const applyHighlight = () => {
    if (!selectedRange) return;

    try {
      const mark = document.createElement('mark');
      mark.className = 'bg-yellow-200 text-slate-900 font-semibold rounded px-1 cursor-pointer transition-colors hover:bg-yellow-300';
      mark.title = 'Nhấp đúp để bỏ highlight';
      mark.dataset.highlightId = String(Date.now());

      // Lắng nghe sự kiện click/double click vào mark để xóa highlight
      mark.addEventListener('click', (e) => {
        e.stopPropagation();
        removeSingleHighlight(mark);
      });

      mark.appendChild(selectedRange.extractContents());
      selectedRange.insertNode(mark);

      window.getSelection()?.removeAllRanges();
      setToolbarPos(null);
      setSelectedRange(null);
      updateCount();
    } catch (e) {
      console.error('Không thể tạo highlight trên cấu trúc DOM này', e);
    }
  };

  // Xóa một thẻ highlight cụ thể
  const removeSingleHighlight = (markNode: HTMLElement) => {
    const parent = markNode.parentNode;
    if (!parent) return;

    while (markNode.firstChild) {
      parent.insertBefore(markNode.firstChild, markNode);
    }
    parent.removeChild(markNode);
    parent.normalize();
    updateCount();
  };

  // Xóa highlight ở vùng đang chọn (nếu có bôi đen qua thẻ mark)
  const removeHighlightFromSelection = () => {
    if (!selectedRange || !containerRef.current) return;

    const marks = containerRef.current.querySelectorAll('mark');
    marks.forEach((mark) => {
      if (selectedRange.intersectsNode(mark)) {
        removeSingleHighlight(mark);
      }
    });

    window.getSelection()?.removeAllRanges();
    setToolbarPos(null);
    setSelectedRange(null);
    updateCount();
  };

  // Xóa toàn bộ highlight trong bài đọc
  const clearAllHighlights = () => {
    if (!containerRef.current) return;
    const marks = containerRef.current.querySelectorAll('mark');
    marks.forEach((m) => removeSingleHighlight(m));
    setToolbarPos(null);
    setSelectedRange(null);
    updateCount();
  };

  const updateCount = () => {
    if (!containerRef.current) return;
    const count = containerRef.current.querySelectorAll('mark').length;
    setHighlightCount(count);
  };

  // Phím tắt Ctrl+H để highlight nhanh
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
        if (selectedRange) {
          e.preventDefault();
          applyHighlight();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRange]);

  return (
    <div className="relative flex flex-col h-full bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
      {/* Header thanh công cụ đọc bài */}
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-base">📖</span>
          <span className="text-xs font-black uppercase text-slate-800 tracking-wider line-clamp-1">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {highlightCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-lg border border-yellow-200">
              🖍️ {highlightCount} điểm highlight
            </span>
          )}
          {highlightCount > 0 && (
            <button
              onClick={clearAllHighlights}
              className="text-[10px] font-bold text-slate-500 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
              title="Xóa tất cả điểm đánh dấu"
            >
              Xóa tất cả
            </button>
          )}
          <span className="hidden sm:inline text-[10px] text-slate-400 font-medium">Bôi đen chữ để Highlight</span>
        </div>
      </div>

      {/* Nội dung bài đọc và Floating Toolbar */}
      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        className="relative flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar select-text text-slate-800 leading-relaxed text-sm md:text-base font-serif"
      >
        {/* Floating Toolbar khi bôi đen */}
        {toolbarPos && (
          <div
            style={{ top: `${toolbarPos.top}px`, left: `${toolbarPos.left}px` }}
            className="absolute z-30 flex items-center gap-1 bg-slate-900 text-white px-2 py-1.5 rounded-xl shadow-xl border border-slate-700 animate-[fadeIn_0.15s_ease-out]"
            onMouseDown={(e) => e.preventDefault()} // Ngăn mất selection khi click button
          >
            <button
              onClick={applyHighlight}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-yellow-400 text-slate-900 rounded-lg hover:bg-yellow-300 transition-transform active:scale-95 cursor-pointer shadow-sm"
              title="Highlight vàng (Ctrl+H)"
            >
              <span>🖍️</span>
              <span>Highlight</span>
            </button>
            <button
              onClick={removeHighlightFromSelection}
              className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Bỏ highlight đoạn này"
            >
              <span>🧹</span>
              <span>Xóa</span>
            </button>
          </div>
        )}

        {/* Nội dung văn bản với định dạng đoạn văn */}
        <div className="space-y-4 whitespace-pre-line">
          {content ? (
            content
          ) : (
            <div className="text-slate-400 italic text-center py-12">
              (Chưa có nội dung văn bản bài đọc cho phần này)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
