import { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Cấu hình worker cho pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface InteractivePdfViewerProps {
  pdfUrl: string;
  storageKey?: string;
}

interface FloatingMenuPosition {
  x: number;
  y: number;
  visible: boolean;
}

// Lấy backend URL chuẩn theo môi trường
const getBackendUrl = (): string => {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (envUrl.startsWith('http://') || envUrl.startsWith('https://')) {
    return envUrl.replace(/\/+$/, '');
  }
  return import.meta.env.PROD ? 'https://ielts-lms-project.onrender.com' : '';
};

// Chuẩn hóa link preview Google Drive cho iframe fallback
const getGoogleDriveEmbedUrl = (url: string) => {
  if (!url) return '';
  const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) {
    return `https://drive.google.com/file/d/${m[1]}/preview`;
  }
  return url;
};

export default function InteractivePdfViewer({ pdfUrl }: InteractivePdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'interactive' | 'drive'>('interactive');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.15); // Zoom scale
  const [renderedPages, setRenderedPages] = useState<number[]>([]);
  const [floatingMenu, setFloatingMenu] = useState<FloatingMenuPosition>({ x: 0, y: 0, visible: false });
  const [highlightCount, setHighlightCount] = useState<number>(0);

  // Chuẩn hóa URL PDF (Nếu là URL ngoài hoặc Google Drive -> chuyển qua backend proxy có host rõ ràng)
  const getProxiedUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const base = getBackendUrl();
      return `${base}/api/booking/pdf-proxy?url=${encodeURIComponent(url)}`;
    }
    // Relative URL cục bộ (ví dụ: /sample-ielts-test.pdf)
    return url;
  };

  const pdfDocRef = useRef<any>(null);

  // Tải tài liệu PDF
  useEffect(() => {
    let isCancelled = false;
    const loadPdf = async () => {
      setLoading(true);
      setError(null);
      try {
        const targetUrl = getProxiedUrl(pdfUrl);
        const loadingTask = pdfjsLib.getDocument({
          url: targetUrl,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (isCancelled) return;
        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        const pageArr = Array.from({ length: doc.numPages }, (_, i) => i + 1);
        setRenderedPages(pageArr);
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Lỗi khi tải tài liệu PDF:', err);
          setError('Không thể tải hoặc hiển thị tài liệu PDF bằng bộ vẽ tương tác. Bạn có thể chuyển sang chế độ xem Google Drive gốc bên dưới.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    if (pdfUrl && viewMode === 'interactive') {
      loadPdf();
    }

    return () => {
      isCancelled = true;
    };
  }, [pdfUrl, viewMode]);

  // Render từng trang (Canvas + TextLayer)
  const renderPage = useCallback(
    async (pageNumber: number, canvas: HTMLCanvasElement, textLayerDiv: HTMLDivElement) => {
      if (!pdfDocRef.current) return;
      try {
        const page = await pdfDocRef.current.getPage(pageNumber);
        const viewport = page.getViewport({ scale });

        // Setup Canvas
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + 'px';
        canvas.style.height = Math.floor(viewport.height) + 'px';

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

        const renderContext = {
          canvasContext: ctx,
          transform: transform,
          viewport: viewport,
        };

        await page.render(renderContext).promise;

        // Setup Text Layer
        textLayerDiv.innerHTML = '';
        textLayerDiv.style.width = Math.floor(viewport.width) + 'px';
        textLayerDiv.style.height = Math.floor(viewport.height) + 'px';
        textLayerDiv.style.setProperty('--scale-factor', `${scale}`);

        const textContent = await page.getTextContent();
        await pdfjsLib.renderTextLayer({
          textContentSource: textContent,
          container: textLayerDiv,
          viewport: viewport,
          textDivs: [],
        }).promise;
      } catch (err) {
        console.error(`Lỗi khi render trang ${pageNumber}:`, err);
      }
    },
    [scale]
  );

  // Xử lý khi bôi đen chuột để hiện Floating Toolbar
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      setFloatingMenu((prev) => ({ ...prev, visible: false }));
      return;
    }

    const text = selection.toString().trim();
    if (text.length === 0) {
      setFloatingMenu((prev) => ({ ...prev, visible: false }));
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (rect.width > 0 && rect.height > 0) {
      setFloatingMenu({
        x: rect.left + rect.width / 2,
        y: Math.max(10, rect.top - 46),
        visible: true,
      });
    }
  };

  // Áp dụng Highlight vàng lên văn bản được chọn
  const applyHighlight = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const text = selection.toString().trim();
    if (!text) return;

    try {
      const mark = document.createElement('mark');
      mark.className = 'ielts-pdf-highlight';
      mark.title = 'Click để bỏ highlight';
      mark.dataset.highlightId = 'hl_' + Date.now();

      try {
        range.surroundContents(mark);
      } catch {
        const fragment = range.extractContents();
        mark.appendChild(fragment);
        range.insertNode(mark);
      }

      setHighlightCount((c) => c + 1);
    } catch (e) {
      console.warn('Không thể bọc phần tử highlight:', e);
    }

    selection.removeAllRanges();
    setFloatingMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  // Bỏ Highlight khi click trực tiếp vào đoạn văn bản đã highlight
  const handleContainerClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const mark = target.closest('.ielts-pdf-highlight') as HTMLElement;
    if (mark) {
      const parent = mark.parentNode;
      while (mark.firstChild) {
        parent?.insertBefore(mark.firstChild, mark);
      }
      parent?.removeChild(mark);
      parent?.normalize();
      setHighlightCount((c) => Math.max(0, c - 1));
      setFloatingMenu((prev) => ({ ...prev, visible: false }));
    }
  };

  // Phím tắt Ctrl + H để Highlight
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed && selection.toString().trim().length > 0) {
          e.preventDefault();
          applyHighlight();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [applyHighlight]);

  // Xóa toàn bộ highlight trên tài liệu
  const clearAllHighlights = () => {
    if (!containerRef.current) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa toàn bộ các đoạn highlight trên tài liệu PDF?')) return;
    const marks = containerRef.current.querySelectorAll('.ielts-pdf-highlight');
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      while (mark.firstChild) {
        parent?.insertBefore(mark.firstChild, mark);
      }
      parent?.removeChild(mark);
      parent?.normalize();
    });
    setHighlightCount(0);
    setFloatingMenu((prev) => ({ ...prev, visible: false }));
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-800 select-none overflow-hidden">
      {/* Styles cho PDF.js Text Layer & Lớp Highlight IELTS */}
      <style>{`
        .pdf-page-container {
          position: relative;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
          background-color: white;
          margin: 0 auto 16px auto;
          border-radius: 6px;
          overflow: hidden;
        }
        .pdf-text-layer {
          position: absolute;
          left: 0;
          top: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
          opacity: 1;
          line-height: 1;
          user-select: text;
          -webkit-user-select: text;
        }
        .pdf-text-layer span {
          color: transparent;
          position: absolute;
          white-space: pre;
          cursor: text;
          transform-origin: 0% 0%;
        }
        .pdf-text-layer ::selection {
          background: rgba(250, 204, 21, 0.45);
        }
        .ielts-pdf-highlight {
          background: rgba(253, 224, 71, 0.78) !important;
          box-shadow: 0 0 0 1px rgba(234, 179, 8, 0.6);
          border-radius: 2px;
          cursor: pointer;
          color: transparent !important;
          position: relative;
          z-index: 2;
          display: inline;
        }
        .ielts-pdf-highlight:hover {
          background: rgba(250, 204, 21, 0.95) !important;
          box-shadow: 0 0 0 2px rgba(202, 138, 4, 0.9);
        }
      `}</style>

      {/* Floating Highlight Toolbar khi bôi đen text */}
      {floatingMenu.visible && (
        <div
          style={{ left: `${floatingMenu.x}px`, top: `${floatingMenu.y}px` }}
          className="fixed z-50 -translate-x-1/2 flex items-center gap-1 bg-slate-900/95 backdrop-blur-md text-white px-2 py-1 rounded-xl shadow-2xl border border-slate-700 text-xs animate-in fade-in zoom-in-95 duration-150"
        >
          <button
            onClick={applyHighlight}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-lg font-black transition-all cursor-pointer shadow-sm"
          >
            <span>🖍️</span>
            <span>Highlight (Ctrl+H)</span>
          </button>
          <button
            onClick={() => setFloatingMenu((prev) => ({ ...prev, visible: false }))}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            title="Đóng"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Toolbar: Điều khiển Chế độ xem, Zoom, Số trang, Xóa highlight */}
      <div className="h-11 px-4 bg-slate-900/90 backdrop-blur-md border-b border-slate-700/80 flex items-center justify-between gap-3 shrink-0 text-white z-10">
        <div className="flex items-center gap-2.5">
          {/* Chuyển đổi giữa Chế độ Highlight và Chế độ Drive Preview */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-[11px]">
            <button
              onClick={() => setViewMode('interactive')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                viewMode === 'interactive'
                  ? 'bg-amber-400 text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Chế độ xem tương tác: Cho phép bôi đen để highlight trực tiếp trên PDF"
            >
              🖍️ Highlight PDF
            </button>
            <button
              onClick={() => setViewMode('drive')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                viewMode === 'drive'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Chế độ xem Google Drive Viewer gốc"
            >
              👁️ Google Drive Gốc
            </button>
          </div>

          {viewMode === 'interactive' && highlightCount > 0 && (
            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold hidden sm:inline-block">
              {highlightCount} đoạn highlight
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {viewMode === 'interactive' && (
            <>
              {/* Zoom controls */}
              <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
                <button
                  onClick={() => setScale((s) => Math.max(0.7, Number((s - 0.15).toFixed(2))))}
                  className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors cursor-pointer font-bold"
                  title="Thu nhỏ"
                >
                  −
                </button>
                <span className="px-2 py-0.5 font-mono text-[11px] font-bold text-slate-300 min-w-12 text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => setScale((s) => Math.min(2.0, Number((s + 0.15).toFixed(2))))}
                  className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors cursor-pointer font-bold"
                  title="Phóng to"
                >
                  +
                </button>
                <button
                  onClick={() => setScale(1.15)}
                  className="px-2 py-1 text-[10px] text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors cursor-pointer border-l border-slate-700"
                  title="Đặt lại 115%"
                >
                  Reset
                </button>
              </div>

              {/* Xóa toàn bộ highlight */}
              {highlightCount > 0 && (
                <button
                  onClick={clearAllHighlights}
                  className="px-2 py-1 text-[11px] font-bold text-rose-300 hover:text-white hover:bg-rose-900/40 border border-rose-800/60 rounded-lg transition-all cursor-pointer"
                >
                  🧹 Xóa Highlight
                </button>
              )}
            </>
          )}

          {/* Mở tab mới */}
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 text-[11px] font-bold text-blue-300 hover:text-white bg-blue-950/60 hover:bg-blue-900 border border-blue-800 rounded-lg transition-all flex items-center gap-1"
            title="Mở PDF gốc ở tab mới"
          >
            <span>Mở tab mới</span>
            <span>↗</span>
          </a>
        </div>
      </div>

      {/* Hiển thị PDF theo chế độ được chọn */}
      {viewMode === 'drive' ? (
        <div className="flex-1 w-full h-full bg-slate-900">
          <iframe
            src={getGoogleDriveEmbedUrl(pdfUrl)}
            className="w-full h-full border-none"
            title="Google Drive PDF Viewer"
            allow="autoplay"
          />
        </div>
      ) : (
        /* Vùng hiển thị cuộn các trang PDF Interactive */
        <div
          ref={containerRef}
          onMouseUp={handleMouseUp}
          onClick={handleContainerClick}
          className="flex-1 overflow-y-auto p-4 custom-scrollbar select-text bg-slate-900/60 flex flex-col items-center"
        >
          {loading && (
            <div className="my-auto flex flex-col items-center justify-center p-8 text-center text-slate-300">
              <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-sm font-bold text-white">Đang tải và xử lý tài liệu PDF...</p>
              <p className="text-xs text-slate-400 mt-1">Đang phân giải link Drive và thiết lập công cụ Highlight...</p>
            </div>
          )}

          {error && (
            <div className="my-auto max-w-md bg-rose-950/60 border border-rose-800 text-rose-200 p-6 rounded-2xl text-center space-y-3">
              <div className="text-3xl">⚠️</div>
              <h4 className="text-sm font-black text-white">Không thể hiển thị tài liệu PDF</h4>
              <p className="text-xs text-rose-300/90 leading-relaxed">{error}</p>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                <button
                  onClick={() => setViewMode('drive')}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  👁️ Xem bằng Google Drive Gốc
                </button>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700 text-center"
                >
                  Mở link trực tiếp ↗
                </a>
              </div>
            </div>
          )}

          {!loading && !error && (
            <div className="w-full flex flex-col items-center">
              {renderedPages.map((pageNo) => (
                <PdfPageItem
                  key={`${pageNo}_${scale}`}
                  pageNumber={pageNo}
                  scale={scale}
                  onRenderPage={renderPage}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Subcomponent hiển thị từng trang PDF riêng lẻ
function PdfPageItem({
  pageNumber,
  scale,
  onRenderPage,
}: {
  pageNumber: number;
  scale: number;
  onRenderPage: (pageNumber: number, canvas: HTMLCanvasElement, textLayer: HTMLDivElement) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (canvasRef.current && textLayerRef.current) {
      onRenderPage(pageNumber, canvasRef.current, textLayerRef.current);
    }
  }, [pageNumber, scale, onRenderPage]);

  return (
    <div className="pdf-page-container relative group">
      <div className="absolute top-2 right-2 z-10 px-2 py-0.5 bg-slate-900/60 backdrop-blur-sm text-slate-300 text-[10px] font-mono rounded font-bold opacity-0 group-hover:opacity-100 transition-opacity">
        Trang {pageNumber}
      </div>
      <canvas ref={canvasRef} className="block" />
      <div ref={textLayerRef} className="pdf-textLayer pdf-text-layer" />
    </div>
  );
}
